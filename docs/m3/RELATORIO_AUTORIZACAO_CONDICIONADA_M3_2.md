# ITV FINANCEIRO HML — relatório da autorização condicionada M3.2

Data: 23/10/2026. Conferências realizadas a partir de 18:04 UTC.

## Resultado: interrompida antes da execução

**Nenhuma migração foi enviada ou executada.** A aceitação expressa da recuperação parcial foi registrada, mas a condição de interromper novas escritas e drenar operações não pôde ser integralmente comprovada. O SQL aprovado permanece inalterado. Não houve alterações em dados, funções, triggers, índices, constraints, políticas RLS, permissões ou configurações do HML. Nenhum outro projeto foi acessado; não houve publicação.

## Condições verificadas

| Condição | Evidência e resultado |
|---|---|
| Destino autorizado | `lovable supabase info --json`: `supabase_project_id = ayjppexbzpgdkzbehvzw`, URL correspondente, integração externa. O campo `environment: production` representa o slot da integração Lovable, não outro banco: o identificador coincide exatamente com o HML autorizado. |
| Recuperação disponível | ZIP em Files, 25.482 bytes; teste CRC sem erro; oito checksums internos SHA-256 conferidos. |
| Cobertura aceita | Esquema financeiro e registros; não recupera integralmente Supabase Auth nem configurações hospedadas. Resultado preservado no pacote: PostgreSQL isolado 17.9, 102 verificações aprovadas, zero falhas. Nesta etapa foi conferida a integridade desse resultado, não realizada nova restauração. |
| SQL final | Arquivo do projeto idêntico byte a byte ao SQL final entregue para autorização. SHA-256 abaixo. |
| Tabelas financeiras vazias | Contas financeiras: 0; operações: 0; movimentos: 0. Consulta com executor `supabase_read_only_user`, com visibilidade integral de RLS confirmada. É pré-inspeção, não substitui a verificação transacional sob bloqueios. |
| Cadastros existentes | Plano de Contas: 1; Centros de Custo: 1; Perfis: 1; Auditoria: 7. Nenhum registro gravado ou removido nesta etapa. |
| Controles atuais | RLS habilitado e obrigatório nas sete tabelas. 15 políticas e 14 triggers não internos contabilizados, sem alterações. |
| Novos objetos M3.2 | Funções `tes_conta_exige_abertura` e `tesouraria_historico_operacoes`, e índice `tes_op_abertura_conta_uq`, ausentes na inspeção. |
| Interrupção de novas escritas | **Não comprovada: bloqueador da aplicação.** |
| Drenagem | Não havia sessões de usuário visivelmente ativas nem transações abertas nas amostras. Isso não prova interrupção de futuras chamadas, pedidos em trânsito ou filas. |

SHA-256 do pacote de recuperação:

`7ceac05cf2e9505c4a33a6c487db93659e464a01dbb87ec72a232623ea7f080a`

SHA-256 do SQL final:

`66c47b7d9292c45f1580f32f1b59937047ba36b294f0eac9d914f188a1817401`

## Motivo técnico da interrupção

Não foi identificado controle de manutenção existente que impeça novas chamadas de escrita em todos os caminhos afetados. Os acessos disponíveis não fornecem uma operação verificada para bloquear simultaneamente chamadas da aplicação, chamadas diretas ao Supabase e pedidos já em trânsito, sem alterar o escopo aprovado.

As RPCs `tesouraria_criar_conta`, `tesouraria_lancar`, `tesouraria_transferir` e `tesouraria_estornar` continuam executáveis por `authenticated`, conforme os controles normais existentes. A função interna `tes_executar` não é executável por `authenticated` nem `anon`; as quatro RPCs públicas também negam execução a `anon`. A edição de contas financeiras usa ainda o acesso direto da aplicação sob RLS.

