-- M4 — Integração GESTÃO ITV → ITV FINANCEIRO HML.
-- Somente financeiro_hml. Aditiva: não altera tabelas, funções, triggers ou políticas existentes.
-- A sincronização registra itens e conferências; NUNCA gera movimentações financeiras
-- (isso continua exclusivo da tesouraria_lancar_conferencia, após conciliação humana).

CREATE TABLE financeiro_hml.integracao_sincronizacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  origem text NOT NULL DEFAULT 'gestao_itv',
  iniciado_em timestamptz NOT NULL DEFAULT clock_timestamp(),
  concluido_em timestamptz,
  responsavel_id uuid,
  status text NOT NULL DEFAULT 'em_andamento' CHECK (status IN ('em_andamento','concluida','falha')),
  consultados integer NOT NULL DEFAULT 0 CHECK (consultados >= 0),
  novos integer NOT NULL DEFAULT 0 CHECK (novos >= 0),
  existentes integer NOT NULL DEFAULT 0 CHECK (existentes >= 0),
  divergentes integer NOT NULL DEFAULT 0 CHECK (divergentes >= 0),
  enviados_conferencia integer NOT NULL DEFAULT 0 CHECK (enviados_conferencia >= 0),
  erros jsonb,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON financeiro_hml.integracao_sincronizacoes TO authenticated;
GRANT ALL ON financeiro_hml.integracao_sincronizacoes TO service_role;
ALTER TABLE financeiro_hml.integracao_sincronizacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY int_sync_ler ON financeiro_hml.integracao_sincronizacoes FOR SELECT TO authenticated
  USING (financeiro_hml.tem_papel(ARRAY['admin_geral','admin_financeiro','analista_financeiro','consulta_gerencial']));

CREATE TABLE financeiro_hml.integracao_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referencia_origem text NOT NULL UNIQUE CHECK (length(referencia_origem) BETWEEN 3 AND 300),
  tipo text NOT NULL CHECK (tipo IN ('pagamento','recebimento_titulo','titulo_aberto')),
  conteudo_hash text NOT NULL,
  resumo jsonb NOT NULL,
  situacao text NOT NULL CHECK (situacao IN ('novo','existente','alterado','enviado_conferencia','possivel_duplicidade')),
  conferencia_id uuid REFERENCES financeiro_hml.tesouraria_conferencias(id),
  duplicidade_candidata_id uuid REFERENCES financeiro_hml.tesouraria_conferencias(id),
  primeira_sincronizacao_id uuid REFERENCES financeiro_hml.integracao_sincronizacoes(id),
  ultima_sincronizacao_id uuid REFERENCES financeiro_hml.integracao_sincronizacoes(id),
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz
);
CREATE INDEX int_itens_situacao ON financeiro_hml.integracao_itens (situacao);
GRANT SELECT ON financeiro_hml.integracao_itens TO authenticated;
GRANT ALL ON financeiro_hml.integracao_itens TO service_role;
ALTER TABLE financeiro_hml.integracao_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY int_itens_ler ON financeiro_hml.integracao_itens FOR SELECT TO authenticated
  USING (financeiro_hml.tem_papel(ARRAY['admin_geral','admin_financeiro','analista_financeiro','consulta_gerencial']));

CREATE TRIGGER int_sync_auditar AFTER INSERT OR UPDATE ON financeiro_hml.integracao_sincronizacoes
  FOR EACH ROW EXECUTE FUNCTION financeiro_hml.tes_conf_auditar();
CREATE TRIGGER int_itens_auditar AFTER INSERT OR UPDATE ON financeiro_hml.integracao_itens
  FOR EACH ROW EXECUTE FUNCTION financeiro_hml.tes_conf_auditar();

-- Inicia uma sincronização manual. Apenas administração (geral ou financeira).
CREATE FUNCTION financeiro_hml.integracao_iniciar() RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, financeiro_hml, pg_temp AS $$
DECLARE s uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT financeiro_hml.tem_papel(ARRAY['admin_geral','admin_financeiro']) THEN
    RAISE EXCEPTION 'INT_PERMISSAO' USING ERRCODE='42501';
  END IF;
  INSERT INTO financeiro_hml.integracao_sincronizacoes(responsavel_id) VALUES (auth.uid()) RETURNING id INTO s;
  RETURN s;
END $$;

