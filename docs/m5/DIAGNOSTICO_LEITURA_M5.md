# Diagnóstico de leitura M5 — 27/10/2026

## Escopo e limites
Somente investigação no ITV FINANCEIRO HML e testes GET de leitura autorizados no endpoint publicado da origem. Não executada sincronização, não importado nenhum registro e não alterado o GESTÃO ITV. Nenhum token ou conteúdo financeiro registrado nos relatórios.

## Evidência histórica
Execução HML `5b7ea61a-87b7-4c42-828f-b1a33580342a`: início 27/10 02:41:48.296 UTC (26/10 22:41:48 Manaus), conclusão com falha 02:41:49.759 UTC, janela 20–26/10, zero consultados/novos/enviados. Log publicado 02:41:49.807 UTC: HTTP 500, `{"estado":"falha","etapa":"leitura_origem"}`. A criação e a conclusão com falha estão auditadas.

O erro original não está disponível nos logs consultados. Em `src/lib/integracao.functions.ts:128–129`, o catch elimina o erro original e preserva somente `autenticacao_origem` se a mensagem termina em `:401`, ou `leitura_origem` em todos os demais casos. Não existe log do recurso, status, causa ou stack trace. Assim, não é possível comprovar retrospectivamente se houve rede, 403, 429, timeout, JSON inválido ou erro 5xx da origem.

## Testes GET atuais
Origem efetiva no ambiente do diagnóstico: `https://itvcentrotecnico.lovable.app/api/public/integracao-financeiro`.
Método GET; cabeçalho Authorization Bearer com GESTAO_ITV_READ_TOKEN, disponível no servidor. Parâmetros: `inicio=2026-10-20`, `fim=2026-10-26`, `offset=0`, `limite=500`, recurso conforme tabela.

| Recurso | HTTP sequencial | HTTP simultâneo | Linhas recebidas |
|---|---|---|---|
| formas_pagamento | 200 | 200 | 9 |
| recebimentos | 200 | 200 | 33 |
| pagamentos | 200 | 200 | 33 |
| recebimentos_titulos | 200 | 200 | 0 |
| titulos | 200 | 200 | 0 |

Todos retornaram application/json válido, dados como array, envelope com dados/recurso/inicio/fim/offset/limite. Na leitura simultânea, parâmetros retornados correspondem aos enviados. Todas as páginas foram menores que 500, portanto a consulta desse período termina na primeira página segundo o leitor atual. Não foram feitas chamadas para páginas adicionais desnecessárias. Não houve redirecionamento aceito.

Tempos sequenciais: 0,87–1,62 s; simultâneos: 0,31–1,19 s. Token aceito em todos os recursos durante os testes atuais. Nenhuma autorização persistente incorreta, indisponibilidade atual, JSON alterado ou timeout foi reproduzido. Contagens são linhas da API, não registros financeiros novos ou candidatos importados.

Limite: testes foram realizados a partir do sandbox do ITV FINANCEIRO, não dentro da execução publicada original. Não provam que o comportamento hospedado histórico ou o vínculo de todos os segredos da implantação é idêntico. A origem não foi inspecionada/modificada; sem logs dela, não é possível recuperar o erro histórico.

## Caminhos manual e automático
Ambos chamam `executarSincronizacao` → `lerFonteGestao` → `lerRecurso`, com a mesma URL, token, método, cabeçalhos, cinco requisições simultâneas, paginação e tratamento de JSON.
Diferenças: manual usa usuário autenticado e data selecionada (um dia) ou exercício até data UTC; automático usa identidade do servidor e últimos sete dias em Manaus. A permissão de início/conclusão HML difere, mas não a autenticação enviada à origem.

## Causa raiz: estado da comprovação
**Falha histórica de leitura: não determinada.** É comprovada a deficiência de diagnóstico que descarta a causa. A hipótese de instabilidade transitória é compatível com falhas manuais anteriores seguidas de sucesso, mas não está comprovada. Não atribuir a falha a concorrência, token ou timeout sem evidência.

## Correção proposta — não aplicada
Preparar instrumentação segura e validação da leitura somente no HML. Registrar evento estruturado com recurso, etapa, status HTTP quando existente e duração; classificar rede, autenticação 401, autorização 403, limite 429, timeout, resposta JSON inválida e erro interno 5xx. Nunca registrar token, cabeçalhos, corpo da resposta, dados financeiros ou mensagem bruta não sanitizada.
Validar dados como array e envelope de paginação; resposta incompatível deve falhar explicitamente, nunca virar sucesso vazio. Extrair leitor para módulo server-only testável, compartilhado entre manual/automático. Não mudar janela, identidade, RPCs, saldos ou conferências. Não adicionar retry automático inicialmente, pois o erro transitório ainda não está comprovado.
Timeout explícito deve ser dimensionado e aprovado com teste local; sua adoção pode encerrar leituras legítimas mais lentas. Guardas de paginação devem preservar volume legítimo e impedir página repetida/loop infinito, sem truncar silenciosamente.

## Componentes e riscos
Afetados propostos: novo leitor server-only e seus testes; src/lib/integracao.functions.ts apenas para delegação; documentos técnicos. Nenhuma migração necessária nesta proposta. O endpoint cron mantém contrato de resposta sem dados financeiros.
Riscos: validação pode recusar resposta antes tolerada; timeout ou limites excessivamente estritos podem interromper leitura válida; logs mal projetados podem expor dados (mitigar com lista fechada de campos). Manter erros atômicos e falha auditada sem conclusão falsa.

## Homologação necessária
Testes isolados com fetch simulado: HTTP 200 nos cinco recursos, 401/403/429/500/503, falha de rede, timeout, JSON inválido, dados ausentes, paginação curta/cheia, envelope divergente e página repetida; comprovar que nenhuma credencial/conteúdo de resposta chega aos logs e que falha não gera escrita de itens/conferências. Regressão de manual/automático usando mesmo leitor. Após aprovação/publicação, teste real separado somente com nova autorização expressa.

## Próximo passo
Aguardar aprovação do plano de instrumentação, antes de alterações no código. Não habilitar a tarefa nem executar nova sincronização real nesta investigação.