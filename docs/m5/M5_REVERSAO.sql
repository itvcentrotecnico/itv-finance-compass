-- Reversão da M5: volta à sincronização somente manual (M4). Preserva histórico e itens.
DROP FUNCTION IF EXISTS financeiro_hml.integracao_iniciar_automatica(date, date);
REVOKE EXECUTE ON FUNCTION financeiro_hml.integracao_concluir(jsonb) FROM service_role;
DROP INDEX IF EXISTS financeiro_hml.integracao_sync_uma_em_andamento;
-- As colunas modo/janela_* e a função integracao_expirar_travadas permanecem (inofensivas);
-- para restaurar exatamente a M4, reaplicar as definições de integracao_iniciar/integracao_concluir de docs/m4.
