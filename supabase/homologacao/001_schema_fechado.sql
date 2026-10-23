-- ITV FINANCEIRO — SOMENTE HOMOLOGAÇÃO ISOLADA
-- Executar manualmente APENAS em um projeto Supabase novo, dedicado a testes.
-- Não executar no banco do GESTÃO ITV.
begin;

create schema if not exists financeiro_hml;

create table financeiro_hml.perfis (
  usuario_id uuid primary key references auth.users(id) on delete cascade,
  papel text not null check (papel in ('admin_geral','admin_financeiro','analista_financeiro','consulta_gerencial')),
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table financeiro_hml.plano_contas (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique check (codigo ~ '^[A-Za-z0-9._-]{1,32}$'),
  descricao text not null check (length(btrim(descricao)) between 2 and 160),
  natureza text not null check (natureza in ('receita','despesa','ativo','passivo','patrimonio')),
  conta_pai_id uuid references financeiro_hml.plano_contas(id) on delete restrict,
  aceita_lancamentos boolean not null default true,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  criado_por uuid references auth.users(id),
  check (conta_pai_id is distinct from id)
);

create table financeiro_hml.centros_custo (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique check (codigo ~ '^[A-Za-z0-9._-]{1,32}$'),
  descricao text not null check (length(btrim(descricao)) between 2 and 160),
  responsavel text check (length(responsavel) <= 160),
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  criado_por uuid references auth.users(id)
);

create table financeiro_hml.contas_financeiras (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (length(btrim(nome)) between 2 and 160),
  tipo text not null check (tipo in ('banco','caixa')),
  moeda text not null default 'BRL' check (moeda = 'BRL'),
  saldo_inicial_centavos bigint not null default 0,
  data_saldo_inicial date not null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  criado_por uuid references auth.users(id)
);

create table financeiro_hml.auditoria (
  id bigint generated always as identity primary key,
  entidade text not null,
  entidade_id uuid not null,
  acao text not null check (acao in ('INSERT','UPDATE','DELETE')),
  autor_id uuid,
  anterior jsonb,
  posterior jsonb,
  ocorrido_em timestamptz not null default now()
);

-- Não expor o schema via API nesta etapa: sem grants para anon/authenticated.
revoke all on schema financeiro_hml from public, anon, authenticated;
revoke all on all tables in schema financeiro_hml from public, anon, authenticated;
revoke all on all sequences in schema financeiro_hml from public, anon, authenticated;

alter table financeiro_hml.perfis enable row level security;
alter table financeiro_hml.plano_contas enable row level security;
alter table financeiro_hml.centros_custo enable row level security;
alter table financeiro_hml.contas_financeiras enable row level security;
alter table financeiro_hml.auditoria enable row level security;

-- Defesa em profundidade: sem policies, mesmo se houver grant acidental,
-- clientes comuns não conseguem ler/escrever. Proprietário e papéis com
-- BYPASSRLS ainda exigem controles operacionais separados.
alter table financeiro_hml.perfis force row level security;
alter table financeiro_hml.plano_contas force row level security;
alter table financeiro_hml.centros_custo force row level security;
alter table financeiro_hml.contas_financeiras force row level security;
alter table financeiro_hml.auditoria force row level security;

create or replace function financeiro_hml.registrar_auditoria()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  insert into financeiro_hml.auditoria(entidade, entidade_id, acao, autor_id, anterior, posterior)
  values (
    TG_TABLE_NAME,
    coalesce(new.id, old.id),
    TG_OP,
    auth.uid(),
    case when TG_OP = 'INSERT' then null else to_jsonb(old) end,
    case when TG_OP = 'DELETE' then null else to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;

-- O gatilho é preparado para uma fase posterior. Não ativar até definir
-- papel de execução e privilégios mínimos da trilha de auditoria.
commit;
