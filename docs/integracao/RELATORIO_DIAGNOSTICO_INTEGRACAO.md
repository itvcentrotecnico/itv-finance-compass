# Diagnóstico de Integração — GESTÃO ITV → ITV FINANCEIRO HML

Data: 26/10/2026. Execução somente leitura, conforme autorização da direção.
Nenhuma alteração foi feita no GESTÃO ITV, no ITV FINANCEIRO HML ou em qualquer banco de dados.

---

## 1. Arquitetura identificada

| Item | GESTÃO ITV | ITV FINANCEIRO HML |
|---|---|---|
| Projeto Lovable | GESTAO ITV CENTRO TECNICO (`6c6015ac-fa4e-460c-9123-c80d81831b6b`) | ITV FINANCEIRO (`2688ea0d-3ed5-4c63-beb5-ce27615a5c09`) |
| Banco de dados | Supabase próprio, ref `lyfgkhryrhytggexvjvn` | Supabase próprio, ref `ayjppexbzpgdkzbehvzw` |
| Esquema | `public` | `financeiro_hml` |
| Publicado em | itvcentrotecnico.lovable.app | itv-financeiro.lovable.app |

**Confirmado: são bancos distintos, em projetos Supabase distintos.** Não existe conexão ativa entre
os dois sistemas hoje — as menções ao GESTÃO ITV no HML são apenas textos de planejamento na
interface. O GESTÃO ITV não possui rotas de API públicas nem webhooks de integração; seu acesso a
dados ocorre pela Supabase Data API com RLS e verificação de permissões nas funções.

## 2. Dados disponíveis para integração

O GESTÃO ITV **não possui uma tabela central de ordens de serviço** nem tabelas próprias de vendas
de televisores. A referência de OS é um campo de texto (`os`) presente em várias tabelas, e a venda
de TV é uma classificação (`grupo_receita = 'venda_tv'`) dentro do caixa.

Fontes financeiras prioritárias (schema `public` do GESTÃO ITV):

| Tabela | Conteúdo | Campos-chave |
|---|---|---|
| `caixa_lancamentos` | Faturamento (serviços, acessórios, venda de TVs) | `id` (UUID), `data_lancamento`, `os`, `cliente` (texto), `grupo_receita`, `valor_bruto`, `desconto`, `valor_final`, `taxas_total`, `receita_liquida`, `status` (ativo/cancelado/estornado), `condicao_recebimento`, `liquida_conta_receber_id` |
| `caixa_pagamentos` | Meios de pagamento de cada lançamento (aceita pagamento misto) | `id`, `lancamento_id`, `forma_pagamento_id`, `valor`, `parcelas`, `taxa_percentual`, `taxa_valor`, `valor_liquido`, snapshot de adquirente/canal/modalidade |
| `contas_receber` | Títulos a receber (faturado/boleto) | `id`, `caixa_lancamento_id`, `cliente_cnpj_id`, `os`, `origem`, `valor_original`, `data_emissao`, `competencia`, `vencimento`, `status`, parcelas |
| `contas_receber_recebimentos` | Recebimentos efetivos de títulos | `id`, `conta_receber_id`, `caixa_lancamento_id`, `data_recebimento`, `valor`, `forma_pagamento_id`, `referencia`, `estorno_de_id`, `motivo_estorno` |
| `caixa_movimentos` | Movimentação de numerário (saldo inicial, suprimento, sangria) | `id`, `data_movimento`, `tipo`, `valor`, `responsavel_id` |
| `caixa_fechamentos` / `caixa_estornos` | Totais diários e reversões | controle — não importar como transações |
| `formas_pagamento` / `formas_pagamento_taxas` / `taxas_recebimento` | Cadastro de formas e taxas por parcela/vigência | dinheiro, Pix, débito, crédito, boleto, Bemol, Saldo Mercado Pago |
| `clientes_cnpj` | Clientes pessoa jurídica estruturados | `cnpj`, `razao_social`, `nome_fantasia`, `telefone`, `email_financeiro` |
| `producao_tecnica` | Execução/validação técnica de OS | `os`, `valor_servico`, `data_execucao`, `validado_em` — **não comprova pagamento** |

Leituras agregadas já existentes: view `contas_receber_saldos`, RPCs `cr_boletos_painel`,
`caixa_indicadores`, `caixa_agg`, `caixa_fisico_resumo`.

## 3. Campos que precisam ser mapeados

| Conceito ITV FINANCEIRO | Origem no GESTÃO ITV | Observação |
|---|---|---|
| Identificador de origem | `caixa_lancamentos.id` / `caixa_pagamentos.id` / `contas_receber_recebimentos.id` | Chave composta: projeto + tabela + UUID |
| Referência de conciliação | `os` (texto) | **Não é único** — o próprio GESTÃO ITV trata OS repetida como alerta confirmável |
| Data da operação | `data_lancamento` / `data_emissao` | `date`, fuso America/Manaus |
| Data do recebimento | `data_recebimento` (títulos) ou `data_lancamento` (recebimento imediato) | distinguir os dois casos |
| Valor contratado | `valor_final` (= bruto − desconto) | |
| Valor recebido | `caixa_pagamentos.valor` / `contas_receber_recebimentos.valor` | |
| Valor pendente | `contas_receber_saldos` (saldo do título) | |
| Forma de pagamento | `formas_pagamento` via `forma_pagamento_id` | mapear para as contas oficiais do HML (Sicredi, Mercado Pago, Caixa Físico) |
| Taxa / valor líquido | `caixa_pagamentos.taxa_valor`, `valor_liquido` | usar o **snapshot gravado no pagamento**, nunca recalcular com o cadastro atual |
| Cliente | `cliente` (texto) ou `clientes_cnpj` | pessoa física só tem nome em texto — conciliação por nome é fraca |

