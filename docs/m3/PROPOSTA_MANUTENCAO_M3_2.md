# ITV FINANCEIRO HML — Proposta de manutenção para M3.2

23/10/2026 • Destino autorizado: Supabase `ayjppexbzpgdkzbehvzw`, esquema `financeiro_hml`.

## Resultado

**Solução PostgreSQL validada localmente; aplicação no HML ainda não autorizada nesta etapa.** Nenhuma consulta ou alteração remota foi executada neste trabalho. Não repetimos a inspeção HML. A proposta não adiciona funcionalidades financeiras nem modifica M1/M2 ou o SQL M3.2 aprovado.

## Mecanismo recomendado

Janela exclusiva com **admissão de conexões fechada no banco + drenagem voluntária de todas as conexões físicas + controle dos escritores de fundo + bloqueios do SQL final**. Preferir operação assistida pelo responsável pelo cluster se os serviços hospedados não puderem ser drenados pelos acessos disponíveis.

1. Manter **A**, conexão física fixa no banco alvo, reservada para aplicação e validação. Não usar pool transacional ou ferramenta que reconecte a cada comando.
2. Estabelecer **B**, conexão administrativa fixa em **outro banco do mesmo cluster**, com autoridade para alterar a configuração do banco alvo. Verificar previamente a possibilidade real de recuperação por B. Não usar outro projeto como substituto.
3. Por B, confirmar nome real/dono e estado inicial, executar e confirmar `ALTER DATABASE <banco_alvo> ALLOW_CONNECTIONS false`.
4. Parar produtores/retries, drenar chamadas e solicitar fechamento gracioso das conexões físicas dos pools, admins e scripts. Acompanhar todos os PIDs até desconexão. Não cancelar/terminar automaticamente nenhuma sessão.
5. Verificar zero outros clientes, zero transações preparadas e controle dos workers. Reconciliar conexões cuja inicialização já estava em trânsito ao fechar a admissão; não usar uma amostra isolada como prova.
6. Na mesma A, executar exclusivamente o SQL final, que adquire os três locks `ACCESS EXCLUSIVE NOWAIT` **antes** das contagens e mantém tudo até COMMIT/ROLLBACK. Se contas, operações ou movimentos tiverem registros, abortar sem removê-los.
7. Validar ainda com admissão fechada; B só reabre após resultado conhecido e controles íntegros. Retomar pools e produtores graciosamente.

**Correção descoberta nos testes:** PostgreSQL 17.9 rejeita fechar o banco da própria conexão (`cannot disallow connections for current database`). Portanto B não é apenas contingência: é obrigatória também para ativação. Não propor execução dessa barreira pelo SQL Editor conectado ao próprio banco alvo.

### Por que cobre chamadas antigas

`ALLOW_CONNECTIONS false` recusa novas conexões comuns inclusive de superusuário, mas **não impede novas queries em conexões existentes**. Por isso todas as conexões físicas, inclusive idle, idle-in-transaction, administrativas e chamadas aguardando advisory lock, devem terminar e desconectar antes da migração. Uma chamada anterior ao primeiro lock financeiro aparece como backend ativo/aguardando; sua ausência de lock não autoriza avançar.

As quatro RPCs entram no mesmo conjunto de clientes: `tesouraria_criar_conta`, `tesouraria_lancar`, `tesouraria_transferir`, `tesouraria_estornar`. Escrita direta administrativa e UPDATE por coluna de contas também são abrangidos. Triggers executam na transação do escritor e os efeitos permanecem atômicos. Não se afirma que a barreira sozinha drena chamadas.

## SQL adicional e escopo

`MANUTENCAO_PROPOSTA.sql` é um **roteiro administrativo em etapas para duas sessões**, não uma nova migração financeira nem um arquivo executável inteiro numa conexão. Usa uma variável para o nome real do banco, que ainda deve ser verificado: Project ID não é nome PostgreSQL.

| Escopo | Alteração |
|---|---|
| Banco alvo / catálogo `pg_database` | `datallowconn`: true → false → true, em transações administrativas separadas |
| Conexões e serviços | Indisponibilidade temporária do banco inteiro; fechamento voluntário dos pools e pausa de escritores |
| Grants, roles, RLS, triggers, tabelas financeiras | Nenhuma alteração adicional pela manutenção |
| SQL M3.2 | Nenhuma diferença; SHA-256 `66c47b7d9292c45f1580f32f1b59937047ba36b294f0eac9d914f188a1817401` |

Os sete objetos da M3.2 permanecem os mesmos: substituição de `tes_validar_efeitos()`, `tes_executar(jsonb)` e `tesouraria_extrato(jsonb)`; criação do índice `tes_op_abertura_conta_uq`, função `tes_conta_exige_abertura()`, trigger `tes_conta_abertura` e função `tesouraria_historico_operacoes(jsonb)`, todos em `financeiro_hml`. As revogações/grant previstos no SQL final permanecem idênticos.

## Evidências locais — 13/13 verificações aprovadas

PostgreSQL **17.9**, socket local `/tmp/m3-review/socket:55439`. Bases descartáveis reconstruídas de fixtures e migrações para testes, sem credenciais ou dados HML. Sessões reais concorrentes, sem mocks, sem cancelamento, sem `DROP ... FORCE`.

