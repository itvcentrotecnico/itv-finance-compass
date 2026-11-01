-- ITV FINANCEIRO HML: inventário complementar. SOMENTE SELECT.
-- Executar apenas no projeto ayjppexbzpgdkzbehvzw, em acesso autorizado.
-- Não contém dados de usuários, senhas, tokens, DML ou comandos de manutenção.
-- Resultado é evidência, NÃO script de restauração de permissões.
SELECT current_database(),current_user,version(),clock_timestamp();

SELECT n.nspname,pg_get_userbyid(n.nspowner) AS owner,n.nspacl::text
FROM pg_namespace n WHERE n.nspname IN ('financeiro_hml','auth','extensions','public');

SELECT c.relname,c.relkind,pg_get_userbyid(c.relowner) AS owner,
 c.relrowsecurity,c.relforcerowsecurity,c.relacl::text
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='financeiro_hml' ORDER BY c.relkind,c.relname;

SELECT c.relname,a.attname,a.attacl::text
FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid
JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='financeiro_hml' AND a.attnum>0 AND NOT a.attisdropped AND a.attacl IS NOT NULL
ORDER BY c.relname,a.attname;

SELECT p.proname,pg_get_function_identity_arguments(p.oid) AS args,
 pg_get_userbyid(p.proowner) AS owner,p.prosecdef,p.proconfig,p.proacl::text,
 md5(pg_get_functiondef(p.oid)) AS definition_md5,
 has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_execute,
 has_function_privilege('service_role',p.oid,'EXECUTE') AS service_execute,
 has_function_privilege('anon',p.oid,'EXECUTE') AS anon_execute
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='financeiro_hml' AND p.prokind='f' ORDER BY p.proname,args;

SELECT pg_get_userbyid(d.defaclrole) AS owner,coalesce(n.nspname,'GLOBAL') AS schema,
 d.defaclobjtype,d.defaclacl::text
FROM pg_default_acl d LEFT JOIN pg_namespace n ON n.oid=d.defaclnamespace
WHERE n.nspname='financeiro_hml' OR
 (d.defaclnamespace=0 AND d.defaclrole=(SELECT oid FROM pg_roles WHERE rolname='postgres'));

SELECT r.rolname,r.rolsuper,r.rolinherit,r.rolcreaterole,r.rolcreatedb,r.rolcanlogin,r.rolbypassrls,
 ARRAY(SELECT pg_get_userbyid(m.roleid) FROM pg_auth_members m WHERE m.member=r.oid ORDER BY m.roleid) AS memberships
FROM pg_roles r WHERE r.rolname IN
 ('postgres','anon','authenticated','service_role','supabase_admin','supabase_auth_admin','authenticator');

SELECT c.relname,pol.polname,pol.polcmd,pol.polpermissive,
 ARRAY(SELECT CASE v WHEN 0 THEN 'PUBLIC' ELSE pg_get_userbyid(v) END FROM unnest(pol.polroles) v) AS roles,
 pg_get_expr(pol.polqual,pol.polrelid) AS using_expression,
 pg_get_expr(pol.polwithcheck,pol.polrelid) AS check_expression
FROM pg_policy pol JOIN pg_class c ON c.oid=pol.polrelid
JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='financeiro_hml'
ORDER BY c.relname,pol.polname;

SELECT c.relname,t.tgname,t.tgenabled,pg_get_triggerdef(t.oid) AS definition
FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='financeiro_hml' AND NOT t.tgisinternal ORDER BY c.relname,t.tgname;

SELECT con.conname,con.conrelid::regclass::text AS tabela,pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='financeiro_hml' ORDER BY tabela,con.conname;

SELECT c.relname,a.attname,pg_get_expr(d.adbin,d.adrelid) AS default_expression
FROM pg_attrdef d JOIN pg_class c ON c.oid=d.adrelid
JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum=d.adnum JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='financeiro_hml' ORDER BY c.relname,a.attname;

SELECT schemaname,sequencename,sequenceowner,data_type,start_value,min_value,max_value,increment_by,cycle,cache_size,last_value
FROM pg_sequences WHERE schemaname='financeiro_hml';

SELECT e.extname,e.extversion,n.nspname AS schema
FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace ORDER BY e.extname;

SELECT to_regclass('auth.users'),to_regprocedure('auth.uid()'),
 to_regprocedure('auth.role()'),to_regprocedure('gen_random_uuid()');

SELECT p.proname,string_agg(DISTINCT x.m[1],', ' ORDER BY x.m[1]) AS external_refs
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
CROSS JOIN LATERAL regexp_matches(p.prosrc,'((?:auth|extensions|public)\.[A-Za-z_][A-Za-z_0-9]*)','g') AS x(m)
WHERE n.nspname='financeiro_hml' AND p.prokind='f' GROUP BY p.proname ORDER BY p.proname;

-- Fotografias NÃO comprovam drenagem contínua nem controle de HTTP/filas/administradores.
-- Não selecionar query: textos de consultas podem conter dados sensíveis.
SELECT pid,usename,state,xact_start,wait_event_type,backend_type
FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid()
AND (xact_start IS NOT NULL OR state LIKE 'idle in transaction%');
SELECT count(*) AS prepared_transactions FROM pg_prepared_xacts WHERE database=current_database();
SELECT count(*) AS sync_em_andamento FROM financeiro_hml.integracao_sincronizacoes WHERE status='em_andamento';