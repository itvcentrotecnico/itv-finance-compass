-- Reversão funcional LIMITADA: consulta preservada, mutações recusadas.
-- Não desfaz eventos financeiros, não remove tabelas, não reaplica definições vulneráveis.
BEGIN;
SET LOCAL lock_timeout='5s';
LOCK TABLE financeiro_hml.tesouraria_solicitacoes,financeiro_hml.conferencia_controles,financeiro_hml.tesouraria_operacoes,financeiro_hml.tesouraria_movimentos IN ACCESS EXCLUSIVE MODE NOWAIT;
DO $$ BEGIN
 IF current_setting('itv.etapa2.reversao',true) IS DISTINCT FROM 'REVERSAO_FUNCIONAL_AUTORIZADA' THEN RAISE EXCEPTION 'ETAPA2_REVERSAO_NAO_AUTORIZADA'; END IF;
END $$;
CREATE OR REPLACE FUNCTION financeiro_hml.tesouraria_solicitar(p jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,financeiro_hml AS $$ BEGIN RAISE EXCEPTION 'CONF_OPERACAO_BLOQUEADA'; END $$;
CREATE OR REPLACE FUNCTION financeiro_hml.tesouraria_decidir(p jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,financeiro_hml AS $$ BEGIN RAISE EXCEPTION 'CONF_OPERACAO_BLOQUEADA'; END $$;
CREATE OR REPLACE FUNCTION financeiro_hml.conferencia_comandar(p jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,financeiro_hml AS $$ BEGIN RAISE EXCEPTION 'CONF_OPERACAO_BLOQUEADA'; END $$;
CREATE OR REPLACE FUNCTION financeiro_hml.tesouraria_lancar_conferencia(p jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,financeiro_hml AS $$ BEGIN RAISE EXCEPTION 'CONF_OPERACAO_BLOQUEADA'; END $$;
REVOKE EXECUTE ON FUNCTION financeiro_hml.tesouraria_solicitar(jsonb),financeiro_hml.tesouraria_decidir(jsonb),financeiro_hml.conferencia_comandar(jsonb),financeiro_hml.tesouraria_lancar_conferencia(jsonb),financeiro_hml.tesouraria_lancar(jsonb),financeiro_hml.tesouraria_transferir(jsonb),financeiro_hml.tesouraria_estornar(jsonb),financeiro_hml.tesouraria_criar_conta(jsonb),financeiro_hml.tesouraria_habilitar_conta(jsonb),financeiro_hml.tes_executar(jsonb) FROM PUBLIC,anon,authenticated,service_role;
COMMIT;