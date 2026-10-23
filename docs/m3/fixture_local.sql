-- FIXTURE DESCARTAVEL LOCAL. NAO E MIGRACAO E NUNCA DEVE SER APLICADA AO HML.
-- Estrutura minima reconstruida para executar M1/M2/M3 sem copiar dados reais.
CREATE SCHEMA auth;
CREATE SCHEMA financeiro_hml;
CREATE TABLE auth.users(id uuid primary key);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
CREATE TABLE financeiro_hml.perfis(usuario_id uuid primary key references auth.users(id) ON DELETE CASCADE, nome text, preferencias jsonb, papel varchar NOT NULL, ativo boolean DEFAULT true NOT NULL, criado_em timestamptz DEFAULT now());
CREATE TABLE financeiro_hml.plano_contas(id uuid primary key DEFAULT gen_random_uuid(), codigo varchar UNIQUE NOT NULL, descricao varchar NOT NULL, natureza varchar NOT NULL, conta_pai_id uuid REFERENCES financeiro_hml.plano_contas(id), aceita_lancamentos boolean DEFAULT true NOT NULL,ativo boolean DEFAULT true NOT NULL,criado_em timestamptz DEFAULT now());
CREATE TABLE financeiro_hml.centros_custo(id uuid primary key DEFAULT gen_random_uuid(),codigo varchar UNIQUE NOT NULL,descricao varchar NOT NULL,responsavel varchar,ativo boolean DEFAULT true NOT NULL,criado_em timestamptz DEFAULT now(),criado_por uuid REFERENCES auth.users(id));
CREATE TABLE financeiro_hml.contas_financeiras(id uuid primary key DEFAULT gen_random_uuid(),nome varchar NOT NULL,tipo varchar NOT NULL,moeda char(3) DEFAULT 'BRL' NOT NULL,saldo_inicial_centavos bigint DEFAULT 0 NOT NULL,data_saldo_inicial date NOT NULL,ativo boolean DEFAULT true NOT NULL,criado_em timestamptz DEFAULT now(),criado_por uuid REFERENCES auth.users(id));
ALTER TABLE financeiro_hml.perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE financeiro_hml.perfis FORCE ROW LEVEL SECURITY;
ALTER TABLE financeiro_hml.plano_contas ENABLE ROW LEVEL SECURITY;
ALTER TABLE financeiro_hml.plano_contas FORCE ROW LEVEL SECURITY;
ALTER TABLE financeiro_hml.centros_custo ENABLE ROW LEVEL SECURITY;
ALTER TABLE financeiro_hml.centros_custo FORCE ROW LEVEL SECURITY;
ALTER TABLE financeiro_hml.contas_financeiras ENABLE ROW LEVEL SECURITY;
ALTER TABLE financeiro_hml.contas_financeiras FORCE ROW LEVEL SECURITY;