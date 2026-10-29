-- Consulta read-only usa SELECT/RLS já existentes; não precisa elevar privilégios.
BEGIN;
ALTER FUNCTION financeiro_hml.integracao_estado_manual() SECURITY INVOKER;
COMMIT;