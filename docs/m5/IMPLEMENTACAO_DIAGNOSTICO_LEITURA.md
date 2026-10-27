# Implementação do plano aprovado — diagnóstico da leitura M5

## Alterações
- `src/lib/integracao-leitura.server.ts`: leitor exclusivo do servidor, compartilhado pelos fluxos manual e automático, GET sem redirecionamento, mesma URL/token/janela/recursos.
- `src/lib/integracao.functions.ts`: delegação por importação dinâmica, preservando RPCs e fluxo de falha auditada.
- Diagnósticos: evento, recurso, categoria, status HTTP e duração. Nenhum token, cabeçalho, corpo, linha financeira ou mensagem bruta é registrado.
- Categorias: rede, 401, 403, 429, demais erros HTTP, 5xx, timeout, JSON inválido, envelope/paginação incompatível e configuração inválida.
- Prazo de 20 segundos por página e 120 segundos por leitura completa; aborta requisições irmãs após falha. Sem retry automático novo.
- Paginação: exige dados como array de objetos com id, envelope correspondente e no máximo 500 linhas/página; recusa identificadores repetidos sem omissão ou truncamento silencioso. Não impõe teto de volume arbitrário; o prazo total limita leituras excessivamente longas.
- `src/test/setup.ts`: proteção para executar testes sem navegador.

## Testes simulados
Leitor: 18 casos cobrindo cinco recursos GET, credencial exclusivamente simulada, HTTP 401/403/429/500/503/404, rede, JSON inválido, dados ausentes/tipo inválido/sem id, paginação de 501 linhas, repetição, envelope divergente, prazo de página/total e URL com credenciais rejeitada antes do envio.
Orquestração: dois testes de falha do caminho compartilhado, com todas as chamadas simuladas; apenas integracao_concluir(status=falha), sem itens, sem acesso de tabelas e sem conferências.
Regressões existentes de integração/agendamento mantidas.

## Riscos e limites
Validação estrita poderá recusar resposta antes tolerada; prazos podem interromper leitura legítima lenta. Não houve sincronização real, alteração HML, mudança de origem ou publicação. A causa histórica permanece indeterminada; a instrumentação permitirá distinguir a próxima falha, não prova uma causa retroativamente. Novo teste real e publicação exigem autorização separada.