# M3.2 — relatório final para autorização

23/10/2026, validação local concluída às 17:41 UTC.

**Decisão: pronta para aplicação controlada no HML, condicionada a nova autorização, manutenção/drenagem, confirmação do destino e pré-condições. Não é homologação final da Tesouraria.**

Nenhuma consulta, migração ou configuração foi executada no Supabase nesta etapa. Nenhum acesso ao GESTÃO ITV ou produção. Somente SQL/documentação e testes locais; nenhuma funcionalidade adicional ou mudança na interface.

## SQL final

Documento integral: `M3_2_CORRECAO_PROPOSTA.sql`. Reversão integral: `REVERSAO_PROPOSTA.sql`. Não colocar a fixture ou os testes na fila de migrações.

A condição de corrida foi corrigida com este início, antes de qualquer leitura de dados:

```sql
BEGIN;
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
LOCK TABLE financeiro_hml.contas_financeiras,
 financeiro_hml.tesouraria_operacoes,
 financeiro_hml.tesouraria_movimentos IN ACCESS EXCLUSIVE MODE NOWAIT;
```

Em seguida, a verificação de ausência de contas/operações/movimentos ocorre sob os três locks. Eles permanecem até COMMIT/ROLLBACK. O SQL não exige que Plano de Contas, Centros de Custo, Perfis ou Auditoria estejam vazios. Os três locks são suficientes para excluir escritas nas tabelas verificadas; bloqueiam também leituras dessas tabelas durante a aplicação. `NOWAIT` evita esperar segurando locks parciais: conflito gera 55P03 e rollback completo. Não há repetição automática.

**Drenagem continua obrigatória:** locks de tabelas não cancelam código antigo já iniciado nem impedem uma chamada já resolvida de retomar após COMMIT. Interromper novas RPCs/escritas e drenar todas as transações afetadas, inclusive scripts administrativos e solicitações em fila. Não basta esconder os botões.

## Lista exata de objetos afetados

Todos em `financeiro_hml`:

| Ação | Objeto |
|---|---|
| Substituir função | `tes_validar_efeitos()` |
| Substituir função | `tes_executar(jsonb)` |
| Substituir função | `tesouraria_extrato(jsonb)` |
| Criar função | `tes_conta_exige_abertura()` |
| Criar função | `tesouraria_historico_operacoes(jsonb)` — já constava na proposta anterior |
| Criar índice único parcial | `tes_op_abertura_conta_uq`, em `tesouraria_operacoes` |
| Criar constraint trigger | `tes_conta_abertura`, AFTER INSERT em `contas_financeiras`, DEFERRABLE INITIALLY DEFERRED |

`tes_op_efeitos` e `tes_mov_efeitos` mantêm suas definições, passando a usar o corpo substituído de `tes_validar_efeitos`. São preservados todos os demais triggers, índices, constraints PK/FK/UNIQUE/CHECK, políticas RLS, RLS obrigatório e grants das tabelas. Não se criam colunas ou tabelas.

ACLs de funções: REVOKE de PUBLIC/anon/authenticated nas funções privadas `tes_validar_efeitos`, `tes_executar` e `tes_conta_exige_abertura`; REVOKE PUBLIC/anon e GRANT EXECUTE authenticated na nova leitura de histórico. `tesouraria_extrato` preserva a ACL existente. Nenhuma nova escrita direta é concedida.

Não há DML executado pela migração: INSERTs fazem parte das definições de funções para chamadas futuras. Não altera/remove cadastros ou históricos existentes. A reversão também não apaga dados; aborta se houver contas ou ledger.

## Testes reais concorrentes — 15/15 aprovados

PostgreSQL 17.9 local, conexões distintas, transações READ COMMITTED, escritores com `SET ROLE authenticated` e identidade simulada exclusivamente local. Sessão observadora confirma bloqueio real com `pg_blocking_pids`; não são testes sequenciais disfarçados nem mocks. Fixture mínima reconstruída + SQL M1/M2/M3/correção, sem copiar dados ou credenciais HML. Bancos isolados criados e descartados ao final.

