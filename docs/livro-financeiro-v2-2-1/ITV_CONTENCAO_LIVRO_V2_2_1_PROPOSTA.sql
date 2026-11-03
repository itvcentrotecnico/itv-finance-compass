-- CONTENCAO V2.2 LIVRO NAO APLICADA. Preserva consultas e todos os dados; nao restaura motor vulneravel.
BEGIN ISOLATION LEVEL READ COMMITTED;
SET LOCAL lock_timeout='5s';
LOCK TABLE financeiro_hml.perfis,financeiro_hml.plano_contas,financeiro_hml.centros_custo,financeiro_hml.contas_financeiras,financeiro_hml.contas_preparadas,financeiro_hml.tesouraria_conferencias,financeiro_hml.tesouraria_operacoes,financeiro_hml.tesouraria_movimentos,financeiro_hml.auditoria,financeiro_hml.integracao_itens,financeiro_hml.integracao_sincronizacoes,financeiro_hml.diagnostico_autorizacoes,financeiro_hml.diagnostico_tentativas IN ACCESS EXCLUSIVE MODE NOWAIT;
DO $$ BEGIN IF current_setting('itv.v22.reversao',true) IS DISTINCT FROM 'CONTENCAO_DRENAGEM_APROVADAS' THEN RAISE EXCEPTION 'V22_REVERSAO_NAO_AUTORIZADA'; END IF; IF to_regprocedure('financeiro_hml.tes_executar(jsonb)') IS NULL OR to_regprocedure('financeiro_hml.tesouraria_lancar(jsonb)') IS NULL THEN RAISE EXCEPTION 'V22_FUNCAO_AUSENTE'; END IF; END $$;
DO $catalogo$ DECLARE f record; expected jsonb:='{"financeiro_hml.autoria()": {"md5": "167f40fd1f0506f0de0a566c3be38da2", "owner": "postgres"}, "financeiro_hml.autoria_cadastro()": {"md5": "4e4f9210bb82bdfb92c104de9cfc71dd", "owner": "postgres"}, "financeiro_hml.diagnostico_finalizar(uuid,uuid,integer,integer,text,text)": {"md5": "4ebe2f56016907cfa4d5633ea8a3f544", "owner": "postgres"}, "financeiro_hml.diagnostico_reservar(uuid,text)": {"md5": "01b85221e475f18a663f10a39ee9e8c2", "owner": "postgres"}, "financeiro_hml.integracao_concluir(jsonb)": {"md5": "d2fcbb76dd8521b4e8742879a33f4216", "owner": "postgres"}, "financeiro_hml.integracao_estado_manual()": {"md5": "12b05c826dd7d702c135f533c5bfb538", "owner": "postgres"}, "financeiro_hml.integracao_expirar_travadas()": {"md5": "7f71d7e5947aa5797d3a1b7a5dee33af", "owner": "postgres"}, "financeiro_hml.integracao_iniciar()": {"md5": "2c08d74468969909eb539130a785c56c", "owner": "postgres"}, "financeiro_hml.integracao_iniciar_automatica(date,date)": {"md5": "0eb46bd9a67f2e0cb14da0fbc8c0b302", "owner": "postgres"}, "financeiro_hml.papel_atual()": {"md5": "ff6e26e80bea9e4e9a8ec60d183915d9", "owner": "postgres"}, "financeiro_hml.pc_hierarquia()": {"md5": "b997693a30edf98768ee9a66d7907ec6", "owner": "postgres"}, "financeiro_hml.perfis_protecao()": {"md5": "61d5750e5d25ba1740159026d9e5a72e", "owner": "postgres"}, "financeiro_hml.registrar_auditoria()": {"md5": "ef434542af5a5735d531640e4a7cbc8c", "owner": "postgres"}, "financeiro_hml.tem_papel(text[])": {"md5": "9652b9d1810b1d2273cdfed0d7a0ea07", "owner": "postgres"}, "financeiro_hml.tes_conf_auditar()": {"md5": "c6a017d70d412451ca0bfc408ec52eed", "owner": "postgres"}, "financeiro_hml.tes_conf_proteger()": {"md5": "05cbdfeaa8957c81393f00fcd16739bb", "owner": "postgres"}, "financeiro_hml.tes_conta_exige_abertura()": {"md5": "f30e26b8e87ebf0a63ac04cf27c9df4e", "owner": "postgres"}, "financeiro_hml.tes_executar(jsonb)": {"md5": "3b2b8a723339b56099a1e79f16f69877", "owner": "postgres"}, "financeiro_hml.tes_imutavel()": {"md5": "3781de7d81ac4d248871565c7700a2fb", "owner": "postgres"}, "financeiro_hml.tes_proteger_conta()": {"md5": "833cba25cdae146f782bb07560574e2b", "owner": "postgres"}, "financeiro_hml.tes_proteger_natureza()": {"md5": "019a3664b770494ff71647be079f2bb5", "owner": "postgres"}, "financeiro_hml.tes_validar_efeitos()": {"md5": "5fc456018ec1207ba0f85b2c4d869305", "owner": "postgres"}, "financeiro_hml.tesouraria_criar_conta(jsonb)": {"md5": "f4220ce6c13b76a7fcce067380135b8e", "owner": "postgres"}, "financeiro_hml.tesouraria_estornar(jsonb)": {"md5": "85ee248752d82d520dba677fe86e6d66", "owner": "postgres"}, "financeiro_hml.tesouraria_extrato(jsonb)": {"md5": "df18ba14c55612a5791499dd459dab5d", "owner": "postgres"}, "financeiro_hml.tesouraria_habilitar_conta(jsonb)": {"md5": "0ec7ade6174d51804623bf6229be05d5", "owner": "postgres"}, "financeiro_hml.tesouraria_historico_operacoes(jsonb)": {"md5": "abd2162e3e541a8c45fe20632d9670f6", "owner": "postgres"}, "financeiro_hml.tesouraria_lancar(jsonb)": {"md5": "ab7b410ec4e6600cff3d19808e61a2d8", "owner": "postgres"}, "financeiro_hml.tesouraria_lancar_conferencia(jsonb)": {"md5": "003ad9c910821e463327eb8b04969c22", "owner": "postgres"}, "financeiro_hml.tesouraria_saldos()": {"md5": "6b5905c5d0f7ffbdc6aa3ad49d353501", "owner": "postgres"}, "financeiro_hml.tesouraria_transferir(jsonb)": {"md5": "cb1415ba2f88cc327474e41bde02e57d", "owner": "postgres"}}'::jsonb; BEGIN IF (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='financeiro_hml')<>(SELECT count(*) FROM jsonb_object_keys(expected)) THEN RAISE EXCEPTION 'V22_SOBRECARGA_DIVERGENTE'; END IF; FOR f IN SELECT key,value FROM jsonb_each(expected) LOOP IF to_regprocedure(f.key) IS NULL OR (SELECT pg_get_userbyid(proowner) FROM pg_proc WHERE oid=to_regprocedure(f.key))<>f.value->>'owner' THEN RAISE EXCEPTION 'V22_CATALOGO_DIVERGENTE'; END IF; IF f.key NOT IN ('financeiro_hml.tesouraria_historico_operacoes(jsonb)','financeiro_hml.tes_executar(jsonb)','financeiro_hml.tesouraria_lancar(jsonb)','financeiro_hml.tesouraria_transferir(jsonb)','financeiro_hml.tesouraria_estornar(jsonb)','financeiro_hml.tesouraria_criar_conta(jsonb)','financeiro_hml.tesouraria_habilitar_conta(jsonb)','financeiro_hml.tesouraria_lancar_conferencia(jsonb)') AND md5(pg_get_functiondef(to_regprocedure(f.key)))<>f.value->>'md5' THEN RAISE EXCEPTION 'V22_FUNCAO_LEITURA_DIVERGENTE'; END IF; END LOOP; END $catalogo$;
DO $estrutura$
BEGIN
 IF md5(pg_get_functiondef('financeiro_hml.tesouraria_historico_operacoes(jsonb)'::regprocedure)) IS DISTINCT FROM 'abd2162e3e541a8c45fe20632d9670f6' THEN RAISE EXCEPTION 'V22_HISTORICO_DIVERGENTE'; END IF;
 IF md5((SELECT jsonb_build_object('tabelas',(SELECT jsonb_agg(jsonb_build_object('nome',c.relname,'owner',pg_get_userbyid(c.relowner),'rls',c.relrowsecurity,'force',c.relforcerowsecurity) ORDER BY c.relname) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='financeiro_hml' AND c.relkind='r'), 'gatilhos',(SELECT jsonb_agg(jsonb_build_object('tabela',c.relname,'nome',t.tgname,'enabled',t.tgenabled,'def',pg_get_triggerdef(t.oid)) ORDER BY c.relname,t.tgname) FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='financeiro_hml' AND NOT t.tgisinternal), 'politicas',(SELECT jsonb_agg(to_jsonb(p) ORDER BY tablename,policyname) FROM pg_policies p WHERE schemaname='financeiro_hml'), 'constraints',(SELECT jsonb_agg(jsonb_build_object('tabela',r.relname,'nome',c.conname,'def',pg_get_constraintdef(c.oid)) ORDER BY r.relname,c.conname) FROM pg_constraint c JOIN pg_class r ON r.oid=c.conrelid JOIN pg_namespace n ON n.oid=r.relnamespace WHERE n.nspname='financeiro_hml')))::text) <> '070d3f1c41e3b3ca72c71ba2c49b3996' THEN RAISE EXCEPTION 'V22_ESTRUTURA_DIVERGENTE'; END IF;
 IF EXISTS(SELECT 1 FROM pg_roles r WHERE r.rolname IN ('anon','authenticated') AND (r.rolsuper OR r.rolbypassrls)) OR EXISTS(SELECT 1 FROM pg_auth_members m JOIN pg_roles r ON r.oid=m.member WHERE r.rolname IN ('anon','authenticated','service_role')) THEN RAISE EXCEPTION 'V22_HERANCA_PRIVILEGIADA'; END IF;
