-- COMPLEMENTO DEFINITIVO ETAPA 2. PREPARADO, NÃO APLICADO NO HML.
-- Executar APÓS CONTROLES_OPERACIONAIS_PROPOSTOS.sql, sob manutenção.
BEGIN;
SET LOCAL lock_timeout='5s';
LOCK TABLE financeiro_hml.tesouraria_conferencias, financeiro_hml.contas_financeiras,
 financeiro_hml.tesouraria_operacoes, financeiro_hml.tesouraria_movimentos IN ACCESS EXCLUSIVE MODE NOWAIT;

CREATE TABLE financeiro_hml.tesouraria_solicitacoes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), chave uuid NOT NULL,
 criado_por uuid NOT NULL, criado_em timestamptz NOT NULL DEFAULT clock_timestamp(),
 pedido jsonb NOT NULL, referencia text UNIQUE,
 estado text NOT NULL DEFAULT 'pendente' CHECK (estado IN ('pendente','executada','devolvida')),
 versao bigint NOT NULL DEFAULT 0, aprovado_por uuid, aprovado_em timestamptz,
 operacao_id uuid UNIQUE REFERENCES financeiro_hml.tesouraria_operacoes(id),
 justificativa text, atualizado_por uuid, atualizado_em timestamptz NOT NULL DEFAULT clock_timestamp(),
 acao text NOT NULL DEFAULT 'solicitar', UNIQUE(criado_por,chave)
);
GRANT SELECT ON financeiro_hml.tesouraria_solicitacoes TO authenticated;
GRANT ALL ON financeiro_hml.tesouraria_solicitacoes TO service_role;
ALTER TABLE financeiro_hml.tesouraria_solicitacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY tes_solicitacoes_ler ON financeiro_hml.tesouraria_solicitacoes FOR SELECT TO authenticated
 USING (financeiro_hml.tem_papel(ARRAY['admin_geral','admin_financeiro','analista_financeiro','consulta_gerencial']));
CREATE TRIGGER tes_solicitacoes_auditar AFTER INSERT OR UPDATE ON financeiro_hml.tesouraria_solicitacoes
 FOR EACH ROW EXECUTE FUNCTION financeiro_hml.tes_conf_auditar();

