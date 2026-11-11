# ITV FINANCEIRO — AUDITORIA GERAL DE MÓDULOS E ROADMAP DE CONCLUSÃO

**Data:** 11/11/2026. Inspeções hospedadas iniciadas às 19h44 UTC (15h44 Manaus).  
**Projeto:** ITV FINANCEIRO HML · Supabase `ayjppexbzpgdkzbehvzw` · esquema `financeiro_hml`.  
**Natureza:** diagnóstico e planejamento exclusivamente; não é liberação operacional.

## 1. Resumo executivo

O projeto possui uma base real de autenticação, cadastros, Tesouraria e integração manual, mas ainda não é um sistema financeiro completo. As telas de Dashboard e Conferência de Caixa são preparações sem leitura financeira. As páginas planejadas no cadastro de módulos não equivalem a funcionalidades implementadas.

**A V2.2.1 não está instalada no Supabase hospedado.** A conclusão é sustentada pela definição real de `tesouraria_lancar`, que não aceita a sonda do livro único; pelo motor legado `tes_executar`; pela ausência de conta interna; pela restrição de tipo que ainda aceita apenas banco/caixa; e pelas seis aberturas existentes, sem a sétima abertura técnica proposta. Não foi executada nem a sonda nem qualquer comando financeiro nesta auditoria.

Três frentes antecedem uma liberação segura: recuperação comprovada do backup, compatibilidade atual do pacote V2.2.1 e fechamento dos caminhos antigos de escrita. Além disso, o aplicativo local apresentou página em branco e erro de separação entre código do servidor e navegador; o site já publicado apresentou login normalmente. Não corrigimos esse erro, conforme a proibição de iniciar alterações.

**Nenhum dos 11 módulos recebeu a classificação “INSTALADO E FUNCIONAL” integralmente nesta auditoria.** Isso não significa que nada funciona: significa que não há comprovação atual de todos os requisitos de cada módulo, incluindo uso autenticado real. O executor não dispõe de sessão gerenciada para este Supabase externo; não foram solicitadas senhas.

### Quantidades consolidadas

| Classificação | Quantidade |
|---|---:|
| INSTALADO E FUNCIONAL | 0 |
| INSTALADO COM PENDÊNCIAS | 3 |
| DESENVOLVIDO, NÃO INSTALADO | 1 |
| PARCIALMENTE DESENVOLVIDO | 2 |
| NÃO DESENVOLVIDO | 5 |
| NÃO VERIFICADO | 0 |
| **Total de módulos solicitados** | **11** |

“Não verificado” aparece em funcionalidades e validações específicas, não como classificação principal de um módulo cujo estágio pôde ser identificado. Não apresentamos percentual arbitrário de conclusão.

## 2. Método e alcance das evidências

- Inspeção dos componentes, navegação central, serviços, propostas SQL, migrações e relatórios anteriores.
- SELECTs atuais no projeto conectado: tabelas, colunas, funções completas relevantes, RLS, permissões efetivas por tabela/coluna/função, gatilhos, restrições, migrações registradas, contagens e integridade.
- Configuração atual de autenticação consultada por HTTP somente leitura: resposta 200, cadastro público desativado e autenticação anônima desativada.
- Navegação pública, sem sessão, no endereço oficial e no aplicativo local. Não houve contorno de autenticação nem simulação de perfil.
- **251 testes existentes aprovados em 27 arquivos** nesta execução. São testes locais, não prova de instalação nem de persistência hospedada.
- A homologação histórica V2.2.1 registra **130 testes de PostgreSQL isolado e 249 testes do aplicativo** em 03/11. Não repetimos o ensaio de banco nem o tratamos como recuperação do backup real.

Consultas distintas representam observações próximas, não snapshot transacional conjunto nem comprovação de manutenção. A inspeção concentrou-se no esquema financeiro solicitado; não estabelece inexistência global de objetos em outros esquemas. Não acessamos o GESTÃO ITV.

## 3. Inventário consolidado obrigatório

