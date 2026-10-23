# Autenticação segura — ITV FINANCEIRO HML

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
- [ ] M3: aplicar correções e realizar testes financeiros no banco (aguarda nova autorização após apresentação do SQL e relatório).
- [x] M3.2: bloqueio NOWAIT antes da pre-verificacao, 15 testes locais concorrentes e 29 de regressao aprovados; SQL final/relatorio entregues.
- [ ] M3.2: aplicação controlada autorizada em 23/10/2026, interrompida antes da execução: backup/ponto de recuperação restaurável não verificável com os acessos disponíveis. Destino ayjppexbzpgdkzbehvzw confirmado, três tabelas financeiras vazias, SQL final idêntico ao entregue. Aguardar comprovação de recuperação e manutenção/drenagem antes de aplicar e validar M1/M2/RLS/dados.
- [x] Backup assistido parcial: exportação real de financeiro_hml (7 tabelas, 18 funções, dados/controles), recuperação em PostgreSQL 17.9 vazio e 102 verificações aprovadas; pacote/relatório disponíveis em Files. Não é backup completo Supabase; auth real e configurações hospedadas não recuperadas.
- [ ] Recuperação total/aceitação de cobertura limitada: aguarda decisão expressa sobre riscos de Auth/configurações ausentes; M3.2 permanece suspensa, nenhuma migração executada.

Testes de convites e demais perfis ficam para homologação final; não bloqueiam o planejamento e desenvolvimento autorizados da M3.