CREATE FUNCTION financeiro_hml.tes_validar_solicitacao(p jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,financeiro_hml,pg_temp AS $$
DECLARE original financeiro_hml.tesouraria_operacoes; dt date; conta record; k text; ref text;
BEGIN
 IF p IS NULL OR jsonb_typeof(p) IS DISTINCT FROM 'object' OR coalesce(p->>'tipo','') NOT IN ('entrada','saida','transferencia','estorno') THEN RAISE EXCEPTION 'SOL_DADOS'; END IF;
 FOR k IN SELECT jsonb_object_keys(p) LOOP
  IF k<>ALL(ARRAY['tipo','data','descricao','valor','origem','destino','plano','centro','original','justificativa','referencia']) THEN RAISE EXCEPTION 'SOL_DADOS'; END IF;
 END LOOP;
 IF coalesce(p->>'data','') !~ '^\d{4}-\d{2}-\d{2}$' OR length(btrim(coalesce(p->>'descricao',''))) NOT BETWEEN 2 AND 500 THEN RAISE EXCEPTION 'SOL_DADOS'; END IF;
 dt:=(p->>'data')::date;
 IF dt>(clock_timestamp() AT TIME ZONE 'America/Manaus')::date THEN RAISE EXCEPTION 'SOL_DATA_FUTURA'; END IF;
 IF p->>'tipo'='estorno' THEN
  IF length(btrim(coalesce(p->>'justificativa',''))) NOT BETWEEN 5 AND 500 THEN RAISE EXCEPTION 'TES_JUSTIFICATIVA'; END IF;
  IF p ?| ARRAY['valor','origem','destino','plano','centro','referencia'] THEN RAISE EXCEPTION 'SOL_DADOS'; END IF;
  SELECT * INTO original FROM financeiro_hml.tesouraria_operacoes WHERE id=(p->>'original')::uuid;
  IF NOT FOUND OR original.tipo IN ('estorno','abertura') THEN RAISE EXCEPTION 'SOL_ESTORNO_INVALIDO'; END IF;
  IF dt<original.data_movimento THEN RAISE EXCEPTION 'TES_DATA'; END IF;
  IF EXISTS(SELECT 1 FROM financeiro_hml.tesouraria_operacoes WHERE operacao_original_id=original.id) THEN RAISE EXCEPTION 'TES_JA_ESTORNADA'; END IF;
  FOR conta IN SELECT c.* FROM financeiro_hml.contas_financeiras c WHERE c.id IN(original.conta_origem_id,original.conta_destino_id) ORDER BY c.id FOR SHARE LOOP
   IF NOT conta.ativo OR NOT EXISTS(SELECT 1 FROM financeiro_hml.contas_preparadas cp WHERE cp.conta_financeira_id=conta.id AND cp.situacao='habilitada') THEN RAISE EXCEPTION 'CONF_CONTA_OFICIAL'; END IF;
  END LOOP;
 ELSE
  PERFORM financeiro_hml.conf_dinheiro(p->>'valor');
  IF p ?| ARRAY['original','justificativa'] THEN RAISE EXCEPTION 'SOL_DADOS'; END IF;
  IF p->>'tipo'='transferencia' THEN
   IF nullif(p->>'origem','') IS NULL OR nullif(p->>'destino','') IS NULL OR p->>'origem'=p->>'destino' OR p ?| ARRAY['plano','centro','referencia'] THEN RAISE EXCEPTION 'TES_MESMA_CONTA'; END IF;
   FOR conta IN SELECT c.* FROM financeiro_hml.contas_financeiras c WHERE c.id IN((p->>'origem')::uuid,(p->>'destino')::uuid) ORDER BY c.id FOR SHARE LOOP
    IF NOT conta.ativo OR dt<conta.data_saldo_inicial OR NOT EXISTS(SELECT 1 FROM financeiro_hml.contas_preparadas cp WHERE cp.conta_financeira_id=conta.id AND cp.situacao='habilitada') THEN RAISE EXCEPTION 'CONF_CONTA_OFICIAL'; END IF;
   END LOOP;
   IF (SELECT count(*) FROM financeiro_hml.contas_financeiras WHERE id IN((p->>'origem')::uuid,(p->>'destino')::uuid))<>2 THEN RAISE EXCEPTION 'CONF_CONTA_OFICIAL'; END IF;
  ELSE
   IF (p->>'tipo'='entrada' AND p ? 'origem') OR (p->>'tipo'='saida' AND p ? 'destino') THEN RAISE EXCEPTION 'SOL_DADOS'; END IF;
   -- Referência documental externa obrigatória: recebimentos importados usam exclusivamente a conferência.
   ref:=lower(btrim(coalesce(p->>'referencia','')));
   IF length(ref) NOT BETWEEN 8 AND 200 OR ref !~ '^externo:[a-z0-9][a-z0-9._:/-]+$' THEN RAISE EXCEPTION 'SOL_REFERENCIA'; END IF;
   IF EXISTS(SELECT 1 FROM financeiro_hml.tesouraria_conferencias WHERE lower(referencia_origem)=ref)
    OR EXISTS(SELECT 1 FROM financeiro_hml.conferencia_vinculos WHERE lower(referencia_origem)=ref) THEN RAISE EXCEPTION 'CONF_DUPLICIDADE'; END IF;
   PERFORM financeiro_hml.conf_validar(jsonb_build_object('forma','pix','descricao',p->>'descricao','data_ocorrencia',p->>'data','valor_bruto',p->>'valor','conta_financeira_id',CASE p->>'tipo' WHEN 'entrada' THEN p->>'destino' ELSE p->>'origem' END,'plano_conta_id',p->>'plano','centro_custo_id',p->>'centro'),p->>'tipo');
  END IF;
 END IF;
END $$;

CREATE FUNCTION financeiro_hml.tesouraria_solicitar(p jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,financeiro_hml,pg_temp AS $$
DECLARE req jsonb; anterior financeiro_hml.tesouraria_solicitacoes; ident uuid; chave_pedido uuid; ref text;
BEGIN
 IF auth.uid() IS NULL OR NOT financeiro_hml.tem_papel(ARRAY['admin_geral','admin_financeiro','analista_financeiro']) THEN RAISE EXCEPTION 'TES_PERMISSAO' USING ERRCODE='42501'; END IF;
 chave_pedido:=(p->>'chave')::uuid;
 IF chave_pedido IS NULL THEN RAISE EXCEPTION 'SOL_DADOS'; END IF;
 req:=jsonb_strip_nulls(p-'chave');
 IF req ? 'referencia' THEN req:=jsonb_set(req,'{referencia}',to_jsonb(lower(btrim(req->>'referencia')))); END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('sol_chave:'||auth.uid()::text||chave_pedido::text,0));
 SELECT * INTO anterior FROM financeiro_hml.tesouraria_solicitacoes WHERE criado_por=auth.uid() AND tesouraria_solicitacoes.chave=chave_pedido;
 IF FOUND THEN
  IF anterior.pedido<>req THEN RAISE EXCEPTION 'TES_IDEMPOTENCIA'; END IF;
  RETURN jsonb_build_object('id',anterior.id,'repetida',true);
 END IF;
 PERFORM financeiro_hml.tes_validar_solicitacao(req);
 ref:=req->>'referencia';
 IF ref IS NOT NULL THEN
  PERFORM pg_advisory_xact_lock(hashtextextended('sol_ref:'||ref,0));
  IF EXISTS(SELECT 1 FROM financeiro_hml.tesouraria_solicitacoes WHERE referencia=ref) THEN RAISE EXCEPTION 'CONF_DUPLICIDADE'; END IF;
 END IF;
 INSERT INTO financeiro_hml.tesouraria_solicitacoes(chave,criado_por,pedido,referencia,atualizado_por)
 VALUES(chave_pedido,auth.uid(),req,ref,auth.uid()) RETURNING id INTO ident;
 RETURN jsonb_build_object('id',ident,'repetida',false);
END $$;

CREATE FUNCTION financeiro_hml.tesouraria_decidir(p jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,financeiro_hml,pg_temp AS $$
DECLARE s financeiro_hml.tesouraria_solicitacoes; r jsonb; corte date; motivo text:=btrim(coalesce(p->>'justificativa',''));
BEGIN
 IF auth.uid() IS NULL OR NOT financeiro_hml.tem_papel(ARRAY['admin_geral','admin_financeiro']) THEN RAISE EXCEPTION 'TES_PERMISSAO' USING ERRCODE='42501'; END IF;
 IF coalesce(p->>'acao','') NOT IN ('executar','devolver') OR coalesce(p->>'versao','') !~ '^\d+$' THEN RAISE EXCEPTION 'SOL_DADOS'; END IF;
 SELECT * INTO s FROM financeiro_hml.tesouraria_solicitacoes WHERE id=(p->>'id')::uuid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'SOL_INEXISTENTE'; END IF;
 IF s.criado_por=auth.uid() THEN RAISE EXCEPTION 'CONF_REVISOR_DISTINTO'; END IF;
 IF s.estado='executada' AND p->>'acao'='executar' THEN RETURN jsonb_build_object('id',s.operacao_id,'repetida',true); END IF;
 IF s.estado<>'pendente' OR s.versao<>(p->>'versao')::bigint THEN RAISE EXCEPTION 'CONF_CONFLITO'; END IF;
 IF p->>'acao'='devolver' THEN
  IF length(motivo) NOT BETWEEN 5 AND 500 THEN RAISE EXCEPTION 'TES_JUSTIFICATIVA'; END IF;
  UPDATE financeiro_hml.tesouraria_solicitacoes SET estado='devolvida',versao=versao+1,justificativa=motivo,atualizado_por=auth.uid(),atualizado_em=clock_timestamp(),acao='devolver' WHERE id=s.id;
  RETURN jsonb_build_object('id',s.id,'repetida',false);
 END IF;
 SELECT a.corte INTO corte FROM financeiro_hml.conferencia_operacao_autorizada a WHERE a.id FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'CONF_OPERACAO_BLOQUEADA'; END IF;
 IF (s.pedido->>'data')::date<corte THEN RAISE EXCEPTION 'CONF_HISTORICO'; END IF;
 PERFORM financeiro_hml.tes_validar_solicitacao(s.pedido);
 -- Motor privado conserva transação, efeitos exatos, locks de contas/estorno e idempotência.
 r:=financeiro_hml.tes_executar((s.pedido-'referencia')||jsonb_build_object('chave',s.id));
 UPDATE financeiro_hml.tesouraria_solicitacoes SET estado='executada',versao=versao+1,aprovado_por=auth.uid(),aprovado_em=clock_timestamp(),operacao_id=(r->>'id')::uuid,atualizado_por=auth.uid(),atualizado_em=clock_timestamp(),acao='aprovar_executar' WHERE id=s.id;
 RETURN r;
END $$;

-- Nenhum wrapper antigo executa diretamente: todos só registram pedido para revisão humana.
CREATE OR REPLACE FUNCTION financeiro_hml.tesouraria_lancar(p jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,financeiro_hml AS $$
BEGIN IF p->>'tipo' NOT IN ('entrada','saida') OR p->>'tipo' IS NULL THEN RAISE EXCEPTION 'SOL_DADOS'; END IF; RETURN financeiro_hml.tesouraria_solicitar(p); END $$;
CREATE OR REPLACE FUNCTION financeiro_hml.tesouraria_transferir(p jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,financeiro_hml AS $$
BEGIN IF p->>'tipo' IS DISTINCT FROM 'transferencia' THEN RAISE EXCEPTION 'SOL_DADOS'; END IF; RETURN financeiro_hml.tesouraria_solicitar(p); END $$;
CREATE OR REPLACE FUNCTION financeiro_hml.tesouraria_estornar(p jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,financeiro_hml AS $$
BEGIN IF p->>'tipo' IS DISTINCT FROM 'estorno' THEN RAISE EXCEPTION 'SOL_DADOS'; END IF; RETURN financeiro_hml.tesouraria_solicitar(p); END $$;

REVOKE ALL ON FUNCTION financeiro_hml.tes_validar_solicitacao(jsonb),financeiro_hml.tesouraria_solicitar(jsonb),financeiro_hml.tesouraria_decidir(jsonb) FROM PUBLIC,anon,authenticated,service_role;
REVOKE EXECUTE ON FUNCTION financeiro_hml.tes_executar(jsonb) FROM PUBLIC,anon,authenticated,service_role;
-- Instalação selada. Liberação autenticada será ato separado após compatibilidade/autorizações.
REVOKE EXECUTE ON FUNCTION financeiro_hml.conferencia_comandar(jsonb),financeiro_hml.tesouraria_lancar_conferencia(jsonb),financeiro_hml.tesouraria_lancar(jsonb),financeiro_hml.tesouraria_transferir(jsonb),financeiro_hml.tesouraria_estornar(jsonb),financeiro_hml.tesouraria_criar_conta(jsonb),financeiro_hml.tesouraria_habilitar_conta(jsonb) FROM PUBLIC,anon,authenticated,service_role;
SET CONSTRAINTS ALL IMMEDIATE;
COMMIT;