END $estrutura$;
DO $baseline$
DECLARE t record; dados jsonb; b jsonb:='{}';
BEGIN
 FOR t IN SELECT c.oid,c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='financeiro_hml' AND c.relkind='r' LOOP
  EXECUTE format('SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text),''[]''::jsonb) FROM financeiro_hml.%I x',t.relname) INTO dados;
  b:=b||jsonb_build_object(t.relname,dados);
 END LOOP;
 PERFORM set_config('itv.v22.baseline',b::text,true);
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
DECLARE t record; dados jsonb; b jsonb:=current_setting('itv.v22.baseline')::jsonb;
BEGIN
 FOR t IN SELECT c.oid,c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='financeiro_hml' AND c.relkind='r' LOOP
  EXECUTE format('SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text),''[]''::jsonb) FROM financeiro_hml.%I x',t.relname) INTO dados;
  IF dados IS DISTINCT FROM b->t.relname THEN RAISE EXCEPTION 'V22_PRESERVACAO_FALHOU: %',t.relname; END IF;
 END LOOP;
 
END $baseline$;
DO $pos$
DECLARE t record; r text; f record; allowed text[];
BEGIN
 FOREACH r IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
  FOR t IN SELECT c.oid,c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='financeiro_hml' AND c.relkind='r' LOOP
   IF has_table_privilege(r,t.oid,'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') OR has_any_column_privilege(r,t.oid,'INSERT,UPDATE,REFERENCES') THEN RAISE EXCEPTION 'V22_DML_RESIDUAL: % %',r,t.relname; END IF;
  END LOOP;
  allowed:=CASE r WHEN 'authenticated' THEN ARRAY['tem_papel','papel_atual','tesouraria_saldos','tesouraria_extrato','tesouraria_historico_operacoes','integracao_estado_manual','integracao_iniciar','integracao_concluir','diagnostico_reservar'] WHEN 'service_role' THEN ARRAY['diagnostico_finalizar'] ELSE ARRAY[]::text[] END;
  FOR f IN SELECT p.oid,p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='financeiro_hml' LOOP
   IF has_function_privilege(r,f.oid,'EXECUTE') IS DISTINCT FROM (f.proname=ANY(allowed)) THEN RAISE EXCEPTION 'V22_EXECUTE_DIVERGENTE: % %',r,f.proname; END IF;
  END LOOP;
 END LOOP;
