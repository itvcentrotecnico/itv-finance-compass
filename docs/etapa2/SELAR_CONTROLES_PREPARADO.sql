-- PROPOSTA: executar após migração apenas durante janela autorizada.
-- CREATE de RPC nova concede EXECUTE conforme migração; manter comandos bloqueados
-- até homologação/decisão posterior. Nunca revogar consultas ou conceder DML.
\set ON_ERROR_STOP on
BEGIN;
DO $$ BEGIN
 IF current_setting('itv.etapa2.autorizacao',true) IS DISTINCT FROM 'MANUTENCAO_EXPLICITAMENTE_AUTORIZADA'
 OR to_regclass('pg_temp.etapa2_janela') IS NULL THEN RAISE EXCEPTION 'ETAPA2_SEM_JANELA'; END IF;
END $$;
REVOKE EXECUTE ON FUNCTION financeiro_hml.conferencia_comandar(jsonb),financeiro_hml.tesouraria_lancar_conferencia(jsonb) FROM PUBLIC,anon,authenticated,service_role;
COMMIT;