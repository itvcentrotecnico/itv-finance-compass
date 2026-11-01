# ITV FINANCEIRO — Correção crítica mínima preparada

**01/11/2026. Status: PREPARADA E TESTADA LOCALMENTE; NÃO APLICADA; NÃO PUBLICADA; NÃO LIBERADA PARA OPERAÇÃO.**

## Entrega e impacto

1. `CORRECAO_MINIMA_PROPOSTA.sql`: substitui o corpo de `financeiro_hml.tes_executar(jsonb)`, preservando assinatura, chave original, validação decimal, registros, auditoria, travas e integridade. Somente administradores ativos passam na autorização; receita exige natureza receita e despesa exige natureza despesa. Categorias inativas/sem aceite continuam recusadas.
2. A mesma proposta mantém **seis intermediários existentes fechados**, sem criar objetos: `tesouraria_lancar`, `tesouraria_transferir`, `tesouraria_estornar`, `tesouraria_criar_conta`, `tesouraria_habilitar_conta`, `tesouraria_lancar_conferencia`. Não foi encontrada comprovação de revisão distinta no contrato legado. Fechá-los evita efetivação sem revisão, inclusive por chamada direta. Aberturas/habilitações ficam fechadas também para não reabrir alteração de saldo inicial neste escopo.
3. Nenhuma tabela, função nova, política ou concessão adicional. A proposta altera sete corpos de funções existentes e não concede acesso ao motor privado. **Impacto operacional:** esses seis intermediários recusariam operações após eventual aplicação; esta é uma correção de segurança preparada, não uma migração de liberação.
4. Código não publicado: `src/lib/tesouraria.ts` e `src/lib/auth/permissions.ts` passam a negar escrita de Tesouraria ao analista. `src/components/tesouraria/TesourariaPanel.tsx` deixa de anunciar revisão: confirmação usa “Registro confirmado. Confira o histórico” e comando “Confirmar operação”. Rotas permanecem somente consulta, sem ativação de formulário. Testes correspondentes foram atualizados.

## Resultados comprovados

- **31 verificações PostgreSQL 17.11 aprovadas**, listadas em `RESULTADOS_TESTES_LOCAIS.json`.
- Administrador Geral e Financeiro aceitos pelo motor; analista, consulta, perfil inativo, sem perfil e sem identidade recusados.
- Receitas/despesas incompatíveis, categoria inativa e sem aceite recusadas; despesa compatível aceita.
- Mesma chave retorna a mesma operação; alteração de valor com a mesma chave recusada.
- Saldo sintético esperado **280.10**, persistido; histórico com seis aberturas sintéticas e quatro lançamentos; hash das seis aberturas preservado.
- Motor privado inacessível a authenticated. Os seis intermediários públicos recusam operação sem revisão comprovada.
- Sessão independente com trava de escritor faz a aplicação com NOWAIT falhar; não há espera silenciosa por escrita concorrente.
- Reversão não autorizada recusada; reversão autorizada localmente fecha inclusive o motor e preserva histórico/consultas.
- **38 testes de aplicativo aprovados**, somente quatro arquivos afetados/dependentes; não repetida a suíte completa. Verificação automática `build OK`.

**Distinção essencial:** testes positivos de lançamento entraram no motor privado por um executor privilegiado local com identidade sintética. Isso testa autorização, natureza, saldo, histórico e idempotência do motor, mas **não certifica um fluxo público operacional**. Nenhum intermediário foi aberto para contornar revisão. A revisão por segundo usuário foi preservada por bloqueio, não implementada nem simulada como aprovação existente.

## Isolamento e recuperação ensaiada

PostgreSQL escuta somente socket `/tmp/itv-minima/socket`, sem endereço de rede. Usados M1/M2/M3 existentes, fixture local e definições das funções do inventário auditado. Os hashes das dez funções financeiras auditadas foram reconfirmados por SELECT no HML; coincidem com o inventário. Nenhum dado financeiro real foi copiado para teste; o restante das 13 tabelas não foi reconstruído integralmente, pois não é necessário para estes testes de motor.

Um dump Custom **sintético local** foi restaurado em outra base descartável. Hash de operações, seis aberturas sintéticas, privacidade do motor e privilégio de execução do intermediário coincidiram; `RESULTADO_RECUPERACAO_LOCAL.json` registra o resultado. O ensaio preserva a versão fechada de segurança e não reabre o legado vulnerável.

