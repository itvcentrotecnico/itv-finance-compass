# M5 — publicação solicitada e verificação somente leitura

## Autorização e escopo
Em 27/10/2026, autorizada somente a publicação da instrumentação previamente implementada e a consulta GET da origem. Nenhuma sincronização manual/automática foi acionada; nenhum banco, conferência, movimento, saldo, regra de autenticação ou idempotência foi alterado. Não houve alteração do GESTÃO ITV nem acesso de configuração ao cron-job.org; a tarefa deve permanecer desabilitada, mas seu estado externo não foi verificado nesta sessão.

## Publicação e testes
Publicação solicitada pelo mecanismo oficial para https://itv-financeiro.lovable.app. O mecanismo confirmou agendamento, não conclusão. Uma consulta posterior à página oficial não confirmou acesso; não se pode afirmar que a nova versão já está servida. Compilação registrada: build OK, 27/10 02:51:00 UTC. Os quatro arquivos de testes de integração, leitura, execução e agendamento passaram duas vezes, inclusive após a solicitação: 39/39 às 02:52 UTC. A verificação pré-publicação não encontrou achados críticos; apontou apenas informação sobre proteção contra senhas vazadas desligada, sem alterar configurações de autenticação.

## Evidência de leitura atual
Às 02:51:59 UTC, executado exclusivamente o leitor existente, com credencial lida do ambiente do servidor, sem código de banco nem orquestração da sincronização. O script temporário transpila o mesmo módulo e remove apenas o marcador de exclusividade do servidor para execução local. Token e respostas não foram persistidos ou impressos.

Endpoint: GET https://itvcentrotecnico.lovable.app/api/public/integracao-financeiro. Intervalo 20–26/10/2026, igual ao da falha anterior; offset 0, limite 500. Cinco chamadas simultâneas, sem redirecionamentos ou repetições automáticas.

| Recurso | HTTP da origem | Duração até cabeçalhos |
|---|---:|---:|
| recebimentos | 200 | 501 ms |
| titulos | 200 | 872 ms |
| formas_pagamento | 200 | 874 ms |
| recebimentos_titulos | 200 | 935 ms |
| pagamentos | 200 | 1168 ms |

O leitor concluiu autenticação, transporte, JSON, validação do envelope/paginação e processamento da resposta sem erro. Nenhuma página adicional foi necessária. Nenhum conteúdo ou contagem financeira foi registrado. Estes resultados são do ambiente de diagnóstico, não de uma chamada dentro da implantação publicada.

## Logs e causa raiz
Consulta aos logs publicados recuperou o erro de 27/10 02:41:49.807 UTC: HTTP 500 do ITV FINANCEIRO, etapa leitura_origem. Esse HTTP 500 não é evidência do status HTTP da origem. O evento novo integracao_leitura_falhou não foi encontrado nos logs publicados da última hora; não provocamos falha real para criá-lo.

A causa comprovada é a perda do diagnóstico original no tratamento anterior. A causa operacional histórica da leitura permanece indeterminada, pois o status da origem e erro original não foram preservados. Hoje não foi reproduzido erro de autenticação, disponibilidade, parâmetros, timeout ou processamento. Não atribuir retrospectivamente a falha a instabilidade, token, concorrência ou implantação sem evidência.

## Correção e próximos limites
A instrumentação já implementada identifica recurso, categoria, HTTP e duração, sem conteúdo sensível; sua publicação foi solicitada. Nenhuma correção adicional de token, origem, parâmetros ou timeout é justificada pela leitura atual. Não existe rota publicada autônoma de diagnóstico: usar a rota automática iniciaria registro de sincronização e violaria esta autorização. Validação hospedada ponta a ponta e nova sincronização dependem de autorização separada. Não habilitar cron-job.org nesta etapa.