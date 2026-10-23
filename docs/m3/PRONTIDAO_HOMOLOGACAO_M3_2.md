# Tesouraria M3.2 — Prontidão para homologação

Data: 23/10/2026, após restauração das permissões pelo usuário. Análise por leitura; nenhuma operação financeira, cadastro ou alteração no banco.

## Resultado

Prontidão parcial: há caminhos implementados para as operações principais, mas não está pronta para homologação funcional completa. Consulta/navegação controlada pode iniciar; testes de escrita aguardam autorização, cadastros aptos e correções de histórico e recuperação de envios.

## Evidências

- Vínculo oficial e configurações frontend/servidor apontam para ayjppexbzpgdkzbehvzw. Dados financeiros usam financeiro_hml; nenhuma conexão com GESTÃO ITV identificada nos caminhos inspecionados.
- As sete RPCs tesouraria_criar_conta, tesouraria_lancar, tesouraria_transferir, tesouraria_estornar, tesouraria_extrato, tesouraria_saldos e tesouraria_historico_operacoes têm EXECUTE para authenticated, não para anon/service_role.
- As cinco permissões UPDATE por coluna da conta retornaram true para authenticated. Junto às quatro RPCs de escrita, confirma as nove permissões restauradas.
- RLS e FORCE RLS ativos nas sete tabelas. Leituras exigem perfil ativo; administração de contas e estornos restritos aos administradores; lançamentos/transferências admitem analista; Consulta Gerencial somente consulta. As funções privadas não admitem authenticated/anon.
- Autenticação do servidor valida token e usa cliente Supabase com a identidade do usuário. Frontend anexa token às chamadas; a barreira de dados continua no banco, não nos botões.
- Navegação real sem sessão para /tesouraria redirecionou a /auth, sem erro de página e sem formulário financeiro visível.
- Sessão gerenciada indisponível neste Supabase externo: acesso autenticado à interface e chamadas frontend → servidor → RPC ainda não verificados ponta a ponta. Não foram solicitadas credenciais nem contornada autenticação.
- Executor das consultas é supabase_read_only_user. Tentativa de chamar RPCs de consulta retornou permission denied for function tesouraria_saldos; não representa falha comprovada de authenticated e não se elevaram privilégios.
- 26 testes locais existentes passaram (Tesouraria, permissões, sessão e roteamento). Não substituem testes financeiros/RLS com sessão no HML.
- Estado: zero contas, operações e movimentos; um centro ativo, zero classificações ativas que aceitem lançamentos; somente um perfil ativo, Administrador Geral.

## Funcionalidades e lacunas

| Funcionalidade | Caminho existente | Limite |
|---|---|---|
| Contas e saldo inicial | Nova conta com banco/caixa, data e saldo positivo/negativo/zero; edição e ativação | Não exercitado com sessão nesta análise |
| Entradas/saídas | Formulário → registrarTesouraria → tesouraria_lancar | Nenhuma classificação apta no HML atual |
| Transferências | Origem/destino ativos, contas distintas → tesouraria_transferir | Não exercitado com escrita |
| Extratos | Filtros, saldos, paginação → tesouraria_extrato | Exibe efeitos, não todas as operações |
| Estornos | Detalhe de linha → tesouraria_estornar, data/justificativa | Abertura zero e estorno zero invisíveis na interface |
| Histórico completo | RPC instalada | Não há adaptador nem lista de operações no frontend |

### Ajustes necessários antes da homologação completa

1. Integrar tesouraria_historico_operacoes com contrato próprio: operações e efeitos não são LinhaExtrato. As abas Movimentações/Extrato consultam hoje a mesma RPC de efeitos; zero abertura/estorno não aparece e transferência aparece em duas linhas.
2. Diferenciar rejeição definitiva de resposta incerta. Após envio, campos ficam bloqueados inclusive quando o servidor rejeita; usuário não consegue corrigir sem fechar o formulário.
3. Preservar ou reconciliar envio pendente ao fechar/reabrir/recarregar. A chave atual só sobrevive ao formulário aberto; nova chave após perda de resposta pode duplicar uma operação já confirmada. Idempotência no banco protege a mesma chave, não conteúdo equivalente com chave diferente.
4. Preparar classificação apta e contas apenas em etapa autorizada; não houve cadastro nesta análise. Outros perfis são necessários para homologar a matriz integral.
5. Confirmar interface com sessão e chamadas reais de consulta, sem escritas, antes de declarar integração ponta a ponta.

Regra vigente a incluir nos testes: estorno exige conta, classificação e centro atualmente ativos; estorno de abertura não apaga conta nem autoriza nova abertura. Não há proibição geral de saldo negativo. Nenhuma mudança dessas regras proposta/realizada nesta etapa.

## Roteiro para etapa posterior autorizada

1. **Acesso:** testar sessão válida/expirada, perfil inativo e os quatro perfis; acesso direto à RPC também deve negar o que a interface esconde. Negar anon e funções privadas.
2. **Contas:** banco/caixa, abertura positiva/negativa/zero, metadados e inativação. Confirmar valor exato; impedir edição do saldo/data e criação direta fora da RPC. Falha não deixa conta parcial.
3. **Entradas/saídas:** conta/classificação ativas, centro opcional e centavos exatos. Negar valor zero/negativo, excesso de casas, classificação sem aceite/inativa, centro inativo e data anterior à abertura.
4. **Transferência:** duas contas, débito/crédito de mesmo valor, variação consolidada zero e nenhuma receita/despesa. Negar mesma conta, inativa ou classificação/centro enviados; erro deve deixar zero efeitos parciais.
5. **Extrato/histórico:** filtros, saldo anterior/final/subtotal, mais de 50 registros sem omissões/repetições. Histórico mostra abertura/estorno zero e transferência única; extrato mostra somente efeitos.
6. **Estornos:** entrada/saída/transferência e aberturas positiva/negativa/zero; preservar original, autor e justificativa. Negar motivo curto, data anterior, segundo estorno e estorno de estorno; confirmar política de cadastros inativos.
7. **Duplicação/recuperação:** duplo clique, duas requisições simultâneas com mesma chave, perda de resposta antes/depois do COMMIT e repetição com mesma chave/payload → mesmo ID e apenas uma operação. Mesma chave com conteúdo distinto → rejeição. Testar fechamento/reabertura/reload sem nova duplicação após corrigir o fluxo pendente.
8. **Concorrência/integridade:** transferências opostas, estornos simultâneos, inativação durante lançamento, deadlock/rollback e repetição segura; conferir saldos, efeitos, autoria e auditoria sem confirmação parcial.

Nenhum cenário financeiro acima foi executado no HML nesta análise. Testes locais de concorrência anteriores permanecem evidência histórica, não execução desta etapa.