**Front-end** significa código e ligação no menu da versão em trabalho, não igualdade comprovada com a versão publicada. **Funcional** discrimina o alcance verificado; não presume gravações.

| Módulo | Front-end | Back-end | Banco | Funcional | Status | Pendências |
|---|---|---|---|---|---|---|
| 1. Dashboard Financeiro | Tela executiva no início; período e comparação locais | Sem serviço de indicadores ligado ao painel | Reutilizará operações; sem apuração própria instalada | Apenas apresentação vazia | PARCIALMENTE DESENVOLVIDO | Conectar indicadores, comparação, categorias, evolução e projeções; validar bases temporais |
| 2. Lançamentos Financeiros | Menu, lista, filtros, detalhes e formulário de receita/despesa | Histórico legado existente; contrato V2.2.1 desenvolvido | Base existente; motor do livro único NÃO instalado | Leitura prevista; novo registro bloqueado pela sonda incompatível | DESENVOLVIDO, NÃO INSTALADO | Backup recuperável, pacote compatível, janela, segurança e validação real do par |
| 3. Despesas Fixas | Sem aba específica; “Despesas” não controla recorrência | Nenhum serviço específico identificado | Sem tabela própria de recorrência no esquema | Não implementado | NÃO DESENVOLVIDO | Cadastro recorrente, vencimentos, fornecedor, previsão e histórico de pagamentos |
| 4. Despesas Variáveis | “Despesas” reutiliza consulta da Tesouraria com saídas | Consulta genérica existente | Operações suportam saída, não pré-cadastro especializado | Consulta parcial; não há controle completo diário/fornecedor/comprovante | PARCIALMENTE DESENVOLVIDO | Livro habilitado, pré-cadastro, fornecedor, comprovantes e comparação |
| 5. Empréstimos e Financiamentos | Nome registrado; fora do menu ativo; página indisponível | Sem implementação específica | Sem contratos/parcelas/amortizações no esquema | Não implementado | NÃO DESENVOLVIDO | Separar principal, juros e encargos; contratos, parcelas, saldo devedor e quitação |
| 6. Contas a Pagar | Nome registrado; página indisponível; fora do menu ativo | Sem serviço de obrigações/baixas | Sem títulos a pagar e pagamentos no esquema | Não implementado | NÃO DESENVOLVIDO | Obrigações, vencimentos, baixas parciais, atraso e vínculo com despesas/contratos |
| 7. Contas a Receber | Nome registrado; página indisponível; fora do menu ativo | Integração importa informações, mas não é módulo de cobrança | `integracao_itens` não substitui carteira de títulos | Não implementado como módulo | NÃO DESENVOLVIDO | Origem, títulos, vencimentos, parciais, inadimplência e histórico |
| 8. Tesouraria e Conferência | Tesouraria somente consulta; nova Conferência é painel vazio no menu | RPCs antigas instaladas; revisão operacional nova ausente | Contas, operações, movimentos e 49 conferências reais | Base instalada; nova rotina não operacional; uso autenticado atual não verificado | INSTALADO COM PENDÊNCIAS | Segurança antiga, revisão distinta, previsto versus comprovado, ligação com livro sem duplicidade |
| 9. Categorias e Centros de Custo | Duas telas reais no menu; filtros, edição e histórico | Serviços de cadastro sob RLS e gatilhos | 18 contas do plano, 14 oficiais analíticas; 1 centro | Persistência histórica existe; nenhuma edição foi feita agora | INSTALADO COM PENDÊNCIAS | Banco ainda permite analista editar centros, contrariando regra; confirmar telas por perfil |
| 10. Relatórios Gerenciais | Nome registrado; página indisponível; fora do menu ativo | Sem gerador específico identificado | Base financeira futura compartilhada | Não implementado | NÃO DESENVOLVIDO | Relatórios por período/categoria, compromissos, fixo/variável e exportação |
| 11. Usuários e Segurança | Login, recuperação, definição de senha e administração reais | Verificação de sessão; convite privilegiado após papel; alteração sob RLS | 2 perfis ativos, Auth confirmado, RLS nas 13 tabelas | Login público renderiza; permissões antigas com riscos; fluxos autenticados não revalidados | INSTALADO COM PENDÊNCIAS | Fechar caminhos legados, ajustar centros, ensaiar perfis e links; corrigir falha local |

