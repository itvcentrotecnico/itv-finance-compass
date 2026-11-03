# ITV FINANCEIRO V2.2.1 — Manifesto e resolução dos impedimentos

## Manifesto completo preparado, aguardando aprovação

Arquivo: MANIFESTO_DEFINITIVO_PARA_APROVACAO_20261103.json. Não substitui aprovação e não cria registros. O modelo vazio anterior foi preservado como referência; na execução futura deve ser utilizado somente o manifesto concreto aprovado.

Responsáveis: admin_geral `2a232414-0290-47b2-8aeb-77a6b490efe4`; analista_financeiro `e5494111-2e8b-4a75-916b-1ecc1d8578e2`. Ambos ativos, confirmados por SELECT nesta solicitação. Categorias lidas do Supabase, ordenadas por código:

| Código | UUID |
|---|---|
| 1.01 | 9b82cc9f-98e9-4057-97ae-281924e2bdeb |
| 1.02 | e299b823-22d3-4a5a-b1be-eac629d9f58b |
| 1.03 | d9a5114e-0633-450a-9ab7-cfc6622aaa17 |
| 1.04 | 4ad2949e-6dd4-4608-ada0-05ec4a5fbdf4 |
| 1.05 | 4c5c3846-6df7-4e52-b81b-f83f3abc1d4c |
| 1.06 | 349dbd2c-780f-431d-b885-ee5996e97c9d |
| 2.01 | 8bb3788c-eb49-47f2-94e9-9a735db82938 |
| 2.02 | 89fec2fa-e9e8-45be-8a01-f2eada468c3a |
| 2.03 | 93aba76c-c954-4d5a-9bfa-6555d45bf879 |
| 2.04 | 23163875-b524-441e-99ad-38c05113790c |
| 2.05 | c15e80a5-a03b-460a-9407-a67010053c3c |
| 2.06 | 5acbaf4f-4a59-4b0d-9178-76cc6ac374fd |
| 2.07 | 8aef3cb2-719f-4e46-979d-b59ed043c787 |
| 2.08 | 0b8b4d5e-0058-40bb-8d5f-e379a62bd9f4 |

Novos UUIDs v4, válidos e distintos:
- Controle interno: `975982de-f0cb-442d-8318-a086815f93e3`.
- Operação de abertura: `216d6c59-6cfc-4891-9860-dee4b2488c2e`.
- Chave idempotente: `0d6aefe2-8d11-4c5f-b9cc-518cb2d07a90`.

SELECTs desta solicitação não encontraram qualquer um desses três identificadores em IDs de contas, IDs de operações ou chaves de operações. Não são reservas no banco: reconfirmar na janela; o instalador também rejeita colisão. As 14 categorias retornaram ativas e aceitando lançamentos. Não houve nova homologação, cadastro, alteração ou execução do instalador. SHA-256 do instalador permanece `f5687d37a804ea80a1701de3f2f451200128cbee2172f9362a7e40eac8a3c5d7`.

## Backup: recursos disponíveis e procedimento gratuito

Neste executor PGHOST está ausente. A ferramenta Supabase fornece SELECTs, não archive completo recuperável; não executar pg_dump usando acesso exec da plataforma nem contornar a ausência de conexão. JSON e MD5 são referências de comparação, nunca backup.

Para exportação pela interface Lovable, o caminho documentado é More → Database → Manage → Settings → Export data. A disponibilidade e a cobertura de estrutura/ACLs/Auth nesse projeto Supabase externo não foram comprovadas; uma exportação de dados não deve ser declarada backup financeiro completo sem inspecionar o resultado. Não mudar para Lovable Cloud nem contratar Pro.

**Ação inicial do proprietário, uma etapa por vez:** abrir o projeto Supabase ayjppexbzpgdkzbehvzw e clicar em **Connect**; conferir se há conexão direta ou Session pooler apropriada para uma ferramenta PostgreSQL local. Informar apenas se essa opção está disponível e se o computador já possui PostgreSQL 17 ou compatível. Não copiar senha, URI com credenciais ou tokens para o chat. Essa informação permite orientar o comando de exportação correto para o computador, sem tentativas cegas no executor.

