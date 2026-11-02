-- CONTENCAO V2.1 NAO APLICADA. Preserva consultas e todos os dados; nao restaura motor vulneravel.
BEGIN ISOLATION LEVEL READ COMMITTED;
SET LOCAL lock_timeout='5s';
LOCK TABLE financeiro_hml.perfis,financeiro_hml.plano_contas,financeiro_hml.centros_custo,financeiro_hml.contas_financeiras,financeiro_hml.contas_preparadas,financeiro_hml.tesouraria_conferencias,financeiro_hml.tesouraria_operacoes,financeiro_hml.tesouraria_movimentos,financeiro_hml.auditoria,financeiro_hml.integracao_itens,financeiro_hml.integracao_sincronizacoes,financeiro_hml.diagnostico_autorizacoes,financeiro_hml.diagnostico_tentativas IN ACCESS EXCLUSIVE MODE NOWAIT;
DO $$ BEGIN IF current_setting('itv.v21.reversao',true) IS DISTINCT FROM 'CONTENCAO_DRENAGEM_APROVADAS' THEN RAISE EXCEPTION 'V21_REVERSAO_NAO_AUTORIZADA'; END IF; IF to_regprocedure('financeiro_hml.tes_executar(jsonb)') IS NULL OR to_regprocedure('financeiro_hml.tesouraria_lancar(jsonb)') IS NULL THEN RAISE EXCEPTION 'V21_FUNCAO_AUSENTE'; END IF; END $$;
DO $estrutura$
BEGIN
 IF md5((SELECT jsonb_build_object('tabelas',(SELECT jsonb_agg(jsonb_build_object('nome',c.relname,'owner',pg_get_userbyid(c.relowner),'rls',c.relrowsecurity,'force',c.relforcerowsecurity) ORDER BY c.relname) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='financeiro_hml' AND c.relkind='r'), 'gatilhos',(SELECT jsonb_agg(jsonb_build_object('tabela',c.relname,'nome',t.tgname,'enabled',t.tgenabled,'def',pg_get_triggerdef(t.oid)) ORDER BY c.relname,t.tgname) FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='financeiro_hml' AND NOT t.tgisinternal), 'politicas',(SELECT jsonb_agg(to_jsonb(p) ORDER BY tablename,policyname) FROM pg_policies p WHERE schemaname='financeiro_hml'), 'constraints',(SELECT jsonb_agg(jsonb_build_object('tabela',r.relname,'nome',c.conname,'def',pg_get_constraintdef(c.oid)) ORDER BY r.relname,c.conname) FROM pg_constraint c JOIN pg_class r ON r.oid=c.conrelid JOIN pg_namespace n ON n.oid=r.relnamespace WHERE n.nspname='financeiro_hml')))::text) <> 'd985be75654eb3c1998218115c5d6f06' THEN RAISE EXCEPTION 'V21_ESTRUTURA_DIVERGENTE'; END IF;
 IF EXISTS(SELECT 1 FROM pg_roles r WHERE r.rolname IN ('anon','authenticated') AND (r.rolsuper OR r.rolbypassrls)) OR EXISTS(SELECT 1 FROM pg_auth_members m JOIN pg_roles r ON r.oid=m.member WHERE r.rolname IN ('anon','authenticated','service_role')) THEN RAISE EXCEPTION 'V21_HERANCA_PRIVILEGIADA'; END IF;