## 4. Situação real do banco hospedado

| Evidência atual | Resultado |
|---|---:|
| Tabelas financeiras/técnicas | 13 |
| Tabelas com RLS | 13 |
| Tabelas com FORCE RLS | 7 |
| Funções | 31 |
| Políticas RLS | 23 |
| Gatilhos não internos | 22; nenhum desativado |
| Migrações registradas | 15; última `20261101202655` |
| Contas financeiras | 6: 4 banco e 2 caixa |
| Controles internos do livro | 0 |
| Operações | 6, todas abertura |
| Movimentos | 0 |
| Conferências | 49, todas pendentes |
| Itens da integração | 49 |
| Sincronizações | 19 |
| Plano de contas | 18 |
| Centros de custo | 1 |
| Perfis | 2 ativos; ambos com Auth existente e e-mail confirmado |
| Auditoria | 296 |
| Contas preparadas | 3 |
| Autorizações / tentativas técnicas de diagnóstico | 2 / 11 |

Integridade por SELECT: seis contas com exatamente uma abertura cada; zero operações diferentes de abertura; zero movimentos órfãos; zero chaves idempotentes duplicadas por autor; zero referências de integração/conferência duplicadas; zero restrições não validadas. As seis aberturas não comprovam saldos bancários reais.

As funções `conferencia_consultar`, `conferencia_comandar`, `conferencia_historico`, `conferencia_opcoes`, `solicitacoes_listar` e `solicitacoes_comandar` propostas **não foram localizadas no catálogo atual**. Também não existe `tesouraria_itens_conferencia`: uma consulta inicial que usou esse nome histórico falhou sem efeitos e foi corrigida utilizando o inventário real. Não criar tabela para acomodar esse erro.

### V2.2.1: confirmação específica

1. `tesouraria_lancar` real admite somente entrada/saída e delega ao motor antigo; não contém `tesouraria_lancar_livro_v2_2_1`.
2. MD5 da definição real de `tesouraria_lancar`: `12893e4cf1ec633acc2cb9051f6290f3`.
3. MD5 do motor real `tes_executar`: `028954f4e03ac8a5402dde2d32f62410`.
4. Não há vínculo interno nem abertura técnica adicional; a constraint ainda permite banco/caixa.
5. Histórico real não projeta os campos adicionais de referência documental/nome previstos na proposta.

**Compatibilidade adicional encontrada:** a impressão estrutural atual, calculada com a expressão do instalador, é `9cf8f2614d34e17234989bb1a46de710`, diferente da referência `910691611965f25f41f922fa1e4b29f7` exigida pela proposta. A comparação disponível encontrou as mesmas 13 tabelas e 23 políticas, mas quatro restrições históricas têm representação SQL diferente, preservando as mesmas listas de valores. Isso não comprova mudança de regra nem determina toda a causa do hash. O inventário histórico disponível contém apenas 56 das 107 restrições e não inclui os gatilhos nesse arquivo. **A proposta pode abortar no pré-check; não trocar o hash nem remover a verificação sem comparação integral e aprovação.**

## 5. Funcionalidades e ausências, módulo a módulo

### 1 — Dashboard

Existem período dia/mês/ano/personalizado, rejeição visual de intervalo invertido e opção de comparação anterior. Todos os indicadores são “não apurados”: receitas, despesas, resultado, pendências, faturamento, líquido previsto e recebimento comprovado. Não há consulta financeira, séries reais, comparativos calculados, participação por categoria ou projeções. O filtro não filtra dados porque nenhum dado é carregado.

### 2 — Lançamentos

Desenvolvidos: formulário receita/despesa, classificação oficial, referência documental, data, valor decimal, histórico, busca, paginação, detalhes e proteção contra duplicidade/perda de resposta com mesma chave. O livro dispensa seleção bancária. A liberação depende de sonda autenticada com contrato exato e 14 UUIDs oficiais; o contrato hospedado é incompatível.

