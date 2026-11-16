-- ITV FINANCEIRO — Contas a Pagar V1 (PROPOSTA; NÃO APLICADA NO HOSPEDADO).
-- Requer Livro Único V2.2.1 instalado. Não altera tabelas/funções existentes.
-- Obrigação = compromisso (não lança). A despesa entra no Livro Único somente na baixa.
BEGIN;
SET LOCAL lock_timeout='5s';

CREATE TABLE financeiro_hml.contas_pagar(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fornecedor varchar(200) NOT NULL CHECK (length(btrim(fornecedor)) BETWEEN 2 AND 200),
  descricao varchar(500) NOT NULL CHECK (length(btrim(descricao)) BETWEEN 2 AND 500),
  plano_conta_id uuid NOT NULL REFERENCES financeiro_hml.plano_contas(id),
  valor_centavos bigint NOT NULL CHECK (valor_centavos>0),
  vencimento date NOT NULL,
  referencia varchar(200) NOT NULL CHECK (referencia ~ '^externo:[a-z0-9][a-z0-9._:/-]+$'),
  cancelada boolean NOT NULL DEFAULT false,
  chave_idempotencia uuid NOT NULL,
  criado_por uuid NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE(criado_por,chave_idempotencia)
);
CREATE TABLE financeiro_hml.contas_pagar_baixas(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conta_pagar_id uuid NOT NULL REFERENCES financeiro_hml.contas_pagar(id),
  data_pagamento date NOT NULL,
  valor_centavos bigint NOT NULL CHECK (valor_centavos>0),
  operacao_id uuid NOT NULL UNIQUE REFERENCES financeiro_hml.tesouraria_operacoes(id),
  modo varchar(10) NOT NULL CHECK (modo IN ('gerada','vinculada')),
  chave_idempotencia uuid NOT NULL,
  criado_por uuid NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE(criado_por,chave_idempotencia)
);
CREATE INDEX contas_pagar_baixas_conta_idx ON financeiro_hml.contas_pagar_baixas(conta_pagar_id);

-- Leitura para os quatro perfis ativos; nenhuma escrita direta (somente RPC).
GRANT SELECT ON financeiro_hml.contas_pagar, financeiro_hml.contas_pagar_baixas TO authenticated;
GRANT ALL ON financeiro_hml.contas_pagar, financeiro_hml.contas_pagar_baixas TO service_role;
ALTER TABLE financeiro_hml.contas_pagar ENABLE ROW LEVEL SECURITY;
ALTER TABLE financeiro_hml.contas_pagar FORCE ROW LEVEL SECURITY;
ALTER TABLE financeiro_hml.contas_pagar_baixas ENABLE ROW LEVEL SECURITY;
ALTER TABLE financeiro_hml.contas_pagar_baixas FORCE ROW LEVEL SECURITY;
CREATE POLICY cp_leitura ON financeiro_hml.contas_pagar FOR SELECT TO authenticated
  USING (financeiro_hml.tem_papel(ARRAY['admin_geral','admin_financeiro','analista_financeiro','consulta_gerencial']));
CREATE POLICY cpb_leitura ON financeiro_hml.contas_pagar_baixas FOR SELECT TO authenticated
  USING (financeiro_hml.tem_papel(ARRAY['admin_geral','admin_financeiro','analista_financeiro','consulta_gerencial']));

-- Resumo com situação pela data de Manaus (respeita RLS do chamador).
CREATE VIEW financeiro_hml.contas_pagar_resumo WITH (security_invoker=true) AS
SELECT c.id,c.fornecedor,c.descricao,c.plano_conta_id,c.vencimento,c.referencia,c.cancelada,c.criado_por,c.criado_em,
  c.valor_centavos, coalesce(b.pago,0)::bigint AS pago_centavos, (c.valor_centavos-coalesce(b.pago,0))::bigint AS saldo_centavos,
  CASE WHEN c.cancelada THEN 'cancelada'
       WHEN c.valor_centavos-coalesce(b.pago,0)=0 THEN 'paga'
       WHEN c.vencimento < (now() AT TIME ZONE 'America/Manaus')::date THEN 'vencida'
       WHEN coalesce(b.pago,0)>0 THEN 'parcial' ELSE 'aberta' END AS situacao
