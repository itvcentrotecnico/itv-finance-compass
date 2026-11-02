# ITV FINANCEIRO — decisão operacional simplificada

**02/11/2026 — análise documental local. Nenhuma adaptação implementada, SQL executado, consulta remota, alteração financeira ou publicação.**

## 1. Recomendação objetiva

Manter o motor e a estrutura existentes, mas propor **um único vínculo interno de controle**, sem associação a Sicredi, Mercado Pago ou Caixa Físico. O usuário registraria receita/despesa sem escolher banco. O vínculo seria definido e validado pelo motor, não por uma escolha oculta de banco no navegador.

Esse controle representa o livro de receitas e despesas, **não uma conta bancária, caixa físico ou dinheiro disponível**. Seus totais devem aparecer apenas como receitas, despesas e resultado do período. Nenhum previsto será convertido em saldo real.

É a menor adaptação recomendada que preserva os vínculos de integridade atuais. Não é uma simples retirada do seletor e não pode ser obtida aplicando a V2.1 inalterada. Esta é uma recomendação para aprovação do conceito, não autorização de criação do controle.

As três contas oficiais, contas de homologação, seis aberturas e todo o histórico continuam intactos. Nenhuma conta existente será renomeada, reaproveitada como agregado ou terá seu saldo inicial alterado. A decisão atual substitui a gestão de saldos individuais como objetivo operacional, não apaga as estruturas legadas.

## 2. O que a V2.1 exige hoje

| Dependência comprovada nos arquivos locais | Consequência |
|---|---|
| Manifesto com exatamente três contas oficiais e 14 categorias analíticas | Um único controle não é aceito pelo contrato atual. |
| Receita exige destino; despesa exige origem | Omitir a conta sem adaptar o motor provoca recusa. |
| Cada movimento contém `conta_financeira_id` obrigatório com vínculo à tabela de contas | Remover a conta exigiria mexer na estrutura e no modelo de integridade, não apenas na tela. |
| Validador de efeitos exige um movimento por receita/despesa e correspondência da conta | Não se pode registrar só a operação, sem seu efeito correspondente. |
| Conta ativa e data não anterior à abertura | O novo controle precisa de início técnico coerente; não há motivo para informar saldos bancários reais. |
| Gatilho de conta exige uma abertura única | Criar um controle interno no modelo atual exige tratar essa dependência explicitamente. |
| Histórico permite consulta sem filtro de conta | Lista e indicadores podem continuar agregados, sem selecionar banco. |
| Tela carrega opções via consulta de saldos e exige seletor de conta | A carga e a validação precisam ser desacopladas da apresentação de saldos bancários. |

**Despesa e saldo:** o motor V2.1 e o validador de efeitos consultados não verificam saldo suficiente para registrar uma despesa. Portanto, não é necessário criar uma receita de cobertura, saldo inicial fictício ou remover uma trava de insuficiência que não aparece nesses arquivos. Resultado negativo é possível e deve significar apenas despesas superiores às receitas registradas. A confirmação de todas as regras do destino atual continua pendente de inspeção futura autorizada.

## 3. Reutilizar, modificar e não fazer

### Reutilizar sem reconstruir

- Cadastro aprovado: 14 categorias analíticas e duas sintéticas; natureza receita/despesa, atividade e aceite de lançamentos.
- Registro transacional existente, valores decimais exatos, agregação em centavos, lista, filtros de período/tipo/categoria/descrição e paginação.
- Referência documental normalizada e persistida na requisição; comparação integral para mesma chave; autoria e auditoria.
- Recuperação de resposta perdida pela chave original e responsável, proteção entre abas e confirmação somente após resposta conclusiva.
- Autenticação, perfis ativos, RLS e permissões no banco; leitura restrita e caminhos alternativos de escrita bloqueados.
- Contenção/reversão que fecha novas gravações sem apagar lançamentos.
- V2.1 e seus testes originais como pacote preservado de comparação. Os 240 testes do aplicativo e 76 testes isolados são evidências da entrega anterior, **não testes de um modelo agregado ainda inexistente**; não foram reexecutados nesta análise.

### Modificações mínimas propostas para uma versão separada

