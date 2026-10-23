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
Uma migração versionada, submetida pela ferramenta própria somente após aprovação:
1. Revalidar estrutura, políticas e ausência de contas. Se surgirem contas antes da aplicação, abortar e apresentar conversão de abertura para revisão, sem inventar movimentos.
2. Acrescentar os campos cadastrais/autoria e criar tabelas, vínculos, índices e unicidades. Grants explícitos, RLS habilitado e obrigatório, leitura por perfil ativo; nenhum acesso a anon.
3. Preservar políticas M1/M2. Nas contas, restringir grants diretos à leitura/atualização de campos cadastrais; criação e abertura exclusivamente transacionais. Triggers bloqueiam alteração de saldo/data de abertura, identidade e autoria.
4. Novas tabelas: SELECT para authenticated, nenhum INSERT/UPDATE/DELETE direto. Funções de escrita controladas; revogar EXECUTE padrão de PUBLIC/anon e liberar somente entradas a authenticated.
5. RPCs propostas: `tesouraria_criar_conta`, `tesouraria_lancar`, `tesouraria_transferir`, `tesouraria_estornar`, `tesouraria_extrato`, `tesouraria_saldos`. Escritas SECURITY DEFINER de escopo mínimo, objetos qualificados, search_path seguro e sem SQL dinâmico. Toda chamada verifica auth.uid() e tem_papel antes da escrita, porque o privilégio elevado não pode depender apenas de RLS. Não aceitar papel/usuário/autoria do cliente; auxiliares não públicas. Leituras sob RLS.
6. Triggers de validação, imutabilidade e auditoria de contas; preservar acesso restrito à auditoria técnica. Validações temporais em triggers, não CHECK com now(). Índices em conta/data/classificação, chave idempotente única por usuário e unicidade de estorno por original.

Validar contas ativas, classificação ativa com aceite, centro ativo quando informado, valor e relações por tipo e data não anterior à abertura. Abertura/transferência não levam classificação de receita/despesa. Não presumir que entrada é sempre receita: preservar natureza para futura DRE.

Idempotência: mesma chave e conteúdo normalizado retorna original; conteúdo diferente falha. Reserva e escrita atômicas. Bloqueios determinísticos de contas/classificações impedem corrida com inativação; falha em qualquer lado reverte a transferência inteira.

Precisão: strings decimais na API e numeric no banco; conversão exata dos centavos legados. Nunca Number/parseFloat/soma financeira JS. Rejeitar mais de duas casas, sem arredondar silenciosamente.

Premissas propostas: BRL; não proibir saldo negativo sem regra autorizada; estorno exige conta ativa, com reativação administrativa prévia se necessário. Snapshot da classificação vigente e bloqueio de mudança de natureza já utilizada preservam histórico.

## 6. Telas e aplicação
Abas Contas, Movimentações e Extrato; saldos e estados vazios reais. Formulários de abertura, entrada/saída e transferência; estorno com justificativa; detalhes com original/estorno, lados da transferência e autoria. Filtros, paginação, carregamento, erros de permissão/validação, bloqueio de duplo envio e recuperação de resultado após falha de conexão.

Arquivos previstos: `src/components/tesouraria/*`, contratos/validações em `src/lib/tesouraria.ts`, chamadas autenticadas em `src/lib/tesouraria.functions.ts`, matriz/testes `src/lib/auth/permissions*`, integração no `src/routes/_authenticated/$modulo.tsx` e documentação AGENTS/roadmap. Migração gerada pela ferramenta própria. Middleware existente e funções TanStack autenticadas chamam RPC como usuário, sem service_role. Leituras iniciais na página protegida com cache de consultas; não alterar tipos gerados.

## 7. Riscos e medidas
Transferência parcial: transação e verificação dos efeitos. Duplicação/estorno simultâneo: unicidade e bloqueios. Saldo divergente: ledger imutável, abertura única e agregação no banco. Inativação concorrente: validação com bloqueios. API direta: grants mínimos, RLS, papel verificado nas funções e triggers. Histórico reclassificado: snapshot e proteção de natureza. Precisão: numeric/strings. Extrato incompleto: paginação e totais sem limite implícito.

## 8. Testes e aceite
- Vitest: cada regra financeira, decimal exato/limites, matriz dos quatro perfis, chave estável em reenvio e erros.
- Banco automatizado: mesma conta negada; transferência completa ou nenhuma e fora de receita/despesa; abertura contada uma vez; conta/categoria inativa ou sem aceite negada; centro inativo negado; UPDATE/DELETE direto negado; estorno inverso, único e justificado; idempotência e conflito de conteúdo; concorrência; totais acima de 1.000 linhas e saldo anterior ao filtro.
- Permissões: chamadas diretas como quatro perfis, anônimo e perfil inativo; conferir leitura/escrita/estorno/auditoria. Testes isolados com rollback, sem dados fictícios persistidos. Simulação não será apresentada como homologação real.
- Ponta a ponta com Administrador Geral e dados explicitamente autorizados: conta → lançamento → transferência → extrato → estorno → recarregar e confirmar saldo/histórico; telas largas/estreitas e erros. Não gravar operações de teste permanentes sem autorização. Convites e demais perfis permanecem na homologação final, sem bloquear a implementação.

## 9. Reversão e entrega
Falha durante a migração reverte sua transação. Antes de movimentações, reversão aprovada pode remover apenas objetos M3 e restaurar grants/triggers anteriores. **Após uso financeiro, não apagar ledger nem voltar a saldo manual:** desativar a interface M3, preservar registros e corrigir por migração posterior; não fazer DROP CASCADE ou apagar cadastros M1/M2.

Entrega após aprovação: Tesouraria operacional no HML, migração e decisões documentadas, testes executados com evidências e pendências de homologação explícitas. Nenhuma publicação em produção.