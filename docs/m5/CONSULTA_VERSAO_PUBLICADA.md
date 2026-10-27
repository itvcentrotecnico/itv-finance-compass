# M5 — consulta protegida de versão publicada

## Implementação autorizada em 27/10/2026 às 13:20 UTC
GET na mesma rota /api/public/integracao/sincronizacao-diaria verifica a identidade técnica Bearer já existente (segredo independente do token da origem), retorna somente versao/revisao_leitor com Cache-Control no-store. Importa dinamicamente o marcador do próprio integracao-leitura.server sem invocar o leitor; nenhuma origem, banco, RPC ou execução acessados pela consulta.

POST permanece byte a byte idêntico ao snapshot aprovado e5ca3cc8027476e4e8d6472af438924953c1e91c. Removendo apenas o marcador/comentário adicionado ao leitor, o arquivo é idêntico à revisão aprovada e tem SHA-256 95cf17c3f13734bf55260c2f5802d615d679c907ebda792be400072d7cd76389. O marcador representa essa revisão original, não o hash do arquivo completo após adicionar metadados. Autenticação da sincronização, idempotência, auditoria, concorrência e ausência de retries preservadas.

## Publicação e prova ativa
Publicação solicitada oficialmente aproximadamente às 13:21:52 UTC. Snapshot local 2ff777590d6a2b10fdde4e47396270972f84e56b. Build hospedado do preview concluído às 13:22:30 UTC; esse horário não é prova do horário de conclusão da publicação.

GET público sem autenticação às 13:43:39 UTC: HTTP 401 application/json, no-store, somente estado nao_autorizado. GET autenticado às 13:43:40 UTC (09:43:40 Manaus): HTTP 200 application/json, no-store, retornou:

```json
{"versao":"m5-http-contexto-v1","revisao_leitor":"95cf17c3f13734bf55260c2f5802d615d679c907ebda792be400072d7cd76389"}
```

Correspondência exata com o marcador do leitor aprovado. O cabeçalho x-deployment-id da resposta autenticada identifica implantação fe0b1400-59e4-4aba-81dc-765e00a52416. Não interpretar trechos variáveis do cabeçalho como data de publicação. Horário exato de conclusão não disponibilizado; versão ativa comprovada no momento dessa resposta.

Limite: prova que a rota publicada importa o marcador da revisão corrigida do leitor compartilhado; não executa nem homologa a comunicação real da sincronização. A causa da falha histórica continua não demonstrada no runtime real. Falha local ao salvar cópia temporária da evidência ocorreu após as respostas e não afetou a consulta; não houve repetição HTTP por isso. Resultados preservados neste relatório e no log de ferramenta.

## Testes e integridade
70/70 testes aprovados antes e depois da publicação (última execução 13:43:45 UTC): 63 regressões M5 e sete testes da consulta/POST. GET rejeita ausência/formato/chave incorretos, não revela revisão sem autorização, retorna somente os dois campos permitidos, não chama fetch/RPC/orquestração, fica 503 sem segredo; POST não autenticado e autenticado com serviços totalmente simulados preservados. Build automático OK.

SELECT HML às 13:43:41 UTC: 16 itens e 16 conferências; zero duplicidades em ambas as referências, zero conferências lançadas, zero movimentos e zero operações diferentes de abertura. Aberturas total 0.00 e nenhuma conta com abertura não zero; saldos R$ 0,00. Hashes dos registros idênticos à leitura anterior da publicação: itens 01b3de508a9f7f43ea0a52d1bbad02a0, conferências e3483b93e924a9be95ec5d65df4350bb.

## Prontidão
Ambiente preparado para solicitar autorização específica de uma única sincronização real supervisionada. Não foi executado POST real, sincronização, leitura da origem, importação ou alteração financeira. Cron-job.org não acessado/habilitado; estado externo não verificado e deve continuar desabilitado. Não considerar a integração homologada antes do teste real autorizado e conferência posterior da execução/auditoria/integridade.

Scan pré-publicação 13:21:42 UTC sem achados críticos; aviso informativo preexistente de proteção contra senhas vazadas desativada, sem alteração fora do escopo. Análise aprofundada disponível mediante solicitação separada.