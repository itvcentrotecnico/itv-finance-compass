# V2.1 — preparação, não autorização de implantação

## Arquivos e limites
- `ITV_CORRECAO_MINIMA_V2_1_PROPOSTA.sql`: transação única READ COMMITTED, locks NOWAIT, catálogo de funções históricas, estrutura reconstruída, manifesto oficial, motor exclusivamente entrada/saída, referência idempotente, intermediários proibidos selados, privilégios positivos e comparação integral dos registros.
- `ITV_CONTENCAO_V2_1_PROPOSTA.sql`: sela motor e intermediários, preserva leitura/M5 manual/dados. Não é retorno ao motor vulnerável V2/legado nem restauração de dump sobre HML.
- `PERMISSOES_POSITIVAS.sql`: fragmento documental, não executar isoladamente.
- `VERIFICACOES_SOMENTE_LEITURA.sql`: coleta antes/depois; não executada no HML nesta etapa.
- `VERIFICACAO_ESTRUTURAL.sql`/`CATALOGO_ESTRUTURAL_LOCAL.json`: baseline reconstruída das migrações locais; NÃO certifica estrutura hospedada atual. Divergência exige parar/revisar/retestar, jamais remover a verificação para executar.
- `DEFINICOES_BASE_LOCAL.sql`: arquivo histórico exclusivamente para reconstrução sintética. Não aplicar no HML: reabriria motor legado.
- `MANIFESTO_OFICIAL_PENDENTE.json`: arrays vazios intencionais. Não há UUID oficial hospedado aprovado nesta entrega.

## Identidade oficial
O operador técnico deve obter os três IDs de `contas_financeiras.id` vinculados a `contas_preparadas.conta_financeira_id` habilitadas e os 14 IDs analíticos do cadastro aprovado. Conferir nomes, atividade, moeda, hierarquia, descrição, natureza e aceite; registrar aprovação administrativa do mapeamento. Não utilizar `contas_preparadas.id`, IDs do ensaio, códigos numéricos isolados ou contas de homologação. A instalação incorpora UUIDs literais nos corpos existentes; a sonda devolve exatamente esses UUIDs. Não cria tabelas/colunas nem consulta settings de cliente no motor.

O manifesto vazio impede a instalação. Os settings `itv.v21.validacao`, `itv.v21.manifesto` e `itv.v21.reversao` são confirmações operacionais do executor privilegiado, NÃO mecanismos de autenticação ou prova automática de backup/destino. Devem ser definidos apenas depois das evidências e autorização específica. O destino deve ser confirmado por conexão/painel do projeto ayjppexbzpgdkzbehvzw; nome `postgres` não identifica o projeto.

## Lista positiva de permissões
- `authenticated`: USAGE sem CREATE; SELECT nas 13 tabelas existentes sob RLS; nenhuma escrita direta de tabela/coluna, referências, gatilhos ou truncamento. SELECT adicional preserva consultas de usuários/cadastros/auditoria/M5 já existentes, não libera sua edição.
- EXECUTE authenticated: `tem_papel(text[])`, `papel_atual()`, `tesouraria_saldos()`, `tesouraria_extrato(jsonb)`, `tesouraria_historico_operacoes(jsonb)`, `tesouraria_lancar(jsonb)` apenas na instalação; `integracao_estado_manual()`, `integracao_iniciar()`, `integracao_concluir(jsonb)`, `diagnostico_reservar(uuid,text)`.
- `service_role`: USAGE; EXECUTE somente `diagnostico_finalizar(uuid,uuid,integer,integer,text,text)`; sem DML direto ou EXECUTE financeiro/automático. BYPASSRLS continua característica preexistente; owners/superusers podem superar ACLs, exigindo exclusividade e disciplina operacional.
- `anon`/PUBLIC: sem EXECUTE em funções financeiras; sem SELECT/DML financeiro ou privilégios de sequência.
- Funções de gatilho/integridade não são removidas/desativadas. EXECUTE direto não é necessário para disparar gatilhos instalados. Owners permanecem postgres, verificados com RLS/políticas/vínculos/constraints.
- Sequências perdem privilégios de aplicação. Inserções autorizadas ocorrem em SECURITY DEFINER com owner; não oferecer credencial desse owner ao aplicativo.
- Consequência deliberada: edições de cadastros/perfis ficam recusadas pela lista positiva; consultas permanecem. Convite que dependa de INSERT privilegiado em perfis pode falhar. Não conceder permissões extras para contornar: eventual retomada exige escopo aprovado separadamente.
- Recuperação consulta operação pela chave/dono primeiro. Tabela opcional `tesouraria_solicitacoes` ausente no catálogo aprovado; se surgir, parar e revisar SELECT/RLS de dono. Não ignorar permissão negada.