Centros de custo existem na base e no serviço genérico, mas **não são selecionáveis no novo formulário do livro único**. Forma de pagamento está desativada e observações não têm campo próprio implementado. Nome do responsável não pode ser inventado: `perfis` não possui coluna `nome`; a proposta mantém ID e nome opcional quando comprovado. O histórico atual não entrega a referência documental adicional da proposta.

Receitas/despesas/resultado são calculados localmente com bigint/decimal, excluindo aberturas, transferências, estornos e operações estornadas. Não são saldo bancário. O limite é 1.000 operações por tipo/período, com aviso e indicadores indisponíveis se excedido; resultado também reflete busca/categoria aplicadas. Esses cálculos passaram em testes locais, mas não foram ensaiados com lançamentos reais hospedados.

### 3 e 4 — Despesas fixas e variáveis

Uma categoria como “Aluguel e estrutura” não é um módulo de recorrência. A página “Despesas” consulta saídas pela Tesouraria. Não existem obrigações mensais geradas, vencimentos, fornecedores, comprovantes armazenados, previsão versus pagamento ou comparação mensal especializada. Despesa variável realizada deverá reutilizar Lançamentos, não outro motor financeiro.

### 5 — Empréstimos e financiamentos

Existe somente previsão no registro de módulos. Ausentes contratos, instituição, valor contratado, taxa, cronograma, parcelas, saldo devedor, amortizações extras, quitação e projeções. Antes da implementação será necessário aprovar o tratamento de principal, juros e encargos: pagar principal não deve ser tratado automaticamente como despesa operacional. A lista atual de 14 categorias não resolve sozinha essa distinção.

### 6 e 7 — Contas a pagar e receber

Nenhum módulo de títulos e baixas foi identificado no esquema financeiro. Importar um recebimento efetivo ou uma informação de título em `integracao_itens` não cria uma carteira completa de cobrança. Faltam previsão, vencimento, saldo pendente, pagamentos parciais, atraso/inadimplência e ligação sem duplicidade ao realizado. Alertas e compromissos futuros dependem desses controles, não apenas do histórico de caixa.

### 8 — Tesouraria, Conferência e integração manual

Tesouraria implementa contas, saldo registrado, extrato, histórico e detalhes com consulta; a página roteada não oferece novas escritas. Os componentes antigos de conferência/revisão existem, mas não são uma rotina nova instalada. A nova Conferência de Caixa tem filtros, resumo e detalhes vazios, sem cliente de dados, comando ou persistência.

A integração manual é uma funcionalidade transversal já instalada: sete sincronizações manuais concluídas e cinco falhas; duas automáticas históricas concluídas e cinco falhas. O último sucesso manual começou em **29/10 às 22h34 UTC (18h34 Manaus)**. A última execução geral foi automática, em **29/10 às 22h48 UTC**, com falha `erro_interno_origem`. Não houve sincronização nova nesta auditoria nem comprovação atual do transporte até a origem.

`integracao_iniciar` e `integracao_estado_manual` aplicam o horário de Manaus e o limite diário pelo banco; nova tentativa após falha é permitida. A interface chama o serviço autenticado. O período permitido permanece **18h30–23h59 de Manaus**, com um sucesso manual por dia. O analista não tem Integrações no menu; o Administrador Geral executa a operação manual no par atual.

Não há `pg_cron`/`pg_net` instalados no catálogo consultado. As agendas externas foram informadas como desativadas anteriormente, mas sua configuração atual não foi relida. **O endpoint automático, o segredo e as RPCs de servidor continuam preparados**, portanto “somente manual” não significa que todo acionamento automático esteja tecnicamente removido. Nada foi ativado ou desativado agora.

### 9 — Categorias e centros

As 14 oficiais analíticas, códigos 1.01–1.06 e 2.01–2.08, continuam ativas e aceitam lançamentos. O total 18 inclui duas categorias-pai e dois registros anteriores; uma receita HML permanece apta no legado. A lista positiva V2.2.1 é necessária para impedir seu uso no livro oficial. Não recriar nem apagar categorias.