| Teste | Resultado concreto |
|---|---|
| Compilação, reversão e preservação | SQL integral aplicado/revertido/reaplicado; registros de M1/M2/auditoria, 7 funções M1/M2, ACLs de tabelas e políticas/RLS idênticos |
| Escritor iniciado antes da migração | 55P03 antes da pré-verificação/DDL; após escritor confirmar, proposta aborta por dados existentes e preserva conta |
| Escritor posterior, migração confirma | Três ACCESS EXCLUSIVE observados; escritor bloqueado até COMMIT; locks liberados |
| Escritor posterior, migração reverte | Escritor bloqueado até ROLLBACK; locks liberados |
| Mesma chave/conteúdo equivalente | `0.30`/`0.3`: mesmo ID; uma operação, dois efeitos e uma auditoria |
| Mesma chave/conteúdos diferentes | Segunda rejeitada com TES_IDEMPOTENCIA; nenhuma segunda operação/efeito/auditoria |
| Transferências opostas simultâneas | Ambas confirmadas, quatro efeitos; valores líquidos das duas contas inalterados |
| Dois estornos, chaves distintas | Um confirma; segundo TES_JA_ESTORNADA; um único estorno e efeitos inversos completos |
| Inativação de conta durante entrada | Ambas as ordens testadas: inativação primeiro rejeita entrada; entrada primeiro bloqueia inativação até confirmar |
| Inativação de classificação | Ambas as ordens testadas, TES_CLASSIFICACAO quando inativa primeiro |
| Inativação de centro | Ambas as ordens testadas, TES_CENTRO quando inativo primeiro |
| Deadlock real e repetição | 40P01 produzido entre edição conta→classificação e entrada classificação→conta; vítima revertida; retry com mesma chave e replay resultam em uma entrada de 0.10 |
| Falha diferida no COMMIT | Trigger de falha somente local; outra sessão não vê dados pendentes; COMMIT falha e não sobra operação, efeito ou auditoria; retry confirma uma única transferência |
| Escrita direta no ledger | DELETE como authenticated negado com 42501; não foi desativado nenhum controle |
| Reconciliação final | Zero transferências incompletas/desbalanceadas; saldos 99.50 e 100.90, total exato 200.40, considerando quatro entradas de 0.10 |

As rejeições esperadas são aprovação do teste, não falhas da bateria. O deadlock foi detectado pelo PostgreSQL e a repetição foi controlada pelo teste — não se adicionou mecanismo de retry automático na aplicação.

Regressão adicional: 29/29 testes Vitest aprovados (Tesouraria, permissões e cadastros).

Reprodução: instalar psycopg 3 em ambiente temporário e executar `testar_concorrencia_local.py` contra o socket local fixo `/tmp/m3-review/socket:55439`. O cluster descartável precisa das roles anon/authenticated/service_role e usuário local postgres. `fixture_local.sql` não é réplica completa do HML: reproduz os campos usados e controles M1/M2/M3. Evidências brutas em `RESULTADOS_CONCORRENCIA.json`. Nenhuma variável de conexão HML é lida. Resultados não certificam PostgREST/HML nem substituem testes finais autenticados.

## Garantias e riscos residuais

