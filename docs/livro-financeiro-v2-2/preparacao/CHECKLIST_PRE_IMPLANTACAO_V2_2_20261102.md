# ITV FINANCEIRO V2.2 — preparação passo a passo
**02/11/2026 — somente documentação e consultas preparadas. Nada executado no hospedado.**
Projeto único: **ayjppexbzpgdkzbehvzw**, esquema **financeiro_hml**, Supabase **Free**. Pacote V2.2 intacto; nenhuma nova versão, funcionalidade, conta, abertura, migração ou publicação. GESTÃO ITV não acessado.

## 1. Consultas entregues — ordem de preparação futura
Os cinco arquivos estão no ZIP desta preparação. **Não executados.** Cada um abre transação REPEATABLE READ READ ONLY e encerra com ROLLBACK; não chama RPC financeira, gerador de UUID, origem ou comandos de escrita. Sintaxe conferida por analisador PostgreSQL local, sem execução SQL. Compatibilidade das colunas/objetos reais ainda depende dos resultados.

Antes de qualquer execução futura: conferir o projeto no painel/conexão. O nome de banco postgres e uma variável de confirmação não provam o destino. Executor autorizado de leitura completa deve ter acesso aos dados e catálogos; não desabilitar RLS nem usar credencial privilegiada no aplicativo. Falta de permissão significa evidência indisponível, não zero registros. Não fornecer senha/token/dump sensível no chat.

| Ordem | Arquivo | Resultado e critério |
|---|---|---|
| 1 | 01_USUARIOS_SOMENTE_LEITURA.sql | UUID, email, nome, papel, ativo e existência no Auth/perfis. Escolher explicitamente os dois usuários reais. Ambos administradores ativos; usuário Auth sem perfil não acessa a área financeira. |
| 2 | 02_CATEGORIAS_OFICIAIS_SOMENTE_LEITURA.sql | As 14 analíticas esperadas, UUIDs, natureza, aceite, ativo e pai oficial. Exige 14 localizadas e 14 conformes. Código/descrição servem à conferência; motor usa UUID aprovado, nunca dedução por nome. |
| 3 | 03_ESTADO_FINANCEIRO_SOMENTE_LEITURA.sql | Seis contas/seis aberturas, total de operações, zero outras operações/zero movimentos, auditoria e hashes integrais das 13 tabelas. Conferir exatamente uma abertura coerente por conta. Auditorias não têm total presumido: capturar o valor atual. |
| 4 | 04_CATALOGO_E_MANIFESTO_SOMENTE_LEITURA.sql | Owners, ACLs e direitos efetivos, funções/assinaturas/hashes, colunas, RLS/FORCE, políticas, gatilhos, constraints, índices, sequências, defaults, roles/heranças, extensões. Comparar com catálogo do pacote V2.2 e hash estrutural esperado. |
| 5 | 05_DEPENDENCIAS_E_JANELA_SOMENTE_LEITURA.sql | FKs externas, pg_depend e referências textuais, auth.uid/auth.role, tipo varchar/text do controle, inexistência de controle interno, transações/locks e M5 em andamento. Fotografia não comprova drenagem contínua. |

Guardar resultados em pasta protegida. JSON agregado evita truncar a lista de usuários/categorias/manifesto por limite padrão de linhas, mas ainda pode haver limite de tamanho da ferramenta. Para catálogo/permissões com muitas linhas, preferir exportação integral por conexão dedicada e conferir saída completa. Não enviar emails/dados pessoais desnecessários para revisão pública. Consultas separadas têm snapshots separados: para backup/inventário consistente seguir seção 4.

**Catálogo real ainda NÃO verificado.** Informações automáticas de ausência de funções não são comprovação do esquema financeiro_hml; não substituir o inventário por essa informação.

## 2. Dados do controle que precisam ser definidos
Preencher somente o MANIFESTO_PENDENTE.json já existente na V2.2, após decisão administrativa; não criar nada no banco nessa preparação.