FROM financeiro_hml.contas_pagar c
LEFT JOIN (SELECT conta_pagar_id,sum(valor_centavos) pago FROM financeiro_hml.contas_pagar_baixas GROUP BY 1) b ON b.conta_pagar_id=c.id;
GRANT SELECT ON financeiro_hml.contas_pagar_resumo TO authenticated;

CREATE FUNCTION financeiro_hml.cp_centavos(v text) RETURNS bigint LANGUAGE plpgsql IMMUTABLE SET search_path=pg_catalog AS $$
BEGIN
  IF coalesce(v,'')!~'^\d{1,16}(\.\d{1,2})?$' THEN RAISE EXCEPTION 'CP_VALOR'; END IF;
  RETURN (v::numeric(18,2)*100)::bigint;
END $$;

CREATE FUNCTION financeiro_hml.cp_cadastrar(p jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,financeiro_hml,pg_temp AS $$
DECLARE uid uuid:=auth.uid(); chave uuid; v bigint; cat record; ref text; ant financeiro_hml.contas_pagar; nid uuid;
BEGIN
  IF uid IS NULL OR NOT financeiro_hml.tem_papel(ARRAY['admin_geral','admin_financeiro','analista_financeiro']) THEN RAISE EXCEPTION 'CP_PERMISSAO' USING ERRCODE='42501'; END IF;
  IF p IS NULL OR jsonb_typeof(p)<>'object' OR EXISTS(SELECT 1 FROM jsonb_object_keys(p) k WHERE k NOT IN ('chave','fornecedor','descricao','plano','valor','vencimento','referencia')) THEN RAISE EXCEPTION 'CP_DADOS'; END IF;
  chave:=nullif(p->>'chave','')::uuid; IF chave IS NULL THEN RAISE EXCEPTION 'CP_DADOS'; END IF;
  v:=financeiro_hml.cp_centavos(p->>'valor'); IF v<=0 THEN RAISE EXCEPTION 'CP_VALOR'; END IF;
  IF coalesce(p->>'vencimento','')!~'^\d{4}-\d{2}-\d{2}$' THEN RAISE EXCEPTION 'CP_DATA'; END IF;
  ref:=lower(btrim(coalesce(p->>'referencia','')));
  IF length(ref)>200 OR ref!~'^externo:[a-z0-9][a-z0-9._:/-]+$' THEN RAISE EXCEPTION 'CP_REFERENCIA'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('cp'||uid::text||chave::text,0));
  SELECT * INTO ant FROM financeiro_hml.contas_pagar WHERE criado_por=uid AND chave_idempotencia=chave;
  IF FOUND THEN
    IF ant.valor_centavos<>v OR ant.referencia<>ref OR ant.fornecedor<>btrim(p->>'fornecedor') OR ant.vencimento<>(p->>'vencimento')::date THEN RAISE EXCEPTION 'CP_IDEMPOTENCIA'; END IF;
    RETURN jsonb_build_object('id',ant.id,'repetida',true);
  END IF;
  SELECT * INTO cat FROM financeiro_hml.plano_contas WHERE id=nullif(p->>'plano','')::uuid;
  IF NOT FOUND OR NOT cat.ativo OR NOT cat.aceita_lancamentos OR cat.natureza<>'despesa' THEN RAISE EXCEPTION 'CP_CATEGORIA'; END IF;
  INSERT INTO financeiro_hml.contas_pagar(fornecedor,descricao,plano_conta_id,valor_centavos,vencimento,referencia,chave_idempotencia,criado_por)
  VALUES(btrim(p->>'fornecedor'),btrim(p->>'descricao'),cat.id,v,(p->>'vencimento')::date,ref,chave,uid) RETURNING id INTO nid;
  INSERT INTO financeiro_hml.auditoria(tabela,registro_id,acao,usuario_id,antes,depois)
  VALUES('contas_pagar',nid,'criar',uid,NULL,jsonb_build_object('valor_centavos',v,'referencia',ref,'vencimento',p->>'vencimento'));
  RETURN jsonb_build_object('id',nid,'repetida',false);
