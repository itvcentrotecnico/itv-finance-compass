-- PREPARADO; NAO EXECUTADO. SOMENTE LEITURA, projeto ayjppexbzpgdkzbehvzw.
-- Conferir projeto no painel/conexao: current_database()=postgres NAO identifica projeto.
-- Executar arquivo completo apenas em etapa posteriormente autorizada; guardar resultado protegido.
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
-- Dependencias catalogadas: FKs fora do financeiro (inclui so definicao, nao dados Auth).
SELECT c.relname tabela,co.conname,co.confrelid::regclass::text referencia,pg_get_constraintdef(co.oid) definicao FROM pg_constraint co JOIN pg_class c ON c.oid=co.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_class destino ON destino.oid=co.confrelid JOIN pg_namespace dn ON dn.oid=destino.relnamespace WHERE n.nspname='financeiro_hml' AND co.contype='f' AND dn.nspname<>'financeiro_hml' ORDER BY tabela,co.conname;
SELECT pg_describe_object(d.classid,d.objid,d.objsubid) objeto,pg_describe_object(d.refclassid,d.refobjid,d.refobjsubid) dependencia,d.deptype
FROM pg_depend d WHERE (d.classid='pg_proc'::regclass AND d.objid IN (SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='financeiro_hml')) OR (d.classid='pg_class'::regclass AND d.objid IN (SELECT c.oid FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='financeiro_hml')) ORDER BY objeto,dependencia;
-- PL/pgSQL/string SQL pode nao catalogar todas referencias: busca complementar, nao prova completa.
SELECT p.oid::regprocedure::text assinatura,x.m[1] referencia_textual FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace CROSS JOIN LATERAL regexp_matches(p.prosrc,'((?:auth|extensions|public)\.[A-Za-z_][A-Za-z_0-9]*)','g') x(m) WHERE n.nspname='financeiro_hml' ORDER BY assinatura,referencia_textual;
SELECT to_regclass('auth.users') auth_users,to_regprocedure('auth.uid()') auth_uid,to_regprocedure('auth.role()') auth_role,to_regprocedure('gen_random_uuid()') gerador_uuid;
-- Nao gera UUIDs nem chama nenhuma funcao financeira ou a origem.
SELECT c.relname,a.attname,format_type(a.atttypid,a.atttypmod) tipo,t.typtype,tn.nspname schema_tipo,t.typname FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_type t ON t.oid=a.atttypid JOIN pg_namespace tn ON tn.oid=t.typnamespace WHERE n.nspname='financeiro_hml' AND c.relname='contas_financeiras' AND a.attname='tipo';
SELECT count(*) controles_internos FROM financeiro_hml.contas_financeiras WHERE tipo='interno' OR nome='LIVRO FINANCEIRO ITV — CONTROLE INTERNO';
-- Fotografias SEM textos de queries/session tokens: nao comprovam drenagem continua.
SELECT pid,usename,state,xact_start,wait_event_type,backend_type FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() AND (xact_start IS NOT NULL OR state LIKE 'idle in transaction%') ORDER BY xact_start;
SELECT count(*) transacoes_preparadas FROM pg_prepared_xacts WHERE database=current_database();
SELECT l.pid,l.mode,l.granted,c.relname FROM pg_locks l JOIN pg_class c ON c.oid=l.relation JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='financeiro_hml' ORDER BY c.relname,l.pid;
SELECT count(*) sincronizacoes_em_andamento FROM financeiro_hml.integracao_sincronizacoes WHERE status='em_andamento';

ROLLBACK;
