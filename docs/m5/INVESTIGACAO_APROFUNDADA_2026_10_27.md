# M5 — investigação aprofundada somente de diagnóstico

Autorizada em 27/10/2026 às 13:57 UTC. Nenhuma chamada real à origem, sincronização, alteração de implementação, publicação ou alteração financeira realizada. Cron não acessado/habilitado. Fontes: código atual, configuração instalada, relatórios históricos, logs publicados existentes e consulta local apenas de validade/presença de configuração sem revelar valores sensíveis.

## Evidência e ponto exato da falha
Execução e60aeb3f-7ddd-4df6-9ff6-0c9dc824d357, 13:53:24 UTC, janela 21–27/10, registrada e concluída com falha; autenticação/início funcionaram. Publicação fe0b1400-59e4-4aba-81dc-765e00a52416; conteúdo f8ca3b92dbfd621a2f465d5f43c0aa749d55be45972d375dc857462211623821. Logs proxy correlacionam resposta 500 rede_origem com request a5122fc61fc04b2c. Log do leitor às 13:53:24.187: formas_pagamento, rede_origem, status HTTP null, 0 ms.

Caminho: POST sincronizacao-diaria → executarSincronizacao → lerFonteGestao → import dinâmico integracao-leitura.server → lerFonteGestaoServidor → lerFonteHttp → lerRecurso → buscar → globalThis.fetch. Código do leitor linhas 78–87 separa exceção síncrona (invocacao_origem) de rejeição ao aguardar a promessa (classificarTransporte). rede_origem/null indica rejeição tratada antes de obter Response; não demonstra se houve resolução DNS, conexão ou TLS. O tipo nativo original não foi preservado: ErroLeitura é a classe criada pelo tratamento, não a exceção original. Não existe causa raiz técnica específica comprovada.

Tempo 0 ms não prova conexão instantânea nem ausência de tráfego. O relógio e falhas simultâneas podem produzir esse valor. Não há evidência de timeout de 20s/120s: categoria timeout não foi registrada e operação terminou muito antes desses limites. Não há HTTP 401/403 da origem: autenticação da origem não foi validada nem demonstrada incorreta nessa execução.

## Ambiente e configuração: comprovado versus indisponível
Publicado executa servidor TanStack/Nitro no ambiente Worker/workerd da plataforma; desenvolvimento/sandbox/testes usam outro ambiente, incluindo Node. vite.config.ts delega configuração ao pacote @lovable.dev/vite-tanstack-config, Nitro alvo Cloudflare padrão. Preset instalado habilita compatibilidade Node/unenv, cujas injeções examinadas não demonstram substituição de global fetch. Código mantém receptor por globalThis.fetch; não foi encontrada evidência de detach ou polyfill de fetch pelo bundler. Artefato completo e configuração efetiva de infraestrutura da implantação não estão acessíveis pelas ferramentas disponíveis; versões internas, regras de saída, DNS e TLS ativos não podem ser atestados.

Configuração no código: GESTAO_ITV_URL quando definida ou domínio oficial de origem como padrão; GESTAO_ITV_READ_TOKEN lido dentro da chamada; GET /api/public/integracao-financeiro com Bearer, redirect error, parâmetros recurso/inicio/fim/offset/limite. Verificação local confirmou URL HTTPS válida correspondente ao domínio oficial e token configurado, sem revelar credencial. Isso vale somente para sandbox. Publicação inicia e chega ao leitor: flags de presença de segredo passaram e validação inicial da URL não produziu configuracao_origem. Não comprova o valor efetivo da URL/token da implantação nem que sejam idênticos aos do sandbox.

Relatórios anteriores comprovam GET 200 dos cinco recursos a partir do sandbox, não de dentro da execução publicada. A acessibilidade da origem pelo mesmo ambiente M5 permanece não confirmada. Não foi executado novo GET para inferi-la.

Logs publicados disponíveis mostram evento sanitizado e resposta de proxy; não contêm exceção nativa, DNS, TLS, tentativa de socket ou logs de saída da origem. Não há acesso comprovado aos logs internos de rede da infraestrutura. A consulta de correlação não trouxe detalhe adicional. Nenhum diagnóstico de causa específica pode ser recuperado retrospectivamente desses campos.

## Hipóteses não confirmadas
1. Restrição/transformação do transporte no ambiente publicado, inclusive rejeição assíncrona imediata de fetch. Nenhuma evidência de detach no código atual; não repetir correção de contexto por suposição.
2. DNS/TLS, política de saída, redirecionamento recusado ou erro de conexão sem código reconhecido. redirect error pode rejeitar sem entregar HTTP de redirect ao leitor; não afirmar que ocorreu.
3. Configuração efetiva publicada diferente da verificação local. Apenas presença e passagem das guardas foram demonstradas na execução; autenticação inválida normalmente geraria HTTP 401/403, não observado.
4. Indisponibilidade da origem. Possível, mas leitura histórica 200 não demonstra disponibilidade no horário do teste nem exclui falha específica do ambiente.

## Revisão arquitetural
formas_pagamento é obrigatório operacionalmente: Promise.all rejeita se qualquer recurso falhar. Normalizador usa mapa id→nome para classificação de pagamentos e recebimentos; sem cadastro pode marcar indefinida, mas isso não autoriza ignorar o recurso. Não mudar dependência, contrato ou elegibilidade por tentativa.

