-- Reversão da M3.3 (somente se nenhuma conferência tiver sido lançada e nenhuma conta preparada habilitada).
BEGIN;
LOCK TABLE financeiro_hml.tesouraria_conferencias, financeiro_hml.contas_preparadas IN ACCESS EXCLUSIVE MODE NOWAIT;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM financeiro_hml.tesouraria_conferencias WHERE operacao_id IS NOT NULL) OR EXISTS(SELECT 1 FROM financeiro_hml.contas_preparadas WHERE situacao='habilitada') THEN RAISE EXCEPTION 'Reversão bloqueada: já existem efeitos financeiros vinculados'; END IF; END $$;
DROP FUNCTION financeiro_hml.tesouraria_lancar_conferencia(jsonb);
DROP FUNCTION financeiro_hml.tesouraria_habilitar_conta(jsonb);
DROP TABLE financeiro_hml.tesouraria_conferencias;
DROP TABLE financeiro_hml.contas_preparadas;
DROP FUNCTION financeiro_hml.tes_conf_auditar();
DROP FUNCTION financeiro_hml.tes_conf_proteger();
COMMIT;
