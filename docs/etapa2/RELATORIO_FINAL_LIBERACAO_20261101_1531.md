# ITV FINANCEIRO — Relatório final de avaliação da liberação

**01/11/2026 — verificações entre 15h29 e 15h31 Manaus.**

## Resultado executivo

**LIBERAÇÃO OPERACIONAL BLOQUEADA POR IMPEDIMENTOS CONCRETOS.** A avaliação solicitada foi concluída; não houve migração, publicação, lançamento financeiro ou acesso ao GESTÃO ITV. Uma correção de compatibilidade foi realizada no código, sem mudar permissões ou regras financeiras.

| Item solicitado | Status | Evidência e limite |
|---|---|---|
| Autenticação | BLOQUEADA para certificação final | Login obrigatório nas três páginas verificadas; cadastro público desativado; consulta de saldos sem sessão retorna 401. Login de usuário autorizado não pôde ser executado neste ambiente. Não significa falha comprovada do login. |
| Permissões financeiras | BLOQUEADAS | O motor atual aceita analista para receitas/despesas, contrariando a regra de que analista não lança. RLS existe, mas não impede o caminho privilegiado das funções. |
| Lançamento de receitas | BLOQUEADO | Autorização insuficiente no motor, nenhuma categoria oficial aprovada disponível e fluxo de confirmação da interface preparado para contrato não instalado. |
| Lançamento de despesas | BLOQUEADO | Mesmos riscos; a única categoria de despesa existente é de teste e não aceita lançamentos. |
| Consulta de saldos | BLOQUEADA para certificação final | Contas e saldos consultáveis por leitura administrativa; painel conectado às consultas existentes. Consulta pela sessão real do usuário ainda não comprovada. Não afirmamos indisponibilidade geral da consulta. |
| Integridade dos dados | VALIDADA no escopo de preservação observado | Seis aberturas, zero outras operações/zero movimentos; contagens e hashes de operações/movimentos estáveis entre verificações. Não certifica saldos reais ou futuras gravações. |
| Publicação | BLOQUEADA | Critérios de segurança e uso autenticado não atendidos; nenhuma publicação solicitada. |

## 1. Causa real dos bloqueios

1. **Autorização no banco:** `tes_executar(jsonb)` admite `admin_geral`, `admin_financeiro` e `analista_financeiro`. `tesouraria_lancar(jsonb)` é SECURITY DEFINER e chama esse motor. EXECUTE está permitido a authenticated, negado a anon e service_role. Negar acesso direto ao motor não impede a chamada pelo intermediário privilegiado. Ocultar botões não resolve essa autorização.
2. **Classificação incompatível:** o motor exige categoria ativa que aceite lançamentos, mas não compara sua natureza com entrada/saída. Uma categoria de receita poderia ser utilizada numa despesa pela chamada direta. A base tem somente `TESTE HOMOLOGACAO` (despesa, não aceita lançamento) e `HML TESTE — Receita` (receita, aceita). Nenhuma categoria oficial está disponível para operar; não foi criado cadastro sem aprovação.
3. **Contrato de confirmação:** a interface de escrita preparada usa “Enviar para revisão” e solicitações da Etapa 2. A tabela `tesouraria_solicitacoes` não existe no banco atual. O intermediário legado executa imediatamente e retorna operação, não uma solicitação a revisar. Ativar o formulário atual sem adequação poderia informar revisão enquanto o saldo já muda.
4. **Validação autenticada final:** o Supabase é externo, sem sessão gerenciada disponível ao executor. Não foi possível testar login autorizado, consulta/histórico pela sessão real ou recusa de um perfil real sem permissão. Não solicitamos senha nem criamos usuários de teste no ambiente financeiro.

Não tratamos ausência da migração de 13 para 19 tabelas como requisito obrigatório para esta liberação mínima. Não a executamos. Uma solução menor deve atacar autorização, classificação e compatibilidade do fluxo; não depende de melhorias visuais ou novos módulos. Backup/recomposição de permissões e manutenção continuam relevantes somente antes de eventual correção crítica no banco, não são falhas de login comprovadas.

## 2. Correção segura realizada

Na consulta da chave original, após uma busca bem-sucedida e sem operação encontrada, a ausência da tabela opcional de solicitações agora retorna “nenhum resultado” para os códigos `42P01` e `PGRST205`. Antes, o banco legado falhava nessa etapa por consultar tabela inexistente.

Erros de permissão, sessão e conexão continuam bloqueando a recuperação. A chave original e a identidade do autor permanecem obrigatórias. Nenhuma chave é substituída por essa correção; nenhum envio automático foi acrescentado. A mudança **não habilita lançamentos** nem corrige a autorização do motor. Não foram modificadas tabelas, funções do banco, RLS, permissões, aberturas ou saldos.

