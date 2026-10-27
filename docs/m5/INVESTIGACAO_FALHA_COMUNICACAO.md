# M5 — investigação direcionada da falha de comunicação

## Escopo
Solicitação recebida em 27/10/2026 às 03:02 UTC. Investigação somente por leitura de código, registros publicados, histórico/auditoria HML e documentação pública. Nenhuma chamada nova à origem ou à sincronização, nenhuma mudança no sistema, nenhuma retentativa, publicação ou configuração do cron. Documento não autoriza correção nem novo teste real.

## Evento e etapa comprovados
- 27/10/2026 02:58:03.357 UTC = 26/10/2026 22:58:03.357 America/Manaus.
- Evento integracao_leitura_falhou, recurso formas_pagamento, etapa/categoria rede_origem, status_http null, duracao_ms 0.
- POST oficial concluído HTTP 500 às 02:58:03.526 UTC, cf_ray a50e6fccebe9790f, conteúdo da implantação 6944a2e5a336453809a09f4a9b4cbcf3dfe06b368129d975587b138acfc9d8cd.
- Execução HML 98d94211-1a24-4bac-a6d6-f59a4d80667c iniciou 02:58:03.292092 UTC e concluiu 02:58:03.506381 UTC como falha rede_origem, modo automática, intervalo 20–26/10, zero consultados/novos/enviados.
- Auditoria existente registra criar e alterar, às 02:58:03.225555 e 02:58:03.496194 UTC. Horários de auditoria e campos da execução usam instantes distintos na transação; não interpretar sua pequena diferença como ordenação física das instruções.

O código atribui status somente depois de await buscar retornar uma Response. Portanto não foi obtida Response HTTP nesse recurso; falhou na invocação/espera da requisição, antes do parse JSON. HTTP 500 é resposta do FINANCEIRO, não da origem. 0 ms é medida registrada por Date.now, não prova latência física zero ou que nenhum pacote saiu; resolução/comportamento do relógio hospedado limita essa interpretação.

## DNS/TLS/conexão/timeout/aborto
Não há mensagem, tipo, código ou causa nativa do erro nos logs disponíveis. O catch transforma qualquer erro não reconhecido em rede_origem. Não é possível distinguir DNS, TLS, conexão, redirecionamento recusado, política de saída ou erro síncrono de invocação.

O evento não foi classificado timeout_origem e o prazo de página é 20 s, total 120 s. Isso torna timeout explícito do leitor menos compatível com o evento, mas não exclui timeout de transporte que não tenha nome reconhecido. O primeiro erro registrado dispara abort das chamadas irmãs; esse cancelamento é consequência implementada, não prova da causa original.

## Comparação dos cinco recursos e modos
Todos usam mesmo host/path, GET, Bearer de leitura, redirect error, blocos 500 e os mesmos prazos. Manual e automática convergem em executarSincronizacao → lerFonteGestao → lerFonteGestaoServidor → lerFonteHttp. Diferem na identidade usada no HML e janela (manual dia/exercício; automática sete dias Manaus), não no cliente da origem.

formas_pagamento aparece primeiro na lista Promise.all e só o primeiro erro é logado. Nenhum status dos outros quatro recursos foi registrado nessa execução; eles não podem ser classificados sucesso/falha independentemente. Os testes GET anteriores do sandbox retornaram HTTP 200 nos cinco recursos, mas não reproduzem o ambiente hospedado. Nenhum GET real novo foi executado nesta investigação.

## Origem da chamada
Metadados acessíveis: domínio oficial, path da sincronização, POST, horário, HTTP 500 e cf_ray acima. Modo automática indica caminho autenticado do servidor, não identifica o emissor como cron-job.org. A inicialização e leitura demonstram passagem pelo controle de autenticação existente. Não há IP, User-Agent, identificação do job ou cabeçalhos do emissor nos logs consultados. Não é possível concluir se foi teste manual do cron, agenda habilitada ou outro cliente autorizado.

