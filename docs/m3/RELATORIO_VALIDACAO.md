# M3 — suspensão, causa raiz e revisão

> Relatório histórico da primeira revisão. A validação concorrente e o SQL final atual estão em `RELATORIO_FINAL_M3_2.md`; as limitações de concorrência abaixo descrevem aquela rodada anterior.

Data da inspeção: 23/10/2026, 17:28–17:32 UTC. Destino inspecionado: Supabase HML `ayjppexbzpgdkzbehvzw`, esquema `financeiro_hml`. Nenhuma migração foi executada no HML após a solicitação de suspensão. Nenhuma conexão com GESTÃO ITV ou produção foi realizada.

## 1. Situação real e cronologia

As primeiras duas tentativas falharam e as inspeções realizadas naquele momento não encontraram os objetos M3. Antes da solicitação de suspensão, duas execuções posteriores foram concluídas:

| Versão registrada no HML | Situação |
|---|---|
| 20261023160644 | M1 aplicada |
| 20261023165006 | M2 aplicada |
| 20261023172001 | M3 aplicada às 17:20 UTC |
| 20261023172359 | Correção de trigger/estorno aplicada às 17:24 UTC |

O teste com dados temporários que estava aguardando aprovação foi cancelado antes de executar. Não é correto afirmar que M3 ainda não foi aplicada: seus objetos existem. Também não se deve reaplicar cegamente o script inicial, que não é idempotente.

Contagens atuais: Plano de Contas 1; Centros de Custo 1; Perfis 1; Contas Financeiras 0; Operações 0; Movimentos 0. Não foram encontrados órfãos de perfis ou de contas-pai. Os objetos esperados da M3 e da correção existem; não há evidência de resíduos parciais das tentativas que falharam. Isso não equivale a certificação de todos os aspectos funcionais.

## 2. Causa raiz 42601

Foram reconstruídas as duas variantes problemáticas a partir dos pontos corrigidos do script, e reproduzidas em PostgreSQL 17.9 local descartável. Os arquivos oficiais atuais já contêm os parênteses; não preservam literalmente cada envio que falhou. Portanto, os testes confirmam o mecanismo e as instruções, mas não recuperam o cursor original de cada resposta do serviço.

### Função `tes_validar_efeitos`, ramo abertura

```sql
-- Problemático dentro da condição IF:
OR n <> CASE WHEN abertura = 0 THEN 0 ELSE 1 END
-- Corrigido:
OR n <> (CASE WHEN abertura = 0 THEN 0 ELSE 1 END)
```

### Função `tes_executar`, validação monetária

```sql
-- Problemático:
IF coalesce(p->>'valor','') !~ CASE WHEN tipo='abertura'
  THEN '^-?\d{1,16}(\.\d{1,2})?$'
  ELSE '^\d{1,16}(\.\d{1,2})?$' END THEN
-- Corrigido:
IF coalesce(p->>'valor','') !~ (CASE WHEN tipo='abertura'
  THEN '^-?\d{1,16}(\.\d{1,2})?$'
  ELSE '^\d{1,16}(\.\d{1,2})?$' END) THEN
```

Na leitura da condição PL/pgSQL, o `THEN` interno do CASE sem agrupamento interfere na delimitação da expressão IF. O PostgreSQL recebe uma expressão truncada e informa `syntax error at end of input` (42601). Não era ausência do `END $$` final da função, nem falha de RLS, índices ou tabelas.

## 3. Revisão integral e defeitos adicionais

