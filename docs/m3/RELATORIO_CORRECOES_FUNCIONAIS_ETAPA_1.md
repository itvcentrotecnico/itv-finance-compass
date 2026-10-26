# Tesouraria M3.2 — Correções funcionais, Etapa 1

Data: 26/10/2026. Escopo autorizado: aplicativo e testes locais, exclusivamente para o HML ayjppexbzpgdkzbehvzw / financeiro_hml.

## Resultado

Correções implementadas com 48/48 testes locais aprovados e compilação automática sem erros. Pronto para iniciar homologação controlada após autorização própria, começando por sessão válida e consultas. Não equivale a homologação financeira concluída: nenhuma escrita de teste foi realizada no HML e a sessão autenticada externa não está disponível para verificação ponta a ponta neste ambiente.

## Arquivos

- Alterados: src/lib/tesouraria.ts; src/lib/tesouraria.functions.ts; src/components/tesouraria/TesourariaPanel.tsx.
- Criados: src/lib/tesouraria-recuperacao.ts; src/components/tesouraria/useEnvioSeguro.ts; src/components/tesouraria/HistoricoOperacoes.tsx.
- Testes criados: src/lib/tesouraria-recuperacao.test.ts; src/lib/tesouraria.functions.test.ts; src/components/tesouraria/TesourariaPanel.test.tsx.
- Documentação: AGENTS.md, roadmap.md e este relatório; autorização registrada na memória de restrições.

## Problemas corrigidos

1. Pedido e chave original são preservados no navegador antes de chamar a operação; fechar/reabrir/recarregar não cria uma substituição. Armazenamento isolado por projeto e usuário. Web Lock serializa tentativas de abas da mesma origem; armazenamento indisponível/corrompido bloqueia novas operações.
2. Recuperação consulta por chave e criado_por da identidade autenticada usando SELECT existente sob RLS, sem cliente privilegiado. Confirmação anterior encerra pendência sem envio. Ausência não significa rejeição. Reenvio exige ação explícita e consulta prévia, preservando exatamente pedido/chave; não há reenvio automático.
3. Resposta explícita de rollback da tentativa inicial libera os campos; falhas de conexão/autenticação intermediária ou respostas desconhecidas mantêm a pendência. Rejeição durante recuperação não comprova rollback da tentativa anterior e por isso não libera uma nova chave. Conflito de idempotência permanece bloqueado para investigação.
4. Movimentações utiliza o histórico de operações existente, separado do extrato de efeitos. Abre saldo zero/estorno zero e apresenta uma linha por transferência. Consulta adicional sob RLS identifica estornos inclusive fora da página atual. Detalhes permitem alcançar o estorno de abertura zero.

## Testes

Comando: bunx vitest run src/components/tesouraria/TesourariaPanel.test.tsx src/lib/tesouraria-recuperacao.test.ts src/lib/tesouraria.functions.test.ts src/lib/tesouraria.test.ts src/lib/auth/permissions.test.ts src/lib/auth/session.test.ts src/test/app-routing.test.tsx.

- Recuperação: 15 testes, abrangendo persistência antes do envio, perda de resposta, consulta sem reenvio de operação confirmada, ausência inconclusiva, mesma chave/conteúdo em entrada/transferência/estorno, proibição de nova chave, falha de consulta, rejeição inicial, rejeição de recuperação, armazenamento, isolamento de usuário e concorrência local serializada.
- Adaptadores: 4 testes; contrato do histórico, zero efeitos, transferência única, consulta restrita ao autor e classificação de rejeição/conexão.
- Interface com serviços simulados: 3 testes; campos liberados após rejeição, fechamento/reabertura e recuperação de confirmação sem novo envio, acesso a estorno de abertura sem efeitos.
- Regressão: 26 testes de Tesouraria/permissões/sessão/roteamento.
- Total: 48 aprovados, zero falhas na rodada final.
- Navegador real sem sessão: /tesouraria redirecionou a /auth, botão Entrar presente, zero erros de página. Esta verificação não substitui acesso autenticado.

## Limites e próxima etapa

- A persistência protege o mesmo navegador/origem; exclusão manual dos dados do navegador, outro dispositivo ou outra origem não compartilham a pendência. Nessas situações, conferir resultado/histórico antes de repetir qualquer operação. Garantia global entre dispositivos exigiria outra proposta e autorização; nada disso foi adicionado nesta etapa.
- Navegadores sem Web Locks ou armazenamento utilizável ficam impedidos de novos envios, preservando consultas.
- Pendência sem resultado visível permanece bloqueada; não há descarte automático. Inativação de perfil/RLS pode ocultar resultado, exigindo recuperação do acesso ou investigação autorizada.
- Não foi possível verificar o fluxo autenticado hospedado: Supabase externo não gerenciado pelo mecanismo de sessão de teste. Não solicitadas credenciais nem contornada autenticação.
- Classificações aptas e contas para os testes devem ser conferidas/preparadas apenas na etapa autorizada. Na leitura de 23/10, não havia classificação ativa apta; outros perfis ficam para a homologação final.
- Nenhuma migração, tabela, função SQL, permissão, regra financeira ou configuração do banco foi alterada; nenhuma operação financeira real/fictícia foi executada no HML; GESTÃO ITV não foi acessado ou alterado.

Próxima ação: autorizar homologação controlada, iniciar com acesso/consultas e depois testar os cenários financeiros previamente definidos, incluindo perda de resposta e recuperação com a mesma chave.