## 3. Verificações e testes

- Reaproveitados os 42 testes anteriores como evidência histórica dos formulários/recuperação; não repetidos integralmente.
- Executados **9 testes do adaptador financeiro**, incluindo 5 casos novos: dois códigos de tabela ausente e três erros que precisam continuar bloqueados. Todos aprovados, somente dados simulados locais.
- Executados **11 testes de acesso/senha** existentes, todos aprovados. São testes locais; não comprovam login ou permissões reais no Supabase.
- Verificação do serviço de autenticação: HTTP 200 e `disable_signup=true`.
- Consulta de saldos pela API sem sessão: HTTP 401.
- Navegador em `/`, `/tesouraria` e `/despesas`: redirecionamento para `/auth`, formulário visível e zero erros; captura inspecionada.
- Verificação automática do aplicativo: `build OK` após a correção.
- Não executados testes de escrita nesta etapa. Os ensaios anteriores da proposta da Etapa 2 não validam o banco legado atual. Não houve teste local completo de uma correção financeira mínima, pois ela não foi implementada/aplicada. O fluxo de lançamento, atualização de saldo e histórico após escrita **não estão aprovados**.

## 4. Preservação e configuração

Destino financeiro confirmado: Supabase `ayjppexbzpgdkzbehvzw`, esquema `financeiro_hml`. Nenhuma conexão ao projeto GESTÃO ITV `lyfgkhryrhytggexvjvn` nem ao seu endpoint de integração foi realizada. Integração M5, agendamentos e credenciais não foram modificados ou acionados.

Leituras confirmam **13 tabelas, todas com RLS; 31 funções; 6 operações de abertura; 0 outras operações; 0 movimentos; 280 auditorias; 49 itens; 49 conferências; 19 sincronizações**. As seis contas têm saldo registrado zero, o que não comprova saldo real inicial.

Hashes MD5 de conteúdo ordenado, usados apenas como comparação de preservação:

| Conteúdo | Hash |
|---|---|
| Operações — idêntico às 15h29 e 15h31 | `809afc571260b8dc1699e13267723d7b` |
| Movimentos — idêntico às 15h29 e 15h31 | `d751713988987e9331980363e24189ce` |
| Contas — referência final | `3ab4a7018d6f9c00bdee80f7795afb79` |
| Itens — referência final | `70b3da40fb4fb2d34f0e297a5d5447df` |
| Conferências — referência final | `c74025f99a1384ec9666c8f7e4218ea9` |

As referências finais de contas/itens/conferências não são comparação integral com um dump. As consultas são retratos de leitura, não prova contínua de ausência de terceiros escrevendo. O executor não efetuou escrita remota; as contagens e operações observadas permaneceram estáveis. Início contábil de 01/11/2026 mantido; reconciliação de saldos reais separada.

## 5. Plano mínimo para liberar, sem Etapa 2 estrutural

1. Apresentar e autorizar especificamente a correção do motor existente: analista não lança; categoria de receita somente para entrada e de despesa somente para saída. Preservar assinatura, idempotência, transação, histórico e número de objetos. **Impacto:** chamadas de analista e classificações incompatíveis hoje aceitas passarão a ser recusadas. Não aplicar antes de validação isolada, recuperação e procedimento de manutenção/reversão comprovados.
2. O responsável aprova as categorias oficiais de receita/despesa e as cadastra pelas telas existentes. Não inventar categorias nem reutilizar TESTE como oficiais. Não alterar saldos de abertura.
3. Adequar somente o formulário existente ao resultado efetivo do contrato escolhido, sem anunciar revisão inexistente; manter recuperação pela chave original e não montar recursos ausentes. A revisão por segundo usuário continua obrigatória nos caminhos que a exigem; este relatório não revoga essa regra.
4. Testar a correção num PostgreSQL isolado com dados sintéticos: administrador registra receita/despesa, analista/consulta/sem perfil são recusados, natureza incompatível é recusada, saldo/histórico persistem e mesma chave não duplica. Não usar gravações de teste no banco financeiro real.
5. Validar acesso e consultas na sessão real do responsável e de perfil restrito, sem lançamento fictício; registrar resultado. Essa evidência não está disponível neste executor externo.
6. Somente após esses critérios e autorização aplicável, publicar e confirmar acesso. O primeiro lançamento real cabe ao gestor autorizado; não ao teste automatizado.

**Próxima ação:** autorizar o escopo exato da correção crítica mínima após revisão do impacto acima e fornecer a aprovação das categorias oficiais, sem autorizar a migração estrutural. A liberação não pode ser declarada apenas por ativação de botões. Nenhuma falha impeditiva foi contornada para publicar.