| Item | Diagnóstico e tratamento proposto |
|---|---|
| Funções | Os dois CASE já corrigidos compilam. Novo erro 42702 reproduzido ao registrar entrada: `SELECT id,codigo,descricao,...` conflita com variável local `descricao`. Proposta usa alias `c.descricao`. `m.valor` no estorno também fica explicitamente qualificado. |
| Trigger compartilhado | A correção anterior separou `NEW.id` de `NEW.operacao_id` em IF procedural. Mantida: evita resolver campo inexistente da outra tabela. |
| Correção anterior | Reescrita por `replace(pg_get_functiondef(...))` poderia não encontrar texto e falhar silenciosamente. Proposta traz definição completa, explícita, sem substituição textual no HML. |
| Regressão da abertura | A correção anterior removeu rejeição de Plano de Contas/Centro de Custo em abertura. Proposta restaura ambas e exige exatamente uma conta e data igual à abertura da conta. |
| Estornos | Proposta compara também endpoints invertidos, classificação, snapshot e data com original; preserva inversão exata dos efeitos e unicidade de original. Valida classificação ativa/com aceite e centro ativo também no estorno; se inativos, a operação é rejeitada, exigindo reativação autorizada. |
| Integridade da abertura | Novo índice único parcial de abertura por conta e trigger diferido exigindo uma abertura para cada conta. Não permite conta sem origem rastreável. |
| Idempotência | A versão implantada compara JSON de transporte: `0.3` e `0.30` conflitam. Proposta normaliza decimal, data, UUIDs e textos antes da comparação, inclui versão 1, preserva lock e unique. Pré-condição exige tabelas vazias para não reinterpretar requisições legadas. |
| Histórico zero | Extrato financeiro atual usa JOIN com efeitos e omite abertura zero. Proposta adiciona consulta de histórico por operação, incluindo abertura zero e seu estorno; não cria efeito financeiro zero. Integração dessa consulta à tela fica para a retomada autorizada. |
| Extrato e índices | Índices existentes suportam data, plano, centro e conta. Proposta mantém todos e limita página a 100000 usando bigint no OFFSET, evitando overflow de int. Agregações com grande volume ainda precisam de testes de desempenho. |
| Constraints | PK/FK/unique/check atuais estão validados. Validação diferida permite montar operação + efeitos atomicamente; proposta fecha referências indevidas e datas anteriores à abertura. Não há validação temporal via CHECK imutável. |
| RLS/grants | RLS habilitado e obrigatório nas sete tabelas. Usuários autenticados só leem ledger, não inserem/alteram/excluem. Cadastro de conta permanece via RPC, edição direta limitada às colunas de metadados. Nenhuma policy foi removida. |
| Segurança definer | Dono das funções: postgres, BYPASSRLS true. Uso intencional para escrita mediada; wrappers validam auth.uid e papel, executor privado sem EXECUTE para anon/authenticated/PUBLIC. Nenhum papel de aplicação tem CREATE no esquema. Proposta usa pg_catalog, financeiro_hml, pg_temp explícitos nas funções revistas. |

A proposta não proíbe saldo negativo nem impõe receita exclusivamente em entradas/despesa exclusivamente em saídas, pois essas regras não foram solicitadas e poderiam impedir operações legítimas. Transferências não têm classificação de receita/despesa; ambas as pontas somam zero. Saldo inicial é metadado imutável e sua movimentação já compõe o saldo: nunca somar o metadado novamente.

## 4. M1 e M2

Os sete corpos de função `papel_atual`, `tem_papel`, `perfis_protecao`, `autoria`, `autoria_cadastro`, `pc_hierarquia` e `registrar_auditoria` foram comparados com a reconstrução local das migrações: idênticos, normalizando apenas espaços. Triggers de autoria, hierarquia, auditoria e proteção de perfis estão habilitados; políticas M1/M2 permanecem presentes; constraints validados; RLS obrigatório. M3 restringiu grants de contas financeiras e adicionou auditoria/proteções, sem substituir os controles anteriores.

**Conclusão estrutural:** M1/M2 permanecem preservadas. **Não equivale a ausência de defeitos herdados:** a revisão identificou riscos concorrentes na proteção do último Administrador Geral e nas alterações simultâneas da hierarquia (checagens sem serialização global). Exigem proposta separada de correção e testes concorrentes antes da homologação final; nenhuma alteração automática foi feita. `autoria_cadastro` herdou EXECUTE público, mas é função trigger, não RPC comum: não foi demonstrada autoelevação por essa permissão. Recomenda-se endurecimento separado com aprovação.