### Exceção M5 manual, sem efeito em saldos
`integracao_concluir` permanece definidora de segurança e pode inserir conferências PENDENTES/itens/auditoria. A revogação de DML direto não elimina essa exceção autorizada. `tesouraria_lancar_conferencia` e o motor para outros tipos ficam selados: sincronização não registra operação/movimento. Automação perde EXECUTE e não é retomada. A conclusão manual legada não vincula payload criptograficamente à origem nem exige iniciador igual ao executor; risco preexistente documentado, não alterado nesta preparação. Não afirmar conferências integralmente imutáveis ou segurança integral da M5 com base somente na V2.1.

## Backup externo gratuito
Responsável autorizado gera backup imediatamente anterior usando conexão oficial Supabase/Session Pooler do ITV FINANCEIRO e PostgreSQL 17 compatível, com senha somente em prompt/arquivo local restrito. Nunca colar credenciais, dump ou dados no chat. Não usar transaction pooler para dump. Exemplo conceitual (substituições verificadas LOCALMENTE pelo responsável): `pg_dump -h <host_oficial> -p <porta_session> -U <usuario_oficial> -d postgres -W -Fc -f <arquivo_restrito.dump>`. Não usar `--no-owner --no-acl` se a intenção é preservar segurança; se limitações obrigarem esses flags, exportar/recompor owners/ACLs separadamente e testar.

Calcular SHA-256; validar `pg_restore --list`; guardar arquivo+catálogo+manifesto de owners/ACLs/defaults/memberships+políticas/gatilhos/extensões/dependências em diretório restrito. Preservar inventário da configuração Auth (sem segredos), usuários e identidade necessária às FKs `auth.users` sem tentar modificar schemas reservados. Dump de financeiro_hml sozinho não equivale a recuperação completa Supabase (Auth, Storage, configurações, secrets). O backup anterior informado com flags de omissão exige recomposição separada.

Restaurar somente em PostgreSQL/Supabase isolado autorizado, com roles/dependências compatíveis; verificar hashes integrais das seis aberturas, todas tabelas, auditoria, RLS, gatilhos diferidos e ACLs efetivos de cada papel. Ensaio sintético incluso não substitui restauração do dump real nem Auth hospedada. Nenhuma contratação Pro necessária; sem conectividade/permissão/arquivo recuperável comprovado, interromper.

## Manutenção e execução futura condicionada
1. Aprovar versão/hash/mapeamento UUID/impacto de cadastros; validar catálogo ATUAL e recuperação REAL. Aprovação dos testes não autoriza executar.
2. Suspender admissão de novas chamadas financeiras/M5 manuais/diagnóstico, inclusive HTTP antigo, retries/tabs/integrações e operadores privilegiados. Fechar navegador não é barreira técnica. Cron permanece desativado.
3. Responsável controla gateway/rotas e credenciais técnicas sob procedimento aprovado; se barreira hospedada indisponível, não avançar. Eventual revogação temporária adicional é alteração remota e exige autorização, não é executada por esta documentação.
4. Monitorar transações e RPCs em andamento continuamente, concluir/rollback voluntário pelos responsáveis; não cancelar/terminar sessões automaticamente. Suspender owners/superusers, sessões administrativas e leitores SECURITY DEFINER em voo. `pg_stat_activity` pontual não prova ausência de chamadas HTTP ainda não admitidas.
5. Executor dedicado obtém locks exclusivos NOWAIT nas 13 tabelas antes de preflight e mantém até COMMIT/ROLLBACK. Lock falha: abortar, nunca esperar/repetir automaticamente. Locks não drenam uma função antiga já carregada aguardando tabela; por isso a barreira/drenagem anterior é obrigatória.
6. Após evidências, definir manifesto real e confirmação técnica na mesma sessão dedicada e executar SOMENTE proposta final aprovada, integral. Espera inicial deliberada: seis aberturas, zero outras operações/zero movimentos; qualquer evolução legítima exige revisão, nunca apagar para satisfazer condição. Não reaplicar após lançamentos.
7. Sem gravação real de teste, coletar catálogo/ACLs/hashes antes/depois; sonda como administrador real, consultar saldos/histórico como perfis autorizados, verificar recusas sem INSERT. Com sessão real e configuração de hospedagem disponíveis, conferir formulário/IDs/recuperação. Não validar bypassando RLS com owner.
8. Falha antes COMMIT: rollback integral. Falha posterior: manter admissão suspensa, drenar novamente e executar contenção aprovada; conservar todos os lançamentos/auditoria. Nunca restaurar legado vulnerável nem sobrescrever dados com dump.
9. Retomar seletivamente somente primeira aba/M5 manual/consultas após evidências e autorização expressa. Publicação continua separada e não executada. Primeiro lançamento real cabe ao gestor, não ao teste automatizado.

## Interrupção objetiva
Manifesto ausente/divergente; backup não recuperável; ACL/owner/RLS/gatilho/constraint/hash divergente; sessão real indisponível; chamada em andamento/owner ativo; lock ocupado; catálogo/sobrecarga externa desconhecida; DML/EXECUTE residual; M5 gera saldo/movimento; precisão/idempotência falha. Não executar/remover controles/publicar nesses casos.
