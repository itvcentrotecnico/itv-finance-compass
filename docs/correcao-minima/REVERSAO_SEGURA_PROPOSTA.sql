-- CONTENCAO, nao restaura motor vulneravel nem apaga historico. NAO APLICADA.
BEGIN;
LOCK TABLE financeiro_hml.perfis,financeiro_hml.plano_contas,financeiro_hml.centros_custo,financeiro_hml.contas_financeiras,financeiro_hml.contas_preparadas,financeiro_hml.tesouraria_conferencias,financeiro_hml.tesouraria_operacoes,financeiro_hml.tesouraria_movimentos,financeiro_hml.auditoria IN ACCESS EXCLUSIVE MODE NOWAIT;
DO $$ BEGIN IF current_setting('itv.minima.reversao',true) IS DISTINCT FROM 'REVERSAO_AUTORIZADA' THEN RAISE EXCEPTION 'MINIMA_REVERSAO_NAO_AUTORIZADA'; END IF; END $$;
CREATE OR REPLACE FUNCTION financeiro_hml.tesouraria_lancar(p jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,financeiro_hml,pg_temp AS $$ BEGIN RAISE EXCEPTION 'TES_REVISAO_OBRIGATORIA' USING ERRCODE='42501'; END $$;
CREATE OR REPLACE FUNCTION financeiro_hml.tesouraria_transferir(p jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,financeiro_hml,pg_temp AS $$ BEGIN RAISE EXCEPTION 'TES_REVISAO_OBRIGATORIA' USING ERRCODE='42501'; END $$;
CREATE OR REPLACE FUNCTION financeiro_hml.tesouraria_estornar(p jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,financeiro_hml,pg_temp AS $$ BEGIN RAISE EXCEPTION 'TES_REVISAO_OBRIGATORIA' USING ERRCODE='42501'; END $$;
CREATE OR REPLACE FUNCTION financeiro_hml.tesouraria_criar_conta(p jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,financeiro_hml,pg_temp AS $$ BEGIN RAISE EXCEPTION 'TES_REVISAO_OBRIGATORIA' USING ERRCODE='42501'; END $$;
CREATE OR REPLACE FUNCTION financeiro_hml.tesouraria_habilitar_conta(p jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,financeiro_hml,pg_temp AS $$ BEGIN RAISE EXCEPTION 'TES_REVISAO_OBRIGATORIA' USING ERRCODE='42501'; END $$;
CREATE OR REPLACE FUNCTION financeiro_hml.tesouraria_lancar_conferencia(p jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,financeiro_hml,pg_temp AS $$ BEGIN RAISE EXCEPTION 'TES_REVISAO_OBRIGATORIA' USING ERRCODE='42501'; END $$;
CREATE OR REPLACE FUNCTION financeiro_hml.tes_executar(p jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,financeiro_hml,pg_temp AS $$ BEGIN RAISE EXCEPTION 'TES_OPERACAO_BLOQUEADA' USING ERRCODE='42501'; END $$;
COMMIT;
