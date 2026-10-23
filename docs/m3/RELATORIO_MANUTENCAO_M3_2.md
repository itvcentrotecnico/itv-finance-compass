# ITV FINANCEIRO HML — execução controlada M3.2: manutenção

23/10/2026, nova inspeção iniciada às 18:11 UTC.

## Resultado

**M3.2 não aplicada. Nenhuma migração foi enviada.** Destino, pacote íntegro, identidade do SQL e tabelas vazias foram reconfirmados. Permanece sem comprovação a barreira que impeça novas execuções das RPCs antigas antes e durante a aplicação e permita drenar as chamadas já iniciadas. Não houve alteração do SQL aprovado, banco, permissões ou aplicação. Nenhum acesso ao GESTÃO ITV ou outro projeto.

## Verificações atuais

- Projeto conectado: **ayjppexbzpgdkzbehvzw**; integração externa, URL correspondente. O rótulo `production` do slot Lovable não muda o identificador HML autorizado nem significa acesso a outro banco.
- Recuperação parcial em Files: ZIP de 25.482 bytes, CRC válido e oito SHA-256 internos válidos. SHA-256 do ZIP: `7ceac05cf2e9505c4a33a6c487db93659e464a01dbb87ec72a232623ea7f080a`.
- Evidência anterior de restauração contida no pacote: 102 verificações aprovadas e zero falhas em PostgreSQL 17.9 isolado; não foi repetida nesta etapa. Auth/configurações hospedadas permanecem fora da cobertura aceita pelo usuário.
- SQL do projeto idêntico byte a byte ao final entregue: SHA-256 `66c47b7d9292c45f1580f32f1b59937047ba36b294f0eac9d914f188a1817401`.
- Contas financeiras: **0**; operações: **0**; movimentos: **0**.
- Plano de Contas: **1**; Centros de Custo: **1**; Perfis: **1**; Auditoria: **7**.
- RLS habilitado e obrigatório nas três tabelas afetadas; definições de políticas, triggers, funções e permissões inspecionadas por leitura.
- Amostra de sessões: quatro conexões cliente ociosas; processo pg_cron sem estado e pg_net ocioso. Não é prova de ausência de chamadas em trânsito ou execuções futuras.

## Caminhos de escrita identificados

| Caminho | Efeito e controle atual |
|---|---|
| `registrarTesouraria` na aplicação | Função autenticada escolhe uma das quatro RPCs abaixo; não grava diretamente o ledger. |
| `tesouraria_criar_conta(jsonb)` | Chama `tes_executar` com abertura; cria conta, operação de abertura e eventual efeito monetário. |
| `tesouraria_lancar(jsonb)` | Chama `tes_executar` para entrada/saída; cria operação e efeito. |
| `tesouraria_transferir(jsonb)` | Chama `tes_executar` para transferência; cria operação e dois efeitos. |
| `tesouraria_estornar(jsonb)` | Chama `tes_executar` para estorno; cria operação e efeitos inversos. |
| RPC direta via Supabase | As mesmas quatro RPCs são executáveis por `authenticated`, inclusive fora da interface; negadas a `anon`, com validação de perfil nas funções. |
| `tes_executar(jsonb)` | Função interna SECURITY DEFINER, negada diretamente a `anon`/`authenticated`; realiza INSERTs nas três tabelas e em auditoria. |
| Edição direta de conta na aplicação ou API | `authenticated` possui UPDATE por coluna em `nome`, `ativo`, `banco`, `agencia`, `numero_conta`, condicionado às políticas para administradores. Não tem INSERT/DELETE nas três tabelas, nem UPDATE no ledger. |
| Executor administrativo `postgres` | Possui escrita direta nas três tabelas e bypass de RLS. A manutenção também precisa abranger scripts/conexões administrativas. |
| `service_role` | Tem bypass de RLS, mas não possui privilégios diretos de INSERT/UPDATE/DELETE nessas três tabelas na inspeção; bypass não substitui GRANT. Não presumir escrita direta apenas pelo nome da role. |

Triggers reais nas tabelas afetadas:

- `contas_financeiras`: `autoria` → `autoria()`; `tes_proteger_conta` → proteção de campos imutáveis/autoria de atualização; `tes_auditoria_conta` → `registrar_auditoria()`, que grava auditoria.
- `tesouraria_operacoes`: `tes_op_imutavel` rejeita UPDATE/DELETE; `tes_op_efeitos` executa validação diferida das operações.
- `tesouraria_movimentos`: `tes_mov_imutavel` rejeita UPDATE/DELETE; `tes_mov_efeitos` executa validação diferida dos efeitos.
- `plano_contas`: `tes_proteger_natureza` consulta operações para impedir alteração da natureza já utilizada; não cria movimentos.
- O trigger de abertura única `tes_conta_abertura` é objeto novo previsto na M3.2, não controle já instalado.

