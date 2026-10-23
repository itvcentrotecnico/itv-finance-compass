# Proposta técnica — Autenticação e permissões ITV FINANCEIRO HML

Ambiente: somente o banco de homologação ayjppexbzpgdkzbehvzw. Nada será executado sem sua aprovação expressa.

## 1. O que existe hoje (inspeção real)

| Tabela | Colunas | Observações |
|---|---|---|
| perfis | usuario_id (chave, ligado ao usuário com exclusão em cascata), papel, ativo, criado_em | papel limitado aos 4 perfis; 1 perfil por usuário; 0 registros |
| plano_contas | id, codigo (único), descricao, natureza (receita/despesa/ativo/passivo/patrimonio), conta_pai_id, aceita_lancamentos, ativo, criado_em | sem criado_por |
| centros_custo | id, codigo (único), descricao, responsavel, ativo, criado_em, criado_por | |
| contas_financeiras | id, nome, tipo (banco/caixa), moeda (BRL), saldo_inicial_centavos, data_saldo_inicial, ativo, criado_em, criado_por | |

- A proteção por linha está ligada e é obrigatória nas 4 tabelas, sem nenhuma regra: hoje o acesso é bloqueado para todos.
- Os perfis de acesso do aplicativo não têm permissão de uso da área `financeiro_hml`.
- Existe 1 usuário cadastrado no login e nenhum perfil vinculado.

## 2. Matriz de permissões (perfil x tabela)

L = ler, C = criar, A = alterar, I = inativar (não haverá exclusão física pelo aplicativo)

| Tabela | Adm. Geral | Adm. Financeiro | Analista | Consulta |
|---|---|---|---|---|
| perfis | L todos, C, A | L o próprio | L o próprio | L o próprio |
| plano_contas | L C A I | L C A I | L | L |
| centros_custo | L C A I | L C A I | L C A | L |
| contas_financeiras | L C A I | L C A I | L | L |

- O Analista não altera a estrutura contábil nem as contas bancárias (privilégio mínimo); ele opera nos centros de custo e nos futuros lançamentos.
- Um perfil inativo (ativo = false) não tem acesso a nada.
- As aprovações ficam para os módulos de lançamentos, em etapa futura.
- O arquivo de permissões da interface será ajustado para espelhar exatamente esta matriz.

## 3. Vínculo seguro com o usuário e proteção contra elevação de privilégio

- O vínculo existente `perfis.usuario_id` → usuário de login será mantido.
- Funções protegidas `financeiro_hml.papel_atual()` e `financeiro_hml.tem_papel(papeis[])` vão ler o perfil ativo do usuário logado. São usadas pelas regras, sem verificação em cascata.
- Somente o Administrador Geral cria e altera perfis. Ninguém altera o próprio perfil, e um gatilho bloqueia:
  - a mudança do próprio papel ou do próprio status;
  - a remoção ou inativação do último Administrador Geral ativo.
- Os campos `criado_por` e `criado_em` são preenchidos pelo banco (gatilho) e não podem ser forjados.
- A troca de `usuario_id` é proibida.

## 4. Primeiro Administrador Geral

Criação feita uma única vez por você, sem passar pelo aplicativo:
1. Convidar o e-mail em Supabase → Authentication → Users → Invite user.
2. Executar no SQL Editor (como dono do banco):
   `insert into financeiro_hml.perfis (usuario_id, papel) select id,'admin_geral' from auth.users where email='SEU_EMAIL';`

Não haverá promoção automática, como "o primeiro cadastrado vira administrador".

## 5. Fluxos de acesso

- **Cadastro público:** desligado (Authentication → Sign In / Providers → "Allow new users to sign up" = off). Esse ajuste é seu, pelo painel; a tela não terá botão de cadastro.
- **Login** (`/auth`): e-mail e senha, mensagens neutras ("e-mail ou senha inválidos"), carregamento visível e identidade ITV.
- **Convite:** o Administrador Geral convida em Usuários. Uma função do servidor verifica o papel dele e chama o convite com a chave de serviço, que fica só no servidor. A mesma função cria o perfil. O link leva a `/definir-senha`, que pede a senha inicial (mínimo de 12 caracteres).
- **Recuperação:** `/recuperar-senha` envia o link (resposta igual se o e-mail existir ou não). `/redefinir-senha` define a nova senha.
- **Sem perfil ou perfil inativo:** a tela "Acesso não liberado" aparece e a sessão é encerrada.
- **Saída:** cancela as consultas, limpa o cache, encerra a sessão e volta para `/auth` sem permitir o botão Voltar.
- **URLs de redirecionamento a cadastrar:** domínio de pré-visualização e domínio publicado, com `/definir-senha` e `/redefinir-senha`.

## 6. Ajustes no aplicativo

