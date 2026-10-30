-- Ato separado da instalação. NÃO AUTORIZADO NO HML nesta preparação.
BEGIN;
DO $$ BEGIN
 IF current_setting('itv.etapa2.liberacao',true) IS DISTINCT FROM 'COMPATIBILIDADE_E_RECUPERACAO_VALIDADAS'
 THEN RAISE EXCEPTION 'ETAPA2_LIBERACAO_NAO_AUTORIZADA'; END IF;
 IF to_regclass('financeiro_hml.tesouraria_solicitacoes') IS NULL THEN RAISE EXCEPTION 'ETAPA2_BASE_INCOMPATIVEL'; END IF;
END $$;
GRANT EXECUTE ON FUNCTION financeiro_hml.conferencia_comandar(jsonb),financeiro_hml.tesouraria_lancar_conferencia(jsonb),financeiro_hml.tesouraria_solicitar(jsonb),financeiro_hml.tesouraria_decidir(jsonb),financeiro_hml.tesouraria_lancar(jsonb),financeiro_hml.tesouraria_transferir(jsonb),financeiro_hml.tesouraria_estornar(jsonb) TO authenticated;
-- Nunca permitir acesso ao motor privado, criar/habilitar conta ou DML nas fontes.
REVOKE EXECUTE ON FUNCTION financeiro_hml.tes_executar(jsonb),financeiro_hml.tesouraria_criar_conta(jsonb),financeiro_hml.tesouraria_habilitar_conta(jsonb) FROM PUBLIC,anon,authenticated,service_role;
COMMIT;