Os triggers não são endpoints independentes: executam dentro da transação que os dispara. Constraints FK encontradas usam RESTRICT nas relações financeiras, sem cascatas de escrita identificadas entre elas. A consulta aos corpos de funções acessíveis não encontrou funções de outro schema com referências textuais explícitas às três tabelas ou a `tes_executar`; essa busca não certifica ausência de SQL dinâmico, clientes externos ou jobs não inspecionados.

## O que os bloqueios aprovados garantem

O SQL final contém, antes de qualquer leitura das tabelas financeiras:

```sql
BEGIN;
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
LOCK TABLE financeiro_hml.contas_financeiras,
 financeiro_hml.tesouraria_operacoes,
 financeiro_hml.tesouraria_movimentos IN ACCESS EXCLUSIVE MODE NOWAIT;
```

Quando adquiridos, esses bloqueios impedem acessos incompatíveis às três tabelas até COMMIT/ROLLBACK. Uma transação anterior que já tenha lock conflitante faz NOWAIT falhar imediatamente: não se aguarda nem se executa a pré-verificação. Isso é correto e foi testado localmente; não foi tentado no HML nesta etapa porque a pré-condição anterior de manutenção não foi atendida.

**Não comprovam o término de toda chamada antiga.** O corpo instalado de `tes_executar` verifica identidade/perfil, prepara dados e adquire um advisory lock antes da primeira consulta a `tesouraria_operacoes`. Uma execução pode já ter iniciado esse corpo, ainda sem lock conflitante nas três tabelas. Ela pode depois aguardar um lock da migração e retomar após COMMIT usando a execução antiga. CREATE OR REPLACE e REVOKE não cancelam uma invocação já em andamento.

Portanto, ausência de lock conflitante na aquisição e ausência de sessões ativas numa consulta anterior não são equivalentes a uma barreira contínua de admissão/drenagem. Fechar navegador, esconder botões ou pausar só a interface também não resolve chamadas diretas às RPCs.

## Janela de manutenção preparada — não ativada

Procedimento necessário, condicionado a um controle operacional disponível e verificável:

1. Barrar admissão de novas chamadas de escrita em todos os caminhos: aplicação, RPC direta, scripts administrativos e filas/repetições. Não desabilitar RLS.
2. Com a barreira ativa, aguardar encerramento de pedidos já admitidos e de transações afetadas, inclusive idle-in-transaction e chamadas esperando advisory locks. Não cancelar sessões automaticamente.
3. Conferir novamente projeto, recuperação, SQL, definições/permissões e registros M1/M2.
4. Executar somente o SQL final integral pelo mecanismo oficial, com os três bloqueios antes da verificação de ausência de dados, numa única transação. Conflito ou dados inesperados: rollback e interrupção, sem retry automático.
5. Depois de COMMIT, comparar os sete objetos autorizados, ACLs, políticas/RLS, triggers e registros existentes. Só então encerrar manutenção e iniciar homologação aprovada, sem cadastrar dados reais.

**Impedimento preciso:** não existe controle de admissão/manutenção verificado nos acessos disponíveis que abranja as quatro RPCs e conexões administrativas; não é possível comprovar a drenagem sem essa barreira. Os recursos de banco oferecem leitura e envio da migração, não uma sessão administrativa persistente de manutenção. Não há PGHOST gerenciado para acesso exec; não foi tentada conexão alternativa. Acrescentar bloqueios/verificações ao arquivo final, mudar privilégios temporariamente ou criar controle novo seria uma alteração adicional ao SQL exclusivo aprovado, e não foi feita silenciosamente.

## Preservação e recuperação

Não houve escrita: M1/M2, cadastros e controles não foram modificados por esta etapa. As contagens observadas não substituem comparação integral de registros pós-migração; ela não se aplica porque não houve migração. Não foram criados dados financeiros de teste ou reais.

Não há rollback a executar agora. Em aplicação futura, falhas na transação revertem integralmente o DDL. Se validação falhar após COMMIT, manter manutenção e investigar; reversão/restauração exige autorização, sem exclusão de dados.

**Decisão final: M3.2 não aplicada por falta de manutenção/drenagem comprovadas antes dos bloqueios transacionais aprovados.**