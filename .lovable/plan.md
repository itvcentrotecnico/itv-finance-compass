# Plano — Plano de Contas e Centros de Custo (HML)

Ambiente: somente `financeiro_hml` no projeto ayjppexbzpgdkzbehvzw. Nenhuma alteração no banco antes do seu "aprovo M2".

## 1. Inspeção (estado atual)

| Item | plano_contas | centros_custo |
|---|---|---|
| Colunas | id, codigo (único), descricao, natureza (receita/despesa/ativo/passivo/patrimonio), conta_pai_id, aceita_lancamentos, ativo, criado_em | id, codigo (único, formato A-Z 0-9 . _ -, até 32), descricao (2 a 160), responsavel, ativo, criado_em, criado_por |
| Proteção por linha | ligada e obrigatória | ligada e obrigatória |
| Regras | ler, criar, alterar (M1); sem exclusão | ler, criar, alterar (M1); sem exclusão |
| Gatilho | autoria | autoria |
| Registros | 0 | 0 |

Lacunas encontradas:
- `plano_contas` não tem `criado_por`, nem validação de formato do código e do tamanho da descrição.
- Nenhuma das tabelas registra quem alterou e quando (`atualizado_em`, `atualizado_por`).
- Não existe trilha de auditoria.
- Nada impede que uma conta seja pai de si mesma ou forme um ciclo, nem que uma conta-filha tenha natureza diferente da conta-pai.

## 2. Migração proposta (M2)

1. `plano_contas`: adicionar `criado_por`, `atualizado_em`, `atualizado_por`; adicionar as mesmas validações de código e descrição de `centros_custo`.
2. `centros_custo`: adicionar `atualizado_em`, `atualizado_por`.
3. Gatilho de autoria ampliado: preenche `atualizado_em`/`atualizado_por` pelo banco; `criado_*` continua inalterável.
4. Gatilho de hierarquia em `plano_contas`: bloqueia ciclos e autorreferência; exige mesma natureza da conta-pai; conta-pai deve estar ativa; impede inativar conta com filhas ativas.
5. Tabela `auditoria` (somente leitura pelo aplicativo): tabela, registro, ação (criar/alterar/inativar/reativar), usuário, data, valores antes e depois. Preenchida apenas por gatilho (segurança definida pelo banco). Leitura: Administrador Geral e Administrador Financeiro. Ninguém cria, altera ou apaga pelo aplicativo.
6. Nenhuma permissão a visitantes; regras de M1 mantidas sem mudança; proteção por linha continua obrigatória.

Reversão (R2): remover gatilhos, a tabela `auditoria`, as validações e as colunas novas. As tabelas estão vazias, então não há perda de dados.

Riscos: baixos. As tabelas estão vazias; nenhuma permissão nova é concedida para gravar; a auditoria guarda valores de cadastro, não dados sensíveis.

## 3. Interfaces

Plano de Contas (`/plano-contas`):
- Árvore hierárquica com busca, filtro por natureza e status (ativas/inativas/todas).
- Formulário (painel lateral) para criar e editar: código, descrição, natureza, conta-pai, aceita lançamentos.
- Inativar/reativar com confirmação; nenhuma exclusão.
- Histórico do registro (auditoria) para quem tem acesso.

Centros de Custo (`/centros-custo`):
- Tabela com busca, filtro de status, ordenação por código.
- Formulário: código, descrição, responsável; inativar/reativar.

Comum:
- Validação no formulário (mesmas regras do banco) e mensagens claras em português para código duplicado, sem permissão e falhas de conexão.
- Estados de carregamento, vazio ("Nenhum registro cadastrado") e erro com "Tentar novamente".
- Botões ocultos conforme o perfil; o banco continua sendo a autoridade.

## 4. Permissões (mantidas da M1)

| | Adm. Geral | Adm. Financeiro | Analista | Consulta |
|---|---|---|---|---|
| Plano de contas | ler, criar, alterar, inativar | ler, criar, alterar, inativar | ler | ler |
| Centros de custo | ler, criar, alterar, inativar | ler, criar, alterar, inativar | ler, criar, alterar | ler |
| Auditoria | ler | ler | — | — |

Ponto a confirmar: o Analista pode inativar centros de custo? Na M1 inativar é uma alteração, então o banco hoje permite. Proposta: manter permitido, pois é reversível e auditado.

## 5. Testes

Banco (transação desfeita ao final, simulando cada perfil):
- Consulta e Analista não criam/alteram plano de contas; Consulta não cria centros de custo.
- Ninguém exclui; `criado_por` e `atualizado_por` não podem ser forjados.
- Ciclo, natureza divergente e código inválido/duplicado são recusados.
- Auditoria é gravada a cada criação/alteração e não pode ser escrita pelo aplicativo.

Aplicativo:
- Matriz de permissões da interface (botões por perfil).
- Validações dos formulários e tradução das mensagens de erro do banco.
- Ponta a ponta com o Administrador Geral: criar, editar, inativar e reativar nos dois módulos.

## 6. Ordem

1. Seu "aprovo M2" (e resposta sobre o Analista).
2. Executar M2 e os testes do banco.
3. Implementar as telas e os testes do aplicativo.
4. Apresentar arquivos alterados, testes executados e pendências.

Fora do escopo: GESTÃO ITV, produção e dados financeiros reais (nenhum registro de exemplo será criado).
