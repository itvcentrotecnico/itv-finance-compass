-- Somente banco descartável local. Nunca executar no HML.
\set ON_ERROR_STOP on
BEGIN;
CREATE TEMP TABLE baseline AS SELECT
  (SELECT count(*) FROM financeiro_hml.tesouraria_movimentos) AS movimentos,
  (SELECT count(*) FROM financeiro_hml.tesouraria_operacoes) AS operacoes,
  (SELECT md5(coalesce(jsonb_agg(to_jsonb(c) ORDER BY c.id)::text,'')) FROM financeiro_hml.tesouraria_conferencias c) AS conferencias,
  (SELECT md5(coalesce(jsonb_agg(to_jsonb(c) ORDER BY c.id)::text,'')) FROM financeiro_hml.contas_financeiras c) AS contas;
-- Limpa somente o estado de integração do banco descartável; tudo será revertido.
UPDATE financeiro_hml.integracao_sincronizacoes SET status='falha', iniciado_em=iniciado_em-interval '10 days';
REVOKE USAGE ON SCHEMA financeiro_hml FROM service_role;
SET ROLE service_role;
SELECT public.como_servidor();
DO $$ BEGIN
  BEGIN
    PERFORM financeiro_hml.integracao_iniciar_automatica(current_date-6,current_date);
    RAISE EXCEPTION 'O erro de permissão não foi reproduzido';
  EXCEPTION WHEN insufficient_privilege THEN
    IF SQLERRM NOT LIKE 'permission denied for schema financeiro_hml%' THEN RAISE; END IF;
    RAISE NOTICE 'PASS: reproduzido SQLSTATE 42501 permission denied for schema financeiro_hml';
  END;
END $$;
RESET ROLE;
GRANT USAGE ON SCHEMA financeiro_hml TO service_role;
DO $$ BEGIN
  IF NOT has_schema_privilege('service_role','financeiro_hml','USAGE') THEN RAISE EXCEPTION 'Sem USAGE'; END IF;
  IF has_schema_privilege('service_role','financeiro_hml','CREATE') THEN RAISE EXCEPTION 'CREATE indevido'; END IF;
  IF has_schema_privilege('anon','financeiro_hml','USAGE') THEN RAISE EXCEPTION 'Anon liberado'; END IF;
  IF has_function_privilege('authenticated','financeiro_hml.integracao_iniciar_automatica(date,date)','EXECUTE') THEN RAISE EXCEPTION 'Usuário liberado'; END IF;
  RAISE NOTICE 'PASS: USAGE mínimo, sem CREATE, anon ou automática para usuário';
END $$;
SET ROLE service_role;
SELECT public.como_servidor();
DO $$ DECLARE a jsonb; b jsonb; d date := (clock_timestamp() AT TIME ZONE 'America/Manaus')::date; BEGIN
  a := financeiro_hml.integracao_iniciar_automatica(d-6,d);
  IF a->>'pular' <> 'false' OR a->>'id' IS NULL THEN RAISE EXCEPTION 'Não iniciou'; END IF;
  b := financeiro_hml.integracao_iniciar_automatica(d-6,d);
  IF b->>'motivo' <> 'em_andamento' THEN RAISE EXCEPTION 'Concorrência não bloqueada'; END IF;
  b := financeiro_hml.integracao_concluir(jsonb_build_object('id',a->>'id','status','concluida','itens','[]'::jsonb));
  IF b->>'status' <> 'concluida' OR b->>'consultados' <> '0' OR b->>'novos' <> '0' THEN RAISE EXCEPTION 'Conclusão vazia falhou'; END IF;
  b := financeiro_hml.integracao_iniciar_automatica(d-6,d);
  IF b->>'motivo' <> 'ja_concluida_hoje' THEN RAISE EXCEPTION 'Idempotência falhou'; END IF;
  RAISE NOTICE 'PASS: início, concorrência, conclusão vazia e idempotência';
END $$;
RESET ROLE;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM financeiro_hml.auditoria WHERE tabela='integracao_sincronizacoes' AND depois->>'modo'='automatica' AND depois->>'status'='concluida') THEN RAISE EXCEPTION 'Sem auditoria'; END IF;
  IF (SELECT movimentos FROM baseline) <> (SELECT count(*) FROM financeiro_hml.tesouraria_movimentos)
    OR (SELECT operacoes FROM baseline) <> (SELECT count(*) FROM financeiro_hml.tesouraria_operacoes)
    OR (SELECT conferencias FROM baseline) <> (SELECT md5(coalesce(jsonb_agg(to_jsonb(c) ORDER BY c.id)::text,'')) FROM financeiro_hml.tesouraria_conferencias c)
    OR (SELECT contas FROM baseline) <> (SELECT md5(coalesce(jsonb_agg(to_jsonb(c) ORDER BY c.id)::text,'')) FROM financeiro_hml.contas_financeiras c)
  THEN RAISE EXCEPTION 'Dados financeiros alterados'; END IF;
  RAISE NOTICE 'PASS: auditoria preservada e zero alterações financeiras';
END $$;
ROLLBACK;