Cadastros suportam criação, alteração, inativação/reativação, hierarquia e consulta de auditoria autorizada. Autoria/auditoria são controladas pelo banco. A regra de centros apenas para Administrador Geral foi implementada na tela/proposta, mas **não no banco real**: `cc_criar` e `cc_alterar` ainda admitem o analista, com INSERT/UPDATE efetivos.

### 10 — Relatórios

Não existe exportador gerencial PDF/planilha identificado. O histórico paginado não é relatório consolidado. Relatórios de fixo/variável, contratos e compromissos não podem ser corretos antes de existir essa classificação e carteira de obrigações. Reutilizar as bases do livro, títulos e conferência.

### 11 — Usuários e segurança

Os dois perfis estão ativos com e-mails confirmados. Cadastro público e login anônimo estão desativados na configuração atual. O site publicado encaminhou `/`, `/lancamentos`, `/conferencia-de-caixa`, `/tesouraria`, `/integracoes`, `/contas-a-pagar` e `/financiamentos` para `/auth` sem sessão; isso prova a barreira pública, não que os módulos internos dessa publicação estejam completos.

O código verifica sessão pelo Supabase, carrega perfil ativo e envia token para funções protegidas. Convite exige papel de Administrador Geral antes de carregar cliente privilegiado; nenhuma chave privada foi apresentada. RLS impede alteração do próprio perfil e há proteção do último administrador. Convite pode enviar e-mail e depois falhar na criação de perfil: tratamento existente informa a falha parcial. O serviço de convite valida o caminho de retorno, mas não estabelece allowlist de domínio no servidor; a interface usa o endereço oficial. Links/e-mails e recusa de todos os perfis não foram novamente exercitados.

## 6. Riscos e pendências técnicas

| ID | Gravidade | Evidência / impacto | Tratamento necessário, sujeito a aprovação |
|---|---|---|---|
| R1 | Crítica para implantação | Backup legível não comprova recuperação com Auth, owners e ACLs | Restore isolado e comparação; nunca restaurar no banco atual |
| R2 | Alta | V2.2.1 ausente; telas não fecham RPCs antigas | Implantação controlada da versão compatível com fechamento efetivo de caminhos |
| R3 | Alta | `cc_criar`/`cc_alterar` incluem analista e grants permitem escrita | Restrição de centros no banco; testar chamada direta e tela |
| R4 | Alta | Motor legado aceita admin financeiro/analista, vínculo fornecido e não exige natureza compatível da categoria nem referência documental | Motor do livro e lista oficial, sem contornar pré-checks |
| R5 | Alta | Conferências têm INSERT/UPDATE por coluna, inclusive status; RPC de lançamento antiga não comprova revisor distinto | Fechar DML/fluxo legado e implantar revisão compatível antes de operar |
| R6 | Alta | `integracao_concluir` verifica papel/modo, não igualdade entre iniciador e chamador manual | Avaliar correção específica e testes; nenhum teste de exploração realizado |
| R7 | Alta para nova versão | Localhost apresentou tela em branco; log identifica importação de `integracao-leitura.server` alcançada por `integracao.functions`/rota automática | Corrigir fronteira servidor/navegador e validar aplicativo local após autorização |
| R8 | Média/alta | Hash estrutural difere do pré-check do instalador | Comparação integral de catálogo e compatibilidade, sem mera substituição de hash |
| R9 | Média | Totalizadores de integração leem itens sem paginação global; acima de 1.000 podem truncar | Agregação/paginação correta quando evolução autorizada |
| R10 | Operacional | Integração automática continua tecnicamente preparada; estado externo atual não verificado | Confirmar agendas desligadas e avaliar selagem específica, sem remover recursos nesta auditoria |
| R11 | Operacional | Telas e fluxos reais do par não verificados; igualdade do código publicado não comprovada | Ensaiar ambos os usuários na versão final, sem credenciais no chat |

