# ITV FINANCEIRO — Etapa 02: segurança e arquitetura

Data: 23/10/2026. Documento de planejamento, sem alterações em produção.

## Estado verificado no código
- React 19, TypeScript, TanStack Router, React Query e Tailwind.
- Rota `/` com dashboard e indicadores vazios; `/$modulo` usa páginas genéricas.
- O cabeçalho informa "Autenticação pendente de ativação".
- Nenhuma proteção de acesso ou conexão de produção foi validada nesta auditoria.

## Regras de separação
- GESTÃO ITV permanece responsável por OS, vendas, Caixa Diário, lançamentos de balcão e apuração operacional de comissões.
- ITV FINANCEIRO assumirá, após homologação, contas a pagar, gestão de contas a receber, despesas, tesouraria, folha, impostos, DRE e fluxo de caixa.
- Não recriar registros do Caixa como receitas novas. Liquidação de contas a receber deve preservar o identificador original e evitar duplicidade.
- Fornecedores e formas de pagamento são cadastros compartilhados: definir um único responsável por alterações.
- Não alterar GESTÃO ITV nem conectar seu banco de produção nesta etapa.

## Ordem de implementação
1. Autenticação individual e autorização real no servidor/banco.
2. Auditoria de RLS, RPC, privilégios e segredos; negar acesso anônimo.
3. Ambiente de homologação isolado, dados sintéticos e backups.
4. Plano de contas (código, natureza, categoria, status) e centros de custo (código, responsável, status).
5. Contas financeiras (banco/caixa, moeda BRL, saldo inicial com data e trilha de auditoria).
6. Lançamentos e transferências atômicas; idempotência e estorno auditável.
7. Conciliação bancária, contas a pagar/receber e indicadores calculados a partir de lançamentos válidos.

## Critérios de aceite
- Acesso anônimo e perfil somente leitura não conseguem executar escritas, inclusive por API.
- Nenhuma credencial privilegiada no frontend.
- Cada movimentação possui identificador imutável, autor, data, origem e histórico.
- Transferências não alteram o saldo consolidado.
- Reprocessamento não duplica transações.
- Estornos preservam rastreabilidade.
- Conciliação fecha com o Caixa Diário em ciclo paralelo de homologação.
- Revisão de segurança e testes antes de ativar dados financeiros reais.

## Estratégia de implantação
Construir em paralelo, primeiro somente leitura; homologar por pelo menos um fechamento mensal. Transferir responsabilidade de escrita por domínio apenas com reconciliação, backup e rollback aprovados.

**Não incluído:** mudanças no GESTÃO ITV, migração, conexão a Supabase de produção, lançamentos reais ou publicação automática.
