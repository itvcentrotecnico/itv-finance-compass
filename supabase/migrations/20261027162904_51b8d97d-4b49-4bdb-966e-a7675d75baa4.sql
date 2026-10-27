INSERT INTO financeiro_hml.diagnostico_autorizacoes(id, administrador_id, encerra_em)
SELECT gen_random_uuid(), '2a232414-0290-47b2-8aeb-77a6b490efe4', clock_timestamp() + interval '24 hours'
WHERE NOT EXISTS (SELECT 1 FROM financeiro_hml.diagnostico_autorizacoes);