# M5 — evidência da versão ativa, 27/10/2026

## Identificador da implantação em execução
Os logs publicados do POST /api/public/integracao/sincronizacao-diaria, às 02:58:03.526 UTC, identificam o conteúdo do servidor como:

`6944a2e5a336453809a09f4a9b4cbcf3dfe06b368129d975587b138acfc9d8cd`

O identificador de armazenamento da implantação é `e41c212d-e68b-4a75-964d-b83d909feef0`. Esse mesmo identificador aparece no cabeçalho público x-deployment-id da página e do endereço da sincronização, consultados por GET às 02:59:04–05 UTC. O cabeçalho completo contém campos variáveis; não usar seu horário numérico como data de publicação.

## Prova de execução do diagnóstico seguro
Log publicado às 02:58:03.357 UTC:

```json
{"evento":"integracao_leitura_falhou","recurso":"formas_pagamento","etapa":"rede_origem","status_http":null,"duracao_ms":0}
```

No mesmo intervalo, o POST do domínio oficial retornou HTTP 500 com etapa rede_origem. O banco registra execução automática iniciada às 02:58:03.292 UTC e concluída às 02:58:03.506 UTC, janela 20–26/10, falha rede_origem e zero consultados/novos/enviados. Essa ocorrência já existia nos serviços: não foi acionada por este diagnóstico e a identidade externa que a acionou não foi determinada. Entradas request e proxy não devem ser somadas como tentativas independentes.

O evento estruturado com recurso, categoria, HTTP e duração e a etapa específica demonstram que o endpoint publicado usa o diagnóstico novo; o código anterior emitia apenas leitura_origem e não esse evento.

## Comparação com fonte testada
O snapshot local 88a105bcc8641daead26da6ad57e243ddc4871db, de 02:51:00 UTC, e a árvore atual não têm diferenças nos arquivos do leitor, orquestração, rota automática e quatro arquivos dos 39 testes. SHA-256 do código-fonte do leitor: 32c8072ae7f5e14cce46bf86a4acb02065d2a5abedc202476e8cf8a4b6ca05f6. Os 39 testes passaram novamente às 02:59 UTC.

Limite: não há acesso ao artefato completo implantado nem vínculo oficial commit→deployment para provar igualdade byte a byte de todo o servidor com a fonte local. Há prova operacional específica das melhorias ativas e igualdade dos arquivos locais relevantes com o snapshot preparado para publicação.

## Horário e cache
Publicação solicitada aproximadamente às 02:51 UTC (26/10 22:51 Manaus). Conclusão exata não disponibilizada pelas ferramentas; o novo código está comprovadamente em execução até 02:58:03 UTC (26/10 22:58:03 Manaus). Não chamar o horário do log de horário exato da publicação.

GET na página e endereço público retornou HTTP 200 text/html e Cache-Control: no-cache, must-revalidate, max-age=0. GET não atesta comportamento POST. A prova de POST vem dos logs existentes, não de novo acionamento. Não há evidência de versão antiga/cache impedindo o diagnóstico no POST observado; isso não equivale a comprovar ausência de qualquer problema de cache.

## Resultado e próximo passo
Publicação do diagnóstico comprovada operacionalmente. Não é necessário republicar para ativar essas melhorias, e nenhuma nova publicação foi solicitada. A leitura hospedada ainda falhou antes de receber resposta HTTP da origem: categoria rede_origem, recurso formas_pagamento, status da origem não disponível. O diagnóstico não preserva detalhes de transporte, portanto não distingue DNS, TLS, política de rede ou erro síncrono de execução. Não atribuir causa específica sem evidência.

16 itens e 16 conferências preservados; zero movimentos e zero conferências lançadas na verificação atual. Não iniciar outro teste supervisionado antes de investigar a falha hospedada recente por meios sem sincronização. Agendamento continua sem autorização de habilitação; seu estado externo não foi inspecionado.

Se for necessária prova futura sem esperar ocorrência real, propor GET de versão na mesma rota, retornando apenas marcador de versão e fingerprint de fonte não sensível, com Cache-Control: no-store; importação do marcador do leitor dentro do handler, sem fetch da origem, banco ou chamada de sincronização, mantendo POST e autenticação intocados. Requer informar/aprovar essa alteração e sua publicação antes de implementá-la.