# M3 — Tesouraria ITV FINANCEIRO HML

## Escopo e autorização
Implementar contas bancárias e caixa físico, entradas, saídas, transferências, saldo inicial, saldo disponível, extrato e estornos rastreáveis, integrados aos cadastros existentes. Exclusivamente Supabase **ayjppexbzpgdkzbehvzw**, esquema **financeiro_hml**. Sem GESTÃO ITV, publicação em produção ou movimentações fictícias.

Esta etapa realizou apenas consultas no banco e revisão da aplicação. **Nenhuma migração ou configuração foi executada.** A aprovação deste plano autoriza a implementação M3 e a submissão da migração pelo mecanismo de aprovação; alterações fora do escopo exigem nova autorização.

Os testes funcionais de Plano de Contas e Centros de Custo com Administrador Geral foram confirmados pelo usuário. Convites e demais perfis continuam na homologação final, sem interromper a M3 autorizada.

## 1. Inspeção confirmada
- Cinco tabelas existentes: `perfis`, `plano_contas`, `centros_custo`, `contas_financeiras`, `auditoria`. Todas com RLS habilitado e obrigatório.
- `contas_financeiras`: `id uuid`, `nome varchar`, `tipo varchar` (`banco` ou `caixa`), `moeda char` (somente BRL), `saldo_inicial_centavos bigint`, `data_saldo_inicial date`, `ativo boolean`, `criado_em timestamptz`, `criado_por uuid`. Não possui campo de saldo disponível nem dados bancários detalhados.
- Restrições existentes: nome entre 2 e 160 caracteres, tipos banco/caixa, BRL, chave primária e autoria. **Não existe proteção específica do saldo inicial contra atualização direta.**
- Políticas de contas: leitura por perfil ativo; criação/alteração apenas Administrador Geral e Financeiro. `authenticated` tem SELECT/INSERT/UPDATE e não DELETE. `anon` não tem acesso ao esquema ou às tabelas.
- Plano de Contas fornece natureza, hierarquia, situação e aceite de lançamentos. Centros de Custo fornece descrição, responsável e situação. M2 já possui validações, autoria e auditoria por triggers.
- Auditoria: tabela, registro, ação, usuário, data, antes/depois. Leitura apenas pelos dois administradores; usuários não podem escrever nela.
- Contagens na inspeção: **0 contas financeiras, 1 conta contábil, 1 centro de custo, 1 perfil ativo Administrador Geral**. Nenhum conteúdo financeiro foi importado ou usado como exemplo.
- Não há tabela de movimentações, operação de transferência, idempotência ou cálculo de saldo.

## 2. O que será reutilizado
Login e sessão existentes, proteção de páginas financeiras, `papel_atual`/`tem_papel`, cadastros M2, identidade ITV com logo oficial e fundo claro, controles e tratamento de erros existentes.

Tesouraria já está no registro de módulos. Sua tela operacional substituirá o estado “Em estruturação” dentro da página existente; não haverá navegação paralela. A matriz atual será espelhada nas regras do banco e ajustada para explicitar as ações M3.

## 3. Matriz proposta
Todas as permissões exigem sessão válida e perfil ativo. Não haverá exclusão física para nenhum perfil.

| Ação | Admin. Geral | Admin. Financeiro | Analista Financeiro | Consulta Gerencial |
|---|---|---|---|---|
| Consultar contas, saldos, extrato e vínculos | Sim | Sim | Sim | Sim |
| Criar contas e informar saldo inicial | Sim | Sim | Não | Não |
| Editar dados cadastrais, ativar/inativar contas | Sim | Sim | Não | Não |
| Registrar entrada/saída | Sim | Sim | Sim | Não |
| Transferir entre contas | Sim | Sim | Sim | Não |
| Estornar operação, com justificativa | Sim | Sim | Não | Não |
| Consultar histórico financeiro das operações | Sim | Sim | Sim | Sim |
| Consultar auditoria técnica antes/depois | Sim | Sim | Não | Não |
| Alterar lançamento confirmado ou saldo diretamente | Não | Não | Não | Não |
| Excluir fisicamente contas/operações/movimentos | Não | Não | Não | Não |

Consulta Gerencial terá **somente leitura da Tesouraria**, hoje não liberada no menu por `can()`. Isso não concede escrita nem acesso a outros módulos. Não incluir fluxo de aprovação ou fechamento de caixa nesta M3: não foi solicitado.

## 4. Modelo financeiro e relacionamentos propostos
### Reutilizar `contas_financeiras`
- Acrescentar `atualizado_em`/`atualizado_por` e dados opcionais de identificação bancária (`banco`, `agencia`, `numero_conta`), sem credenciais bancárias.
- Preservar campos de abertura existentes, mas torná-los imutáveis após criação. Conta e respectivo registro de abertura nascem na mesma transação; abertura zero fica registrada como operação de abertura sem efeito monetário.
- Não criar coluna editável de saldo disponível. Contas inativas continuam consultáveis; novas movimentações nelas são rejeitadas.