## 4. Riscos de duplicidade

1. **Tripla representação do mesmo ciclo:** faturamento original (`caixa_lancamentos`), título
   (`contas_receber`) e recebimento/liquidação (`contas_receber_recebimentos` + lançamento com
   `liquida_conta_receber_id`) são representações relacionadas do mesmo dinheiro. Somar dois ou
   três deles duplica receita. Regra central: **uma única representação por recebimento**, com
   vínculos preservados.
2. **Cruzamento com a importação da planilha:** o lote set/out 2026 (474 lançamentos, ainda não
   importado) pode conter os mesmos recebimentos que o GESTÃO ITV registra. A referência de origem
   da planilha (aba/célula) e o UUID do GESTÃO ITV são identificadores distintos — a conciliação
   precisa de critérios adicionais (OS, cliente, valor, data, forma), sem assumir que mesmo
   valor+data é duplicado automaticamente.
3. **OS repetida:** `os` é texto livre e pode se repetir em lançamentos distintos; não serve como
   chave de idempotência.
4. **Estornos:** `caixa_lancamentos.status = 'estornado'`, `caixa_estornos` e
   `contas_receber_recebimentos.estorno_de_id` precisam ser traduzidos em estornos auditáveis no
   HML, nunca em exclusão ou em novo lançamento avulso.
5. **Caixa físico:** `caixa_movimentos` (suprimento/sangria/saldo inicial) não é receita comercial;
   importá-lo como entrada inflaria o faturamento.

## 5. Estratégia de sincronização (proposta, não implementada)

- **Direção única:** GESTÃO ITV → ITV FINANCEIRO HML. Nenhuma escrita no GESTÃO ITV.
- **Ancoragem na M3.3:** cada recebimento importado entra em `tesouraria_conferencias` com
  `referencia_origem` única no formato `gestao_itv:<tabela>:<uuid>` — a mesma proteção contra
  duplicidade já usada para a planilha. Só afeta saldo após conciliação e lançamento explícito
  (`tesouraria_lancar_conferencia`).
- **Separação de conceitos:** valor contratado ≠ valor recebido ≠ valor pendente. Orçamento
  aprovado e serviço entregue **não** viram receita automaticamente; só o recebimento efetivo
  (pagamento imediato ou baixa de título) gera conferência.
- **Modo de execução:** sincronização sob demanda (botão na aba Conferência), nunca automática em
  primeiro momento; cada execução é idempotente pela referência de origem.
- **Cartões:** o valor líquido e a taxa vêm do snapshot do pagamento no GESTÃO ITV; a confirmação
  de crédito em conta pela adquirente continua sendo conferência bancária no HML.

## 6. Requisitos de segurança

- **Impedimento atual:** o ITV FINANCEIRO HML **não possui nenhuma credencial de acesso ao banco do
  GESTÃO ITV**. Os secrets do HML contêm apenas as chaves do próprio projeto. Portanto, neste
  momento não existe acesso legítimo disponível para leitura.
- **O que precisa ser configurado (decisão do responsável):**
  1. No GESTÃO ITV: criar uma identidade de leitura dedicada à integração (usuário com perfil de
     consulta, ou papel PostgreSQL somente leitura), com RLS/permissões restritas às tabelas
     financeiras necessárias.
  2. No ITV FINANCEIRO HML: armazenar essa credencial como **secret de servidor** (nunca em
     variável `VITE_*` nem no código do navegador) e usá-la apenas em server functions.
- Nenhuma migração, alteração de permissão, atualização ou exclusão no GESTÃO ITV.
- Toda leitura registrada em auditoria no HML (origem, momento, quantidade de registros).

## 7. Plano de testes (quando o acesso for configurado)

1. Leitura de amostra: contagem e 5 registros de cada tabela financeira, sem gravar nada.
2. Mapeamento: conferir formas de pagamento ativas e taxas contra o cadastro do GESTÃO ITV.
3. Importação simulada em lote de 1 dia: verificar referência de origem única e idempotência
   (reexecutar e confirmar zero duplicados).
4. Conciliação cruzada com a planilha: confirmar que um recebimento presente nos dois lados é
   detectado como o mesmo, sem soma dupla.
5. Estorno: estornar um recebimento no GESTÃO ITV e verificar a reversão auditável no HML.
6. Permissões: confirmar que a credencial de integração não consegue escrever em nenhuma tabela.

## 8. Alterações necessárias exclusivamente no ITV FINANCEIRO HML

1. Secret de servidor com a credencial de leitura do GESTÃO ITV (após configuração do item 6).
2. Server function de leitura (somente consulta) para as tabelas/views financeiras do GESTÃO ITV.
3. Rotina de importação para `tesouraria_conferencias` com `referencia_origem`
   `gestao_itv:<tabela>:<uuid>` e mapeamento de formas de pagamento para as contas oficiais.
4. Tela na aba Conferência para executar a sincronização sob demanda e revisar pendências.
5. Testes locais de idempotência, duplicidade cruzada com a planilha e estornos.

**Nenhuma alteração é necessária no GESTÃO ITV** além da criação da identidade de leitura (item 6),
que é configuração de acesso, não mudança de estrutura.

---

## Questões em aberto

1. Volume e exemplos reais de dados: o diagnóstico usou o código-fonte; o conteúdo atual do banco
   do GESTÃO ITV só pode ser confirmado com o acesso de leitura configurado.
2. Formas de pagamento ativas e taxas em vigor hoje.
3. Semântica das baixas de `despesas`/`contas_pagar` (não rastreada nesta etapa — saídas ficam para
   uma fase posterior, se autorizada).
4. Existência de outro sistema de origem para aprovação/entrega de OS (o GESTÃO ITV não guarda
   essas datas no registro financeiro).
