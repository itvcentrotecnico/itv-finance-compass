# ITV FINANCEIRO — verificação anterior à implantação

01/11/2026, após a autorização das 14h02 Manaus.

**STATUS: INTERROMPIDA ANTES DA MIGRAÇÃO.** Autorização administrativa mantida; nenhuma migração, manutenção, liberação, publicação, operação financeira ou sincronização executada nesta verificação. GESTÃO ITV não foi acessado.

## Backup atualizado

Geração informada pelo administrador: `ITV_FINANCEIRO_BACKUP_20261101_135833.dump`, aproximadamente 475 KB, PostgreSQL Custom, pg_dump 17.11 e catálogo legível. SHA-256 informado: `3422ee9c50f505443f6900893a65662c2d62a7829cae2a6d84887aa6f0de66e3`.

O arquivo está protegido no computador do administrador e não foi inspecionado neste ambiente. Nome, tamanho, hash e aprovação de leitura do catálogo não comprovam que todas as entradas necessárias estejam incluídas. A aceitação limitada da restauração de 29/10 permanece válida; não é necessário repetir essa decisão nem enviar o dump.

**Ação necessária:** o responsável técnico deve fornecer o inventário não sensível de `pg_restore --list` restrito aos objetos financeiros e suas dependências, ou atestar nominalmente sua cobertura: dados das 13 tabelas, funções/assinaturas, esquema, índices/chaves, gatilhos, políticas/RLS, permissões de esquema/tabela/coluna/função, privilégios padrão, sequências quando existentes e papéis/extensões/dependências externas necessários. Confirmar também que a exportação não excluiu estrutura, dados, proprietários ou permissões sem inventário complementar. Não enviar credenciais, registros, dump ou conteúdo de autenticação. Dependências de Auth real e configurações hospedadas conservam as limitações anteriormente aceitas.

## Banco atual e histórico

Consultas exclusivamente de leitura confirmaram:

- PostgreSQL 17.11 e 13 tabelas financeiras com RLS habilitada.
- 49 itens de integração e 49 conferências pendentes.
- 19 sincronizações finalizadas: nove concluídas e dez com falha; nenhuma em andamento nesse conjunto.
- 280 eventos de auditoria, seis operações exclusivamente de abertura e zero movimentos.
- Hash histórico dos itens: `f64dc54b9b5b6821d2570a2b3c906782`.
- Hash histórico das conferências: `93c55a20c6c20dd66b2b97204f687434`.

Os hashes coincidem com a referência anterior, usando o mesmo método de ordenação e concatenação. As seis aberturas não foram duplicadas. Nenhum saldo ou registro foi alterado. Contagens/hashes não substituem cobertura do backup nem homologação operacional.

## Pacote aprovado e reversão

Migração disponível: `ETAPA_2_MIGRACAO_DEFINITIVA.sql`, SHA-256 `8c9f71fa845dfb1743bf7322c80e3b43b9901582447b9413164fa792baed60b6`. Nenhuma alteração no pacote foi feita nesta verificação.

A reversão `REVERSAO_FUNCIONAL_DEFINITIVA.sql`, SHA-256 `79c2b49c4e4823f015b36f7f5dd2f1cff1b1eb8aa49ae3c8bb8a5a5eaa859aa0`, é coerente com as estruturas que essa migração criará: preserva dados, leitura e histórico e bloqueia os comandos financeiros. Não pode ser executada sobre o banco pré-migração, pois suas tabelas auxiliares ainda não existem. Não desfaz operações nem restaura o sistema antigo. Sua execução após instalação depende de contenção de escritores e drenagem, ainda não comprovadas; portanto, aplicabilidade operacional não está certificada.

Permissões atuais ainda admitem comandos financeiros autenticados e acessos técnicos à integração. Nenhuma transação alheia aberta ou preparada foi observada na consulta, mas isso não prova bloqueio de novas chamadas nem suspensão contínua dos produtores privilegiados. A janela exige responsável técnico, contenção desses produtores e confirmação da drenagem; observar sessões vazias ou apenas fechar navegadores não basta.

## Saldos de abertura e publicação

O pacote preserva as seis aberturas, não cria movimentos automáticos e mantém novas aberturas/habilitações bloqueadas. Entretanto, **não contém o procedimento específico de confirmação/correção rastreável dos saldos reais** solicitado anteriormente. Essa pendência é técnica, não falta de autorização administrativa. Não será incluída silenciosamente em uma migração autorizada exclusivamente como pacote final previamente aprovado. Os zeros existentes não certificam os saldos reais de fechamento de 31/10.

Início contábil de 01/11/2026 e integração M5 manual permanecem requisitos; nada nesta verificação alterou datas, histórico ou M5. O SQL aprovado deixa a configuração de corte vazia: instalar os controles não significa liberar operação.

**Próximo passo:** comprovar cobertura do backup pelo inventário não sensível e estabelecer contenção/drenagem da janela; resolver e identificar a pendência do procedimento seguro de saldos antes de declarar operação completa. Não se pede nova autorização genérica nem novo backup sem necessidade demonstrada. Não houve testes pós-migração porque nenhuma migração foi aplicada. A publicação permanece proibida até a aprovação final do relatório pela direção.