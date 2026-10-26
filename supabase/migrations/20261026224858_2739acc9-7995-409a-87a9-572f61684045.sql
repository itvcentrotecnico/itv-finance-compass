-- M3.3 — Contas pendentes de abertura + conferência de recebimentos + vínculo com a Tesouraria.
-- Somente financeiro_hml. Não altera tabelas, funções, triggers ou políticas existentes (aditiva).
CREATE TABLE financeiro_hml.contas_preparadas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome varchar(160) NOT NULL UNIQUE CHECK (length(btrim(nome)) BETWEEN 2 AND 160),
  tipo varchar NOT NULL CHECK (tipo IN ('banco','caixa')),
  banco varchar(120),
  finalidade varchar(500),
  situacao text NOT NULL DEFAULT 'pendente_abertura' CHECK (situacao IN ('pendente_abertura','habilitada')),
  conta_financeira_id uuid UNIQUE REFERENCES financeiro_hml.contas_financeiras(id),
  data_abertura date, saldo_validado numeric(18,2), responsavel_conferencia varchar(160),
  habilitada_por uuid, habilitada_em timestamptz,
  criado_em timestamptz NOT NULL DEFAULT now(),
  CHECK ((situacao = 'habilitada') = (conta_financeira_id IS NOT NULL AND data_abertura IS NOT NULL AND saldo_validado IS NOT NULL AND responsavel_conferencia IS NOT NULL))
);
GRANT SELECT ON financeiro_hml.contas_preparadas TO authenticated;
GRANT ALL ON financeiro_hml.contas_preparadas TO service_role;
ALTER TABLE financeiro_hml.contas_preparadas ENABLE ROW LEVEL SECURITY;
CREATE POLICY contas_preparadas_ler ON financeiro_hml.contas_preparadas FOR SELECT TO authenticated
  USING (financeiro_hml.tem_papel(ARRAY['admin_geral','admin_financeiro','analista_financeiro','consulta_gerencial']));

INSERT INTO financeiro_hml.contas_preparadas(nome,tipo,banco,finalidade) VALUES
 ('SICREDI — CONTA PRINCIPAL','banco','Sicredi','Pix, pagamentos bancários e transferências recebidas do Mercado Pago'),
 ('MERCADO PAGO — RECEBIMENTOS','banco','Mercado Pago','Cartão de crédito, débito e parcelado; recebimentos líquidos da operadora'),
 ('CAIXA FÍSICO ITV','caixa',NULL,'Recebimentos em dinheiro e movimentações de numerário');

CREATE TABLE financeiro_hml.tesouraria_conferencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identificador_origem uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  referencia_origem text NOT NULL UNIQUE CHECK (length(referencia_origem) BETWEEN 3 AND 300),
  original jsonb,
  grupo_id uuid NOT NULL DEFAULT gen_random_uuid(),
  valor_total_grupo numeric(18,2) CHECK (valor_total_grupo > 0),
  natureza text NOT NULL CHECK (natureza IN ('entrada','saida')),
  forma text NOT NULL CHECK (forma IN ('dinheiro','pix','credito','debito','parcelado','boleto','misto','indefinida')),
  data_ocorrencia date NOT NULL,
  descricao varchar(500) NOT NULL CHECK (length(btrim(descricao)) >= 2),
  valor_bruto numeric(18,2) NOT NULL CHECK (valor_bruto > 0),
  valor_liquido numeric(18,2) CHECK (valor_liquido > 0 AND valor_liquido <= valor_bruto),
  taxa numeric(18,2) GENERATED ALWAYS AS (valor_bruto - valor_liquido) STORED,
  data_liquidacao date,
  boleto_vencimento date, boleto_pagamento date,
  boleto_status text CHECK (boleto_status IN ('pendente','pago','vencido')),
  conta_sugerida varchar(160), categoria_sugerida varchar(200),
  conta_financeira_id uuid REFERENCES financeiro_hml.contas_financeiras(id),
  plano_conta_id uuid REFERENCES financeiro_hml.plano_contas(id),
  centro_custo_id uuid REFERENCES financeiro_hml.centros_custo(id),
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','em_conferencia','conciliado','divergente')),
  observacao varchar(500),
  operacao_id uuid UNIQUE REFERENCES financeiro_hml.tesouraria_operacoes(id),
  lancado_por uuid, lancado_em timestamptz,
  criado_em timestamptz NOT NULL DEFAULT now(), criado_por uuid,
  atualizado_em timestamptz, atualizado_por uuid,
  CHECK (forma <> 'boleto' OR boleto_status IS NOT NULL),
  CHECK (status <> 'conciliado' OR conta_financeira_id IS NOT NULL),
  CHECK (forma NOT IN ('credito','debito','parcelado') OR status <> 'conciliado' OR (valor_liquido IS NOT NULL AND data_liquidacao IS NOT NULL)),
  CHECK (forma <> 'boleto' OR status <> 'conciliado' OR (boleto_status = 'pago' AND boleto_pagamento IS NOT NULL))
);
CREATE INDEX tes_conf_grupo ON financeiro_hml.tesouraria_conferencias (grupo_id);
CREATE INDEX tes_conf_status ON financeiro_hml.tesouraria_conferencias (status, data_ocorrencia);