END $$;

CREATE FUNCTION financeiro_hml.cp_baixar(p jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,financeiro_hml,pg_temp AS $$
DECLARE uid uuid:=auth.uid(); chave uuid; v bigint; dt date; modo text; c financeiro_hml.contas_pagar; ant financeiro_hml.contas_pagar_baixas; pago bigint; op record; opid uuid; r jsonb; bid uuid;
BEGIN
  IF uid IS NULL OR NOT financeiro_hml.tem_papel(ARRAY['admin_geral','admin_financeiro','analista_financeiro']) THEN RAISE EXCEPTION 'CP_PERMISSAO' USING ERRCODE='42501'; END IF;
  IF p IS NULL OR jsonb_typeof(p)<>'object' OR EXISTS(SELECT 1 FROM jsonb_object_keys(p) k WHERE k NOT IN ('chave','conta','data','valor','modo','operacao')) THEN RAISE EXCEPTION 'CP_DADOS'; END IF;
  chave:=nullif(p->>'chave','')::uuid; IF chave IS NULL THEN RAISE EXCEPTION 'CP_DADOS'; END IF;
  v:=financeiro_hml.cp_centavos(p->>'valor'); IF v<=0 THEN RAISE EXCEPTION 'CP_VALOR'; END IF;
  IF coalesce(p->>'data','')!~'^\d{4}-\d{2}-\d{2}$' THEN RAISE EXCEPTION 'CP_DATA'; END IF; dt:=(p->>'data')::date;
  modo:=p->>'modo'; IF modo IS NULL OR modo NOT IN ('gerar','vincular') THEN RAISE EXCEPTION 'CP_DADOS'; END IF;
  -- Trava da obrigação: serializa baixas simultâneas e reenvios.
  SELECT * INTO c FROM financeiro_hml.contas_pagar WHERE id=nullif(p->>'conta','')::uuid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'CP_INEXISTENTE'; END IF;
  SELECT * INTO ant FROM financeiro_hml.contas_pagar_baixas WHERE criado_por=uid AND chave_idempotencia=chave;
  IF FOUND THEN
    IF ant.conta_pagar_id<>c.id OR ant.valor_centavos<>v OR ant.data_pagamento<>dt OR ant.modo<>(CASE modo WHEN 'gerar' THEN 'gerada' ELSE 'vinculada' END)
       OR (modo='vincular' AND ant.operacao_id IS DISTINCT FROM nullif(p->>'operacao','')::uuid) THEN RAISE EXCEPTION 'CP_IDEMPOTENCIA'; END IF;
    RETURN jsonb_build_object('id',ant.id,'operacao_id',ant.operacao_id,'repetida',true);
  END IF;
  IF c.cancelada THEN RAISE EXCEPTION 'CP_CANCELADA'; END IF;
  SELECT coalesce(sum(valor_centavos),0) INTO pago FROM financeiro_hml.contas_pagar_baixas WHERE conta_pagar_id=c.id;
  IF v>c.valor_centavos-pago THEN RAISE EXCEPTION 'CP_SALDO'; END IF;
  IF modo='gerar' THEN
    IF p ? 'operacao' THEN RAISE EXCEPTION 'CP_DADOS'; END IF;
    -- Fluxo oficial do Livro Único (mesma transação; falha desfaz tudo). Permissões do par aprovado aplicadas pelo motor.
    r:=financeiro_hml.tesouraria_lancar(jsonb_build_object('tipo','saida','chave',chave::text,'data',dt::text,
        'descricao',left('Pagamento — '||c.fornecedor||' — '||c.descricao,500),'valor',(v::numeric/100)::numeric(18,2)::text,
        'plano',c.plano_conta_id::text,'referencia',c.referencia));
    opid:=(r->>'id')::uuid;
  ELSE
    opid:=nullif(p->>'operacao','')::uuid;
    SELECT o.* INTO op FROM financeiro_hml.tesouraria_operacoes o WHERE o.id=opid FOR SHARE;
    IF NOT FOUND OR op.tipo<>'saida' OR (op.valor*100)::bigint<>v OR op.plano_conta_id IS DISTINCT FROM c.plano_conta_id THEN RAISE EXCEPTION 'CP_VINCULO_INCOMPATIVEL'; END IF;
    IF EXISTS(SELECT 1 FROM financeiro_hml.tesouraria_operacoes e WHERE e.operacao_original_id=opid) THEN RAISE EXCEPTION 'CP_VINCULO_INCOMPATIVEL'; END IF;
  END IF;
  IF EXISTS(SELECT 1 FROM financeiro_hml.contas_pagar_baixas WHERE operacao_id=opid) THEN RAISE EXCEPTION 'CP_VINCULO_USADO'; END IF;
  INSERT INTO financeiro_hml.contas_pagar_baixas(conta_pagar_id,data_pagamento,valor_centavos,operacao_id,modo,chave_idempotencia,criado_por)
  VALUES(c.id,dt,v,opid,CASE modo WHEN 'gerar' THEN 'gerada' ELSE 'vinculada' END,chave,uid) RETURNING id INTO bid;
  INSERT INTO financeiro_hml.auditoria(tabela,registro_id,acao,usuario_id,antes,depois)
  VALUES('contas_pagar_baixas',bid,'criar',uid,jsonb_build_object('saldo_centavos',c.valor_centavos-pago),jsonb_build_object('conta_pagar_id',c.id,'valor_centavos',v,'operacao_id',opid,'saldo_centavos',c.valor_centavos-pago-v));
  RETURN jsonb_build_object('id',bid,'operacao_id',opid,'repetida',false);
EXCEPTION WHEN unique_violation THEN RAISE EXCEPTION 'CP_VINCULO_USADO';
END $$;

CREATE FUNCTION financeiro_hml.cp_cancelar(p jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,financeiro_hml,pg_temp AS $$
DECLARE c financeiro_hml.contas_pagar;
BEGIN
  IF auth.uid() IS NULL OR NOT financeiro_hml.tem_papel(ARRAY['admin_geral']) THEN RAISE EXCEPTION 'CP_PERMISSAO' USING ERRCODE='42501'; END IF;
  SELECT * INTO c FROM financeiro_hml.contas_pagar WHERE id=nullif(p->>'conta','')::uuid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'CP_INEXISTENTE'; END IF;
  IF EXISTS(SELECT 1 FROM financeiro_hml.contas_pagar_baixas WHERE conta_pagar_id=c.id) THEN RAISE EXCEPTION 'CP_COM_BAIXAS'; END IF;
  IF c.cancelada THEN RETURN jsonb_build_object('id',c.id,'repetida',true); END IF;
  UPDATE financeiro_hml.contas_pagar SET cancelada=true WHERE id=c.id;
  INSERT INTO financeiro_hml.auditoria(tabela,registro_id,acao,usuario_id,antes,depois) VALUES('contas_pagar',c.id,'inativar',auth.uid(),jsonb_build_object('cancelada',false),jsonb_build_object('cancelada',true));
  RETURN jsonb_build_object('id',c.id,'repetida',false);
END $$;

REVOKE ALL ON FUNCTION financeiro_hml.cp_centavos(text), financeiro_hml.cp_cadastrar(jsonb), financeiro_hml.cp_baixar(jsonb), financeiro_hml.cp_cancelar(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION financeiro_hml.cp_cadastrar(jsonb), financeiro_hml.cp_baixar(jsonb), financeiro_hml.cp_cancelar(jsonb) TO authenticated;
COMMIT;