`autoria_cadastro` tem EXECUTE efetivo para anon, mas anon não possui USAGE no esquema; trata-se de higiene de ACL, não evidência de acesso anônimo financeiro. Os mutadores antigos de Tesouraria permanecem executáveis por authenticated; o motor privado não é executável diretamente. Seus wrappers SECURITY DEFINER delegam a ele. RLS nas tabelas não neutraliza por si só esses wrappers.

O registro automático de compilação consultado informa **build OK**, porém isso não supera a falha efetivamente observada no aplicativo local e nos logs do servidor. Testes unitários aprovados também não detectaram essa falha de empacotamento. **Não declarar a nova versão pronta para publicação.**

## 7. Backup: atualização e correção das informações anteriores

O arquivo recebido foi previamente lido integralmente, com SHA-256 `7cc16b0351b3679fa35d7147cac54a8f2122158ff658f5f6e9190f84e3a2ae79`; o catálogo informa **253 itens**. Nesta auditoria foi relido o SQL extraído preservado em área temporária, sem restaurar nem executar seu conteúdo.

**Correção importante da resposta anterior:** o backup contém **19 sincronizações**, não uma; não contém tabela `tesouraria_itens_conferencia`. Seus 49 registros de conferência estão em `tesouraria_conferencias`. Contagens corretas das 13 tabelas do backup:

| Tabela | Linhas no backup |
|---|---:|
| auditoria | 296 |
| centros_custo | 1 |
| contas_financeiras | 6 |
| contas_preparadas | 3 |
| diagnostico_autorizacoes | 2 |
| diagnostico_tentativas | 11 |
| integracao_itens | 49 |
| integracao_sincronizacoes | 19 |
| perfis | 2 |
| plano_contas | 18 |
| tesouraria_conferencias | 49 |
| tesouraria_movimentos | 0 |
| tesouraria_operacoes | 6 |

Essas quantidades coincidem com o hospedado observado, mas igualdade de contagens não prova igualdade integral nem restauração. Seis FKs dependem de `auth.users`; funções usam `auth.uid`/`auth.role`. O backup de um esquema não inclui todo o Auth, configurações de acesso, segredos, aplicação ou infraestrutura Supabase. **A recuperação ainda não está comprovada.** Esta auditoria não a dispensa nem a executa.

## 8. Funcionalidades compartilhadas e prevenção de retrabalho

- **Lançamentos é o motor do realizado:** despesas variáveis, pagamentos de obrigações e relatórios devem reutilizar operações/classificação/autoria/idempotência. Não criar segundo livro.
- **Despesas fixas e financiamentos alimentam Contas a Pagar:** recorrência e cronograma geram previsões/obrigações, não despesas pagas automaticamente.
- **Contas a Pagar e Receber** compartilham conceitos de vencimento, parcial, baixa e ligação com operação, preservando natureza e origem distintas.
- **Integração e Conferência** compartilham referência de origem e evidências. Conferir/aprovar não lança nem comprova recebimento automaticamente.
- **Dashboard e Relatórios** devem consumir a mesma apuração; faturamento comercial, recebimento comprovado e resultado do livro são medidas diferentes.
- **Categorias, centros, usuários e auditoria** são bases existentes reutilizáveis. Uma categoria Folha/Comissões não instala módulos de cálculo dessas obrigações.
- O registro contém **24 nomes de módulos**, mas o menu atual filtra **9 entradas** antes das permissões. Os outros nomes são planejamento: indicadores, relatórios, contas a pagar/receber, conciliação, folha, comissões, tributos, financiamentos, DRE, fluxo, planejamento, projetos, fornecedores e configurações não têm painel operacional dedicado no roteamento atual.
- “Conciliação bancária”, OFX e integração com bancos aparecem no registro antigo, mas não são a arquitetura operacional aprovada. Não implementar só porque há esse texto; ajustes de nomenclatura também aguardam autorização.

## 9. Roadmap de conclusão proposto — nenhuma execução autorizada por este relatório

