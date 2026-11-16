-- Contenção de Contas a Pagar V1 (PROPOSTA). Fecha cadastro/baixa removendo as funções e o resumo;
-- preserva integralmente as tabelas, obrigações, baixas e auditoria. Necessária antes da contenção da V2.2.1.
BEGIN;
SET LOCAL lock_timeout='5s';
DROP FUNCTION financeiro_hml.cp_cadastrar(jsonb);
DROP FUNCTION financeiro_hml.cp_baixar(jsonb);
DROP FUNCTION financeiro_hml.cp_cancelar(jsonb);
DROP FUNCTION financeiro_hml.cp_centavos(text);
DROP VIEW financeiro_hml.contas_pagar_resumo;
COMMIT;
