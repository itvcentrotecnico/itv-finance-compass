# ITV FINANCEIRO — CORREÇÃO MÍNIMA V2: PREPARAÇÃO E VALIDAÇÃO (01/11/2026)

**Status: PREPARADA E TESTADA EM AMBIENTE ISOLADO. NÃO APLICADA. NÃO PUBLICADA.**

Autorização administrativa de 01/11/2026: receitas e despesas diretas somente por `admin_geral` e `admin_financeiro` ativos, sem segundo aprovador nesta fase. Transferências, estornos, aberturas, habilitações de conta e conferências permanecem bloqueados.

## 1. O que foi preparado

- `ITV_CORRECAO_MINIMA_V2_PROPOSTA.sql` — altera o motor privado já corrigido (hash verificado `028954f4e03ac8a5402dde2d32f62410`) e abre **somente** o intermediário `tesouraria_lancar` para `entrada`/`saida`. Sonda inócua `{tipo:"sonda"}` devolve `{contrato:"tesouraria_lancar_minima_v2"}` sem efeito financeiro. Demais intermediários e tipos permanecem fechados com `TES_REVISAO_OBRIGATORIA`. Não cria tabelas nem funções novas; não toca dados.
- `ITV_REVERSAO_SEGURA_V2_PROPOSTA.sql` — contenção que fecha novamente o intermediário aberto, os demais e o motor, sem apagar dados, auditoria ou histórico e sem restaurar código vulnerável. Exige autorização local própria.
- Interface: o formulário de receitas/despesas só aparece quando o banco confirma a sonda `tesouraria_lancar_minima_v2` (falha fechada: qualquer erro ou resposta diversa mantém somente consulta). Botão "Confirmar lançamento"; sucesso "Lançamento registrado com sucesso."; sem transferência, estorno, conferência ou solicitações na tela; categorias filtradas pela natureza da operação; ausência de categoria oficial apta bloqueia o envio com explicação.
- Correção de defeito latente: a recuperação de envio rejeitava a referência documental externa (`externo:documento`), o que tornaria todo lançamento de receita/despesa indeterminado. Campo incluído no esquema de recuperação, com teste.

## 2. Validação executada (ambiente isolado, PostgreSQL 17.11 local, dados sintéticos)

- **36/36 verificações aprovadas**, incluindo os 10 testes obrigatórios pelo caminho público autenticado `tesouraria_lancar`:
  1. Administrador Geral registra receita; 2. Administrador Financeiro registra despesa; 3. Analista, consulta e perfil inativo recusados (`TES_PERMISSAO`); 4. Usuário sem perfil e sessão sem identidade recusados; 5. Receita com categoria de despesa recusada (`TES_CATEGORIA_NATUREZA`); 6. Despesa com categoria de receita recusada; 7. Mesma chave não duplica; mesma chave com outro valor recusada; 8. Saldo exato persistido (180,00), histórico com 6 aberturas + 3 lançamentos, aberturas intactas (hash); 9. Transferência, estorno e abertura pelo intermediário bloqueados; demais intermediários fechados; 10. Motor privado não vira API (permission denied).
- Proposta sem autorização técnica local recusada; nenhuma tabela ou função adicional criada; manutenção recusa escritor concorrente sem espera silenciosa (NOWAIT); reversão sem autorização recusada; reversão fecha intermediário e motor, preserva registros e consultas.
- **221/221 testes do aplicativo** aprovados; build OK.

## 3. O que NÃO foi feito (exigências da autorização)

- Nenhuma alteração no banco remoto HML (`ayjppexbzpgdkzbehvzw`); nenhuma publicação; nenhum lançamento real ou fictício; GESTÃO ITV (`lyfgkhryrhytggexvjvn`) intocado; migração 13→19 não executada; seis aberturas e saldos preservados.
- O ensaio isolado não substitui a validação do backup real de HML nem o acesso autenticado hospedado.

## 4. Pré-condições para aplicação (aguardam aprovação final específica)

1. Categorias oficiais de receita e despesa cadastradas, ativas e com aceite de lançamentos (sem categorias de teste).
2. Janela de manutenção com escritas bloqueadas e transações drenadas (procedimento já documentado).
3. Backup real recuperável verificado.
4. Aplicação da `ITV_CORRECAO_MINIMA_V2_PROPOSTA.sql` com a autorização técnica local, seguida dos testes pós-aplicação.
5. Validação autenticada real no ambiente hospedado.
6. Relatório final e aprovação expressa antes de qualquer publicação.
