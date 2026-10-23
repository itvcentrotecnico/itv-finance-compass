alter table financeiro_hml.plano_contas
  add column criado_por uuid references auth.users(id),
  add column atualizado_em timestamptz,
  add column atualizado_por uuid references auth.users(id),
  add constraint pc_codigo_formato check (codigo::text ~ '^[A-Za-z0-9._-]{1,32}$'),
  add constraint pc_descricao_tamanho check (length(btrim(descricao::text)) between 2 and 160);
alter table financeiro_hml.centros_custo
  add column atualizado_em timestamptz,
  add column atualizado_por uuid references auth.users(id);

create or replace function financeiro_hml.autoria_cadastro() returns trigger
language plpgsql set search_path = financeiro_hml, pg_temp as $$
begin
  if tg_op = 'INSERT' then
    new.criado_em := now(); new.criado_por := auth.uid();
    new.atualizado_em := null; new.atualizado_por := null;
  else
    if new.id <> old.id then raise exception 'Identificador não pode ser alterado'; end if;
    new.criado_em := old.criado_em; new.criado_por := old.criado_por;
    new.atualizado_em := now(); new.atualizado_por := auth.uid();
  end if;
  return new;
end $$;

drop trigger autoria on financeiro_hml.plano_contas;
drop trigger autoria on financeiro_hml.centros_custo;
create trigger autoria before insert or update on financeiro_hml.plano_contas
  for each row execute function financeiro_hml.autoria_cadastro();
create trigger autoria before insert or update on financeiro_hml.centros_custo
  for each row execute function financeiro_hml.autoria_cadastro();

create or replace function financeiro_hml.pc_hierarquia() returns trigger
language plpgsql security definer set search_path = financeiro_hml, pg_temp as $$
declare pai record; atual uuid; passos int := 0;
begin
  if new.conta_pai_id is not null then
    if new.conta_pai_id = new.id then raise exception 'PC_CICLO: conta não pode ser pai de si mesma'; end if;
    select id, natureza, ativo into pai from financeiro_hml.plano_contas where id = new.conta_pai_id;
    if not found then raise exception 'PC_PAI_INEXISTENTE: conta-pai não encontrada'; end if;
    if pai.natureza <> new.natureza then raise exception 'PC_NATUREZA: natureza deve ser igual à da conta-pai'; end if;
    if new.ativo and not pai.ativo then raise exception 'PC_PAI_INATIVO: conta-pai está inativa'; end if;
    atual := new.conta_pai_id;
    while atual is not null loop
      if atual = new.id then raise exception 'PC_CICLO: a hierarquia formaria um ciclo'; end if;
      passos := passos + 1; if passos > 50 then raise exception 'PC_CICLO: hierarquia muito profunda'; end if;
      select conta_pai_id into atual from financeiro_hml.plano_contas where id = atual;
    end loop;
  end if;
  if tg_op = 'UPDATE' then
    if old.ativo and not new.ativo and exists (select 1 from financeiro_hml.plano_contas where conta_pai_id = new.id and ativo) then
      raise exception 'PC_FILHAS_ATIVAS: inative primeiro as contas-filhas';
    end if;
    if new.natureza <> old.natureza and exists (select 1 from financeiro_hml.plano_contas where conta_pai_id = new.id) then
      raise exception 'PC_NATUREZA: conta com filhas não pode mudar de natureza';
    end if;
  end if;
  return new;
end $$;
revoke all on function financeiro_hml.pc_hierarquia() from public, anon, authenticated;
create trigger pc_hierarquia before insert or update on financeiro_hml.plano_contas
  for each row execute function financeiro_hml.pc_hierarquia();

create table financeiro_hml.auditoria (
  id bigint generated always as identity primary key,
  tabela text not null,
  registro_id uuid not null,
  acao text not null check (acao in ('criar','alterar','inativar','reativar')),
  usuario_id uuid,
  ocorrido_em timestamptz not null default now(),
  antes jsonb,
  depois jsonb
);
create index auditoria_registro_idx on financeiro_hml.auditoria (tabela, registro_id, ocorrido_em desc);
grant select on financeiro_hml.auditoria to authenticated;
grant all on financeiro_hml.auditoria to service_role;
alter table financeiro_hml.auditoria enable row level security;
alter table financeiro_hml.auditoria force row level security;
create policy auditoria_ler on financeiro_hml.auditoria for select to authenticated
  using (financeiro_hml.tem_papel(array['admin_geral','admin_financeiro']));

create or replace function financeiro_hml.registrar_auditoria() returns trigger
language plpgsql security definer set search_path = financeiro_hml, pg_temp as $$
declare a text;
begin
  if tg_op = 'INSERT' then a := 'criar';
  elsif old.ativo and not new.ativo then a := 'inativar';
  elsif not old.ativo and new.ativo then a := 'reativar';
  else a := 'alterar'; end if;
  insert into financeiro_hml.auditoria (tabela, registro_id, acao, usuario_id, antes, depois)
  values (tg_table_name, new.id, a, auth.uid(),
          case when tg_op = 'UPDATE' then to_jsonb(old) end, to_jsonb(new));
  return null;
end $$;
revoke all on function financeiro_hml.registrar_auditoria() from public, anon, authenticated;
create trigger auditoria after insert or update on financeiro_hml.plano_contas
  for each row execute function financeiro_hml.registrar_auditoria();
create trigger auditoria after insert or update on financeiro_hml.centros_custo
  for each row execute function financeiro_hml.registrar_auditoria();