### Nova `tesouraria_operacoes` — cabeçalho imutável
`id uuid`, `tipo` (abertura/entrada/saida/transferencia/estorno), `data_movimento date`, `descricao`, `valor numeric(18,2)`, `conta_origem_id`/`conta_destino_id`, `plano_conta_id` opcional conforme tipo, `centro_custo_id` opcional, `operacao_original_id` para estorno, `justificativa`, `chave_idempotencia uuid`, `criado_em`, `criado_por uuid`.

Chaves estrangeiras para contas, Plano de Contas, Centros de Custo e operação original, com remoção restrita. Autoria preenchida pelo banco, sem FK nova para `auth.users` nas tabelas de negócio. Sem referência a Contas a Pagar/Receber ainda inexistentes; o ID estável da operação servirá para integração posterior.

### Nova `tesouraria_movimentos` — efeitos de saldo imutáveis
`id uuid`, `operacao_id`, `conta_financeira_id`, `direcao` (credito/debito), `valor numeric(18,2)` positivo. Abertura zero não gera efeito; abertura negativa é representada por débito do valor absoluto. Nenhum movimento pode existir sem operação.

- Entrada: um crédito; saída: um débito; transferência: **um débito e um crédito de mesmo valor**, em contas distintas, no mesmo cabeçalho.
- Estorno: novo cabeçalho ligado ao original e efeitos exatamente inversos, com justificativa e autoria. Unicidade impede segundo estorno; não permitir estorno de estorno. Correção de classificação/valor exige estornar e registrar nova operação.
- A integridade da quantidade, direção, contas e valores dos movimentos será verificada no banco ao final da transação. Cabeçalhos e efeitos não podem ser editados/excluídos depois de confirmados.

### Saldos e extrato
Saldo = soma de créditos − soma de débitos, incluindo abertura e estornos. **Não somar novamente o campo legado de saldo inicial.** Abertura e transferências são identificadas separadamente e nunca tratadas como receita/despesa. Estornos mantêm o vínculo e neutralizam a classificação original.

Saldo de abertura do período inclui efeitos anteriores ao filtro; saldo final inclui efeitos até a data final. Filtros de tipo/categoria selecionam linhas, mas não podem adulterar o saldo real da conta: resultados filtrados têm subtotal separado. Transferências mostram os dois lados no extrato consolidado e apenas o lado correspondente no extrato de uma conta. Ordenação estável por data, criação e ID; paginação e totais no banco, sem depender do limite de 1.000 linhas.

## 5. Migração M3 e segurança — detalhes técnicos
Uma migração versionada, submetida pela ferramenta de migração somente após aprovação:

1. Revalidar estrutura, políticas e existência de contas; abortar em divergência não prevista. Como hoje não há contas, não será necessário converter saldos existentes. Se surgirem contas antes da aplicação, apresentar tratamento de abertura para nova revisão, sem inventar movimentos.
2. Acrescentar dados cadastrais/autoria às contas e criar as duas tabelas, índices, vínculos e unicidades. Grants explícitos seguidos de RLS habilitado e obrigatório e políticas de leitura por perfil ativo. Nenhum grant a `anon`.
3. Preservar as políticas M1/M2. Nas contas, restringir os grants diretos: leitura e atualização apenas dos campos cadastrais permitidos; criação/abertura exclusivamente por função transacional. Trigger bloqueia alterações de saldo/data de abertura, identidade e autoria, mesmo por caminhos alternativos.
4. Nas novas tabelas, conceder SELECT a `authenticated`, **sem INSERT/UPDATE/DELETE diretos**. Escrita exclusivamente por funções SQL controladas; revogar EXECUTE padrão de PUBLIC/anon e liberar somente as funções de entrada a authenticated.
5. Funções propostas: `tesouraria_criar_conta`, `tesouraria_lancar`, `tesouraria_transferir`, `tesouraria_estornar`, `tesouraria_extrato` e `tesouraria_saldos`. As funções de escrita são `SECURITY DEFINER` de escopo mínimo, sem SQL dinâmico, com objetos qualificados e `search_path` seguro. Como executam com privilégio elevado, **validam `auth.uid()` e `tem_papel` no banco em toda chamada** antes da escrita; não confiar apenas em RLS ou na tela. Nunca aceitar usuário/papel/autoria enviados pelo cliente. Leitura permanece sob RLS; funções auxiliares não ficam abertas ao público.
6. Triggers de validação e imutabilidade, auditoria de contas com os mecanismos existentes e rastreabilidade dos cabeçalhos/estornos. Não alterar o acesso à auditoria técnica. Validações temporais usam triggers, não CHECK dependente de `now()`.
7. Índices em data/conta/classificação/operação; unicidade para idempotência por usuário e chave, e para estorno por original.