| Dado | Estado | Regra |
|---|---|---|
| Nome técnico | Definido no pacote | LIVRO FINANCEIRO ITV — CONTROLE INTERNO |
| Tipo/moeda/dados bancários | Definidos | interno / BRL / banco, agência e número vazios |
| Data inicial | Confirmada | **01/11/2026** |
| Valor da abertura | Confirmado | **R$ 0,00**, sem movimentos; não saldo bancário |
| UUID do controle | Pendente | Novo UUID distinto de qualquer conta existente; reservado uma única vez |
| UUID da operação de abertura | Pendente | Novo UUID distinto de operação existente e do controle |
| Chave idempotente da abertura | Pendente | Nova UUID distinta das chaves existentes; manter a mesma durante implantação |
| Duas identidades responsáveis | Pendente | UUIDs reais escolhidos a partir da consulta 01; não escolher automaticamente |
| Responsável pela instalação/abertura | Pendente | Uma das duas identidades aprovadas, com autoria comprovada na conexão dedicada |
| 14 UUIDs de categorias | Pendente | Transcrever somente depois de 14/14 conformes |
| Responsável técnico da janela/backup | Pendente | Nome, acesso autorizado, horário e prova de contenção de produtores privilegiados |

UUIDs podem ser reservados localmente pelo responsável técnico numa futura preparação autorizada; não gerar no banco nem usar UUIDs sintéticos dos testes. Com as três UUIDs reservadas, conferir ausência de colisão por leitura antes de instalar. Nada foi reservado nesta etapa.

## 3. Impacto da lista positiva: decisão obrigatória
**Sim: V2.2 pode interromper funções administrativas necessárias.** A análise abaixo é do código e SQL locais; não prova os privilégios hospedados atuais. Perfil admin_geral não é proprietário PostgreSQL; service_role com bypass RLS também precisa de GRANT.

| Função | Impacto V2.2 | Decisão pendente |
|---|---|---|
| Entrar/sair e consultar papel ativo | Auth e SELECT perfis preservados | Verificar acesso real de ambos; perfil ausente/inativo continua bloqueado |
| Recuperar/definir senha | Sem bloqueio direto: usa Supabase Auth | Validar links/emails no uso real; não afirmar testado agora |
| Listar usuários | tem_papel + SELECT perfis e Auth Admin preservados | Somente admin_geral conforme código; não ampliar ao financeiro |
| Alterar perfil/ativar/desativar usuário | **Bloqueado:** updateUserRole escreve UPDATE perfis | Decidir se pode ficar indisponível; se necessário, impede implantação do pacote inalterado |
| Convidar novo usuário | **Falha parcial:** email pode ser enviado, INSERT perfis negado | Não usar convite após implantação; decidir congelamento ou suspender liberação |
| Criar/editar/inativar/reativar categorias e centros | **Bloqueado:** salvar usa INSERT/UPDATE sem GRANT restabelecido | Categorias atuais são lidas; aceitar formalmente congelamento ou interromper implantação |
| Histórico cadastral/auditoria | SELECT mantido sob RLS | Conferir acesso dos papéis, sem inferir que leitura libera edição |
| Nome do responsável | Nome atual apenas quando visível por RLS; UUID permanece | Financeiro pode não ver nome do outro; UUID identifica, sem remover história |
| Alterar nome/preferências | Escrita direta bloqueada; API específica não comprovada | Confirmar se necessária; não prometer preservação por presença de coluna |
| Receitas/despesas da primeira aba | Somente motor público para duas identidades ativas | Depende instalação e sonda V2.2; nenhuma gravação liberada agora |
| M5 manual | RPCs manuais enumeradas preservadas | Pausar durante janela; não acessar origem/testar sincronização nesta preparação |
| Automação, transferências, estornos, aberturas genéricas e conferências | Permanecem fechados | Não restaurar permissões antigas nem chamar como contorno |

**Ponto de decisão:** aceitar expressamente os cadastros/acessos congelados ou reconhecer que o pacote V2.2 não atende uma necessidade administrativa essencial. Nenhuma permissão foi alterada/proposta adicional criada. Se essas funções forem necessárias, parar antes de instalar: não restaurar GRANT amplo, não usar owner como rotina e não declarar a implantação transparente.

