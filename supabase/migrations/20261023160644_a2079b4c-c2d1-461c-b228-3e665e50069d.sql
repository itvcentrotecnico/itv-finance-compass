grant usage on schema financeiro_hml to authenticated;
revoke all on all tables in schema financeiro_hml from anon, public;

create or replace function financeiro_hml.papel_atual() returns text
language sql stable security definer set search_path = financeiro_hml, pg_temp as $$
  select papel::text from financeiro_hml.perfis where usuario_id = auth.uid() and ativo $$;
create or replace function financeiro_hml.tem_papel(p text[]) returns boolean
language sql stable security definer set search_path = financeiro_hml, pg_temp as $$
  select coalesce(financeiro_hml.papel_atual() = any(p), false) $$;
revoke all on function financeiro_hml.papel_atual() from public, anon;
revoke all on function financeiro_hml.tem_papel(text[]) from public, anon;
grant execute on function financeiro_hml.papel_atual() to authenticated;
grant execute on function financeiro_hml.tem_papel(text[]) to authenticated;

-- perfis
grant select, insert, update on financeiro_hml.perfis to authenticated;
create policy perfis_ler on financeiro_hml.perfis for select to authenticated
  using (usuario_id = auth.uid() or financeiro_hml.tem_papel(array['admin_geral']));
create policy perfis_criar on financeiro_hml.perfis for insert to authenticated
  with check (financeiro_hml.tem_papel(array['admin_geral']) and usuario_id <> auth.uid());
create policy perfis_alterar on financeiro_hml.perfis for update to authenticated
  using (financeiro_hml.tem_papel(array['admin_geral']) and usuario_id <> auth.uid())
  with check (financeiro_hml.tem_papel(array['admin_geral']) and usuario_id <> auth.uid());

create or replace function financeiro_hml.perfis_protecao() returns trigger
language plpgsql security definer set search_path = financeiro_hml, pg_temp as $$
begin
  if tg_op = 'UPDATE' then
    if new.usuario_id <> old.usuario_id then raise exception 'Alteração de usuario_id não permitida'; end if;
    new.criado_em := old.criado_em;
  end if;
  if tg_op in ('UPDATE','DELETE') and old.papel = 'admin_geral' and old.ativo
     and (tg_op = 'DELETE' or new.papel <> 'admin_geral' or not new.ativo) then
    if not exists (select 1 from financeiro_hml.perfis where papel = 'admin_geral' and ativo and usuario_id <> old.usuario_id) then
      raise exception 'Não é permitido remover o último Administrador Geral ativo';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;
revoke all on function financeiro_hml.perfis_protecao() from public, anon, authenticated;
create trigger perfis_protecao before update or delete on financeiro_hml.perfis
  for each row execute function financeiro_hml.perfis_protecao();

-- autoria
create or replace function financeiro_hml.autoria() returns trigger
language plpgsql set search_path = financeiro_hml, pg_temp as $$
begin
  if tg_op = 'INSERT' then
    new.criado_em := now();
    if tg_table_name <> 'plano_contas' then new.criado_por := auth.uid(); end if;
  else
    new.criado_em := old.criado_em;
    if tg_table_name <> 'plano_contas' then new.criado_por := old.criado_por; end if;
  end if;
  return new;
end $$;
revoke all on function financeiro_hml.autoria() from public, anon, authenticated;
create trigger autoria before insert or update on financeiro_hml.plano_contas for each row execute function financeiro_hml.autoria();
create trigger autoria before insert or update on financeiro_hml.centros_custo for each row execute function financeiro_hml.autoria();
create trigger autoria before insert or update on financeiro_hml.contas_financeiras for each row execute function financeiro_hml.autoria();

grant select, insert, update on financeiro_hml.plano_contas, financeiro_hml.centros_custo, financeiro_hml.contas_financeiras to authenticated;

create policy pc_ler on financeiro_hml.plano_contas for select to authenticated using (financeiro_hml.papel_atual() is not null);
create policy pc_criar on financeiro_hml.plano_contas for insert to authenticated with check (financeiro_hml.tem_papel(array['admin_geral','admin_financeiro']));
create policy pc_alterar on financeiro_hml.plano_contas for update to authenticated
  using (financeiro_hml.tem_papel(array['admin_geral','admin_financeiro'])) with check (financeiro_hml.tem_papel(array['admin_geral','admin_financeiro']));

create policy cc_ler on financeiro_hml.centros_custo for select to authenticated using (financeiro_hml.papel_atual() is not null);
create policy cc_criar on financeiro_hml.centros_custo for insert to authenticated with check (financeiro_hml.tem_papel(array['admin_geral','admin_financeiro','analista_financeiro']));
create policy cc_alterar on financeiro_hml.centros_custo for update to authenticated
  using (financeiro_hml.tem_papel(array['admin_geral','admin_financeiro','analista_financeiro'])) with check (financeiro_hml.tem_papel(array['admin_geral','admin_financeiro','analista_financeiro']));

create policy cf_ler on financeiro_hml.contas_financeiras for select to authenticated using (financeiro_hml.papel_atual() is not null);
create policy cf_criar on financeiro_hml.contas_financeiras for insert to authenticated with check (financeiro_hml.tem_papel(array['admin_geral','admin_financeiro']));
create policy cf_alterar on financeiro_hml.contas_financeiras for update to authenticated
  using (financeiro_hml.tem_papel(array['admin_geral','admin_financeiro'])) with check (financeiro_hml.tem_papel(array['admin_geral','admin_financeiro']));