A sequência abaixo antecipa segurança e um núcleo de obrigações para evitar construir despesas/financiamentos sem lugar correto para vencimentos e baixas. Conferência pode ser preparada paralelamente, mas só será instalada depois de compatibilizada com o livro único.

| Ordem | Trabalho necessário | Dependências | Complexidade | Risco principal | Critério objetivo de conclusão |
|---:|---|---|---|---|---|
| 0 | Concluir recuperação do backup e confirmar cobertura/limitações | Arquivo já lido; destino isolado, owners/roles/Auth e inventário | Alta | Recuperação incompleta ou restauração acidental no HML | Restore isolado sem erros não justificados; dados e segurança comparados; limites aceitos; duas cópias protegidas |
| 1 | Corrigir falha do aplicativo local e comparar catálogo/pre-check V2.2.1 | Aprovação específica; fontes e catálogo atuais | Média | Publicar versão branca ou contornar divergência real | App renderiza localmente; nenhum código servidor no navegador; catálogo integral compatível e testes de fronteira aprovados |
| 2 | Instalar e validar Lançamentos V2.2.1 com segurança | Etapas 0–1; manifesto aprovado; janela, admissão/drenagem; autorização de aplicação | Alta | Escritas antigas abertas, duplicidade ou classificação indevida | Conta interna/abertura técnica únicas; seis anteriores intactas; par/UUID→papel correto; 14 categorias; legados fechados; histórico/sonda lidos pelo par |
| 3 | Validar usuários, centros e integração manual já existentes | Segurança da etapa 2; sessões reais; correção específica M5 se aprovada | Média | Analista administrar centros; conclusão de sync por outro iniciador | Banco recusa centros pelo analista; admin preservado; operação manual autorizada conclui e lê resultado, sem movimento automático; agendas desligadas comprovadas |
| 4 | Núcleo de Contas a Pagar | Livro operacional; modelo de obrigação e ligação único aprovados | Alta | Confundir previsto com pago ou duplicar despesa | Títulos, vencimentos, baixas parciais/total, atraso e histórico; baixa vinculada exatamente uma vez ao realizado |
| 5 | Despesas Fixas e complemento de Variáveis | Categorias/centros; etapas 2 e 4; fornecedor/documentos definidos | Média | Gerar meses duplicados ou repetir gasto no livro | Recorrência única por competência; previsão não vira pagamento; variável reutiliza livro; filtros e histórico funcionam |
| 6 | Empréstimos e Financiamentos | Contas a Pagar; contrato de principal/juros/encargos aprovado | Alta | Principal distorcer resultado ou cálculo de juros incorreto | Cronograma confere centavos com contrato; parcelas e amortizações vinculadas; saldo devedor/projeções conferidos; testes isolados |
| 7 | Contas a Receber | Identidade da origem, parciais e vínculo com integração/livro | Alta | Duplicar faturamento e recebimento ou tratar previsão como caixa | Vencimentos, pendência, parciais e inadimplência rastreáveis; recebimento único; informação importada não presumida paga |
| 8 | Conectar Conferência de Caixa reaproveitando preparação/Etapa 2 | Livro e controles atuais; proposta antiga revisada, não aplicada diretamente | Alta | Autoaprovação, perda da fonte ou lançamento duplicado | Fonte preservada; previsto/comprovado separados; revisor distinto; versão antiga recusada; aprovação gera zero movimentos |
| 9 | Apuração compartilhada, Dashboard e Relatórios | Realizado e obrigações/conferência confiáveis | Média/alta | Totais incompletos, duplicados ou bases temporais misturadas | Totais conciliam com livro; série/comparação/categoria corretas; previsão separada; exportação confere com tela e respeita acesso |
| 10 | Homologação integrada e publicação separadamente autorizada | Critérios anteriores; ambos os usuários; plano de contingência | Alta | Diferença local/publicado e liberação indevida | Fluxos reais permitidos/negados verificados; sem erros impeditivos; relatório pós-instalação aceito e autorização de publicação |

Publicação não acontece automaticamente após desenvolver ou instalar. Nenhuma etapa autoriza consulta ou mudança no GESTÃO ITV, integração bancária, dados financeiros de teste no hospedado ou aprovação automática.