END $estrutura$;
DO $baseline$
DECLARE t record; dados jsonb; b jsonb:='{}';
BEGIN
 FOR t IN SELECT c.oid,c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='financeiro_hml' AND c.relkind='r' LOOP
  EXECUTE format('SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text),''[]''::jsonb) FROM financeiro_hml.%I x',t.relname) INTO dados;
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
 FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='financeiro_hml' LOOP
  EXECUTE format('REVOKE SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER ON financeiro_hml.%I FROM PUBLIC,anon,authenticated,service_role',t);
  SELECT string_agg(quote_ident(attname),',') INTO cols FROM pg_attribute WHERE attrelid=format('financeiro_hml.%I',t)::regclass AND attnum>0 AND NOT attisdropped;
  EXECUTE format('REVOKE SELECT (%s),INSERT (%s),UPDATE (%s),REFERENCES (%s) ON financeiro_hml.%I FROM PUBLIC,anon,authenticated,service_role',cols,cols,cols,cols,t);
 END LOOP;
 -- Fecha cada sobrecarga; catálogo divergente é recusado antes desta etapa.
 FOR f IN SELECT p.oid::regprocedure assinatura FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='financeiro_hml' LOOP
  EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC,anon,authenticated,service_role',f.assinatura);
 END LOOP;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA financeiro_hml FROM PUBLIC,anon,authenticated,service_role;
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
  EXECUTE format('SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text),''[]''::jsonb) FROM financeiro_hml.%I x',t.relname) INTO dados;
  IF dados IS DISTINCT FROM b->t.relname THEN RAISE EXCEPTION 'V21_PRESERVACAO_FALHOU: %',t.relname; END IF;
 END LOOP;
 
END $baseline$;
DO $pos$
DECLARE t record; r text; f record; allowed text[];
BEGIN
 FOREACH r IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
  FOR t IN SELECT c.oid,c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='financeiro_hml' AND c.relkind='r' LOOP
   IF has_table_privilege(r,t.oid,'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') OR has_any_column_privilege(r,t.oid,'INSERT,UPDATE,REFERENCES') THEN RAISE EXCEPTION 'V21_DML_RESIDUAL: % %',r,t.relname; END IF;
  END LOOP;
  allowed:=CASE r WHEN 'authenticated' THEN ARRAY['tem_papel','papel_atual','tesouraria_saldos','tesouraria_extrato','tesouraria_historico_operacoes','integracao_estado_manual','integracao_iniciar','integracao_concluir','diagnostico_reservar'] WHEN 'service_role' THEN ARRAY['diagnostico_finalizar'] ELSE ARRAY[]::text[] END;
  FOR f IN SELECT p.oid,p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='financeiro_hml' LOOP
   IF has_function_privilege(r,f.oid,'EXECUTE') IS DISTINCT FROM (f.proname=ANY(allowed)) THEN RAISE EXCEPTION 'V21_EXECUTE_DIVERGENTE: % %',r,f.proname; END IF;
  END LOOP;
 END LOOP;
END $pos$;
DO $estrutura$
BEGIN
 IF md5((SELECT jsonb_build_object('tabelas',(SELECT jsonb_agg(jsonb_build_object('nome',c.relname,'owner',pg_get_userbyid(c.relowner),'rls',c.relrowsecurity,'force',c.relforcerowsecurity) ORDER BY c.relname) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='financeiro_hml' AND c.relkind='r'), 'gatilhos',(SELECT jsonb_agg(jsonb_build_object('tabela',c.relname,'nome',t.tgname,'enabled',t.tgenabled,'def',pg_get_triggerdef(t.oid)) ORDER BY c.relname,t.tgname) FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='financeiro_hml' AND NOT t.tgisinternal), 'politicas',(SELECT jsonb_agg(to_jsonb(p) ORDER BY tablename,policyname) FROM pg_policies p WHERE schemaname='financeiro_hml'), 'constraints',(SELECT jsonb_agg(jsonb_build_object('tabela',r.relname,'nome',c.conname,'def',pg_get_constraintdef(c.oid)) ORDER BY r.relname,c.conname) FROM pg_constraint c JOIN pg_class r ON r.oid=c.conrelid JOIN pg_namespace n ON n.oid=r.relnamespace WHERE n.nspname='financeiro_hml')))::text) <> 'd985be75654eb3c1998218115c5d6f06' THEN RAISE EXCEPTION 'V21_ESTRUTURA_DIVERGENTE'; END IF;
 IF EXISTS(SELECT 1 FROM pg_roles r WHERE r.rolname IN ('anon','authenticated') AND (r.rolsuper OR r.rolbypassrls)) OR EXISTS(SELECT 1 FROM pg_auth_members m JOIN pg_roles r ON r.oid=m.member WHERE r.rolname IN ('anon','authenticated','service_role')) THEN RAISE EXCEPTION 'V21_HERANCA_PRIVILEGIADA'; END IF;
END $estrutura$;
COMMIT;
