-- SOMENTE LEITURA. Não executado no Supabase nesta etapa.
BEGIN READ ONLY;
SELECT current_database(),current_user,version();
SELECT count(*) total,count(*) FILTER(WHERE tipo='abertura') aberturas,count(*) FILTER(WHERE tipo<>'abertura') outras FROM financeiro_hml.tesouraria_operacoes;
SELECT count(*) movimentos FROM financeiro_hml.tesouraria_movimentos;
SELECT c.id,c.nome,c.ativo,c.moeda,c.data_saldo_inicial,c.saldo_inicial_centavos,p.situacao,p.conta_financeira_id FROM financeiro_hml.contas_financeiras c LEFT JOIN financeiro_hml.contas_preparadas p ON p.conta_financeira_id=c.id ORDER BY c.nome,c.id;
SELECT c.id,c.codigo,c.descricao,c.natureza,c.ativo,c.aceita_lancamentos,p.codigo codigo_pai FROM financeiro_hml.plano_contas c LEFT JOIN financeiro_hml.plano_contas p ON p.id=c.conta_pai_id ORDER BY c.codigo;
SELECT p.oid::regprocedure assinatura,pg_get_userbyid(p.proowner) owner,p.prosecdef,p.proconfig,p.proacl,md5(pg_get_functiondef(p.oid)) definicao_md5 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='financeiro_hml' ORDER BY assinatura::text;
SELECT c.relname,pg_get_userbyid(c.relowner) owner,c.relrowsecurity,c.relforcerowsecurity,c.relacl FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='financeiro_hml' AND c.relkind IN ('r','S') ORDER BY c.relname;
SELECT * FROM pg_policies WHERE schemaname='financeiro_hml' ORDER BY tablename,policyname;
SELECT c.relname,t.tgname,t.tgenabled,pg_get_triggerdef(t.oid) FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='financeiro_hml' AND NOT t.tgisinternal ORDER BY c.relname,t.tgname;
SELECT c.relname,a.attname,a.attacl FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='financeiro_hml' AND a.attnum>0 AND NOT a.attisdropped AND a.attacl IS NOT NULL;
SELECT r.rolname,r.rolsuper,r.rolbypassrls,p.oid::regprocedure assinatura,has_function_privilege(r.rolname,p.oid,'EXECUTE') executar FROM pg_roles r CROSS JOIN pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE r.rolname IN ('anon','authenticated','service_role') AND n.nspname='financeiro_hml' ORDER BY r.rolname,assinatura::text;
SELECT member::regrole,roleid::regrole,admin_option FROM pg_auth_members ORDER BY member,roleid;
-- Somente contagens: não expõe comandos/session tokens.
SELECT state,count(*),max(clock_timestamp()-xact_start) transacao_mais_antiga FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() GROUP BY state;
-- Fingerprints completos para guardar sob acesso restrito antes/depois (não comprovam concorrência isoladamente).
SELECT 'aberturas' objeto,md5(coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text),'[]'::jsonb)::text) hash FROM financeiro_hml.tesouraria_operacoes t WHERE tipo='abertura';
SELECT 'operacoes' objeto,md5(coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text),'[]'::jsonb)::text) hash FROM financeiro_hml.tesouraria_operacoes t;
SELECT 'movimentos' objeto,md5(coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text),'[]'::jsonb)::text) hash FROM financeiro_hml.tesouraria_movimentos t;
SELECT 'auditoria' objeto,md5(coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text),'[]'::jsonb)::text) hash FROM financeiro_hml.auditoria t;
COMMIT;