## 5. Validação realizada e limites

Todo teste com registros foi executado **somente em PostgreSQL local descartável**, com schemas/roles mínimos reconstruídos e M1/M2 originais, sem dados/copiar credenciais do HML. Os registros foram revertidos. O HML recebeu exclusivamente SELECTs de inspeção nesta revisão.

- Compilação local integral da M3 e correção anterior: passou.
- Reprodução das duas variantes 42601: falharam exatamente com `syntax error at end of input`, como esperado.
- Entrada antes da nova proposta: falhou com `column reference descricao is ambiguous` (42702).
- SQL da nova proposta compilou integralmente.
- Transferência, entrada, estorno, repetição e leituras: passaram localmente.
- 17 verificações locais passaram: mesma conta rejeitada; mais de 2 casas rejeitado; conta inativa rejeitada; saldo inicial imutável; ledger imutável; retry canonicalizado único; conflito rejeitado; segundo estorno rejeitado; classificação inativa no estorno rejeitada; histórico zero incluído; saldo exato após estorno; operação incompleta revertida pela constraint; paginação grande limitada; operações permitidas aos 3 perfis escritores e negadas à Consulta Gerencial.
- Comparação dos corpos M1/M2: 7/7 preservados.

Não foram certificados nesta rodada: duas sessões concorrentes sob carga; browser autenticado; políticas via PostgREST real; desempenho; convites e demais fluxos de autenticação. O Supabase externo não disponibiliza sessão automática para verificação autenticada. Testes locais não substituem homologação no HML.

Avisos preexistentes: seis EXECUTE de funções SECURITY DEFINER (incluindo helpers de perfil), cuja necessidade foi revisada; proteção contra senhas vazadas desativada, pendente de ajuste autorizado na configuração de autenticação.

## 6. SQL entregue e execução segura

- `M3_2_CORRECAO_PROPOSTA.sql`: proposta completa apropriada ao estado atual, não replay da M3 inicial; não aplicada no HML.
- `REVERSAO_PROPOSTA.sql`: restaura definições anteriores sem apagar dados financeiros; bloqueia se houver operações. Retornar ao estado anterior reintroduz defeitos conhecidos, portanto exige análise e autorização.
- `validar_regras_local.py`: testes reproduzíveis, conexão fixa ao socket local `/tmp/m3-review/socket:55439`, nunca usa variáveis de credenciais do HML. Exige PostgreSQL local e fixture M1/M2 com tabelas base mínimas; não executar em conexão Supabase.

Plano seguro:
1. Obter nova autorização somente após revisão deste relatório e do SQL; não abrir aprovação de migração agora.
2. Reinspecionar estado e garantir snapshot/backup adequado. Script aborta se já houver contas ou ledger, exigindo reconciliação específica.
3. Aplicar pelo mecanismo oficial de migrações em **uma transação única**. O SQL proposto contém BEGIN/COMMIT para revisão/manual; se o mecanismo já envolve transação, retirar apenas esses delimitadores externos no envio, preservando atomicidade do executor.
4. Todos os DDL usados são transacionais (sem CREATE INDEX CONCURRENTLY, sem chamadas externas). Erro aborta; ROLLBACK restaura funções, triggers e índices. Validação com SET CONSTRAINTS ALL IMMEDIATE antes do commit. Timeout de lock 5s e statement 60s: falha deve abortar, não ignorar erro e continuar.
5. Executar testes autorizados no HML em transações com rollback, RLS e perfis reais; testar concorrência/idempotência e reconciliação de saldos; não deixar registros de teste.
6. Integrar o histórico completo à tela e executar validação funcional autenticada. Não declarar Tesouraria homologada antes disso.

**Decisão atual: M3 suspensa; SQL corrigido apresentado, sem nova aplicação ou solicitação de aprovação automática.**