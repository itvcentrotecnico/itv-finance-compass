# M3 — Tesouraria ITV FINANCEIRO HML

## Escopo e autorização
Contas bancárias/caixa, entradas, saídas, transferências, abertura, saldos, extrato e estornos integrados aos cadastros. Exclusivamente Supabase **ayjppexbzpgdkzbehvzw**, **financeiro_hml**; sem GESTÃO ITV, produção ou movimentos fictícios.

Somente inspeção realizada: **nenhuma alteração no banco**. Aprovação autoriza implementar M3 e submeter a migração à aprovação própria; fora do escopo exige nova autorização. M2 foi validada pelo usuário com Administrador Geral; convites e outros perfis ficam para homologação final sem interromper M3.

## 1. Inspeção e reutilização
- Cinco tabelas: perfis, plano_contas, centros_custo, contas_financeiras e auditoria. Todas com RLS habilitado e obrigatório.
- Contas financeiras: id uuid, nome varchar (2–160 caracteres), tipo banco/caixa, moeda BRL, saldo_inicial_centavos bigint, data_saldo_inicial date, ativo, criado_em e criado_por. Sem saldo disponível, identificação bancária detalhada ou proteção específica da atualização de abertura.
- Contas: perfil ativo lê; Administrador Geral/Financeiro cria e altera. authenticated tem SELECT/INSERT/UPDATE, não DELETE; anon sem acesso. Auditoria é lida só pelos administradores, sem escrita pelo usuário.
- Plano de Contas tem natureza, pai, situação e aceite de lançamentos; Centros de Custo tem responsável/situação. M2 oferece autoria, validações e auditoria por triggers.
- Contagens: 0 contas financeiras, 1 conta contábil, 1 centro e 1 Administrador Geral ativo. Não há ledger, transferência, idempotência ou cálculo de saldo.
- Reutilizar login, sessão, proteção financeira, papel_atual/tem_papel, cadastros, controles, erros e identidade ITV com logo oficial/fundo claro. A Tesouraria já existe no registro de módulos: substituir seu estado “Em estruturação”, sem rota paralela.

## 2. Matriz proposta
Sessão válida e perfil ativo obrigatórios. Nenhum perfil exclui fisicamente registros.

| Ação | Geral | Financeiro | Analista | Consulta |
|---|---|---|---|---|
| Ler contas/saldos/extrato/histórico financeiro | Sim | Sim | Sim | Sim |
| Criar conta e abertura; editar/ativar/inativar conta | Sim | Sim | Não | Não |
| Entrada/saída/transferência | Sim | Sim | Sim | Não |
| Estorno com justificativa | Sim | Sim | Não | Não |
| Auditoria técnica antes/depois | Sim | Sim | Não | Não |
| Editar lançamento ou saldo diretamente; excluir | Não | Não | Não | Não |

Consulta Gerencial ganhará somente leitura da Tesouraria, hoje não liberada pelo menu; sem ampliar outros módulos. Não incluir aprovação ou fechamento de caixa, não solicitados.

## 3. Modelo proposto
**contas_financeiras:** reutilizar, acrescentando atualizado_em/por e banco/agencia/numero_conta opcionais, sem credenciais. Abertura e conta criadas atomicamente; campos de abertura imutáveis. Abertura zero tem operação sem efeito monetário. Sem coluna editável de saldo; contas inativas continuam consultáveis.

**tesouraria_operacoes (nova):** id uuid, tipo (abertura/entrada/saida/transferencia/estorno), data_movimento, descricao, valor numeric(18,2), origem/destino, plano_conta_id, centro_custo_id, operacao_original_id, justificativa, chave_idempotencia, criado_em/por. Classificação e centro conforme tipo. Autoria do banco. FKs restritivas para cadastros e original, sem nova FK auth.users em tabelas de negócio. ID estável para integrações futuras, sem vínculos a módulos ainda inexistentes.

**tesouraria_movimentos (nova):** id, operacao_id, conta_financeira_id, direcao credito/debito, valor numeric(18,2) positivo. Não existe sem operação. Entrada: crédito; saída: débito; transferência: um débito e um crédito iguais, contas distintas e mesmo cabeçalho. Abertura negativa: débito absoluto; zero: sem efeito. Validação ao fim da transação garante quantidade/direção/contas/valores.

Cabeçalhos e efeitos confirmados imutáveis, sem UPDATE/DELETE. Estorno cria inversos vinculados ao original, justificados e auditados; unicidade impede repetição e estorno de estorno. Correções exigem estornar e registrar novamente.

## 4. Saldos e extrato
Saldo = créditos − débitos incluindo abertura e estornos, **sem somar novamente saldo_inicial_centavos**. Transferências/abertura nunca são receita/despesa; estornos neutralizam a classificação original.

Saldo inicial do período inclui registros anteriores; final inclui até data final. Filtros período/conta/tipo/categoria; tipo/categoria filtram linhas, não o saldo real: subtotal separado. Transferência consolidada mostra os dois lados; por conta mostra só seu lado. Ordenação data/criação/ID, paginação e totais no banco, sem limite implícito de 1.000 linhas.

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

Implementação: painel Tesouraria na página existente, contratos decimais/validações, matriz e testes, documentação. Funções TanStack autenticadas usam middleware existente e RPC como usuário, sem service_role. Leituras na página protegida; migração pela ferramenta própria, sem editar tipos gerados.

## 7. Riscos e medidas
Transferência parcial: transação e verificação dos efeitos. Duplicação/estorno simultâneo: unicidade e bloqueios. Saldo divergente: ledger imutável, abertura única e agregação no banco. Inativação concorrente: validação com bloqueios. API direta: grants mínimos, RLS, papel verificado nas funções e triggers. Histórico reclassificado: snapshot e proteção de natureza. Precisão: numeric/strings. Extrato incompleto: paginação e totais sem limite implícito.

## 8. Testes e aceite
- Vitest: cada regra financeira, decimal exato/limites, matriz dos quatro perfis, chave estável em reenvio e erros.
- Banco automatizado: mesma conta negada; transferência completa ou nenhuma e fora de receita/despesa; abertura contada uma vez; conta/categoria inativa ou sem aceite negada; centro inativo negado; UPDATE/DELETE direto negado; estorno inverso, único e justificado; idempotência e conflito de conteúdo; concorrência; totais acima de 1.000 linhas e saldo anterior ao filtro.
- Permissões: chamadas diretas como quatro perfis, anônimo e perfil inativo; conferir leitura/escrita/estorno/auditoria. Testes isolados com rollback, sem dados fictícios persistidos. Simulação não será apresentada como homologação real.
- Ponta a ponta com Administrador Geral e dados explicitamente autorizados: conta → lançamento → transferência → extrato → estorno → recarregar e confirmar saldo/histórico; telas largas/estreitas e erros. Não gravar operações de teste permanentes sem autorização. Convites e demais perfis permanecem na homologação final, sem bloquear a implementação.

## 9. Reversão e entrega
Falha na migração reverte sua transação. Antes de uso, reversão aprovada remove somente M3 e restaura grants/triggers anteriores. Depois de uso financeiro: desativar tela, preservar ledger e corrigir por nova migração; nunca apagar histórico, usar DROP CASCADE ou voltar a saldo manual.

Entregar Tesouraria HML, migração/documentação, testes e evidências com pendências explícitas; sem publicação em produção.