CREATE FUNCTION financeiro_hml.tes_conf_proteger() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, financeiro_hml, pg_temp AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.criado_por := auth.uid(); NEW.criado_em := clock_timestamp();
    IF auth.uid() IS NOT NULL THEN NEW.operacao_id := NULL; NEW.lancado_por := NULL; NEW.lancado_em := NULL; NEW.original := NULL; END IF;
  ELSE
    IF OLD.operacao_id IS NOT NULL THEN RAISE EXCEPTION 'TES_CONF_LANCADA: conferência já lançada é imutável'; END IF;
    NEW.id := OLD.id; NEW.identificador_origem := OLD.identificador_origem; NEW.referencia_origem := OLD.referencia_origem;
    NEW.original := OLD.original; NEW.natureza := OLD.natureza; NEW.criado_por := OLD.criado_por; NEW.criado_em := OLD.criado_em;
    NEW.atualizado_por := auth.uid(); NEW.atualizado_em := clock_timestamp();
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER tes_conf_proteger BEFORE INSERT OR UPDATE ON financeiro_hml.tesouraria_conferencias
  FOR EACH ROW EXECUTE FUNCTION financeiro_hml.tes_conf_proteger();

CREATE FUNCTION financeiro_hml.tes_conf_auditar() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, financeiro_hml, pg_temp AS $$
BEGIN
  INSERT INTO financeiro_hml.auditoria(tabela, registro_id, acao, usuario_id, antes, depois)
  VALUES (TG_TABLE_NAME, NEW.id, CASE TG_OP WHEN 'INSERT' THEN 'criar' ELSE 'alterar' END, auth.uid(),
          CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) END, to_jsonb(NEW));
  RETURN NULL;
END $$;
CREATE TRIGGER tes_conf_auditar AFTER INSERT OR UPDATE ON financeiro_hml.tesouraria_conferencias
  FOR EACH ROW EXECUTE FUNCTION financeiro_hml.tes_conf_auditar();
CREATE TRIGGER tes_contas_preparadas_auditar AFTER INSERT OR UPDATE ON financeiro_hml.contas_preparadas
  FOR EACH ROW EXECUTE FUNCTION financeiro_hml.tes_conf_auditar();

GRANT SELECT ON financeiro_hml.tesouraria_conferencias TO authenticated;
GRANT INSERT (referencia_origem, grupo_id, valor_total_grupo, natureza, forma, data_ocorrencia, descricao, valor_bruto, valor_liquido, data_liquidacao, boleto_vencimento, boleto_pagamento, boleto_status, conta_financeira_id, plano_conta_id, centro_custo_id, status, observacao)
  ON financeiro_hml.tesouraria_conferencias TO authenticated;
GRANT UPDATE (grupo_id, valor_total_grupo, forma, data_ocorrencia, descricao, valor_bruto, valor_liquido, data_liquidacao, boleto_vencimento, boleto_pagamento, boleto_status, conta_financeira_id, plano_conta_id, centro_custo_id, status, observacao)
  ON financeiro_hml.tesouraria_conferencias TO authenticated;
GRANT ALL ON financeiro_hml.tesouraria_conferencias TO service_role;
ALTER TABLE financeiro_hml.tesouraria_conferencias ENABLE ROW LEVEL SECURITY;
CREATE POLICY conf_ler ON financeiro_hml.tesouraria_conferencias FOR SELECT TO authenticated
  USING (financeiro_hml.tem_papel(ARRAY['admin_geral','admin_financeiro','analista_financeiro','consulta_gerencial']));
CREATE POLICY conf_inserir ON financeiro_hml.tesouraria_conferencias FOR INSERT TO authenticated
  WITH CHECK (financeiro_hml.tem_papel(ARRAY['admin_geral','admin_financeiro','analista_financeiro']));
CREATE POLICY conf_editar ON financeiro_hml.tesouraria_conferencias FOR UPDATE TO authenticated
  USING (financeiro_hml.tem_papel(ARRAY['admin_geral','admin_financeiro','analista_financeiro']))
  WITH CHECK (financeiro_hml.tem_papel(ARRAY['admin_geral','admin_financeiro','analista_financeiro']));