END $pos$;
DO $estrutura$
BEGIN
 IF md5((SELECT jsonb_build_object('tabelas',(SELECT jsonb_agg(jsonb_build_object('nome',c.relname,'owner',pg_get_userbyid(c.relowner),'rls',c.relrowsecurity,'force',c.relforcerowsecurity) ORDER BY c.relname) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='financeiro_hml' AND c.relkind='r'), 'gatilhos',(SELECT jsonb_agg(jsonb_build_object('tabela',c.relname,'nome',t.tgname,'enabled',t.tgenabled,'def',pg_get_triggerdef(t.oid)) ORDER BY c.relname,t.tgname) FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='financeiro_hml' AND NOT t.tgisinternal), 'politicas',(SELECT jsonb_agg(to_jsonb(p) ORDER BY tablename,policyname) FROM pg_policies p WHERE schemaname='financeiro_hml'), 'constraints',(SELECT jsonb_agg(jsonb_build_object('tabela',r.relname,'nome',c.conname,'def',pg_get_constraintdef(c.oid)) ORDER BY r.relname,c.conname) FROM pg_constraint c JOIN pg_class r ON r.oid=c.conrelid JOIN pg_namespace n ON n.oid=r.relnamespace WHERE n.nspname='financeiro_hml')))::text) <> '070d3f1c41e3b3ca72c71ba2c49b3996' THEN RAISE EXCEPTION 'V22_ESTRUTURA_DIVERGENTE'; END IF;
 IF EXISTS(SELECT 1 FROM pg_roles r WHERE r.rolname IN ('anon','authenticated') AND (r.rolsuper OR r.rolbypassrls)) OR EXISTS(SELECT 1 FROM pg_auth_members m JOIN pg_roles r ON r.oid=m.member WHERE r.rolname IN ('anon','authenticated','service_role')) THEN RAISE EXCEPTION 'V22_HERANCA_PRIVILEGIADA'; END IF;
END $estrutura$;
COMMIT;
