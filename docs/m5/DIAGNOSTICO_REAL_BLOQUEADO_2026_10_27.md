# M5 — etapa de diagnóstico real interrompida por pré-condição de segurança

Autorização recebida em 27/10/2026 às 14:19 UTC para até cinco GETs individuais sequenciais, condicionados à validação administrativa real no ambiente publicado. Nenhuma chamada à origem foi executada.

## Etapa 1

- GET publicado `/api/public/integracao/diagnostico`, sem credenciais: HTTP 401, `estado: nao_autorizado`.
- Executor informa `external_unmanaged`: não há sessão administrativa real disponível nem mecanismo gerenciado autorizado para emiti-la. Não foram solicitadas senhas/tokens, usadas credenciais de serviço como sessão nem contornadas permissões.
- Reconhecimento administrativo publicado e recusa de usuário real não administrador não foram comprovados. Testes isolados não substituem essas evidências.
- 86/86 testes isolados aprovados em 27/10/2026 às 14:20:57 UTC, incluindo controles de acesso e ausência de chamada à origem quando bloqueada.
- Código mantém bloqueio por padrão: `M5_DIAGNOSTICO_LEITURA_AUTORIZADA` precisa ser exatamente `true`. A preparação anterior deixou a leitura desabilitada; o valor vigente publicado não foi consultado nesta etapa. Nenhuma configuração foi alterada. Uma eventual alteração de variável do servidor necessita publicação para atingir o ambiente oficial, não autorizada nesta solicitação.

## Recursos

Formas de pagamento, recebimentos, pagamentos, recebimentos de títulos e títulos: todos **não executados**, pois a pré-condição administrativa não foi satisfeita. Não existem HTTP da origem, duração ou exceção desta etapa para reportar. Isso não comprova indisponibilidade da origem.

## Integridade por SELECT

Verificação do HML em 27/10/2026 às 14:20:51 UTC (10:20:51 Manaus): 16 registros, 16 conferências; zero duplicidades de referência em ambas as tabelas; zero movimentos; zero operações diferentes de abertura; total de aberturas `0.00`, zero aberturas não zero. Saldos permanecem R$ 0,00, sem efeitos financeiros. Total de execuções 12, nenhuma iniciada desde 14:19 UTC e nenhuma em andamento; auditorias 112, igual à última verificação documentada.

## Conclusão

Procedimento interrompido antes da origem. Causa raiz da falha histórica continua indeterminada e M5 não homologada. Retomada exige um meio seguro de validar a consulta com sessão administrativa real no ambiente oficial e comprovar a recusa de usuário não autorizado. Não compartilhar tokens/senhas. Caso seja necessário habilitar a variável na publicação, solicitar autorização específica antes; não publicar por iniciativa própria. Nenhuma correção, sincronização, importação, chamada à origem ou habilitação de cron realizada; estado externo do cron não verificado.