| Teste | Evidência |
|---|---|
| Identidade do SQL final | SHA-256 exato verificado pelo teste |
| Quatro RPCs antigas antes do primeiro lock | Cada RPC realmente iniciada aguarda advisory lock; PID observado em `pg_blocking_pids`, zero locks nas três tabelas; gate fechado durante espera; conclusão/rollback voluntário |
| Novas conexões durante manutenção | Duas conexões locais owner/superuser recusadas pelo PostgreSQL |
| Sessão idle administrativa preexistente | Continua capaz de UPDATE real em cadastro; rollback; impede a declaração de drenagem enquanto conectada |
| Drenagem completa | Zero outros clientes e transações preparadas, gate fechado; nenhum cancelamento |
| Aplicação após drenagem | SQL integral aplicado; três tabelas vazias; registros M1/M2, funções de base, ACLs de tabelas e policies/RLS preservados |
| Retomada após COMMIT | RPC cria abertura zero local e repetição retorna mesmo ID sem duplicação |
| Escrita financeira confirmada antes da drenagem | Conta/abertura local permanece; M3.2 rejeita banco não vazio e não cria índice nem perde dados |
| Erro DDL no meio da transação | Erro real 22012; rollback remove DDL parcial, sem efeitos financeiros |
| Perda da conexão A | Desconexão voluntária simula perda; rollback do DDL parcial; B reabre e comprova ausência de objetos parciais |

O JSON contém resultados e PIDs. Nas quatro chamadas antigas, só a criação de conta consegue completar seu corpo: as demais retornam erros normais pela ausência intencional de contas/operação original, **depois de passar pelo advisory lock real**. Isso valida admissão/drenagem dessas RPCs, não equivale à homologação financeira completa. Os testes financeiros anteriores são complementares.

## Condições de aplicabilidade no Supabase e riscos residuais

- **Ainda não comprovados:** disponibilidade de outro banco acessível no mesmo cluster, autoridade sobre `datallowconn`, conexões fixas A/B, visibilidade integral das sessões, fechamento gracioso dos pools hospedados e controle dos jobs/workers. Não presumir esses poderes porque um usuário se chama `postgres`.
- PostgreSQL não oferece essa garantia contra administradores que deliberadamente reabram o banco durante a janela. Coordenar exclusividade dos operadores; somente B controla reabertura.
- A barreira afeta o **banco inteiro**, incluindo Auth e demais serviços que usem esse banco; não apenas Tesouraria. Usuários podem receber indisponibilidade temporária.
- Workers de replicação/extensões podem ignorar a barreira de conexões comuns. Autovacuum pode conflitar com os locks: NOWAIT aborta com segurança. Escritores de fundo devem ser inventariados e pausados/drenados graciosamente pelo responsável. Zero clientes não é prova de zero workers escritores.
- Uma sessão que não desconecta ou uma transação preparada pendente **bloqueia a aplicação**. Estabelecer prazo operacional, abortar a janela com resultado conhecido, sem encerrar sessões à força.
- Fechamento da admissão é COMMIT separado: rollback da M3.2 não reabre o banco. Perda de A exige B; perda das duas conexões requer recuperação administrativa do mesmo cluster. Não fechar sem recuperação comprovada.
- O SQL final exige mecanismo oficial de migrações, mas a janela exige a mesma conexão física A. Compatibilidade do executor e registro de migração devem ser demonstrados antes de aplicar. Não trocar silenciosamente para execução avulsa ou modificar o SQL aprovado.
- Teste local não comprova controle dos serviços gerenciados. Não há promessa de aplicação possível só com as ferramentas atualmente disponíveis.

## Ativação, abortagem e desativação

**Antes de ativar:** aprovação da solução e da indisponibilidade global HML; confirmar Project ID, pacote CRC/checksums e restauração validada, SHA do SQL final, A/B no mesmo cluster, poderes/recuperação, inventário de serviços e executor compatível.

**Durante:** B fecha e confirma gate; produtores param; A acompanha PIDs até término/desconexão voluntária e verifica transações preparadas/workers. Locks e contagens são executados pelo SQL final em uma única transação READ COMMITTED. Não fazer retry automático em conflitos.

**Após COMMIT:** ainda fechado, comparar todos os registros M1/M2 e auditorias com a captura anterior; comparar constraints, policies, RLS obrigatório e ACLs de tabelas/colunas e RPCs; verificar definições dos sete objetos esperados e vínculo do trigger; confirmar contas/operações/movimentos em zero. Chamadas que gravam dados para homologação ficam para etapa autorizada; não cadastrar dados reais.

**Após falha:** ROLLBACK em A, confirmar que nenhum dos novos objetos ficou parcialmente aplicado e que os registros antigos estão idênticos. Sem reversão automática nem outra migração. Se houve COMMIT mas validação falhou, manter fechado e apresentar estado para decisão; não executar rollback lógico automaticamente.

**Desativação:** B restaura estado inicial true somente após verificar COMMIT/ROLLBACK e autorização operacional; serviços retomam, leituras e login são conferidos. Se drenagem/controle de workers não forem possíveis, encerrar janela sem aplicar M3.2 e informar a sessão/serviço impeditivo.

**Decisão:** proposta tecnicamente demonstrada em PostgreSQL isolado e entregue para aprovação; **M3.2 continua não aplicada**, sem qualquer alteração no HML, GESTÃO ITV ou produção nesta etapa.