- Transferências/estornos/efeitos/auditoria pertencem à mesma transação; constraints diferidas impedem confirmação parcial. Saldo deriva de movimentos imutáveis com numeric, sem atualização perdida de saldo materializado.
- Idempotência é por **usuário + chave**, protegida por lock transacional e UNIQUE. Chaves diferentes ou usuários diferentes não são deduplicação global de negócios.
- READ COMMITTED foi testado. REPEATABLE READ/SERIALIZABLE podem produzir 40001/23505 em vez de replay transparente; duplicação continua vedada pela constraint. Não certificar esses isolamentos sem bateria específica.
- Deadlocks ainda podem ocorrer em transações que combinam edições com ordens distintas ou várias RPCs. Tratar com rollback de toda a transação e repetição limitada, mesma chave/conteúdo; não ignorar erro ou repetir com nova chave. Falhas de rede exigem primeiro consultar/repetir pela mesma chave.
- M1: risco herdado de remoção concorrente dos últimos administradores. M2: risco herdado de ciclos/consistência hierárquica em edições simultâneas. **Não corrigidos aqui**, conforme escopo; exigem aprovação separada antes de homologação integral.
- Sem regra de impedir saldo negativo, sem garantia de snapshot único entre consultas separadas. Desempenho sob carga, browser autenticado e acesso PostgREST real permanecem fora desta validação local.
- O executor da migração deve ter visibilidade integral das tabelas sob RLS. Comentário com Project ID não é barreira técnica contra escolher outro projeto: conferir o destino pelo mecanismo oficial antes do envio.
- Há interrupção temporária das leituras/escritas nas três tabelas. Outras dependências/catalog locks ainda podem causar timeout; rollback obrigatório. Não afirmar migração universalmente livre de deadlock.

## Procedimento de aplicação após autorização

1. Confirmar exclusivamente `ayjppexbzpgdkzbehvzw`, schema `financeiro_hml`, versões M1/M2/M3/correção existentes; confirmar backup restaurável e capturar definições/ACLs/contagens antes da aplicação.
2. Janela de manutenção: barrar novas chamadas afetadas, filas/retries e escritas diretas; drenar requests/transações antigas, inclusive idle-in-transaction, leitores e scripts/jobs administrativos. Qualquer cancelamento administrativo exige procedimento autorizado. Não diminuir RLS/grants para isso.
3. Usar SQL final integral pelo mecanismo oficial em transação única READ COMMITTED; confirmar semântica do executor antes de enviar. Se já envolver transação, remover somente BEGIN/COMMIT externos; manter locks, checks e fail-on-error no mesmo bloco. Não reaplicar M3 original.
4. Conflito 55P03/timeout/dados existentes: ROLLBACK integral, manutenção ativa, investigar; nenhuma tentativa automática. Dados existentes exigem proposta de reconciliação, não apagar nem adaptar silenciosamente.
5. Após COMMIT, comparar objetos/ACLs/policies/RLS e cadastros/auditoria M1/M2 com o estado anterior. Verificar funções novas/substituídas, constraint trigger e índice único. Reexecutar verificações autorizadas de acesso/perfis, idempotência, operações e reconciliação antes de abrir acesso. Testes simultâneos HML exigem estratégia autorizada isolada; testes que confirmam dados não devem deixar registros fictícios no HML.
6. Liberar acesso apenas após validação; aplicação M3.2 não equivale à homologação final ou autorização de produção.

## Recuperação

- **Erro antes/durante COMMIT:** todos os DDL transacionais são revertidos; SET CONSTRAINTS ALL IMMEDIATE ocorre antes do COMMIT. Nenhuma instrução CREATE INDEX CONCURRENTLY ou operação externa.
- **Erro de validação pós-COMMIT:** manter manutenção, preservar evidência/backup, inspecionar somente por leitura. Reversão exige autorização e utiliza mesmos locks NOWAIT antes de checar ausência de contas/operações/movimentos.
- **Sem novos dados:** `REVERSAO_PROPOSTA.sql` restaura definições anteriores e remove somente trigger/funções/índice novos. Foi compilada/executada localmente; reintroduz defeitos conhecidos, portanto não liberar Tesouraria automaticamente após reverter.
- **Com novos dados:** reversão aborta; nenhuma exclusão. Preparar correção progressiva/reconciliação aprovada. Restaurar backup não é ação automática, pois pode apagar alterações posteriores.

**Solicitação apresentada para revisão: autorização específica para aplicar esta M3.2 no HML nas condições acima. Nenhuma migração foi executada ou encaminhada para execução.**