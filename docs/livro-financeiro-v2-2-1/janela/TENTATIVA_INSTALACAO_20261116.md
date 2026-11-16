# Tentativa de instalação V2.2.1 — 16/11/2026 ~16:10 Manaus

- Autorização expressa: Caio Fabio Souza (16/11/2026). Backup prévio SHA-256 8c60749bb75094f1de4fcb2d328c60a927394c24983e6ed35d5312dbfd8506a2.
- Arquivo aplicado: ITV_LIVRO_UNICO_V2_2_1_PROPOSTA.sql (SHA-256 e5659a9b…2aa3), sem alteração, precedido apenas das configurações de sessão (validação, autor admin_geral, manifesto de 03/11).
- Resultado: RECUSADA pela própria trava `V22_TIPO_EXIGE_REVISAO`, antes de qualquer alteração. Transação desfeita.
- Passaram antes da parada: catálogo das 31 funções, estado financeiro (6 aberturas, 0 movimentos), impressão estrutural 9cf8f261…, herança de papéis, manifesto, 14 categorias, responsáveis, autoria, ausência de controle interno e de colisão de IDs.
- Causa: a coluna real `contas_financeiras.tipo` é `character varying(20)`; a trava aceitava somente `character varying` sem tamanho (a base de ensaio não reproduzia o tamanho).
- Conferência pós-falha (leitura): 6 contas, 6 operações, 0 movimentos, 296 auditorias, `tesouraria_lancar` MD5 12893e4c… (original), regra de tipo original. Nada mudou.
- Próximo passo: ajustar a trava para aceitar `character varying(n)` com n ≥ 7, ajustar a base de ensaio para varchar(20), repetir o ensaio isolado, novo SHA-256 e nova autorização expressa.
