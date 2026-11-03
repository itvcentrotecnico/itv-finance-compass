-- EXCLUSIVO: fixture PostgreSQL descartável local, nunca HML.
BEGIN;
SET LOCAL ROLE postgres;
ALTER TABLE financeiro_hml.perfis DROP COLUMN nome, DROP COLUMN preferencias;
ALTER TABLE financeiro_hml."centros_custo" ADD CONSTRAINT "chk_codigo_centro_custo" CHECK (((codigo)::text ~ '^[A-Za-z0-9._-]{1,32}$'::text));
ALTER TABLE financeiro_hml."centros_custo" ADD CONSTRAINT "chk_descricao_centro_custo" CHECK (((length(btrim((descricao)::text)) >= 2) AND (length(btrim((descricao)::text)) <= 160)));
ALTER TABLE financeiro_hml."contas_financeiras" ADD CONSTRAINT "chk_nome_conta_financeira" CHECK (((length(btrim((nome)::text)) >= 2) AND (length(btrim((nome)::text)) <= 160)));
ALTER TABLE financeiro_hml."contas_financeiras" ADD CONSTRAINT "contas_financeiras_moeda_check" CHECK ((moeda = 'BRL'::bpchar));
ALTER TABLE financeiro_hml."contas_financeiras" ADD CONSTRAINT "contas_financeiras_tipo_check" CHECK (tipo IN ('banco', 'caixa'));
ALTER TABLE financeiro_hml."perfis" ADD CONSTRAINT "perfis_papel_check" CHECK (papel IN ('admin_geral', 'admin_financeiro', 'analista_financeiro', 'consulta_gerencial'));
ALTER TABLE financeiro_hml."plano_contas" ADD CONSTRAINT "plano_contas_natureza_check" CHECK (natureza IN ('receita', 'despesa', 'ativo', 'passivo', 'patrimonio'));
COMMIT;
