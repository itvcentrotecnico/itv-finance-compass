-- M5 — Sincronização automática diária GESTÃO ITV → ITV FINANCEIRO HML.
-- Somente financeiro_hml. Não cria/alterar movimentos, saldos, contas ou permissões de perfis.
-- O acionamento automático só é aceito com a identidade de servidor (role service_role),
-- usada exclusivamente pelo endpoint protegido; perfis de usuário não ganham nenhum acesso novo.

-- 1. Histórico: modo de execução e janela lida.
ALTER TABLE financeiro_hml.integracao_sincronizacoes
  ADD COLUMN modo text NOT NULL DEFAULT 'manual' CHECK (modo IN ('manual','automatica')),
  ADD COLUMN janela_inicio date,
  ADD COLUMN janela_fim date;

-- 2. Execuções interrompidas (servidor encerrado no meio) expiram após 15 minutos.
CREATE FUNCTION financeiro_hml.integracao_expirar_travadas() RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, financeiro_hml, pg_temp AS $$
DECLARE n integer;
BEGIN
  UPDATE financeiro_hml.integracao_sincronizacoes
     SET status='falha', concluido_em=clock_timestamp(),
         erros=coalesce(erros,'[]'::jsonb) || '[{"etapa":"tempo_esgotado"}]'::jsonb
   WHERE status='em_andamento' AND iniciado_em < clock_timestamp() - interval '15 minutes';
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION financeiro_hml.integracao_expirar_travadas() FROM PUBLIC, anon, authenticated;

SELECT financeiro_hml.integracao_expirar_travadas();

-- 3. Bloqueio de execuções simultâneas (manuais e automáticas): no máximo uma em andamento.
CREATE UNIQUE INDEX integracao_sync_uma_em_andamento
  ON financeiro_hml.integracao_sincronizacoes ((true)) WHERE status = 'em_andamento';

-- 4. Início manual (administradores): mesma regra de perfil, agora com bloqueio de simultaneidade.
CREATE OR REPLACE FUNCTION financeiro_hml.integracao_iniciar() RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, financeiro_hml, pg_temp AS $$
DECLARE s uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT financeiro_hml.tem_papel(ARRAY['admin_geral','admin_financeiro']) THEN
    RAISE EXCEPTION 'INT_PERMISSAO' USING ERRCODE='42501';
  END IF;
  PERFORM financeiro_hml.integracao_expirar_travadas();
  BEGIN
    INSERT INTO financeiro_hml.integracao_sincronizacoes(responsavel_id, modo) VALUES (auth.uid(), 'manual') RETURNING id INTO s;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'INT_EM_ANDAMENTO' USING ERRCODE='55P03';
  END;
  RETURN s;
END $$;

-- 5. Início automático: somente identidade de servidor; uma conclusão automática por dia (Manaus);
--    até 6 tentativas por dia; janela de no máximo 31 dias.
CREATE FUNCTION financeiro_hml.integracao_iniciar_automatica(p_inicio date, p_fim date) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, financeiro_hml, pg_temp AS $$
DECLARE s uuid; hoje date := (clock_timestamp() AT TIME ZONE 'America/Manaus')::date;
BEGIN
  IF coalesce(auth.role(),'') <> 'service_role' THEN
    RAISE EXCEPTION 'INT_PERMISSAO' USING ERRCODE='42501';
  END IF;
  IF p_inicio IS NULL OR p_fim IS NULL OR p_fim < p_inicio OR p_fim - p_inicio > 31 OR p_fim > hoje THEN
    RAISE EXCEPTION 'INT_JANELA_INVALIDA' USING ERRCODE='22023';
  END IF;
  PERFORM financeiro_hml.integracao_expirar_travadas();
  IF EXISTS (SELECT 1 FROM financeiro_hml.integracao_sincronizacoes
              WHERE modo='automatica' AND status='concluida'
                AND (iniciado_em AT TIME ZONE 'America/Manaus')::date = hoje) THEN
    RETURN jsonb_build_object('pular', true, 'motivo', 'ja_concluida_hoje');
  END IF;
  IF (SELECT count(*) FROM financeiro_hml.integracao_sincronizacoes
       WHERE modo='automatica' AND (iniciado_em AT TIME ZONE 'America/Manaus')::date = hoje) >= 6 THEN
    RETURN jsonb_build_object('pular', true, 'motivo', 'limite_tentativas');
  END IF;
  BEGIN
    INSERT INTO financeiro_hml.integracao_sincronizacoes(responsavel_id, modo, janela_inicio, janela_fim)
    VALUES (NULL, 'automatica', p_inicio, p_fim) RETURNING id INTO s;
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('pular', true, 'motivo', 'em_andamento');
  END;
  RETURN jsonb_build_object('pular', false, 'id', s);
END $$;
REVOKE ALL ON FUNCTION financeiro_hml.integracao_iniciar_automatica(date, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION financeiro_hml.integracao_iniciar_automatica(date, date) TO service_role;

-- 6. Conclusão: corpo idêntico à M4; muda só a verificação de quem pode concluir
--    (execução manual → administradores; execução automática → somente identidade de servidor).
CREATE OR REPLACE FUNCTION financeiro_hml.integracao_concluir(p jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, financeiro_hml, pg_temp AS $$
DECLARE
  s financeiro_hml.integracao_sincronizacoes;
  it jsonb;
  existente financeiro_hml.integracao_itens;
  dup uuid;
  conf_id uuid;
  v_novos int := 0; v_exist int := 0; v_div int := 0; v_env int := 0;
  v_hash text; v_tipo text; v_forma text; v_data date; v_bruto numeric; v_liq numeric; v_desc text;
  v_servidor boolean := coalesce(auth.role(),'') = 'service_role';
BEGIN
  IF NOT v_servidor AND (auth.uid() IS NULL OR NOT financeiro_hml.tem_papel(ARRAY['admin_geral','admin_financeiro'])) THEN
    RAISE EXCEPTION 'INT_PERMISSAO' USING ERRCODE='42501';
  END IF;
  SELECT * INTO s FROM financeiro_hml.integracao_sincronizacoes WHERE id = (p->>'id')::uuid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'INT_SYNC_INEXISTENTE'; END IF;
  IF (s.modo = 'automatica') <> v_servidor THEN
    RAISE EXCEPTION 'INT_PERMISSAO' USING ERRCODE='42501';
  END IF;
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
        INSERT INTO financeiro_hml.integracao_itens
          (referencia_origem,tipo,conteudo_hash,resumo,situacao,primeira_sincronizacao_id,ultima_sincronizacao_id)
        VALUES (it->>'referencia',v_tipo,v_hash,it->'resumo','novo',s.id,s.id);
      END IF;
    ELSE
      IF (existente.conteudo_hash <> v_hash) THEN
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
GRANT EXECUTE ON FUNCTION financeiro_hml.integracao_concluir(jsonb) TO service_role;