### Próxima ação recomendada

**Concluir o ensaio de recuperação do backup real em ambiente separado**, usando o arquivo já identificado; não pedir um novo backup apenas por desconhecer seu conteúdo. Em seguida, obter aprovação para corrigir a falha local e compatibilizar o pré-check V2.2.1 com o catálogo atual. Não avançar criando outro módulo como substituto da liberação segura do livro.

## 10. Índice técnico de evidências

| Área | Arquivos / objetos comprobatórios |
|---|---|
| Navegação e estágios | `src/lib/modules.ts`, `src/components/layout/AppSidebar.tsx`, `src/routes/_authenticated/$modulo.tsx` |
| Dashboard | `src/routes/_authenticated/index.tsx`, `src/components/dashboard/DashboardExecutivoPanel.tsx` |
| Lançamentos | `src/components/lancamentos/LancamentosPanel.tsx`, `src/lib/lancamentos.ts`, `src/lib/livro-financeiro.ts`, `src/lib/lancamentos-oficiais.ts`, `src/lib/tesouraria.functions.ts`, `src/components/tesouraria/useEnvioSeguro.ts` |
| Contrato proposto | `docs/livro-financeiro-v2-2-1/ITV_LIVRO_UNICO_V2_2_1_PROPOSTA.sql`, contenção, manifesto definitivo e `PROCEDIMENTO_IMPLANTACAO_CONTROLADA_V2_2_1.md` |
| Homologação histórica | `docs/livro-financeiro-v2-2-1/RELATORIO_FINAL_HOMOLOGACAO_V2_2_1_20261103.md`, `RESULTADOS_TESTES_LOCAIS.json`, catálogo de homologação |
| Conferência | `src/components/conferencia-caixa/ConferenciaCaixaPanel.tsx`, `src/components/tesouraria/ConferenciaPanel.tsx`, `ConferenciaOperacionalEditor.tsx`, `src/lib/conferencia-operacional.functions.ts`, `docs/conferencia-caixa/PROPOSTA_PREPARACAO_20261111.md`, propostas `docs/etapa2/` |
| Cadastros | `src/components/cadastros/PlanoContasPanel.tsx`, `CentrosCustoPanel.tsx`, `src/lib/cadastros.ts`; tabelas/RLS/gatilhos reais |
| Usuários | `src/components/usuarios/UsuariosPanel.tsx`, `src/lib/usuarios.functions.ts`, `src/lib/auth/permissions.ts`, `session.ts`, `recuperacao.ts`, `src/routes/_authenticated/route.tsx`, `src/start.ts` |
| Integração | `src/components/integracao/IntegracaoPanel.tsx`, `src/lib/integracao.functions.ts`, `integracao-leitura.server.ts`, `integracao-manual.ts`, rota pública `integracao/sincronizacao-diaria`; tabelas/RPCs reais |
| Testes atuais | 27 arquivos existentes, incluindo permissions, cadastros, lancamentos, livro-financeiro, tesouraria, recuperação, conferência e integração; 251 aprovados |
| Hospedado | `pg_class`, `pg_proc`/`pg_get_functiondef`, `pg_policies`, `pg_trigger`, `pg_constraint`, `has_*_privilege`, `supabase_migrations.schema_migrations`; SELECTs agregados em `financeiro_hml` |
| Configuração e navegador | `/auth/v1/settings` HTTP 200; páginas publicadas redirecionadas ao login; aplicativo local em branco e erro de import-protection nos logs |

Todas as páginas de conteúdo locais inspecionadas possuem metadados próprios, inclusive o índice autenticado que serve `/`; não há necessidade de alterar esses arquivos para esta auditoria.

**Encerramento:** diagnóstico concluído. Nenhuma tabela criada, migração aplicada, permissão alterada, registro financeiro modificado, sincronização disparada, funcionalidade desenvolvida ou publicação realizada. Somente documentação de auditoria e acompanhamento foi registrada. **Aguardar aprovação antes de implementar qualquer alteração.**