# M5 — resultado do teste supervisionado de 27/10/2026

Usuário confirmou às 13:53 UTC o acionamento manual único pelo cron-job.org. Verificação feita exclusivamente por registros existentes e SELECT no HML, sem nova sincronização, consulta da origem ou habilitação da agenda.

## Execução e falha
- Uma execução nova registrada após baseline: e60aeb3f-7ddd-4df6-9ff6-0c9dc824d357, modo automática, início 13:53:24.112957 UTC (09:53:24 Manaus), conclusão 13:53:24.468465 UTC, status falha.
- Autenticação aceita e inicialização comprovadas pela execução criada.
- Janela registrada: 21–27/10/2026, sete dias inclusivos.
- Resposta HTTP do FINANCEIRO: 500, estado falha, etapa rede_origem; implantação fe0b1400-59e4-4aba-81dc-765e00a52416, conteúdo f8ca3b92dbfd621a2f465d5f43c0aa749d55be45972d375dc857462211623821.
- Diagnóstico seguro às 13:53:24.187 UTC: evento integracao_leitura_falhou, recurso formas_pagamento, categoria rede_origem, status_http null, duração 0 ms. Não foi registrada resposta HTTP da origem; falha anterior ao processamento de resposta. Duração é resolução do relógio de registro, não prova de latência física zero.
- Não é possível confirmar leitura bem-sucedida dos cinco recursos. O leitor compartilhado os solicita em paralelo e cancela ao primeiro erro; nenhum resultado individual dos outros quatro foi registrado.
- Categoria permanece rede_origem, não invocacao_origem/conexao_origem/timeout_origem; sem código reconhecido disponível não atribuir DNS, TLS, autenticação ou causa técnica específica. A correção de contexto publicada não resolveu essa ocorrência real; hipótese histórica não virou causa comprovada.
- Logs apresentam duas entradas request POST 500 às 13:53:23.023 e 13:53:24.493, além da entrada proxy da última resposta. Não somar proxy como tentativa adicional. Apenas uma execução nova no banco; a origem da entrada adicional de request não foi esclarecida, e não comprova por si duas sincronizações.

## Comparação com baseline 09:47 Manaus
| Verificação | Antes | Depois |
| --- | --- | --- |
| Itens | 16 | 16 |
| Conferências | 16 pendentes | 16, zero lançadas |
| Duplicidades de referências itens/conferências | 0 / 0 | 0 / 0 |
| Movimentos de Tesouraria | 0 | 0 |
| Operações diferentes de abertura | 0 | 0 |
| Total de aberturas | 0.00 | 0.00 |
| Contas com abertura não zero | 0 | 0 |
| Saldos | R$ 0,00 | R$ 0,00 |
| Auditorias | 110 | 112 |

Consulta às 13:54:26 UTC. Hashes íntegros e idênticos: itens 01b3de508a9f7f43ea0a52d1bbad02a0, conferências e3483b93e924a9be95ec5d65df4350bb. Zero vínculos de conferência inválidos. Nenhum dado financeiro anterior alterado entre as verificações.

Contagens da execução: consultados 0, existentes 0, novos 0, divergentes 0, enviados_conferencia 0; nenhuma conferência criada. Zero consultados/existentes são contadores de execução falha, não evidência de origem vazia nem de ausência dos 16 itens já existentes. Elegibilidade de registros reais não foi exercitada.

## Auditoria
Duas entradas novas, ambas para o ID da execução: criar/em_andamento às 13:53:24.035065 UTC e alterar/falha às 13:53:24.457428 UTC. Os horários de auditoria são os registrados pelo banco e não devem ser reordenados artificialmente para coincidir com campos da execução. Nenhuma auditoria financeira nova encontrada no período.

## Conclusão
M5 não pode ser homologada: autenticação, início, janela e registro de falha/auditoria funcionaram e integridade foi preservada, mas a leitura real não concluiu. Investigar transporte no ambiente publicado somente com autorização para a próxima etapa; não corrigir ou repetir automaticamente. Agenda deve permanecer desabilitada, estado externo não inspecionado pelo assistente.