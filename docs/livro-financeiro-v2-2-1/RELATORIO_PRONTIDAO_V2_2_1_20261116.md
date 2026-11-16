# ITV FINANCEIRO — Prontidão da V2.2.1 (16/11/2026)

Nada foi aplicado no banco hospedado, nada foi publicado e o GESTÃO ITV não foi acessado.

## 1. Recuperação do backup — COMPROVADA (com limitação conhecida)
- Arquivo: `ITV_FINANCEIRO_PRE_V221_20261111_150728.dump`, SHA-256 `7cc16b0351b3679fa35d7147cac54a8f2122158ff658f5f6e9190f84e3a2ae79` (conferido antes de restaurar).
- Restaurado em PostgreSQL 17 isolado e descartável, com `--exit-on-error`: **sem erros**.
- Contagens das 13 tabelas idênticas às do banco hospedado (auditoria 296, centros 1, contas 6, contas preparadas 3, autorizações 2, tentativas 11, itens integração 49, sincronizações 19, perfis 2, plano de contas 18, conferências 49, movimentos 0, operações 6 — todas aberturas).
- Estrutura: 31 funções, 23 políticas, 22 gatilhos, proprietários e RLS/FORCE RLS iguais; impressão estrutural restaurada = `9cf8f2614d34e17234989bb1a46de710` (idêntica à hospedada).
- Vínculos com `auth.users`: 6 chaves externas restauradas; 0 perfis órfãos.
- Permissões efetivas: `anon` sem acesso ao esquema; `authenticated` com acesso; Administrador Geral vê 2 perfis, Analista vê apenas o próprio, usuário desconhecido não vê nada. Evidências em `homologacao/RESTAURACAO_*_20261116.txt`.
- **Preparado à parte** (não faz parte do backup do esquema): papéis `anon`/`authenticated`/`service_role`, esquema `auth` mínimo (tabela de usuários com os 2 IDs e funções `auth.uid/role/jwt`), extensão `pgcrypto`.
- **Limitação:** o backup não contém senhas/sessões do Auth do Supabase. Em desastre real, os dois usuários continuam existindo no Auth hospedado (não afetado pela V2.2.1); se o Auth fosse perdido, seria necessário recriar os 2 usuários com os mesmos IDs.

## 2. Manifesto — versão 2
`MANIFESTO_V2_PARA_APROVACAO_20261116.json`: SHA-256 completos da instalação (`e5659a9b…2aa3`) e contingência (`23618014…bd22`), impressões pré/pós/contingência, backup e revisão do aplicativo. Releitura hospedada de 16/11: impressão e contagens **sem mudança** desde o ensaio.

## 3. Teste pela tela
- Ensaio isolado repetido hoje: **132/132** verificações (dois perfis, receita, despesa, resultado negativo, histórico, total, reenvio com a mesma chave sem duplicar, permissões, contingência), com dados sintéticos.
- **Não foi possível** rodar a tela do aplicativo contra a base isolada: o ambiente não dispõe do serviço de login e da camada de acesso do Supabase; somente o banco pode ser isolado aqui. O fluxo pela tela fica para a janela.
- Durante a janela: a mesma revisão fica disponível na **pré-visualização restrita** do projeto (exige login no Lovable e conta ITV); o Administrador Geral e o Analista entram, fazem 1 lançamento real previamente identificado pela ITV cada um, conferem histórico/total e reenviam com a mesma chave. A publicação no endereço oficial só ocorre depois, com autorização separada.

## 4. Decisão
**PRONTA PARA A JANELA, condicionada a:** (a) aprovação escrita deste manifesto v2; (b) data/hora da janela; (c) identificação dos 2 lançamentos reais para o teste autenticado.

### Roteiro da janela
1. Novo backup (mesmo comando de 11/11) e conferência do SHA-256.
2. Sincronização manual pausada; nenhum uso do sistema.
3. Releitura: impressão `9cf8…e710` e contagens acima. Divergência → parar.
4. Aplicar a instalação (SHA-256 `e5659a9b…`) com o manifesto v2.
5. Verificações: impressão pós `071a…0bfa`, 6 aberturas intactas, 1 controle interno e 1 abertura técnica de R$ 0,00, 0 movimentos novos.
6. Teste autenticado na pré-visualização: cada usuário faz 1 lançamento real identificado, confere histórico e total, reenvia com a mesma chave (não pode duplicar).
7. Abertura do piloto; publicação apenas com autorização separada.

### Interrupção e contingência
- **Parar antes de aplicar** se: backup falhar, SHA-256 divergir, impressão/contagens diferentes, alguém usando o sistema.
- **Acionar contingência** (`23618014…`) se após aplicar: impressão pós diferente, abertura alterada/duplicada, lançamento recusado para usuário válido, aceito para inválido, total errado ou duplicidade no reenvio. A contingência fecha as escritas e preserva registros e histórico (impressão `173c…b04b`). Restauração do backup só em último caso, por decisão do Administrador Geral.
