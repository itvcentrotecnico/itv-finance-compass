# M5 — validação administrativa publicada v2

Autorização de 27/10/2026 14:24 UTC. Ajustes limitados ao diagnóstico; nenhuma chamada à origem nem sincronização.

## Entregue

- Na página Integrações, administradores encontram a ação “Validar acesso administrativo”. Usa a sessão Supabase existente em memória, enviando Bearer somente para GET sem parâmetros da rota diagnóstica. Não exibe credenciais, não inicia leitura ou sincronização e não repete automaticamente.
- Servidor mantém validação de claims e RPC existente `tem_papel` para admin_geral/admin_financeiro. Retorna versão e estado de preparação sem consultar a origem. Usuários sem sessão/permissão continuam recusados.
- Versão `m5-diagnostico-acesso-v2`; GET técnico autenticado publicado retornou HTTP 200 e esse marcador. Cabeçalho público identifica publicação `87935f5e-fd38-44c1-be15-a18f7b31ed9a`. Consulta diagnóstica publicada sem sessão retornou 401. Horário de conclusão exato da publicação não disponível.
- 92/92 testes isolados aprovados: 86 regressões anteriores, cinco do cliente administrativo e um teste dos cinco recursos bloqueados mesmo com flag. Verificação automática da aplicação OK.
- Verificação de segurança pré-publicação completa: nenhuma ocorrência crítica retornada; aviso informativo existente de proteção contra senhas vazadas desabilitada. Não alterada nesta tarefa. Análise aprofundada não realizada.

## Pendência de liberação

O código anterior tinha flag, mas não orçamento global atômico de cinco chamadas nem reserva única por recurso. Worker sem estado persistente não pode garantir limite entre abas/usuários/instâncias; flags e contadores locais não resolvem. Não há armazenamento diagnóstico durável identificado. Novas tabelas/migrações exigem aprovação expressa e não foram executadas.

Por segurança, a rota mantém os cinco recursos bloqueados mesmo se a flag for ativada isoladamente. A implementação do leitor e transporte M5 permanece preservada; nenhum POST foi alterado. Não declarar as cinco leituras liberadas. Requer proposta de controle técnico não financeiro durável, aprovação antes de aplicação e autorização posterior para leitura real.

## Procedimento do usuário

1. Entrar normalmente em https://itv-financeiro.lovable.app como administrador.
2. Abrir Integrações e clicar apenas “Validar acesso administrativo”.
3. Informar somente texto de acesso, HTTP e versão mostrados. Resultado esperado: Administrador confirmado pelo servidor / HTTP 200 / m5-diagnostico-acesso-v2 / Leitura diagnóstica Bloqueada.
4. Não clicar “Sincronizar agora” nem compartilhar senha, token, cabeçalhos ou armazenamento do navegador.

Sessão administrativa real e recusa de usuário comum real ainda não verificadas neste executor externo; os testes simulados não substituem essas verificações. Aguardam o procedimento do usuário; nenhuma alteração de autenticação foi feita.

## Integridade

SELECT em 27/10/2026 14:28:17 UTC: 16 itens, 16 conferências, zero duplicidades, zero movimentos, zero operações não abertura, total aberturas 0.00 e zero aberturas não zero. Saldos R$ 0,00. Permanecem 12 execuções, zero iniciadas nesta etapa e 112 auditorias. Cron não acessado/habilitado; estado externo não comprovado. M5 não homologada.