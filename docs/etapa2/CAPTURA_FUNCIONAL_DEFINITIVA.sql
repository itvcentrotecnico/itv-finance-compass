-- PSQL: captura local protegida das definições DEFINITIVAS antes de reversão.
-- \set captura /caminho/protegido/definicoes.sql
\set ON_ERROR_STOP on
COPY (
 SELECT pg_get_functiondef(p.oid) AS definicao
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='financeiro_hml' AND p.proname IN
 ('conferencia_comandar','tesouraria_lancar_conferencia','tesouraria_solicitar','tesouraria_decidir')
 ORDER BY p.proname
) TO STDOUT WITH CSV \g :captura
-- Guardar SHA-256 e assinaturas. CSV NÃO é executável SQL nem backup.
-- Para reativação: reconstruir somente definições verificadas em transação,
-- manter REVOKEs, validar e então executar LIBERACAO_DEFINITIVA.sql.