-- Conclui a sincronização: registra itens, cria conferências de recebimentos efetivos
-- e sinaliza divergências. Idempotente pela referência de origem e pelo id da sincronização.
CREATE FUNCTION financeiro_hml.integracao_concluir(p jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, financeiro_hml, pg_temp AS $$
DECLARE
  s financeiro_hml.integracao_sincronizacoes;
  it jsonb;
  existente financeiro_hml.integracao_itens;
  dup uuid;
  conf_id uuid;
  v_novos int := 0; v_exist int := 0; v_div int := 0; v_env int := 0;
  v_hash text; v_tipo text; v_forma text; v_data date; v_bruto numeric; v_liq numeric; v_desc text;
BEGIN
  IF auth.uid() IS NULL OR NOT financeiro_hml.tem_papel(ARRAY['admin_geral','admin_financeiro']) THEN
    RAISE EXCEPTION 'INT_PERMISSAO' USING ERRCODE='42501';
  END IF;
  SELECT * INTO s FROM financeiro_hml.integracao_sincronizacoes WHERE id = (p->>'id')::uuid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'INT_SYNC_INEXISTENTE'; END IF;
  IF s.status <> 'em_andamento' THEN
    RETURN jsonb_build_object('id', s.id, 'repetida', true, 'status', s.status);
  END IF;

  IF (p->>'status') = 'falha' THEN
    UPDATE financeiro_hml.integracao_sincronizacoes
       SET status='falha', concluido_em=clock_timestamp(), erros=p->'erros'
     WHERE id=s.id;
    RETURN jsonb_build_object('id', s.id, 'repetida', false, 'status', 'falha');
  END IF;

  FOR it IN SELECT * FROM jsonb_array_elements(coalesce(p->'itens','[]'::jsonb)) LOOP
    v_tipo := it->>'tipo';
    v_hash := md5(it->>'canonico');
    v_forma := coalesce(it->'resumo'->>'forma','indefinida');
    v_data := (it->'resumo'->>'data')::date;
    v_bruto := (it->'resumo'->>'valor_bruto')::numeric;
    v_liq := nullif(it->'resumo'->>'valor_liquido','')::numeric;
    v_desc := left(coalesce(nullif(it->'resumo'->>'descricao',''),'Recebimento GESTÃO ITV'),500);

    SELECT * INTO existente FROM financeiro_hml.integracao_itens
     WHERE referencia_origem = it->>'referencia' FOR UPDATE;

    IF NOT FOUND THEN
      v_novos := v_novos + 1;
      IF (v_tipo IN ('pagamento','recebimento_titulo')) THEN
        -- Cruzamento com a planilha: mesma data, valor e forma NÃO provam duplicidade;
        -- o item é retido para revisão humana em vez de gerar conferência.
        SELECT c.id INTO dup FROM financeiro_hml.tesouraria_conferencias c
         WHERE c.referencia_origem LIKE 'CONTROLE\_CAIXA\_%' ESCAPE '\'
           AND c.data_ocorrencia = v_data AND c.valor_bruto = v_bruto AND c.forma = v_forma
         ORDER BY c.criado_em LIMIT 1;
        IF dup IS NOT NULL THEN
          INSERT INTO financeiro_hml.integracao_itens
            (referencia_origem,tipo,conteudo_hash,resumo,situacao,duplicidade_candidata_id,primeira_sincronizacao_id,ultima_sincronizacao_id)
          VALUES (it->>'referencia',v_tipo,v_hash,it->'resumo','possivel_duplicidade',dup,s.id,s.id);
          v_div := v_div + 1;
        ELSE
          INSERT INTO financeiro_hml.tesouraria_conferencias
            (referencia_origem,natureza,forma,data_ocorrencia,descricao,valor_bruto,valor_liquido,
             boleto_vencimento,boleto_pagamento,boleto_status,status,observacao)
          VALUES
            (it->>'referencia','entrada',v_forma,v_data,v_desc,v_bruto,v_liq,
             nullif(it->'resumo'->>'boleto_vencimento','')::date,
             CASE WHEN (v_tipo = 'recebimento_titulo') THEN v_data END,
             CASE WHEN (v_tipo = 'recebimento_titulo') THEN 'pago' END,
             'pendente',
             left('Origem: GESTÃO ITV · '||coalesce(it->'resumo'->>'contexto',''),500))
          RETURNING id INTO conf_id;
          INSERT INTO financeiro_hml.integracao_itens
            (referencia_origem,tipo,conteudo_hash,resumo,situacao,conferencia_id,primeira_sincronizacao_id,ultima_sincronizacao_id)
          VALUES (it->>'referencia',v_tipo,v_hash,it->'resumo','enviado_conferencia',conf_id,s.id,s.id);
          v_env := v_env + 1;
        END IF;
      ELSE
        -- Título em aberto: informativo, nunca vira conferência nem receita.
        INSERT INTO financeiro_hml.integracao_itens
          (referencia_origem,tipo,conteudo_hash,resumo,situacao,primeira_sincronizacao_id,ultima_sincronizacao_id)
        VALUES (it->>'referencia',v_tipo,v_hash,it->'resumo','novo',s.id,s.id);
      END IF;
    ELSE
      IF (existente.conteudo_hash <> v_hash) THEN
        -- Conteúdo mudou na origem: divergência para revisão; a conferência já criada não é alterada.
        UPDATE financeiro_hml.integracao_itens
           SET conteudo_hash=v_hash, resumo=it->'resumo', situacao='alterado',
               ultima_sincronizacao_id=s.id, atualizado_em=clock_timestamp()
         WHERE id=existente.id;
        v_div := v_div + 1;
      ELSE
        UPDATE financeiro_hml.integracao_itens
           SET ultima_sincronizacao_id=s.id,
               situacao = CASE WHEN (situacao IN ('novo','alterado')) THEN situacao ELSE 'existente' END,
               atualizado_em=clock_timestamp()
         WHERE id=existente.id;
        v_exist := v_exist + 1;
      END IF;
    END IF;
  END LOOP;

  UPDATE financeiro_hml.integracao_sincronizacoes
     SET status='concluida', concluido_em=clock_timestamp(),
         consultados=jsonb_array_length(coalesce(p->'itens','[]'::jsonb)),
         novos=v_novos, existentes=v_exist, divergentes=v_div, enviados_conferencia=v_env,
         erros=p->'erros'
   WHERE id=s.id;
  RETURN jsonb_build_object('id',s.id,'repetida',false,'status','concluida',
    'consultados',jsonb_array_length(coalesce(p->'itens','[]'::jsonb)),
    'novos',v_novos,'existentes',v_exist,'divergentes',v_div,'enviados_conferencia',v_env);
END $$;

REVOKE ALL ON FUNCTION financeiro_hml.integracao_iniciar(), financeiro_hml.integracao_concluir(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION financeiro_hml.integracao_iniciar(), financeiro_hml.integracao_concluir(jsonb) TO authenticated;