### Sequência completa de referência (não executada)

1. **Exportação no computador autorizado:** configurar conexão TLS usando os dados do painel Connect em ambiente local protegido; senha via passfile/cofre, nunca embutida em comando/chat. Usar pg_dump custom para financeiro_hml, incluindo dados e estrutura, sem opções --no-owner/--no-acl. O archive deve incluir tabelas, funções, índices, sequências, triggers, RLS e grants. Conferir ausência de erros e catálogo de pg_restore. Fazer isso somente no computador autorizado, não via exec da plataforma.
2. **Owners/ACLs e dependências:** guardar inventário completo de schema USAGE/CREATE, grants de tabela/coluna/sequência/função/defaults, proprietários, políticas, roles/memberships relevantes e dependências auth.uid/auth.role/auth.users e extensões. Se archive omitir algum deles, preparar recomposição explícita e validá-la isoladamente; não assumir que SECURITY DEFINER resolve grants. Inventários de estrutura disponíveis na homologação não substituem captura dos ACLs completos atuais.
3. **Auth:** dump limitado a financeiro_hml não contém o serviço Auth nem auth.users. A recuperação precisa documentar como os usuários referenciados serão preservados/recuperados em destino autorizado. Auth simplificado isolado valida somente relações financeiras, não recuperação de login real. Não alterar schemas reservados hospedados nem exportar credenciais para o chat. Configurações de URLs/provedores e secrets são cobertura separada protegida.
4. **Integridade:** guardar SHA-256 do archive e catálogo legível; comparar 13 contagens/hashes de snapshot consistente e catalogar funções/triggers/políticas/constraints. Snapshot de dados deve ser do mesmo ponto da exportação ou obtido sob admissão de escritas contida; não comparar momentos diferentes como prova de recuperação. MD5 só comparação, SHA-256 identidade do arquivo.
5. **Restauração isolada:** destino PostgreSQL descartável, sem rede/origem/jobs, versão compatível, custo zero. Recriar roles/dependências locais mínimas aprovadas, restaurar com erros fatais e validar dados, owners, ACLs, RLS, funções e triggers. Não restaurar schemas geridos em Supabase operacional. Restauração sintética dos testes já concluídos não substitui o archive real.
6. **Evidências:** responsável guarda archive, catálogo, inventário e relatório em local privado. Informar apenas nome/data/SHA-256, conclusão do restore, contagens/hashes e validação de privilégios/dependências, sem senhas, tokens, archive sensível ou dados pessoais no chat. Qualquer cobertura parcial deve ser explicitada antes de aprovação.

Plano Free não impede exportação lógica via conexão autorizada; não há PITR nesse procedimento e a recuperação se limita ao último archive. Serviços/configuração/Storage não são recuperados automaticamente por archive financeiro. Não foi produzido ou restaurado backup nesta solicitação.

## Janela e instalação — aguardam backup comprovado

Não ativar manutenção antes de comprovar o backup. Depois, usar procedimento V2.2.1 já preparado: identificar interfaces antigas, cadastros/convites, RPCs financeiros, sincronização manual/cron externo, escritores administrativos/service_role e acessos diretos; suspender admissão de todos os produtores e drenar chamadas/transações existentes. Não basta fechar botão ou observar snapshot sem atividade. Restringir somente financeiro_hml e preservar GESTÃO ITV.

A autorização administrativa permanece válida. Manifesto concreto aguarda aprovação específica do conteúdo, não nova autorização genérica. Na janela efetiva reconfirmar estado/colisões e catálogo, aplicar somente instalador identificado e conferir preservação, 7 contas/7 aberturas técnicas, zero movimentos automáticos, ACLs e consultas autenticadas. Sem lançamentos fictícios. Publicação exige autorização específica após relatório pós-instalação.

## Situação final desta etapa

- Manifesto: completo, dados reais verificados, aguardando aprovação.
- Backup recuperável: não produzido/comprovado; próxima ação depende do computador/acesso do responsável.
- Janela: não iniciada; depende de backup comprovado e controle de produtores.
- Instalação e verificações posteriores: não executadas.
- Publicação: não realizada.
