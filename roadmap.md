# Autenticação segura — ITV FINANCEIRO HML

- [ ] Solicitação 18:20 UTC: verificar por leitura a viabilidade hospedada da manutenção e apresentar classificação/evidências e alternativa operacional simples; nenhuma ativação ou migração autorizada.

- [x] Solicitação 18:15 UTC: proposta de barreira PostgreSQL entregue, SQL adicional separado/SQL M3.2 intacto e 13/13 testes locais de admissão/drenagem/retomada/recuperação; nenhuma alteração HML.
- [ ] Manutenção proposta: aguarda aprovação e comprovação de conexões fixas em dois bancos do mesmo cluster, autoridade de admissão, drenagem graciosa dos pools/workers e executor oficial compatível; não fechar HML nem aplicar M3.2 sem esses controles.

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
- [ ] M3: aplicar correções e realizar testes financeiros no banco (aguarda manutenção/drenagem operacional comprovada; SQL final autorizado condicionalmente).
- [x] M3.2: bloqueio NOWAIT antes da pre-verificacao, 15 testes locais concorrentes e 29 de regressao aprovados; SQL final/relatorio entregues.
- [ ] M3.2: aplicação controlada interrompida antes da execução em 23/10/2026 às 18:04 UTC: recuperação parcial aceita e íntegra, destino e tabelas vazias confirmados; bloqueio contínuo de novas escritas/manutenção não disponível ou comprovado. Aguardar esse controle e drenagem antes de aplicar somente SQL final e validar M1/M2/RLS/dados.
- [x] Backup assistido parcial: exportação real de financeiro_hml (7 tabelas, 18 funções, dados/controles), recuperação em PostgreSQL 17.9 vazio e 102 verificações aprovadas; pacote/relatório disponíveis em Files. Não é backup completo Supabase; auth real e configurações hospedadas não recuperadas.
- [x] Aceitação expressa da recuperação parcial em 23/10/2026 às 18:04 UTC, limitada ao HML; Auth/configurações hospedadas fora da cobertura.
- [x] Autorização condicionada: destino, pacote CRC/SHA-256, identidade do SQL e tabelas vazias conferidos; 29 testes de regressão aprovados; relatório de interrupção e roteiro de homologação preparados, sem migração nem novos dados.
- [x] Solicitação 18:11 UTC: RPCs, triggers, privilégios de tabela/coluna e acessos diretos mapeados; destino/recuperação/SQL/tabelas vazias reconfirmados; roteiro de manutenção entregue. M3.2 não aplicada: bloqueio de admissão e drenagem de chamadas antigas não comprováveis apenas com NOWAIT; aguarda controle operacional verificado, sem migrações adicionais.

Testes de convites e demais perfis ficam para homologação final; não bloqueiam o planejamento e desenvolvimento autorizados da M3.