Não há leitura sequencial entre recursos: cinco promessas são iniciadas em paralelo, com formas_pagamento primeiro na lista. Primeira rejeição capturada aborta requisições irmãs e só um evento é registrado. Se uma falha for imediata e comum às cinco, a ordem da lista pode favorecer formas_pagamento no diagnóstico; não prova falha exclusiva desse recurso ou dos outros quatro. Sucesso individual não é registrado. Manter esse comportamento financeiro até aprovação explícita; diagnóstico separado pode observar recursos sem cancelamento entre irmãos.

| Alternativa | Complexidade/risco | Impacto |
| --- | --- | --- |
| Diagnosticar e corrigir transporte do endpoint dedicado já existente | Menor alteração; mantém contrato/identidade/autoridade HML. Exige causa demonstrada, não retries/skip | Mais reversível e menor mudança operacional |
| Hospedar a mesma interface de leitura fora da camada web atual | Nova implantação, segurança, observabilidade e autorização para origem; só útil se isolamento demonstrar problema dessa camada | Remove dependência da camada comprovadamente problemática, caso exista |
| Executor separado para comunicação/agendamento | Novo serviço, segredos/monitoramento e responsabilidade; não garante resolver rede | Isola duração/carga, mas mantém RPCs e auditoria HML como autoridade; cron-job.org continua exclusivo conforme autorização vigente |
| Leitura direta de API Supabase com identidade mínima | Alto acoplamento a esquema/RLS e maior impacto de credencial; API também usa HTTP; jamais service_role genérico da origem | Requer autorização explícita de acesso/contrato/origem; não é atalho autorizado nem elimina automaticamente transporte |

Não escolher mudança arquitetural antes de identificar qual camada falha. O endpoint dedicado de leitura na origem já existe; propor outro igual não resolveria a causa por si só.

## Teste isolado recomendado — proposta, NÃO implementado/executado
Solicitar autorização específica para preparar/publicar consulta técnica protegida no mesmo servidor do FINANCEIRO. Usar identidade técnica existente, URL/token exclusivamente server-side e exatamente o transporte GET do leitor M5, sem executarSincronizacao, clientes de banco ou RPCs. Para garantir código comum, eventual extração mínima do transporte por página para helper compartilhado requer aprovação; não duplicar implementação e chamar isso de mesmo cliente.

Procedimento proposto:
1. Testes simulados garantem ausência de banco/RPCs/POST e campos sanitizados; preservar byte-equivalência comportamental da rotina financeira.
2. Publicar somente após autorização e validar versão técnica. Não chamar origem durante publicação/verificação de versão.
3. Com autorização adicional para chamada real: uma sessão diagnóstica com no máximo cinco GETs, um por recurso, primeira página offset 0/limite 500, janela 21–27/10, mesma URL, Bearer, redirect error e prazos 20s/página/120s total. Consultar sequencialmente só nesse diagnóstico para distinguir cada resultado; nenhuma retentativa. Não paginar nesta verificação de conectividade e não alegar completude financeira se houver página cheia.
4. Descartar dados/corpo da resposta após validação mínima em memória; registrar apenas recurso, estágio fechado, HTTP ou null, duração, categoria e nome/código de exceção de lista fechada. Nenhum header, token, URL arbitrária, stack, mensagem bruta, variável ou corpo permitido em retorno/log.
5. Distinguir configuração, invocação síncrona, rejeição assíncrona, DNS/TLS/conexão/timeout somente por códigos conhecidos expostos pelo ambiente; desconhecido continua transporte não identificado. Não inferir momento de conexão a partir de fetch invocado. Se DNS/TLS não forem expostos, declarar limitação e exigir correlação de rede do provedor, não inventar categoria.
6. Encerrar e comparar HML com baseline sem gerar registro de sincronização ou auditoria financeira. Nenhum agendamento habilitado.

Uma sessão de cinco GETs não é autorização para sincronização; ambos os atos exigem aprovação separada. Até receber autorização, nenhuma implementação/publicação/chamada será feita.

## Correção e critérios objetivos
Correção concreta ainda não indicada: recuperar diagnóstico seguro no ambiente real primeiro. Se código nativo/restrição/incompatibilidade for reproduzido, corrigir somente a camada comprovada e testar isoladamente. Se URL/redirect for comprovado, ajustar endereço apenas com validação e sem relaxar autenticação. Se DNS/TLS/disponibilidade, tratar a causa no serviço autorizado. Não aumentar timeout/retry nem remover formas_pagamento sem prova e aprovação.

Riscos do diagnóstico: carga limitada na origem, exposição acidental e deriva do transporte compartilhado; mitigar limite de chamadas, campos fechados e testes. O próprio ambiente pode não expor causas DNS/TLS, mantendo incerteza mesmo após instrumentação.

Retomar homologação somente após: (a) versão do diagnóstico publicada e autorização para sessão de leitura; (b) HTTP 200 e resposta válida de cada recurso no mesmo ambiente sem mascarar falha; (c) causa identificada/correção comprovada ou resolução operacional demonstrada com limites de incerteza; (d) nova autorização para única sincronização real com paginação completa/janela correta; (e) contagens coerentes, elegibilidade/duplicidade e auditoria confirmadas, sem movimentos e saldos preservados; (f) autorização separada para agenda. Publicação e testes simulados não homologam comunicação real.