## 4. Backup externo no Supabase Free — procedimento, não execução
Responsável com PostgreSQL compatível já disponível e conexão dedicada segura ao ITV FINANCEIRO; sem contratar Pro, instalar ferramentas no computador do usuário ou criar projeto pago nesta etapa. Não reutilizar conexão GESTÃO ITV. URI/senha ficam fora de documentos, comandos compartilhados e logs; preferir arquivo de serviço/passfile protegido, nunca gravar segredo no projeto.

1. Preparar pasta externa restrita (permissão de acesso apenas aos responsáveis), capacidade disponível, duas cópias protegidas e nomes datados. Registrar versão pg_dump/pg_restore, hora UTC/Manaus e projeto verificado.
2. Planejar janela de suspensão dos produtores e drenagem, incluindo acesso administrativo/owner, M5 e HTTP; não cancelar sessões automaticamente. Backup anterior à mudança deve refletir estado financeiro consistente.
3. Na conexão de captura, manter transação **REPEATABLE READ READ ONLY** aberta e exportar snapshot por pg_export_snapshot(). Rodar as leituras de estado/catálogo usando esse snapshot (em conexão participante, importar snapshot antes de qualquer SELECT; retirar apenas BEGIN/ROLLBACK externos dos arquivos ao incorporá-los à transação). Exportação de snapshot é controle de consistência, não operação financeira. Só fazer na etapa futura autorizada.
4. Gerar dump **Custom** com pg_dump --format=custom --schema=financeiro_hml --no-owner --no-acl --snapshot=<snapshot_exportado> --file=<arquivo_protegido>, usando serviço de conexão seguro já validado. O dump e os inventários de linhas/owners/ACLs devem usar o mesmo snapshot antes de encerrar a conexão exportadora. Nenhum comando de backup foi executado agora.
5. Guardar separadamente: resultados JSON do catálogo (owners, grants/concessores/beneficiários/grant-option, ACLs de colunas, defaults, schema USAGE/CREATE, funções, sequências, roles/herança/RLS/gatilhos), hashes de dados da consulta 03, dependências da consulta 05, catálogo pg_restore --list e SHA-256 de cada arquivo. SHA-256 comprova arquivo íntegro, não cobertura; hashes MD5 das linhas são comparadores auxiliares, não assinatura criptográfica de aprovação.
6. Inspecionar catálogo: schema, todas tabelas/dados, funções, triggers, constraints/índices/políticas/seq. Manifesto de ACL não é restauração automática: técnico deve demonstrar recomposição revisada de proprietários e direitos **em destino isolado** antes de qualquer implantação. Não executar cegamente grants extraídos.
7. Restaurar somente em PostgreSQL isolado descartável, sem URLs/tokens/serviços da origem; recompor roles/dependências compatíveis e testar owners/ACLs/RLS/definições/dados. Não recriar/substituir schemas gerenciados em Supabase hospedado. Comparar counts/hashes e comportamento de permissões. Registrar limites e tempo de recuperação. Ensaio sintético anterior não substitui restauração desse backup atual.
8. Dump restrito a financeiro_hml **não é backup completo do Supabase**. Dependências Auth (usuários/identidades), auth.uid/auth.role, extensões, configurações de email/URLs, segredos e eventual Storage precisam de cobertura/procedimento separado. Lista de UUIDs/emails não restaura autenticação. Não exportar senhas/tokens pelo chat; documentar o que é recuperável e o que falta. Sem cobertura essencial/comprovação, implantação permanece bloqueada.
9. Conferir cópias/hashes e acesso de recuperação; nada de restauração sobre o banco real. Para haver backup completo da plataforma, qualquer lacuna acima exige solução e autorização próprias, não contratação presumida.