-- Habilitar conta preparada: cria a conta e a abertura validada atomicamente pelo motor existente.
CREATE FUNCTION financeiro_hml.tesouraria_habilitar_conta(p jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, financeiro_hml, pg_temp AS $$
DECLARE c financeiro_hml.contas_preparadas; r jsonb; resp text := btrim(coalesce(p->>'responsavel',''));
BEGIN
  IF auth.uid() IS NULL OR NOT financeiro_hml.tem_papel(ARRAY['admin_geral','admin_financeiro']) THEN RAISE EXCEPTION 'TES_PERMISSAO' USING ERRCODE='42501'; END IF;
  SELECT * INTO c FROM financeiro_hml.contas_preparadas WHERE id = (p->>'id')::uuid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'TES_CONTA_INEXISTENTE'; END IF;
  IF c.situacao = 'habilitada' THEN RETURN jsonb_build_object('id', c.conta_financeira_id, 'repetida', true); END IF;
  IF length(resp) NOT BETWEEN 2 AND 160 THEN RAISE EXCEPTION 'TES_RESPONSAVEL'; END IF;
  IF coalesce(p->>'valor','') = '' OR coalesce(p->>'data','') = '' THEN RAISE EXCEPTION 'TES_DADOS: data e saldo validados são obrigatórios'; END IF;
  r := financeiro_hml.tes_executar(jsonb_build_object('tipo','abertura','chave',p->>'chave','data',p->>'data','valor',p->>'valor',
        'nome',c.nome,'conta_tipo',c.tipo,'banco',c.banco,'descricao','Abertura · '||c.nome));
  UPDATE financeiro_hml.contas_preparadas SET situacao='habilitada', conta_financeira_id=(r->>'conta_id')::uuid,
    data_abertura=(p->>'data')::date, saldo_validado=(p->>'valor')::numeric, responsavel_conferencia=resp,
    habilitada_por=auth.uid(), habilitada_em=clock_timestamp() WHERE id=c.id;
  RETURN jsonb_build_object('id', r->>'conta_id', 'repetida', false);
END $$;

-- Lançar conferência aprovada: uma única vez, atômico, idempotente, vinculado.
CREATE FUNCTION financeiro_hml.tesouraria_lancar_conferencia(p jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, financeiro_hml, pg_temp AS $$
DECLARE c financeiro_hml.tesouraria_conferencias; pai financeiro_hml.tesouraria_conferencias; soma numeric; v numeric; d date; r jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT financeiro_hml.tem_papel(ARRAY['admin_geral','admin_financeiro','analista_financeiro']) THEN RAISE EXCEPTION 'TES_PERMISSAO' USING ERRCODE='42501'; END IF;
  SELECT * INTO c FROM financeiro_hml.tesouraria_conferencias WHERE id = (p->>'id')::uuid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'TES_CONF_INEXISTENTE'; END IF;
  IF c.operacao_id IS NOT NULL THEN RETURN jsonb_build_object('id', c.operacao_id, 'repetida', true); END IF;
  IF c.status <> 'conciliado' THEN RAISE EXCEPTION 'TES_CONF_NAO_CONCILIADA'; END IF;
  IF c.forma IN ('misto','indefinida') THEN RAISE EXCEPTION 'TES_CONF_FORMA: informe a forma ou o rateio'; END IF;
  IF c.plano_conta_id IS NULL THEN RAISE EXCEPTION 'TES_CLASSIFICACAO'; END IF;
  SELECT * INTO pai FROM financeiro_hml.tesouraria_conferencias WHERE grupo_id = c.grupo_id AND forma = 'misto' AND id <> c.id FOR SHARE;
  IF FOUND THEN
    SELECT sum(valor_bruto) INTO soma FROM financeiro_hml.tesouraria_conferencias WHERE grupo_id = c.grupo_id AND forma <> 'misto';
    IF soma <> pai.valor_bruto THEN RAISE EXCEPTION 'TES_CONF_RATEIO: soma das formas difere do total'; END IF;
  END IF;
  IF c.forma IN ('credito','debito','parcelado') THEN v := c.valor_liquido; d := c.data_liquidacao;
  ELSIF c.forma = 'boleto' THEN v := c.valor_bruto; d := c.boleto_pagamento;
  ELSE v := c.valor_bruto; d := c.data_ocorrencia; END IF;
  r := financeiro_hml.tes_executar(jsonb_build_object('tipo',c.natureza,'chave',c.identificador_origem,'data',d::text,'descricao',c.descricao,'valor',v::text,
        CASE c.natureza WHEN 'entrada' THEN 'destino' ELSE 'origem' END, c.conta_financeira_id,'plano',c.plano_conta_id,'centro',c.centro_custo_id));
  UPDATE financeiro_hml.tesouraria_conferencias SET operacao_id=(r->>'id')::uuid, lancado_por=auth.uid(), lancado_em=clock_timestamp() WHERE id=c.id;
  RETURN jsonb_build_object('id', r->>'id', 'repetida', false);
END $$;

REVOKE ALL ON FUNCTION financeiro_hml.tesouraria_habilitar_conta(jsonb), financeiro_hml.tesouraria_lancar_conferencia(jsonb), financeiro_hml.tes_conf_proteger(), financeiro_hml.tes_conf_auditar() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION financeiro_hml.tesouraria_habilitar_conta(jsonb), financeiro_hml.tesouraria_lancar_conferencia(jsonb) TO authenticated;