As amostras de sessões não mostraram transações de usuário em execução. A consulta agregada identificou três conexões de cliente ociosas e processos `pg_cron`/`pg_net`; a ausência de execução na amostra não certifica a ausência de trabalhos futuros ou de solicitações fora do banco. A visibilidade de estatísticas de sessões foi confirmada, mas não existe uma barreira contínua para novas chamadas.

O SQL final exige explicitamente manutenção e drenagem antes de adquirir os três bloqueios `ACCESS EXCLUSIVE NOWAIT`. Os bloqueios vêm antes da verificação de tabelas vazias e permanecem até o término da transação. Entretanto, não impedem uma chamada antiga já iniciada de aguardar e retomar após o COMMIT. Não foi usado esconder botões, desabilitar RLS, revogar permissões temporariamente ou modificar silenciosamente o SQL como substituto da manutenção.

## Objetos autorizados, mas não modificados

Todos em `financeiro_hml`:

1. Substituição de `tes_validar_efeitos()`.
2. Substituição de `tes_executar(jsonb)`.
3. Substituição de `tesouraria_extrato(jsonb)`.
4. Criação de `tes_conta_exige_abertura()`.
5. Criação de `tesouraria_historico_operacoes(jsonb)`.
6. Criação do índice único parcial `tes_op_abertura_conta_uq`.
7. Criação do constraint trigger `tes_conta_abertura`.

As alterações de permissões das funções são apenas as previstas no SQL final. Nenhuma delas foi aplicada nesta etapa.

## Tesouraria e homologação funcional

Os testes existentes foram executados novamente: **29/29 aprovados** — 14 de Tesouraria, 8 de permissões e 7 de cadastros. Os 15 testes concorrentes PostgreSQL e as 102 verificações de recuperação continuam sendo evidências locais anteriores, não testes novos no HML.

A compilação hospedada mais recente consultada estava concluída com sucesso e sincronizada, finalizada às 18:01:19 UTC. As telas de contas, movimentações e extrato já estão implementadas. Não foram adicionadas funcionalidades ou dados.

**Não declarar a Tesouraria liberada para homologação funcional da M3.2:** a correção não foi aplicada. Testes autenticados ponta a ponta não foram realizados; a integração Supabase externa não disponibiliza sessão gerenciada para essas verificações. Não foram solicitadas credenciais.

Roteiro preparado para depois da aplicação e validação autorizadas:

- Conferir leitura das contas e extrato com Administrador Geral, ainda sem novos dados reais.
- Em cenário de teste explicitamente autorizado, validar abertura, entrada, saída, transferência, repetição com mesma chave, estorno e auditoria.
- Conferir restrições por perfil e tentativas negadas diretamente pelo banco.
- Reconciliar saldos com efeitos, excluir transferências das receitas/despesas e confirmar ausência de duplicação ou confirmação parcial.
- Não executar esses cenários criando registros fictícios ou reais no HML sem estratégia de dados de homologação aprovada.

## Próximo passo e recuperação

É necessário disponibilizar e comprovar um procedimento de manutenção que impeça novas escritas em todos os caminhos e permita drenar solicitações em andamento. Criar um novo controle ou alterar permissões/configurações não integra o SQL exclusivo autorizado; exige definição e autorização separadas. Não foi executada migração adicional.

Depois dessa condição atendida: reconfirmar destino, pacote e estado; aplicar uma única vez o SQL final integral pelo mecanismo oficial em uma transação; abortar por conflito, timeout, dados inesperados ou qualquer erro; comparar os objetos, controles e registros pré/pós-aplicação antes de liberar acesso.

Como nenhuma execução ocorreu, **não há rollback a executar**. Em execução futura, falha transacional deve reverter integralmente o DDL. Falha de validação após COMMIT exige manutenção e investigação; reversão ou restauração não são automáticas, requerem autorização e não devem apagar registros posteriores.

**Conclusão: recuperação parcial aceita e íntegra; destino e tabelas vazias confirmados; aplicação suspensa exclusivamente pela falta de bloqueio/drenagem operacional comprovados.**