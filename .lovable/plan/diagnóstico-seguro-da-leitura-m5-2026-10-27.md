# Diagnóstico seguro da leitura M5

## Resultado da investigação
A leitura atual do GESTÃO ITV funcionou nos cinco recursos, tanto sequencialmente como simultaneamente. A falha anterior não pode ser atribuída com segurança a uma causa específica: o aplicativo descartou o erro original e registrou apenas “leitura_origem”.

## Alterações propostas
- Preservar nos registros de diagnóstico somente recurso, etapa, código HTTP e duração, sem chave, cabeçalhos ou dados financeiros.
- Distinguir falhas de rede, autenticação, autorização, limite de chamadas, demora excessiva, resposta inválida e erro interno da origem.
- Validar o formato recebido para impedir que uma resposta incompatível seja considerada uma consulta vazia bem-sucedida.
- Manter uma única leitura compartilhada entre sincronização manual e automática, com os mesmos controles financeiros e de segurança.
- Definir prazo de leitura e proteção contra paginação repetida em testes isolados, sem truncar registros silenciosamente.

## O que não será feito
- Nenhuma mudança no GESTÃO ITV, nas permissões do HML, nos saldos, contas ou conferências.
- Nenhuma sincronização real, importação ou ativação do agendamento.
- Nenhuma repetição automática adicional antes de identificar a falha.

## Testes e riscos
Testar respostas normais, erros HTTP, falhas de rede, demora, JSON inválido e paginação usando respostas simuladas. Confirmar ausência de dados sensíveis nos registros e que falhas não criam itens ou conferências. A validação e os prazos poderão recusar respostas antes toleradas; deverão falhar claramente, sem registrar sucesso vazio.

## Detalhes técnicos
Extrair a leitura HTTP para módulo server-only testável; adaptar `src/lib/integracao.functions.ts` para reutilizá-lo. Cobrir ambos os caminhos e manter as RPCs M5 e a resposta pública do cron intactas. Não é necessária migração nesta proposta.

## Aprovações
A aprovação deste plano autoriza somente as alterações e os testes simulados. Uma nova sincronização real dependerá de autorização separada após a correção e publicação.