## 5. Sequência exata — exclusivamente V2.2 existente
1. Receber resultados das consultas 01–05 e aprovar dois responsáveis/14 categorias/identificadores técnicos. Guardar catálogo e comparar hashes/assinaturas/owners com V2.2; hash estrutural esperado **d985be75654eb3c1998218115c5d6f06**. Qualquer diferença impede aplicação; não modificar hashes para passar.
2. Resolver decisão da seção 3. Conferir pedidos pendentes nos navegadores pela chave original; nunca trocar conta/chave para resultado incerto.
3. Comprovar backup atual/restauração/recomposição e definir responsáveis/janela. Obter autorização específica de implantação e eventual publicação coordenada; **esta etapa não autoriza nenhuma execução**.
4. Suspender produtores privilegiados; usar somente **MANUTENCAO_PREPARADA_REUSO.sql** já contido na V2.2 quando autorizado. Capturar manifesto protegido de ACL antes do COMMIT e manter conexão física. Confirmar drenagem continuamente; ausência pontual não basta.
5. Conexão dedicada: verificar projeto/owner e autoria administrativa da abertura por uma das identidades aprovadas; carregar o manifesto aprovado e confirmação técnica apenas depois das evidências. Esses valores não substituem autenticação/autorização nem prova de destino.
6. Executar **ITV_LIVRO_UNICO_V2_2_PROPOSTA.sql** integralmente, ON_ERROR_STOP, transação única, locks NOWAIT antes da conferência. Não aplicar V2.1 nem fragmentos, nem criar conta à parte. Forçar constraints/verificações antes do COMMIT como já no SQL. Falha: abortar, não repetir automaticamente.
7. Após sucesso, leitura em janela: **sete contas/sete aberturas, seis antigas idênticas, zero outras operações e zero movimentos; auditoria anterior intacta + exatamente dois eventos técnicos**, categorias e demais tabelas preservadas. Conferir sonda, lista positiva efetiva/RLS, histórico/referência/autoria e M5 manual sem sincronizar. Registrar hashes/UUIDs/horário/autor e catálogo instalado.
8. Sob autorização de publicação, validar interface compatível e acessos reais de ambos; não efetuar lançamento financeiro de teste hospedado. Manter produtores suspensos até validação. Não usar retomada/grants de outro pacote: **RETOMADA_SELETIVA antiga não integra esta sequência**. A V2.2 já restabelece apenas a lista positiva; retomar operacionalmente só produtores autorizados sem concessões adicionais.
9. Primeiro registro real somente por responsável após liberação formal. Indicadores são receitas/despesas/resultado por período, nunca saldo bancário; resultado negativo permitido. Não lançar automático/duplicar abertura.
10. Se falha antes do COMMIT: ROLLBACK integral e conferir preservação. Se falha após: suspender/drainar novamente e executar, apenas autorizado, **ITV_CONTENCAO_LIVRO_V2_2_PROPOSTA.sql** integral; sela escrita e mantém controle/abertura/histórico/auditoria/consultas. Recuperação caller-owned continua consultando a chave do autor, sem escrita. Não apagar registro, restaurar motor vulnerável ou dump em HML. Retomada após contenção exige nova decisão/revisão; não reaplicar instalação que exige catálogo original.

## 6. Checklist objetivo das pendências
- [ ] Resultados reais 01: dois UUIDs, perfis ativos, existência Auth e responsável autor da instalação.
- [ ] Resultados reais 02: 14 UUIDs oficiais e 14/14 conformes.
- [ ] Resultados reais 03: seis contas/seis aberturas, zero operações não abertura/movimentos e hash/count de auditoria/todas tabelas.
- [ ] Resultados reais 04–05: catálogo/owners/ACL/RLS/gatilhos/dependências/tipo interno compatíveis; controle interno ausente; nenhum drift sem análise.
- [ ] Reservar e aprovar três UUIDs (controle, operação, chave); conferir colisões por leitura autorizada.
- [ ] Decidir aceitação de bloqueios cadastrais/gestão de acessos e risco de convite parcial.
- [ ] Backup atual Custom + manifesto consistente + catálogo + hashes + cópias protegidas.
- [ ] Recuperação atual comprovada com owners/ACL/dependências e limites Auth/configuração explícitos.
- [ ] Manutenção/drenagem e controle dos escritores privilegiados/HTTP/M5, responsável e janela.
- [ ] Pedidos antigos resolvidos/pendentes preservados sem conta/chave substituta.
- [ ] Autorização futura específica de aplicação/publicação e critérios de validação real dos dois usuários.

**Próximo passo único:** quando a direção autorizar a leitura, executar primeiro **01_USUARIOS_SOMENTE_LEITURA.sql** no projeto conferido e identificar os dois responsáveis. Não avançar para instalação a partir de resultados incompletos. Nenhum SQL hospedado foi executado por esta entrega.
