# M3.2 — aplicação interrompida nas pré-condições

23/10/2026, inspeção iniciada às 17:44 UTC.

## Decisão

Nenhuma migração foi enviada ou executada. A autorização está registrada, mas a pré-condição de backup/ponto de recuperação válido não pôde ser comprovada. Não prosseguir sem essa comprovação e sem manutenção/drenagem das chamadas antigas.

## Evidências verificadas por leitura

- `lovable supabase info --json` confirmou o destino efetivamente conectado: `ayjppexbzpgdkzbehvzw`, URL correspondente, integração externa (`managed_by_lovable: false`). O campo `environment: production` descreve o slot da integração no Lovable; não atesta a finalidade de negócio do banco. O UUID coincide exatamente com o HML autorizado pelo usuário. Nenhum outro projeto foi acessado.
- Histórico: M1 `20261023160644`, M2 `20261023165006`, M3 `20261023172001`, correção anterior `20261023172359`; M3.2 não aplicada.
- Contas financeiras: 0; operações: 0; movimentos: 0.
- Plano de Contas: 1; Centros de Custo: 1; Perfis: 1; Auditoria: 7.
- RLS habilitado e obrigatório em todas as sete tabelas de `financeiro_hml`.
- SHA-256 da proposta no projeto e do SQL entregue: `66c47b7d9292c45f1580f32f1b59937047ba36b294f0eac9d914f188a1817401`, iguais. Nenhum SQL foi editado nesta etapa.

As contagens são inspeção preliminar, não substituem a pré-verificação transacional sob locks. Não foi executado teste que criasse dados no HML. Não se certifica nesta etapa uma comparação integral de definições/ACLs/linhas M1/M2 antes e depois: não houve aplicação.

## Pré-condição sem comprovação

Os recursos disponíveis de Supabase oferecem consultas de leitura e migrações, mas não forneceram estado, data ou sucesso de backups/PITR. A conexão externa não trouxe essa informação. Não há acesso de gestão Supabase nem conexão direta de banco disponível para verificar/criar e testar um backup restaurável; não foram solicitadas nem expostas credenciais.

Não inferir recuperação válida a partir de RLS, histórico de migrações, SQL de reversão ou disponibilidade da conexão. A proposta de reversão não equivale a backup.

## Próximo passo seguro

Obter evidência do backup/PITR do projeto exato, com data/hora, status de conclusão e disponibilidade de restauração; confirmar sua cobertura dos dados/objetos afetados. Confirmar janela de manutenção e drenagem. Só então retomar a aplicação do SQL final integral aprovado com locks NOWAIT antes da verificação de tabelas vazias, na mesma transação.

Se houver conflito, dados ou falha, interromper sem repetição automática. Não executar reversão ou migração adicional sem autorização. Como nenhuma aplicação ocorreu, não há rollback a executar agora.

## Escopo preservado

Somente consultas de leitura no HML e atualização de documentação/memória. Nenhuma alteração em dados, funções, triggers, índices, constraints, grants, políticas ou configuração; nenhum acesso ao GESTÃO ITV ou outro banco; nenhuma publicação.