1. **Identidade interna:** um registro de controle explicitamente não bancário na tabela existente, com UUID aprovado. Sem nova tabela, sem selecionar uma das três contas por padrão e sem identificar o controle como Caixa Físico. O tipo da aplicação hoje admite `banco` ou `caixa`; o tipo neutro de controle e eventual restrição do banco precisam de uma revisão localizada e explícita. Não atribuir um tipo enganoso para evitar essa revisão.
2. **Abertura técnica:** se a integridade atual for mantida, o registro exigirá uma única abertura técnica de valor zero, sem movimento monetário. Zero significa início do livro interno, não saldo disponível nem saldo bancário confirmado. É **um novo cadastro e um novo evento histórico**, dependentes de autorização específica. As seis aberturas anteriores não serão duplicadas nem alteradas. Caso não se aceite esse evento adicional, retirar a dependência de abertura é uma alternativa mais invasiva, com revisão dos gatilhos e testes; não é a recomendação mínima.
3. **Contrato do motor:** substituir, somente na nova proposta, a exigência das três contas por um controle fixado e aprovado. O motor resolve origem/destino pelo tipo do lançamento, rejeita tentativa de atribuir outro vínculo e preserva a identidade resolvida na requisição idempotente. Não recalcular envios antigos pendentes com outro destino. Manter assinatura pública se viável, mas usar marcador de versão distinto para impedir liberação pela sonda antiga.
4. **Primeira aba:** retirar seletor, filtro e coluna bancária da rotina corrente; não excluir os vínculos dos dados nem suas consultas legadas. Usar a sonda segura para validar o controle disponível sem apresentar saldo bancário. Manter campos tipo, valor, data, descrição, categoria e referência. As demais abas não serão desenvolvidas nesta etapa.
5. **Detalhes auditáveis:** a autoria já existe no registro; a referência está em `requisicao.referencia`, mas o histórico atual remove `requisicao`. Propor projeção apenas da referência necessária no histórico/detalhes, sob RLS, e apresentação do responsável. Não expor toda a requisição nem usar descrição como substituto de campos estruturados.
6. **Datas:** preservar início contábil de 01/11/2026. A data técnica do controle deve permitir esse início, sem mudar datas ou aberturas anteriores.

### Opções descartadas ou de maior custo

- **Escolher Sicredi ou Caixa automaticamente:** esconderia a seleção, mas continuaria atribuindo operações a banco/caixa sem comprovação e distorcendo seus totais.
- **Usar conta TESTE ou renomear uma conta com histórico:** compromete identidade e rastreabilidade.
- **Eliminar todas as contas do motor:** exigiria revisar vínculos, movimentos, gatilhos, histórico, recuperação e mais testes; custo superior ao controle técnico único.
- **Reconstruir em tabelas paralelas:** desnecessário nesta etapa.

## 4. Futura Conferência de Caixa — conceito, não desenvolvimento

Fluxo futuro: **recebimento comercial identificado → previsão líquida → conferência humana do crédito/dinheiro recebido → divergência ou confirmação**. Uma OS faturada ou um recebimento previsto não é, por si só, receita efetivamente recebida.

| Informação | Tratamento proposto |
|---|---|
| Identidade do recebimento e OS | Usar identificador estável da origem e de cada recebimento/parcela/componente; número de OS sozinho não garante unicidade. |
| Modalidade e bruto | Dinheiro, Pix, débito, crédito, parcelado ou componentes mistos; conservar o registro original e o responsável. Não inferir rateio. |
| Taxa prevista | Regra futura por modalidade/operadora/parcelas, com vigência e versão. Percentuais/tarifas somente fornecidos ou aprovados pela administração. Sem regra válida, taxa e líquido ficam pendentes, não zero. |
| Líquido previsto | Bruto menos taxas aplicáveis, com arredondamento monetário definido e exato. Nunca apresentado como saldo disponível. |
| Crédito confirmado | Valor e data verificados manualmente no aplicativo bancário ou recebimento em dinheiro, responsável e referência/comprovante. Nenhuma credencial bancária no ITV FINANCEIRO. |
| Divergência | Crédito confirmado menos líquido previsto, com registro do sinal, justificativa e resolução. Crédito ausente é pendência, não zero confirmado. |
| Taxa ajustada | Preservar taxa original, nova taxa, regra usada, justificativa, responsável e horário; recalcular previsão sem sobrescrever evidência histórica. |

Um crédito pode corresponder a várias OS e uma OS a vários pagamentos. A conferência deve admitir vinculação explícita e rateio confirmado, sem vincular apenas pela coincidência de valor/data e sem lançar duas vezes o mesmo recebimento. Confirmação na lista atual significa registro aceito no banco de dados, **não conciliação bancária**; essas situações precisam ser distintas no conceito futuro.

**Não duplicar o efeito das taxas:** definir antes da futura implementação uma convenção única. Se registrar receita bruta e despesa da taxa comprovada, o resultado será o líquido; se registrar somente receita líquida, a taxa poderá ser informação de conferência, mas não uma segunda despesa sobre esse mesmo líquido. Previsão de taxa não deve virar despesa automaticamente. A escolha contábil fica para aprovação; a primeira aba atual continua sem cálculo automático de taxas/modalidade, que não são campos próprios do lançamento existente.

A confirmação futura não libera estornos, transferências ou aprovação de conferências hoje bloqueados. Ajustes financeiros deverão ter mecanismo específico autorizado e auditável. Onde houver revisão independente obrigatória, duas pessoas continuam sendo pessoas distintas; uso interno não autoriza autoaprovação.

