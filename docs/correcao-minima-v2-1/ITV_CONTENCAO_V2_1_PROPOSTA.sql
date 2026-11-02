-- CONTENCAO V2.1 NAO APLICADA. Preserva consultas e todos os dados; nao restaura motor vulneravel.
BEGIN ISOLATION LEVEL READ COMMITTED;
SET LOCAL lock_timeout='5s';
LOCK TABLE financeiro_hml.perfis,financeiro_hml.plano_contas,financeiro_hml.centros_custo,financeiro_hml.contas_financeiras,financeiro_hml.contas_preparadas,financeiro_hml.tesouraria_conferencias,financeiro_hml.tesouraria_operacoes,financeiro_hml.tesouraria_movimentos,financeiro_hml.auditoria,financeiro_hml.integracao_itens,financeiro_hml.integracao_sincronizacoes,financeiro_hml.diagnostico_autorizacoes,financeiro_hml.diagnostico_tentativas IN ACCESS EXCLUSIVE MODE NOWAIT;
DO $$ BEGIN IF current_setting('itv.v21.reversao',true) IS DISTINCT FROM 'CONTENCAO_DRENAGEM_APROVADAS' THEN RAISE EXCEPTION 'V21_REVERSAO_NAO_AUTORIZADA'; END IF; IF to_regprocedure('financeiro_hml.tes_executar(jsonb)') IS NULL OR to_regprocedure('financeiro_hml.tesouraria_lancar(jsonb)') IS NULL THEN RAISE EXCEPTION 'V21_FUNCAO_AUSENTE'; END IF; END $$;
DO $baseline$
DECLARE t record; dados jsonb; b jsonb:='{}';
BEGIN
 FOR t IN SELECT c.oid,c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='financeiro_hml' AND c.relkind='r' LOOP
  EXECUTE format('SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text),'[]'::jsonb) FROM financeiro_hml.%I x',t.relname) INTO dados;
  b:=b||jsonb_build_object(t.relname,dados);
 END LOOP;
 PERFORM set_config('itv.v21.baseline',b::text,true);
END $baseline$;
CREATE OR REPLACE FUNCTION financeiro_hml.tesouraria_transferir(p jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,financeiro_hml,pg_temp AS $$ BEGIN RAISE EXCEPTION 'TES_OPERACAO_BLOQUEADA' USING ERRCODE='42501'; END $$;
CREATE OR REPLACE FUNCTION financeiro_hml.tesouraria_estornar(p jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,financeiro_hml,pg_temp AS $$ BEGIN RAISE EXCEPTION 'TES_OPERACAO_BLOQUEADA' USING ERRCODE='42501'; END $$;
CREATE OR REPLACE FUNCTION financeiro_hml.tesouraria_criar_conta(p jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,financeiro_hml,pg_temp AS $$ BEGIN RAISE EXCEPTION 'TES_OPERACAO_BLOQUEADA' USING ERRCODE='42501'; END $$;
CREATE OR REPLACE FUNCTION financeiro_hml.tesouraria_habilitar_conta(p jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,financeiro_hml,pg_temp AS $$ BEGIN RAISE EXCEPTION 'TES_OPERACAO_BLOQUEADA' USING ERRCODE='42501'; END $$;
CREATE OR REPLACE FUNCTION financeiro_hml.tesouraria_lancar_conferencia(p jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,financeiro_hml,pg_temp AS $$ BEGIN RAISE EXCEPTION 'TES_OPERACAO_BLOQUEADA' USING ERRCODE='42501'; END $$;
CREATE OR REPLACE FUNCTION financeiro_hml.tes_executar(p jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,financeiro_hml,pg_temp AS $$ BEGIN RAISE EXCEPTION 'TES_OPERACAO_BLOQUEADA' USING ERRCODE='42501'; END $$;
CREATE OR REPLACE FUNCTION financeiro_hml.tesouraria_lancar(p jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,financeiro_hml,pg_temp AS $$ BEGIN RAISE EXCEPTION 'TES_OPERACAO_BLOQUEADA' USING ERRCODE='42501'; END $$;
-- Somente permissões enumeradas, nunca GRANT ALL. Mantém RLS/gatilhos/owners.
DO $acl$
DECLARE t text; cols text; f record;
BEGIN
 FOREACH t IN ARRAY ARRAY['contas_financeiras','contas_preparadas','tesouraria_conferencias','tesouraria_operacoes','tesouraria_movimentos','auditoria'] LOOP
  EXECUTE format('REVOKE INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER ON financeiro_hml.%I FROM PUBLIC,anon,authenticated,service_role',t);
  SELECT string_agg(quote_ident(attname),',') INTO cols FROM pg_attribute WHERE attrelid=format('financeiro_hml.%I',t)::regclass AND attnum>0 AND NOT attisdropped;
  EXECUTE format('REVOKE INSERT (%s),UPDATE (%s),REFERENCES (%s) ON financeiro_hml.%I FROM PUBLIC,anon,authenticated,service_role',cols,cols,cols,t);
 END LOOP;
 -- Fecha cada sobrecarga; catálogo divergente é recusado antes desta etapa.
 FOR f IN SELECT p.oid::regprocedure assinatura FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='financeiro_hml' LOOP
  EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC,anon,authenticated,service_role',f.assinatura);
 END LOOP;
END $acl$;
GRANT USAGE ON SCHEMA financeiro_hml TO authenticated,service_role;
REVOKE CREATE ON SCHEMA financeiro_hml FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON financeiro_hml.perfis,financeiro_hml.plano_contas,financeiro_hml.centros_custo,financeiro_hml.contas_financeiras,financeiro_hml.contas_preparadas,financeiro_hml.tesouraria_conferencias,financeiro_hml.tesouraria_operacoes,financeiro_hml.tesouraria_movimentos,financeiro_hml.auditoria,financeiro_hml.integracao_itens,financeiro_hml.integracao_sincronizacoes,financeiro_hml.diagnostico_autorizacoes,financeiro_hml.diagnostico_tentativas TO authenticated;
GRANT EXECUTE ON FUNCTION financeiro_hml.tem_papel(text[]),financeiro_hml.papel_atual(),financeiro_hml.tesouraria_saldos(),financeiro_hml.tesouraria_extrato(jsonb),financeiro_hml.tesouraria_historico_operacoes(jsonb),financeiro_hml.integracao_estado_manual(),financeiro_hml.integracao_iniciar(),financeiro_hml.integracao_concluir(jsonb),financeiro_hml.diagnostico_reservar(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION financeiro_hml.diagnostico_finalizar(uuid,uuid,integer,integer,text,text) TO service_role;
DO $baseline$
DECLARE t record; dados jsonb; b jsonb:=current_setting('itv.v21.baseline')::jsonb;
BEGIN
 FOR t IN SELECT c.oid,c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='financeiro_hml' AND c.relkind='r' LOOP
  EXECUTE format('SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text),'[]'::jsonb) FROM financeiro_hml.%I x',t.relname) INTO dados;
  IF dados IS DISTINCT FROM b->t.relname THEN RAISE EXCEPTION 'V21_PRESERVACAO_FALHOU: %',t.relname; END IF;
 END LOOP;
 
END $baseline$;
COMMIT;
