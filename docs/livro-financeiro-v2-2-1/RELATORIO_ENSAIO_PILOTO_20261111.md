# ITV Financeiro — Ensaio do piloto de Lançamentos V2.2.1 (Livro Único)
11/11/2026 · Nada aplicado no Supabase hospedado · Nada publicado · GESTÃO ITV não acessado

## 1. Tela em branco — corrigida
**Causa:** `src/lib/integracao.functions.ts` (importado por telas) continha funções comuns (`lerFonteGestao`, `executarSincronizacao`) com `import("./integracao-leitura.server")` fora de um `createServerFn`. A proteção de importação do TanStack recusava esse módulo no navegador e o aplicativo não montava.
**Correção:** as duas funções passaram para `src/lib/integracao-execucao.server.ts` (somente servidor). A sincronização manual e a rota automática carregam esse módulo dentro do servidor. Nenhuma regra foi alterada.
**Observado no navegador local:** `/` redireciona para `/auth`; a tela "ITV FINANCEIRO · Entrar" aparece, sem erros no console. Build OK; 251/251 testes do aplicativo.

## 2. Catálogo hospedado × referência do instalador (leitura somente)
| Item | Hospedado | Referência | Resultado |
|---|---|---|---|
| Tabelas (dono, RLS, FORCE) | 13 | 13 | Idênticas |
| Políticas | 23 | 23 | Idênticas |
| Funções (corpo MD5 e dono) | 31 | 31 | Idênticas |
| Restrições | 107 | 56 inventariadas | 52 idênticas; 4 só de escrita; 51 PK/FK/UNIQUE/gatilho fora do inventário antigo |
| Gatilhos | 22 | sem inventário | — |

**Diferenças de representação (sem mudança de regra):** `contas_financeiras_tipo_check`, `contas_preparadas_tipo_check`, `perfis_papel_check`, `plano_contas_natureza_check`. As listas de valores são as mesmas; mudou apenas a escrita SQL (`ARRAY[('x'::varchar)::text]` em vez de `(ARRAY['x'::varchar])::text[]`). O backup de 11/11 (150728) tem a mesma escrita nova.
**Prova:** recalculando a impressão hospedada com só essas 4 escritas trocadas pela forma antiga, o resultado é exatamente `910691611965f25f41f922fa1e4b29f7`, a referência original. Logo, **não há diferença de estrutura, regras ou permissões**.
**Atualização fundamentada (pré-check mantido):**
- pré-check da instalação: `910691…` → `9cf8f2614d34e17234989bb1a46de710` (valor hospedado atual);
- conferência pós-instalação: `17946ebf…` → `071ad09b9919c8bab267784612980bfa`;
- contingência: `82b4c16e…` → `173ccd6c116decc45c70c39b142bb04b`.
Os dois últimos foram medidos na base isolada que reproduz a impressão hospedada.

## 3. Ensaio — base usada
PostgreSQL 17.11 local descartável (mesma versão hospedada), sem rede, com dados exclusivamente sintéticos. A base é recriada com as migrações do projeto e o ajuste `FIXTURE_AJUSTE_REAL_LOCAL.sql`, atualizado para a escrita de 11/11. **Ela reproduz a impressão estrutural hospedada `9cf8f…`** (teste automático). O backup real **não** foi usado como base; sua restauração continua sendo condição para a implantação.

**Resultado: 132/132 aprovados.**
| Validação pedida | Resultado |
|---|---|
| Seis aberturas preservadas; abertura técnica criada uma única vez (reexecução não duplica) | Aprovado |
| 14 categorias analíticas (6 receitas, 8 despesas); natureza incompatível e referência ausente/inválida recusadas | Aprovado |
| Caminhos legados (transferir, estornar, criar/habilitar conta, lançar conferência, abertura/estorno/transferência no motor) fechados | Aprovado |
| Analista não cria/altera centro de custo; Administrador Geral cria e desativa | Aprovado |
| Administrador Geral e Analista lançam; demais perfis, inativos, anon e service_role recusados; papel trocado é recusado | Aprovado |
| Lançamento persiste, aparece no histórico com referência e autoria, entra no total (80,05 e −118,94 exatos) | Aprovado |
| Mesma chave repetida (inclusive em concorrência) mantém um único registro | Aprovado |
| Contingência preserva registros, leitura e M5 manual | Aprovado |

## 4. Arquivos alterados
- `src/lib/integracao.functions.ts`, `src/lib/integracao-execucao.server.ts` (novo), `src/routes/api/public/integracao/sincronizacao-diaria.ts`, `src/lib/integracao-execucao.test.ts`, `src/lib/integracao-versao.test.ts`
- `docs/livro-financeiro-v2-2-1/ITV_LIVRO_UNICO_V2_2_1_PROPOSTA.sql` (SHA-256 e5659a9b…; antes f5687d37…)
- `docs/livro-financeiro-v2-2-1/ITV_CONTENCAO_LIVRO_V2_2_1_PROPOSTA.sql` (23618014…; antes f038c5e6…)
- `docs/livro-financeiro-v2-2-1/FIXTURE_AJUSTE_REAL_LOCAL.sql`, `testar_livro_local.py`, `RESULTADOS_TESTES_LOCAIS.json`
- `homologacao/CATALOGO_HOSPEDADO_COMPLETO_20261111.json`, `homologacao/COMPARACAO_CATALOGO_20261111.txt`
O `SHA256_PACOTE_FINAL.json` de 03/11 deixa de valer para os dois SQL; nova lista de hashes deve ser aprovada com este relatório.

## 5. Bloqueios restantes
| Bloqueio | Próxima ação |
|---|---|
| Recuperação do backup real não comprovada | Restaurar `ITV_FINANCEIRO_PRE_V221_20261111_150728.dump` (SHA-256 7cc16b03…) em base separada com usuários Auth mínimos e comparar contagens e permissões |
| Motor legado ainda ativo no hospedado | Resolvido pela própria instalação V2.2.1, após autorização |
| Teste com sessão real na tela | Após a instalação: Administrador Geral e Analista entram, registram 1 lançamento cada e conferem histórico e total |
| Aprovação dos novos hashes e do manifesto de 03/11 | Aprovação escrita deste relatório |
| Janela de manutenção | Definir data/hora sem uso do sistema e sem sincronização M5 |
| Publicação | Autorização separada, após o item anterior |

## 6. Sequência proposta para a janela
1. Confirmar backup restaurado com sucesso e novo `pg_dump` do dia (SHA-256 registrado).
2. Avisar os dois usuários; nenhuma sincronização M5 durante a janela.
3. Ler a impressão hospedada: deve ser `9cf8f2614d34e17234989bb1a46de710`, 6 aberturas, 0 movimentos.
4. Aplicar a V2.2.1 com o manifesto aprovado (transação única; trava sem espera).
5. Conferir: impressão `071ad09b…`, 7 contas, 7 aberturas, 0 movimentos, +2 auditorias, 31 funções.
6. Teste autenticado pelos dois usuários (1 lançamento cada, repetir envio, conferir histórico e total).
7. Só então solicitar a publicação.

**Interromper (sem aplicar) se:** impressão diferente de `9cf8f…`; contagens diferentes; trava ocupada; manifesto recusado; backup sem SHA-256.
**Executar a contingência se, após aplicar:** a conferência do passo 5 falhar, um perfil não autorizado conseguir lançar, um envio repetido duplicar, ou as aberturas mudarem. A contingência fecha os lançamentos e preserva todos os registros; restauração do backup só com nova autorização.