**Limite impeditivo antes de aplicação remota:** esse ensaio não é restauração do backup HML de 01/11; não comprova recomposição completa de proprietários/ACLs omitidos no dump real por `--no-owner --no-acl`, nem Supabase Auth/configurações. A evidência histórica informada pelo administrador continua com essas limitações. Nenhuma recuperação real foi declarada aprovada por este ensaio.

## Aplicação proposta — não executar nesta autorização

1. Obter aprovação final do pacote exato e confirmar recuperação do backup real com proprietários, privilégios, funções e dependências. Conferir hashes do SQL, funções de origem, 13 tabelas/31 funções, seis aberturas, demais registros, saldos e auditoria.
2. Responsável abre janela de manutenção e interrompe produtores HTTP, integrações manuais/agendadas, administração e acessos privilegiados que possam escrever. Não modificar GESTÃO ITV; suspendem-se apenas produtores do ITV FINANCEIRO. Não presumir que fechar navegador impede chamadas diretas.
3. Preparar barreira seletiva de EXECUTE dos intermediários financeiros e DML nas tabelas envolvidas, a partir de ACLs atuais e por autorização específica, sem ampliar privilégios. A barreira deve ser efetiva antes da drenagem. Os comandos de ACL de outras etapas não devem ser executados cegamente: precisam corresponder ao inventário atual. Esta entrega **não contém barreira remotamente validada**.
4. Confirmar término das transações já admitidas e ausência de transações preparadas/conexões incompatíveis numa conexão administrativa dedicada. Não encerrar sessões automaticamente. Continuar impedindo novas gravações; observar ausência de sessão uma vez não prova drenagem contínua.
5. Na conexão controlada, registrar a validação administrativa exigida pelo SQL e executar a proposta integral em uma transação. As nove tabelas de segurança/lançamento são travadas com `ACCESS EXCLUSIVE NOWAIT` **antes** de qualquer substituição. Falha de trava, hash divergente ou condição não comprovada: ROLLBACK e interrupção, sem repetição automática.
6. Verificar corpos, assinaturas, proprietários/ACLs/RLS e invariantes por leitura; conservar intermediários fechados e consultas disponíveis depois da transação. Retomar produtores somente depois de comprovar que não reabrem efeitos sem revisão. Sem lançamentos fictícios remotos.

NOWAIT foi testado contra escritor local; **não drena RPC antiga antes de ela tocar tabelas**. Por isso a barreira anterior, contenção privilegiada e drenagem externa continuam necessárias. Os bloqueios transitórios também interrompem consultas durante a transação; a janela deve prever essa indisponibilidade breve.

## Reversão

`REVERSAO_SEGURA_PROPOSTA.sql` é reversão funcional de contenção: exige aprovação específica, trava as mesmas tabelas, fecha motor e intermediários e mantém dados/consultas. Não elimina lançamentos e não restaura permissões ou funções vulneráveis. Aplicação/reversão exigem a mesma barreira e drenagem. Para recuperar disponibilidade posteriormente, corrigir e revalidar um pacote novo; jamais restaurar o executor legado inseguro sobre dados operacionais.

## Riscos e próximo passo

- **Revisão obrigatória sem contrato suficiente:** permanece impeditiva; estrutura atual não comprova aprovador distinto. Não dispensada por esta preparação. Liberação exige solução aprovada para esse requisito ou definição administrativa explícita e compatível de quais operações dispensam revisão; não presumimos dispensa.
- **Categorias oficiais:** responsável informou que ainda as cadastrará; nada criado ou convertido de TESTE para oficial.
- **Recuperação real e manutenção hospedada:** pendentes de comprovação antes de qualquer execução remota.
- **Uso autenticado final:** não validado neste executor de Supabase externo; não substituído por mocks ou executor privilegiado local.
- Outros riscos históricos de DML de conferências/integração não foram corrigidos fora do escopo; os intermediários fechados não certificam toda a plataforma.

**Confirmação:** nenhuma alteração no banco HML/produção, migração completa, publicação, lançamento real ou consulta ao GESTÃO ITV foi realizada; seis aberturas reais permanecem preservadas. A preparação solicitada está concluída, com os impedimentos acima explicitamente mantidos.