- Expor `financeiro_hml` na API do Supabase (Settings → API → Exposed schemas): ajuste seu, pelo painel.
- O cliente usa `.schema('financeiro_hml')`; as variáveis de ambiente atuais serão mantidas.
- Todas as páginas financeiras (Dashboard e /$modulo) vão para a área protegida; as páginas de login, convite e recuperação ficam públicas.
- O menu e os botões serão ocultados conforme o perfil, sempre com o banco como autoridade.
- Os indicadores continuam vazios, sem dados reais.

## 7. Migração proposta (M1)

```sql
grant usage on schema financeiro_hml to authenticated;
revoke all on all tables in schema financeiro_hml from anon, public;

create or replace function financeiro_hml.papel_atual() returns text
language sql stable security definer set search_path = financeiro_hml, pg_temp as $$
  select papel from financeiro_hml.perfis where usuario_id = auth.uid() and ativo $$;
create or replace function financeiro_hml.tem_papel(p text[]) returns boolean
language sql stable security definer set search_path = financeiro_hml, pg_temp as $$
  select coalesce(financeiro_hml.papel_atual() = any(p), false) $$;
revoke all on function financeiro_hml.papel_atual(), financeiro_hml.tem_papel(text[]) from public, anon;
grant execute on function financeiro_hml.papel_atual(), financeiro_hml.tem_papel(text[]) to authenticated;

-- perfis
grant select, insert, update on financeiro_hml.perfis to authenticated;
create policy perfis_ler on financeiro_hml.perfis for select to authenticated
  using (usuario_id = auth.uid() or financeiro_hml.tem_papel(array['admin_geral']));
create policy perfis_criar on financeiro_hml.perfis for insert to authenticated
  with check (financeiro_hml.tem_papel(array['admin_geral']));
create policy perfis_alterar on financeiro_hml.perfis for update to authenticated
  using (financeiro_hml.tem_papel(array['admin_geral']) and usuario_id <> auth.uid())
  with check (financeiro_hml.tem_papel(array['admin_geral']) and usuario_id <> auth.uid());
-- gatilho perfis_protecao: impede troca de usuario_id e inativação/rebaixamento do último admin_geral ativo

-- cadastros (mesmo padrão para plano_contas, centros_custo, contas_financeiras)
grant select, insert, update on financeiro_hml.plano_contas, financeiro_hml.centros_custo,
  financeiro_hml.contas_financeiras to authenticated;
create policy pc_ler on financeiro_hml.plano_contas for select to authenticated
  using (financeiro_hml.papel_atual() is not null);
create policy pc_criar on financeiro_hml.plano_contas for insert to authenticated
  with check (financeiro_hml.tem_papel(array['admin_geral','admin_financeiro']));
create policy pc_alterar on financeiro_hml.plano_contas for update to authenticated
  using (financeiro_hml.tem_papel(array['admin_geral','admin_financeiro']))
  with check (financeiro_hml.tem_papel(array['admin_geral','admin_financeiro']));
-- centros_custo: criar/alterar também para analista_financeiro
-- contas_financeiras: igual a plano_contas
-- gatilhos preenchem criado_por = auth.uid() no insert e impedem alterar criado_por/criado_em
-- nenhuma permissão de exclusão é concedida
```

Nenhuma permissão é concedida a `anon`. A chave de serviço nunca chega ao navegador. A proteção por linha permanece ligada e obrigatória.

**Reversão (R1):** remover as regras e os gatilhos criados, remover as funções, revogar as permissões de `authenticated` nas 4 tabelas e o uso do esquema. O banco volta ao estado atual, totalmente bloqueado. Nenhuma tabela ou dado é apagado.

## 8. Testes

Testes automáticos no banco, simulando cada perfil com transação desfeita ao final:
- Visitante sem login: nenhuma leitura em nenhuma tabela.
- Usuário logado sem perfil, ou com perfil inativo: nada é lido.
- Consulta: lê os 3 cadastros; não cria nem altera nada; vê só o próprio perfil.
- Analista: cria e altera centros de custo; não altera o plano de contas nem as contas financeiras.
- Adm. Financeiro: gerencia os 3 cadastros; não lê outros perfis nem altera perfis.
- Adm. Geral: gerencia perfis; não altera o próprio papel; não inativa o último Administrador Geral.
- Ninguém exclui registros; `criado_por` não pode ser forjado.

Testes no aplicativo:
- matriz de permissões da interface;
- redirecionamento de páginas protegidas para `/auth`;
- saída limpando o cache;
- login, convite, recuperação e saída no ambiente HML, com Playwright.

## 9. Ordem de execução após aprovação

1. Você: desligar o cadastro público, expor `financeiro_hml` e cadastrar as URLs de redirecionamento.
2. Executar M1 (após seu "aprovo M1") e rodar os testes de acesso no banco.
3. Você: criar o primeiro Administrador Geral (seção 4).
4. Implementar as telas e a proteção das páginas; validar ponta a ponta.
5. Apresentar os arquivos alterados e os testes executados ou pendentes.

Fora do escopo: GESTÃO ITV, produção e dados financeiros reais.
