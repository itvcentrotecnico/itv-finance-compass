# M3.2 — Relatório de execução controlada

**Resultado: migração aplicada com sucesso em 23/10/2026, às 21:26 UTC.**

## Destino e identidade

- Projeto confirmado pelo vínculo oficial: `ayjppexbzpgdkzbehvzw` (ITV FINANCEIRO HML).
- Esquema alterado pelo SQL: `financeiro_hml`. GESTÃO ITV não acessado ou modificado.
- Origem: `docs/m3/M3_2_CORRECAO_PROPOSTA.sql`.
- Registro gerado pelo mecanismo oficial: `supabase/migrations/20261023212630_557b7d2c-6baf-4a65-99e8-58ce48a19be9.sql`.
- SHA-256 da origem e do arquivo registrado: `66c47b7d9292c45f1580f32f1b59937047ba36b294f0eac9d914f188a1817401`.
- Comparação binária confirmou conteúdo integral e inalterado, inclusive BEGIN/COMMIT.
- Uma única submissão de migração, concluída sem erro; nenhuma migração adicional ou repetição.

## Pré-condições

- Backup restaurado localmente e nove permissões de recuperação preservadas: confirmação expressa do usuário nesta autorização; não reexecutamos a restauração nesta etapa.
- Barreira verificada por leitura: EXECUTE das quatro RPCs de escrita retornou false para authenticated, anon e service_role.
- UPDATE das cinco colunas de conta (`nome`, `ativo`, `banco`, `agencia`, `numero_conta`) retornou false para authenticated.
- Nenhuma outra transação com início visível em pg_stat_activity no banco alvo; zero transações preparadas na observação anterior.
- Suspensão contínua de produtores administrativos: compromisso operacional informado pelo usuário. A observação de sessões não é, isoladamente, prova contínua de suspensão.
- Contas, operações e movimentos: zero antes da submissão.
- O SQL adquiriu ACCESS EXCLUSIVE NOWAIT nas três tabelas antes da verificação interna de vazio, dentro de READ COMMITTED, mantendo os locks até o encerramento da transação.

## Objetos afetados — somente os sete previstos

| Objeto | Resultado |
|---|---|
| `tes_validar_efeitos()` | Definição substituída |
| `tes_executar(jsonb)` | Definição substituída |
| `tesouraria_extrato(jsonb)` | Definição substituída |
| `tes_op_abertura_conta_uq` | Índice único criado, pronto e válido |
| `tes_conta_exige_abertura()` | Função de trigger criada, execução direta restrita |
| `tes_conta_abertura` | Trigger criado, habilitado, DEFERRABLE INITIALLY DEFERRED |
| `tesouraria_historico_operacoes(jsonb)` | Função de consulta criada, acesso authenticated conforme SQL aprovado |

## Integridade pós-migração — consultas de leitura

| Verificação | Resultado |
|---|---|
| Contas / operações / movimentos | 0 / 0 / 0 |
| Plano de Contas / Centros de Custo / Perfis / Auditorias | 1 / 1 / 1 / 7, sem mudança |
| Conteúdo integral dos registros M1/M2 e auditorias | Hashes MD5 das agregações JSON ordenadas idênticos antes/depois |
| RLS e FORCE ROW LEVEL SECURITY | Ativos nas sete tabelas |
| Políticas RLS | Hash do catálogo idêntico antes/depois: `9120cc117c393024236fd5728b890349` |
| ACLs de tabela | Idênticas antes/depois |
| Funções existentes fora das três substituídas | Hashes de definição e ACLs preservados |
| Triggers anteriores | Definições preservadas; novo trigger de abertura acrescentado |
| Triggers desabilitados | 0 |
| Constraints não validadas | 0 |
| Índices inválidos | 0 |
| Quatro RPCs de escrita | Permanecem sem EXECUTE para authenticated/anon/service_role |
| Cinco permissões UPDATE temporariamente removidas | Permanecem false para authenticated |

Hashes de conteúdo dos registros, iguais antes e depois:

- Plano de Contas: `9942147a7e9bfa9fe5568b662d435d30`.
- Centros de Custo: `2709c560755c8e0a4b65c0e409797d95`.
- Perfis: `16ee4326e7769752fc0070d8620480e0`.
- Auditorias: `edaef33b6e530270717e67b8cdf7d157`.

Uma consulta auxiliar de pré-validação retornou 42703 por presumir coluna `id` em perfis; a consulta somente de leitura foi corrigida para ordenar o JSON completo. Isso não foi erro de migração, não alterou o banco e não provocou repetição da execução M3.2.

## Limites e próxima etapa

- Validação desta execução é estrutural e de preservação por leitura. Não foram executadas operações financeiras, testes de escrita, criação de contas ou cadastros reais.
- Funções foram criadas/substituídas com sucesso e os triggers estão habilitados; a homologação funcional no HML não foi realizada nesta etapa.
- Os nove GRANTs temporários não foram restaurados. As escritas financeiras permanecem bloqueadas; restauração e homologação dependem de etapa separada autorizada.
- Nenhuma senha, token ou credencial foi exibida ou modificada.
- O mecanismo informou três alertas anteriores à migração: duas ocorrências de execução de função SECURITY DEFINER por usuários autenticados e proteção contra senhas vazadas desativada. Nenhum alerta novo foi atribuído à M3.2; avaliação separada, sem alterações nesta execução.

**Conclusão: M3.2 aplicada e integridade estrutural/dados verificada; barreira de escrita mantida conforme solicitado.**