Há múltiplas entradas request/proxy próximas; não contá-las como tentativas independentes sem correlação. No intervalo 02:58–02:59, há uma execução HML registrada. Conferir futuramente o histórico do cron-job.org com horário e identificador, sem compartilhar o cabeçalho de autenticação. Não habilitar tarefa para obter essa informação.

## Controles existentes
| Controle | Situação e limite |
|---|---|
| Timeout | 20 s/página e 120 s/leitura; comprovado no código/testes existentes, adequação hospedada completa não comprovada |
| Falhas transitórias | Classificadas como falha segura; sem recuperação interna por recurso |
| Retentativas progressivas | Não implementadas; reservas externas são novas chamadas, não backoff interno |
| Simultaneidade | Índice único parcial e RPCs impedem mais de uma execução em andamento; expiração após 15 min |
| Idempotência | Referência única/hash de conteúdo, repetição de conclusão protegida e checagem de conferências; uma conclusão automática/dia, até seis tentativas automáticas/dia |
| Auditoria | Registro da execução e criar/alterar comprovados; evento sanitizado comprovado, mas detalhes nativos de transporte ausentes |

Não alterar esses controles nem acrescentar retries nesta etapa. Repetir uma falha determinística só aumentaria chamadas e consumiria tentativas; retries de escrita/RPC não devem ser confundidos com retries de GET.

## Causa mais provável e correção recomendada
Hipótese prioritária a verificar: falha imediata na invocação do cliente HTTP no ambiente hospedado, inclusive possível chamada desassociada do fetch global. O código copia a função com const buscar = opcoes.fetch ?? fetch e a invoca fora do objeto global. Se a implementação hospedada exigir receptor, pode lançar TypeError de invocação e ser incorretamente classificada como rede. Isso explica diferença de sandbox e execução hospedada e é compatível com o evento, mas não foi demonstrado no runtime real: não declarar causa raiz confirmada.

Os 18 testes do leitor injetam fetch simulado; não exercitam explicitamente o caminho global padrão. O teste GET anterior também injetou wrapper. Assim, há uma lacuna comprovada de validação desse caminho, não prova da hipótese.

Após autorização, recomendação mínima:
1. Testar isoladamente, sem origem nem banco, o caminho padrão com função global simulada que exige o receptor correto e erro síncrono de invocação.
2. Se confirmado o defeito no padrão, usar wrapper que chama globalThis.fetch(input, init), preservando injeção de teste; não alterar auth, janela, RPC, prazos ou retries.
3. Ampliar diagnóstico por códigos fechados de erro (por exemplo invocacao_http, dns, tls, conexao, aborto quando comprováveis), nunca logar mensagem/stack/code arbitrário, cabeçalhos, URL completa ou corpo. Tipo/código nativo só convertidos em valores allowlisted; desconhecidos permanecem não determinados.
4. Rodar regressões simuladas e validar compatibilidade do runtime em ambiente isolado sem acesso real. Informar e obter autorização antes de publicação ou novo teste de conectividade/sincronização.

Riscos: mudar wrapper não corrige falha real de DNS/TLS; classificador ingênuo pode produzir causa falsa; usar mensagens brutas pode expor segredos; introduzir retries antes do diagnóstico pode mascarar erro determinístico. Nenhuma dessas alterações foi implementada.

## Referências verificáveis
- src/lib/integracao-leitura.server.ts:37, 58–60, 87–102, 113–119.
- src/lib/integracao.functions.ts:86–100, 112–127.
- src/lib/integracao-leitura.test.ts: chamadas com fetch injetado.
- docs/m5/M5_SINCRONIZACAO_AUTOMATICA.sql: concorrência, limites, conclusão e duplicidade.
- https://developers.cloudflare.com/workers/runtime-apis/fetch/
- https://developers.cloudflare.com/workers/observability/errors/

A documentação pública consultada não confirma que o fetch global desassociado necessariamente falhe nesse runtime. A hipótese precisa de validação; a causa nativa histórica permanece não determinada.