GESTÃO ITV continua origem comercial. Nesta análise não houve leitura ou mudança nesse projeto, chamada do leitor, sincronização ou integração bancária. M5 manual e seus limites permanecem como estão; não ativar agenda, não converter importados em lançamentos automaticamente. Reutilizar futuramente itens e conferências pendentes existentes, após revisar seu contrato e riscos já documentados, sem pressupor que taxas e vínculos já estejam suportados.

## 5. Segurança proporcional e impacto na implantação

**Duas pessoas:** manter contas de acesso individuais, sem senha compartilhada, cadastro público ou autoelevação. Não criar cargos novos nem remover usuários/perfis agora. Quem registra utiliza perfil autorizado ativo; autoria vem da sessão. Identificar e confirmar as duas pessoas é tarefa administrativa futura, não executar mudança de acessos por inferência.

**Baixo custo:** reutilizar tabelas, motor, RPCs, testes e primeira aba; sem Open Finance, serviços bancários, agendamento, novas abas ou contratação obrigatória. Evitar alterações no restante da plataforma e manter consultas legadas preservadas, sem promovê-las como gestão bancária.

**Impacto real:** o pacote V2.1 preservado não implementa o conceito novo. A versão futura separada deverá revisar sonda/manifesto, motor, tipo/abertura do controle, carregamento e detalhes da primeira aba, hashes e verificações de instalação. O preflight atual exige seis aberturas e zero movimentos: não se pode adicionar o controle antes e depois executar esse preflight inalterado, nem apagar dados para fazê-lo passar. A sequência e o novo evento precisam estar na transação e no pacote aprovados, com comparação que preserve integralmente as seis aberturas e demais dados anteriores.

**Permissões:** manter lista positiva, RLS, autoria e fechamento de DML direto/por coluna e de mutadores não liberados. Não abrir a função genérica de criar/habilitar contas para o usuário apenas para instalar o controle. A suspensão de edição de cadastros/perfis prevista na V2.1 permanece impacto a revisar; duas pessoas não eliminam esse risco.

**Testes futuros, adicionais e separados:** receita/despesa sem seletor; rejeição de banco injetado; apenas controle aprovado; primeiro lançamento de despesa com resultado negativo sem receita fictícia; categoria/natureza; referência/autoria; recuperação e concorrência sem substituir o vínculo de pedidos pendentes; precisão; manutenção/ACLs/RLS; histórico e seis aberturas anteriores intactos; abertura técnica única se aprovada; reversão fecha escrita sem exclusão. Manter todos os testes V2.1 originais em seu contexto e criar cobertura do novo contrato, sem apagar casos para obter aprovação artificial.

## 6. Status e próxima decisão

**Análise concluída. Modelo recomendado: livro único de receitas/despesas com vínculo técnico interno não bancário. Não implementado nem liberado.**

A decisão necessária é aprovar ou rejeitar esse conceito, incluindo eventual cadastro interno e abertura técnica zero. Não é necessário fornecer saldos dos bancos. Somente depois caberá preparar uma versão separada e seus testes; aplicação continua condicionada a autorização específica, catálogo atual, backup real recuperável com owners/ACLs, manutenção/drenagem, validação autenticada e publicação autorizada separadamente. A redução de escopo não transforma os ensaios sintéticos anteriores em prova do ambiente hospedado.

### Fontes locais e limites das evidências

- `docs/correcao-minima-v2-1/ITV_CORRECAO_MINIMA_V2_1_PROPOSTA.sql`: manifesto/contas (32–44), entrada/saída e requisição (50–69), categoria/conta/data/gravação (70–83), sonda (86–93), preflight (5–21).
- `docs/correcao-minima-v2-1/DEFINICOES_BASE_LOCAL.sql`: abertura única (465–475), integridade dos efeitos (600–633), histórico sem requisição (685–695), cálculo de saldos (733–741).
- `supabase/migrations/20261023172001_428bd967-7990-41f6-9de7-b64f55d6e0d5.sql`: vínculos das operações e conta obrigatória dos movimentos (7–8, 24).
- `src/lib/lancamentos-oficiais.ts`: sonda exige três UUIDs de contas e 14 categorias (1–9).
- `src/lib/tesouraria.ts`: tipos e contratos (5–19), conta/data nas validações (41–55).
- `src/components/lancamentos/LancamentosPanel.tsx`: carga de contas (36), histórico agregado/opcional (58–74), referência/conta/envio (132–155), campos atuais (160–171).
- Relatório e procedimento V2.1 de 02/11: resultados anteriores e pendências de recuperação, manutenção, acesso real e risco legado M5.

São evidências dos arquivos disponíveis, não inspeção nova do banco atual. O pacote V2.1 e seus arquivos de testes não foram modificados nesta análise.