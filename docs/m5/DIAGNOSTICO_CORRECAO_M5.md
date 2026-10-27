# Diagnóstico e correção da inicialização M5

## Escopo
Somente ITV FINANCEIRO HML, Supabase `ayjppexbzpgdkzbehvzw`, esquema `financeiro_hml`. Nenhuma sincronização real executada neste diagnóstico. Nenhum acesso à origem GESTÃO ITV.

## Evidências e causa raiz
- Servidor publicado: POSTs em 27/10/2026 às 02:31:40.960 e 02:31:41.593 UTC (26/10 às 22:31 Manaus), HTTP 500. Resposta disponível: `{"estado":"falha","etapa":"inicio"}`.
- Supabase Data API: POST `/rest/v1/rpc/integracao_iniciar_automatica` às 02:31:40.979 UTC, HTTP 403.
- PostgreSQL: 02:31:41.523 UTC, SQLSTATE `42501`, `permission denied for schema financeiro_hml`.
- ACL anterior do esquema: `{postgres=UC/postgres,authenticated=U/postgres}`; `has_schema_privilege('service_role','financeiro_hml','USAGE') = false`.
- A função existia, era SECURITY DEFINER, de propriedade postgres e possuía EXECUTE para service_role. As colunas, trigger de auditoria e índice de exclusão simultânea estavam presentes.
- O bloqueio ocorreu antes da resolução/invocação da função, por ausência de USAGE. Não havia execução automática nem sincronização em andamento; nenhuma espera de lock pendente foi observada na inspeção.
- Não há stack trace original disponível: o cliente devolve o erro como resultado, e o endpoint converte-o em resposta genérica sem lançar/logar a exceção. O erro PostgreSQL original foi recuperado; não é falha de timeout comprovada.
- Somente um erro PostgreSQL e uma chamada Data API ficaram disponíveis na janela para duas respostas HTTP 500. Não é possível atribuir individualmente todos os registros às duas respostas; a causa foi reproduzida exatamente no banco descartável.

## Configuração
SUPABASE_URL corresponde ao projeto HML. SUPABASE_SERVICE_ROLE_KEY, INTEGRACAO_CRON_SECRET e GESTAO_ITV_READ_TOKEN disponíveis no sandbox, sem exposição de valores. As respostas publicadas de falha na etapa início comprovam passagem pelas verificações de segredo do agendador e presença do token da origem. A leitura real com a identidade service_role confirmou a validade da conexão HML após a correção; não constitui prova de todas as configurações hospedadas.

## Correção aplicada pelo mecanismo oficial
```sql
GRANT USAGE ON SCHEMA financeiro_hml TO service_role;
```
Não altera corpos de funções, tabelas, triggers, políticas RLS, dados ou perfis. Não concede CREATE nem privilégios adicionais de tabelas. Sem mudanças no endpoint ou no GESTÃO ITV.

### Risco e recuperação
USAGE permite usar objetos do esquema para os quais service_role já tinha privilégios; não se limita às duas RPCs M5. A identidade privilegiada continua restrita ao servidor após autenticação. A reversão específica é `REVOKE USAGE ON SCHEMA financeiro_hml FROM service_role;`, mediante autorização, e interromperia novamente a automação sem alterar dados.

## Testes
`docs/m5/testar_m5_acesso_local.sql`, somente PostgreSQL descartável `/tmp/pgm5`, banco t2:
- Reproduzida ACL real do HML e erro exato 42501 sem USAGE.
- Após GRANT: inicialização com identidade service_role, bloqueio simultâneo, conclusão com lista vazia e bloqueio de nova conclusão diária aprovados.
- Ausência de CREATE, de acesso anônimo e de EXECUTE automático para authenticated confirmadas.
- Auditoria confirmada; movimentos/operações, contas e conferências locais idênticos ao baseline. Transação integralmente revertida por ROLLBACK.
- `bunx vitest run src/lib/agendamento.test.ts`: 4/4 aprovados.
- Primeira tentativa local detectou ACL anônima diferente do HML; segunda detectou RPC removida pelo teste de reversão anterior. Ambiente descartável ajustado à ACL real e função M5 restaurada nele antes da validação final, sem efeitos no HML.

## Verificação HML após aplicação (somente leitura)
- Leitura real pela Data API com identidade service_role e Accept-Profile financeiro_hml: HTTP 200.
- USAGE service_role true; CREATE service_role false; USAGE anon false; authenticated preservado.
- EXECUTE automática: service_role true, authenticated false, anon false.
- RPC manual permanece callable por authenticated, não service_role nem anon.
- Índice integracao_sync_uma_em_andamento válido.
- Zero execuções automáticas, 16 itens, 16 conferências, zero conferências com operação, zero movimentos, três operações de abertura somando 0.00, três contas com abertura zero. Integridade financeira preservada.
- 11 alertas de segurança anteriores à migração, nenhum novo: 10 sobre funções SECURITY DEFINER disponíveis a usuários e 1 sobre proteção contra senhas vazadas desativada; fora do escopo atual.

## Próxima etapa
Correção do bloqueio de acesso comprovada. Execução automática publicada ponta a ponta permanece não verificada: requer autorização expressa para novo teste real pelo cron-job.org. Manter tarefa desabilitada até teste de execução e repetição segura.