As funções verificam contas ativas, conta contábil ativa e que aceita lançamentos, centro ativo quando informado, relações obrigatórias por tipo, valor válido e data não anterior à abertura. Transferência/abertura não levam classificação de receita/despesa. Não presumir que toda entrada é receita: a natureza contábil será preservada para a futura DRE.

Idempotência compara o conteúdo normalizado: repetição com a mesma chave e dados retorna a operação original; mesma chave com conteúdo diferente gera erro. Reserva da chave e gravação financeira são atômicas. Bloqueios em ordem determinística nas contas e classificações evitam corrida com inativação; falha em qualquer lado da transferência reverte toda a operação.

**Precisão:** valores recebidos/retornados como strings decimais; PostgreSQL calcula com `numeric`, abertura legado converte centavos exatamente. Não usar `Number`, `parseFloat` ou soma financeira em JavaScript. Rejeitar mais de duas casas em vez de arredondar silenciosamente.

**Premissas propostas:** somente BRL; não impor proibição de saldo negativo sem regra autorizada; estorno exige contas ativas (reativação administrativa prévia se necessário), preservando a proibição de movimentos em contas inativas. Não permitir mudar natureza de classificação já utilizada, para não reescrever a leitura histórica; registrar também a classificação vigente no momento da operação.

## 6. Telas e aplicação
Abas **Contas**, **Movimentações** e **Extrato**, saldos e estados vazios reais. Formulários de conta/abertura, entrada/saída e transferência; confirmação de estorno com justificativa; detalhes com vínculo da transferência, original/estorno e autoria. Pesquisa, filtros e paginação; carregamento, erros de validação e permissão, prevenção de duplo envio e confirmação de resultado após falha de conexão.

Arquivos previstos: `src/components/tesouraria/*`, contratos/validações em `src/lib/tesouraria.ts`, funções autenticadas em `src/lib/tesouraria.functions.ts`, matriz e testes em `src/lib/auth/permissions*`, integração em `src/routes/_authenticated/$modulo.tsx`, documentação em `AGENTS.md`/`roadmap.md`. Migração gerada somente pela ferramenta própria.

Reutilizar middleware e bearer existentes; funções TanStack autenticadas chamam SQL RPC no contexto do usuário, sem cliente administrativo. Leituras iniciais sob a página protegida com cache de consultas; não buscar dados privados na página de login. Não modificar tipos Supabase gerados manualmente.

## 7. Riscos e prevenção
| Risco | Medida |
|---|---|
| Transferência parcial | Transação única e validação dos dois efeitos |
| Requisição repetida / estorno simultâneo | Unicidade, comparação de conteúdo e bloqueio |
| Saldo divergente | Livro imutável, abertura única e agregação no banco |
| Inativação/classificação concorrente | Bloqueios e validação transacional |
| Bypass por API direta | Grants mínimos, RLS, funções com verificação de papel e triggers |
| Reclassificação histórica | Snapshot e proteção da natureza utilizada |
| Perda de precisão | Strings decimais e numeric; zero cálculo float |
| Extrato incompleto | Paginação e totais calculados sem limite implícito |

## 8. Testes e critérios de aceite
- Vitest: cada regra financeira, parsing decimal exato e limites; matriz concreta dos quatro perfis; envio repetido mantém chave; tratamento de erros.
- Banco automatizado: mesma conta negada; transferência completa ou nenhuma; transferência não aumenta receita/despesa; saldo inicial contado uma vez; conta/categoria inativa ou sem aceite negada; centro inativo negado; UPDATE/DELETE direto negados; estorno inverso e único; justificativa obrigatória; repetição idêntica retorna mesmo ID e conteúdo diferente falha; concorrência; totais acima de 1.000 linhas e saldo anterior ao período.
- Permissões: chamadas diretas com identidade de cada perfil, anônimo e perfil inativo; confirmar leitura/escrita/estorno/auditoria permitidos e negados. Testes isolados com rollback, sem registros fictícios persistidos no HML. Resultados simulados não serão apresentados como homologação real.
- Ponta a ponta com Administrador Geral e dados de teste explicitamente autorizados: criar conta, lançar, transferir, filtrar, estornar, recarregar e confirmar saldo/histórico; verificar telas largas/estreitas e ausência de erros. Não gravar operações de teste permanentes sem autorização específica. Demais perfis/convites ficam identificados como pendentes da homologação final, sem bloquear a implementação.

## 9. Reversão e entrega
Falha durante a migração reverte sua transação. Antes de movimentações, reversão aprovada pode remover apenas objetos M3 e restaurar grants/triggers anteriores. **Após uso financeiro, não apagar ledger nem voltar a saldo manual:** desativar a interface M3, preservar registros e corrigir por migração posterior; não fazer DROP CASCADE ou apagar cadastros M1/M2.

Entrega após aprovação: Tesouraria operacional no HML, migração e decisões documentadas, testes executados com evidências e pendências de homologação explícitas. Nenhuma publicação em produção.