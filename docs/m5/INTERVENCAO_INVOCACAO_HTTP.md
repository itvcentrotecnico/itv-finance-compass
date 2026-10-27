# M5 — intervenção controlada no leitor HTTP

## Resultado e limite da comprovação
Autorização 27/10/2026 03:05 UTC. O teste isolado sem fetch injetado substitui a função global por uma resposta simulada que exige this === globalThis. Antes da correção, esse teste falhou como rede_origem, reproduzindo a perda de receptor pelo padrão const buscar = fetch; buscar(...). Depois da correção passou, recebendo cinco GET com parâmetros e cabeçalho exclusivamente simulado corretos.

Comprovado: o código anterior não preservava o receptor global e era incompatível com implementações que o exigem; a cobertura anterior não exercitava esse caminho. Não comprovado: que o runtime publicado real exigiu receptor naquela ocorrência ou lançou Illegal invocation. O log histórico não preservou tipo/causa nativa, portanto a causa histórica continua hipótese, embora o defeito de compatibilidade esteja reproduzido isoladamente. Nenhum teste no serviço publicado ou origem real foi executado.

## Correção realizada
Somente src/lib/integracao-leitura.server.ts foi alterado no comportamento do sistema:
- Wrapper padrão chama globalThis.fetch(input, init), sem destacar a função nativa; injeção de fetch para testes preservada.
- Falha síncrona antes de obter promessa é invocacao_origem, sem inferir DNS/TLS ou registrar mensagem.
- Rejeição assíncrona com códigos conhecidos de conexão é conexao_origem. Timeout de página/total, AbortError/TimeoutError e códigos fechados ETIMEDOUT/UND_ERR_*_TIMEOUT são timeout_origem.
- Código desconhecido continua rede_origem. Nenhum código arbitrário, mensagem, stack ou causa é copiado para log; campos do evento permanecem evento/recurso/etapa/status_http/duracao_ms.
- Retorno que não seja Response é recusado como resposta_invalida_origem. Categorias de HTTP, JSON e paginação preservadas.
- Date.now e duração permanecem iguais; não atribuir 0 ms a latência física zero.

URL, método GET, cabeçalhos, redirecionamentos, cinco recursos, prazo 20s/página e 120s/total, autenticação, idempotência, RPCs e janela não foram alterados. Nenhum retry foi incluído.

## Testes e componentes
- src/lib/integracao-invocacao.test.ts: 16 testes novos do caminho padrão, receptor global, erro síncrono, conexão conhecida/desconhecida, HTTP 401/403/429/500/404, retorno não Response, JSON inválido, timeout página/total/nativo e ausência de conteúdo sensível no log.
- src/lib/integracao-execucao.test.ts: ampliado de 2 para 10 casos, preservando categorias no caminho compartilhado manual/automático e garantindo só conclusão de falha simulada, sem itens/conferências.
- src/lib/integracao-leitura.test.ts: 18 regressões existentes, sem mudanças.
- src/lib/integracao.test.ts: 15 regressões existentes.
- src/lib/agendamento.test.ts: 4 regressões existentes.

Total final: 63/63 aprovados em cinco arquivos, 27/10 às 03:06:58 UTC. A primeira execução pré-correção teve um teste deliberadamente falhando, documentando a reprodução; não confundir essa evidência com regressão pendente. Compilação automática registrada build OK às 03:06:52 UTC.

AGENTS.md recebeu a regra estrutural do wrapper/default-path; roadmap e este relatório documentam resultados. Nenhuma outra implementação de sistema foi alterada.

## Prontidão e riscos
Pronta para solicitar publicação controlada da correção local testada; não publicada nesta etapa. Compatibilidade exata hospedada e causa do evento histórico permanecem não validadas por teste real. Uma falha real de DNS/TLS/rede não será resolvida pelo wrapper; códigos não expostos pelo runtime continuarão genéricos. invocacao_origem distingue momento síncrono, não diagnostica automaticamente seu motivo específico. Um runtime que rejeite invocação de forma assíncrona ainda poderá aparecer como rede_origem.

Nenhuma sincronização, importação, leitura de dados financeiros reais, alteração HML/GESTÃO ITV, conferência, movimento, saldo, autenticação, idempotência, cron ou publicação foi realizada. Publicação e nova sincronização exigem autorização separada.