# Autenticação segura — ITV FINANCEIRO HML

- [x] Etapa 1 autorizada em 26/10/2026: recuperação persistente com consulta prévia e mesma chave, rejeição inicial distinta de resultado incerto, histórico completo e 48 testes locais aprovados; compilação OK, acesso sem sessão protegido. Sem migrações, mudanças no banco ou operações financeiras no HML. Relatório: docs/m3/RELATORIO_CORRECOES_FUNCIONAIS_ETAPA_1.md. Validação autenticada/financeira fica para homologação autorizada; persistência limitada ao navegador/origem.

- [x] Solicitação 21:19 UTC: M3.2 aplicada em 21:26 UTC pelo mecanismo oficial, SQL integral e SHA-256 idêntico ao aprovado; integridade M1/M2, dados, RLS, ACLs, funções/triggers/índice e barreira verificadas por leitura. Nove grants temporários não restaurados; nenhuma operação financeira executada.
- [x] Nove grants temporários restaurados pelo usuário; RPCs de Tesouraria para authenticated reconfirmadas por leitura em 21:30 UTC.
- [x] Solicitação 21:30 UTC: prontidão analisada por leitura, nove permissões restauradas verificadas, HML exclusivo confirmado, 26 testes locais aprovados e acesso sem sessão redirecionado. Relatório docs/m3/PRONTIDAO_HOMOLOGACAO_M3_2.md; pendências: histórico de operações não integrado, recuperação de envios incertos/erros, zero classificações aptas e validação autenticada não disponível nesta sessão externa.
- [ ] Homologar operações financeiras: aguarda autorização separada; nenhuma escrita de teste permitida na análise de prontidão.

- [x] Solicitação 21:03 UTC: comandos finais entregues para registro/validação de ACL de UPDATE, barreira temporária por REVOKE, eficácia persistente, drenagem após COMMIT, submissão oficial do SQL byte-idêntico e restauração exata de nove grants; nenhuma alteração executada no HML. Evidências hospedadas/backup informadas pelo usuário. Execução aguarda autorização expressa e controle administrativo dos escritores privilegiados.

- [x] Solicitação 18:20 UTC: viabilidade verificada por SELECT; destino confirmado, template1 listado mas conexão B não comprovada; executor somente leitura, PIDs distintos, sem controle de conexões fixas/serviços/workers ou escolha de sessão no mecanismo de migração. Nenhuma ativação/migração; alternativa é janela operacional coordenada no HML, com risco residual explicitado e nova decisão antes de executar.

- [x] Solicitação 18:15 UTC: proposta de barreira PostgreSQL entregue, SQL adicional separado/SQL M3.2 intacto e 13/13 testes locais de admissão/drenagem/retomada/recuperação; nenhuma alteração HML.
- [x] Manutenção: alternativa operacional por barreira ACL adotada pelo usuário; permissões false verificadas, produtores administrativos suspensos pelo responsável e ausência de transações observada antes da M3.2. Proposta de datallowconn não ativada.

- [x] Conectar o projeto Supabase HML (ayjppexbzpgdkzbehvzw).
- [x] Inspecionar `financeiro_hml` e apresentar proposta técnica (aprovada).
- [x] Migração M1: permissões e regras de acesso por perfil.
- [x] Login, convite/senha inicial, recuperação, saída segura e proteção das páginas.
- [ ] Painel Supabase (usuário): desligar cadastro público, expor `financeiro_hml`, cadastrar URLs de redirecionamento.
- [x] Primeiro Administrador Geral criado e acesso confirmado pelo usuário.
- [ ] Testes de acesso por perfil ponta a ponta em HML (aguarda usuários de teste para cada perfil).

Não conectar o GESTÃO ITV, não publicar em produção e não adicionar dados financeiros reais.
- [x] M2 e telas de Plano de Contas e Centros de Custo (auditoria, validações, testes de banco por perfil).
- [ ] Teste ponta a ponta das telas com login real em HML (aguarda usuários de teste por perfil).
- [x] Plano de Contas e Centros de Custo: testes funcionais com Administrador Geral confirmados pelo usuário.
- [x] M3: inspecionar banco/aplicação e apresentar plano de Tesouraria para aprovação, sem alterar o banco.
- [x] M3 suspensa: revisão integral do SQL, causa raiz 42601 reproduzida localmente, inspeção de objetos e integridade M1/M2, SQL corrigido e relatório (somente leitura no HML).
- [x] M3: correções M3.2 aplicadas; testes financeiros no HML reservados à homologação separada, sem autorização nesta execução.
- [x] M3.2: bloqueio NOWAIT antes da pre-verificacao, 15 testes locais concorrentes e 29 de regressao aprovados; SQL final/relatorio entregues.
- [x] M3.2: interrupções anteriores superadas pela autorização 21:19 UTC e barreira ACL operacional; aplicação oficial 20261023212630 concluída, integridade verificada, relatório docs/m3/RELATORIO_EXECUCAO_M3_2.md.
- [x] Backup assistido parcial: exportação real de financeiro_hml (7 tabelas, 18 funções, dados/controles), recuperação em PostgreSQL 17.9 vazio e 102 verificações aprovadas; pacote/relatório disponíveis em Files. Não é backup completo Supabase; auth real e configurações hospedadas não recuperadas.
- [x] Aceitação expressa da recuperação parcial em 23/10/2026 às 18:04 UTC, limitada ao HML; Auth/configurações hospedadas fora da cobertura.
- [x] Autorização condicionada: destino, pacote CRC/SHA-256, identidade do SQL e tabelas vazias conferidos; 29 testes de regressão aprovados; relatório de interrupção e roteiro de homologação preparados, sem migração nem novos dados.
- [x] Solicitação 18:11 UTC: RPCs, triggers, privilégios de tabela/coluna e acessos diretos mapeados; destino/recuperação/SQL/tabelas vazias reconfirmados; roteiro de manutenção entregue. M3.2 não aplicada: bloqueio de admissão e drenagem de chamadas antigas não comprováveis apenas com NOWAIT; aguarda controle operacional verificado, sem migrações adicionais.

Testes de convites e demais perfis ficam para homologação final; não bloqueiam o planejamento e desenvolvimento autorizados da M3.
