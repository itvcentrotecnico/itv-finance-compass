# ITV FINANCEIRO — verificação complementar da Etapa 2

**01/11/2026 | Destino autorizado: ayjppexbzpgdkzbehvzw | Status: BLOQUEADO PARA IMPLANTAÇÃO.**

## 1. Resultado objetivo

Concluídas a inspeção de permissões e dependências do banco atual e a revisão do procedimento de manutenção. **Não foi ativada manutenção, aplicado SQL de escrita, executada sincronização, alterado saldo ou publicada a aplicação. GESTÃO ITV não foi acessado.**

Os requisitos estão documentados; sua execução e comprovação de recuperação ainda não estão concluídas. Nova autorização expressa é obrigatória antes de manutenção, migração ou publicação. A reconciliação dos saldos reais saiu do escopo desta implantação e depende de aprovação específica.

| Requisito | Evidência | Situação |
|---|---|---|
| Proprietários e privilégios | Catálogos reais, ACLs de esquema/tabela/coluna/função/sequência, privilégios efetivos e memberships consultados | Documentado; recomposição em recuperação não ensaiada |
| Dependências externas | Auth, seis FKs, corpos de funções, políticas, defaults, extensões e fontes da aplicação examinados | Disponíveis no banco atual; disponibilidade no destino de recuperação ainda não comprovada |
| Controle de escritas | Scripts existentes revisados; fotografia de sessões, transações preparadas e sincronizações consultada | Procedimento definido; contenção e drenagem contínuas não ativadas nem comprovadas |
| Reversão | Artefato idêntico ao aprovado, sem remoção de histórico | Aplicável somente após instalação; depende da mesma manutenção/drenagem |

## 2. Evidências do banco atual

Consultas exclusivamente SELECT, executadas como `supabase_read_only_user`, em PostgreSQL **17.11**. O projeto é o HML vinculado; `current_database()='postgres'` é nome comum, não identifica sozinho um projeto Supabase.

- **13 tabelas com RLS**, 23 políticas, 31 funções e 22 gatilhos de usuário; nenhum desses gatilhos desativado.
- **49 itens, 49 conferências, 19 sincronizações, 280 auditorias, seis operações — todas de abertura — e zero movimentos**.
- Nenhuma sincronização em andamento; nenhuma transação preparada; nenhuma outra sessão com transação aberta retornada na fotografia consultada. Isso **não é certificado de drenagem**: não exclui requisições HTTP fora do banco nem novas chamadas após a consulta.
- Foram encontrados 12 vínculos não nulos às identidades de Auth nos seis relacionamentos externos; **zero vínculos órfãos**. Nenhuma identidade, e-mail ou credencial foi incluída neste relatório.
- A ausência de escrita nesta verificação e as contagens acima não substituem comparação integral pré/pós-migração.

### Identidade dos artefatos — SHA-256 conferido

| Artefato | SHA-256 |
|---|---|
| Migração final | `8c9f71fa845dfb1743bf7322c80e3b43b9901582447b9413164fa792baed60b6` |
| Reversão funcional | `79c2b49c4e4823f015b36f7f5dd2f1cff1b1eb8aa49ae3c8bb8a5a5eaa859aa0` |
| Manutenção preparada | `3c1624115a5fe7bd47ba660d1979bf45790e5f65069cf0c5577050f2519df933` |
| Backup de 01/11 — informado pelo administrador, não recalculado aqui | `3422ee9c50f505443f6900893a65662c2d62a7829cae2a6d84887aa6f0de66e3` |

Os scripts aprovados permaneceram inalterados. O pacote definitivo acrescenta **seis tabelas e 11 funções**, substituindo seis funções existentes: expectativa de **19 tabelas e 42 funções**, a confirmar por assinaturas e definições, não apenas por contagem. A documentação antiga de cinco tabelas/sete funções refere-se ao pacote anterior, não ao definitivo.

## 3. Proprietários e permissões necessárias

### Propriedade e poderes administrativos

O esquema `financeiro_hml`, suas tabelas, índices, sequência e suas 31 funções pertencem a **postgres**. `authenticated`, `anon` e `service_role` não têm login direto; `authenticated` e `anon` não têm BYPASSRLS nem memberships. `service_role` tem BYPASSRLS, mas continua precisando de privilégios SQL.

`postgres` tem BYPASSRLS, criação de papéis/bancos e memberships privilegiados; `supabase_admin` é superusuário. **REVOKE dos consumidores não contém essas identidades.** A manutenção exige exclusividade operacional do responsável sobre os acessos administrativos. Não transferir esses poderes a usuários financeiros.

O esquema concede USAGE a `authenticated` e `service_role`, sem CREATE; `anon` não possui USAGE. Não há entradas de privilégios padrão globais de postgres ou específicas de `financeiro_hml` na consulta realizada. Isso não dispensa conferir defaults do destino de recuperação.

### Tabelas — ACL atual

Todos os objetos abaixo pertencem a postgres. SELECT concedido não dispensa perfil e política RLS.

| Tabelas | authenticated | service_role |
|---|---|---|
| plano_contas, centros_custo, perfis | SELECT, INSERT, UPDATE | Sem concessão direta |
| contas_financeiras | SELECT e UPDATE em cinco colunas | Sem concessão direta |
| tesouraria_operacoes, tesouraria_movimentos | SELECT | Sem concessão direta |
| diagnostico_autorizacoes, diagnostico_tentativas | SELECT | Sem concessão direta |
| auditoria, contas_preparadas, integracao_itens, integracao_sincronizacoes, tesouraria_conferencias | SELECT; conferências também possuem concessões por coluna | ALL de tabela, incluindo MAINTAIN do PostgreSQL 17 |

Não há concessões diretas para anon/PUBLIC nessas tabelas. A sequência **auditoria_id_seq** pertence a postgres e tem ACL nula: utiliza os privilégios padrão de sequência do proprietário, sem concessão externa. A sequência deve ser recuperada com seu valor/identidade/dependência da coluna; não conceder acesso indiscriminado para fazer testes passarem.

**Colunas de contas:** UPDATE em `agencia`, `ativo`, `banco`, `nome`, `numero_conta`.

**Conferências:** INSERT e UPDATE em `boleto_pagamento`, `boleto_status`, `boleto_vencimento`, `centro_custo_id`, `conta_financeira_id`, `data_liquidacao`, `data_ocorrencia`, `descricao`, `forma`, `grupo_id`, `observacao`, `plano_conta_id`, `status`, `valor_bruto`, `valor_liquido`, `valor_total_grupo`; apenas INSERT em `natureza` e `referencia_origem`. São permissões **anteriores à Etapa 2**, não uma instrução de reabertura após a migração.

### RPCs — EXECUTE efetivo atual

Nenhuma das 19 funções não-trigger abaixo é executável por anon. PUBLIC não recebe EXECUTE nas respectivas ACLs.

| Beneficiário | Assinaturas |
|---|---|
| authenticated | `tem_papel(text[])`, `papel_atual()`, `integracao_estado_manual()`, `integracao_iniciar()`, `diagnostico_reservar(uuid,text)` |
| authenticated | `tesouraria_criar_conta(jsonb)`, `tesouraria_habilitar_conta(jsonb)`, `tesouraria_lancar(jsonb)`, `tesouraria_lancar_conferencia(jsonb)`, `tesouraria_transferir(jsonb)`, `tesouraria_estornar(jsonb)`, `tesouraria_extrato(jsonb)`, `tesouraria_historico_operacoes(jsonb)`, `tesouraria_saldos()` |
| authenticated e service_role | `integracao_concluir(jsonb)` |
| apenas service_role | `integracao_iniciar_automatica(date,date)`, `diagnostico_finalizar(uuid,uuid,integer,integer,text,text)` |
| apenas proprietário | `tes_executar(jsonb)`, `integracao_expirar_travadas()` |

As funções de estado manual, saldos, extrato e histórico são SECURITY INVOKER; as demais RPCs listadas são SECURITY DEFINER. Os 12 auxiliares de gatilho também pertencem a postgres. `autoria_cadastro()` tem ACL nula, portanto EXECUTE padrão de PUBLIC; por retornar trigger, não é um RPC financeiro diretamente utilizável, mas o default deve constar da comparação de recuperação.

**Após a instalação:** a migração final retira os acessos de escrita financeira, mantém auxiliares privados e deixa os novos comandos selados. A liberação é ato separado. Não reaplicar a matriz antiga sobre o estado migrado; especialmente não devolver DML direto às conferências nem acesso ao motor privado.

### Recuperação com --no-owner --no-acl

O dump não recompõe os proprietários e as concessões originais; o dono das funções SECURITY DEFINER após restore muda sua autoridade. Recuperação deve usar um **manifesto de segurança separado**, protegido e datado, com donos, ACLs inclusive colunas/sequência, opções de concessão, PUBLIC/defaults e memberships. O manifesto de manutenção é apenas parcial e não serve como esse backup de segurança.

Procedimento para ensaio autorizado: destino isolado sem consumidores/rede externa → papéis/dependências aprovados → restaurar como proprietário controlado equivalente → remover concessões padrão indevidas e recompor explicitamente ACLs do ponto de recuperação → comparar owners/ACLs/RLS/gatilhos/assinaturas/sequência → testar permissões positivas e negativas. **Não executar aqui, não criar usuários reais fictícios, não restaurar sobre HML, não recriar os poderes administrativos hospedados automaticamente.**

O anexo de consultas SELECT permite produzir o manifesto legível sem senhas, tokens ou conteúdo de usuários. A recomposição SQL só deve ser derivada e revisada para o destino específico, com aprovação, não via GRANT ALL genérico.

## 4. Dependências externas e cobertura

| Dependência | Prova atual | Exigência na migração/recuperação |
|---|---|---|
| auth.users | Existe; seis FKs externas e zero órfãos | Preservar identidades referenciadas; comprovar cobertura de Auth no dump/recuperação. Inventário apenas financeiro não cobre isso |
| auth.uid(), auth.role() | Existem, dono supabase_auth_admin, EXECUTE disponível aos papéis por PUBLIC | Mesmas funções e contexto de identidade validado pelo serviço Auth; função simulada local não comprova login real |
| PostgreSQL/pg_catalog | Versão 17.11, gen_random_uuid() presente, defaults e corpos revisados | PostgreSQL compatível, plpgsql e funções nativas de JSON/numeric/UUID/travas; sequence de auditoria preservada |
| Extensões instaladas | plpgsql 1.0, pgcrypto 1.3, uuid-ossp 1.1, pg_stat_statements 1.11, supabase_vault 0.3.1 | Inventariadas, mas instalação não prova dependência: não foram encontradas chamadas diretas a extensions/vault nas funções financeiras examinadas; gen_random_uuid é nativa no PG17 |
| API do Supabase | Aplicação seleciona financeiro_hml; catálogos não comprovam configuração hospedada | Conferir esquema exposto, troca de papel, cache/contratos, autenticação e acesso real por perfil; sem ampliar exposição |
| Aplicação/convites | Fontes usam validação de claims e Auth administrativo | Preservar domínio/URLs oficiais, configuração Auth, bloqueio de cadastro público, entrega de e-mail e segredos server-only; backup financeiro não recupera configurações hospedadas |
| M5 | Servidor possui caminhos de sincronização e diagnóstico; ACL de caminho automático ainda existe | Manter cron desativado e operação manual; não chamar origem para provar isolamento; existência de ACL automática não comprova agenda ativa |

As seis FKs externas são: `perfis.usuario_id`, `contas_financeiras.criado_por`, `plano_contas.criado_por/atualizado_por`, `centros_custo.criado_por/atualizado_por` → `auth.users.id`. Corpos de 15 funções e duas políticas usam `auth.uid()`/`auth.role()`. Foram revisados defaults e referências textuais; **pg_depend sozinho não captura todas as referências PL/pgSQL**. A consulta a funções de outros esquemas não encontrou referências textuais a financeiro_hml; não é prova universal contra SQL dinâmico ou clientes externos.

A migração final não remove Auth nem as extensões existentes, mas disponibilidade futura não pode ser prometida sem validação pós-instalação. Para recuperação em outro destino, existência atual não basta: falta evidência de restauração das dependências, usuários e permissões. O inventário informado de 179 entradas financeiras e 13 TABLE DATA comprova presença nominal, **não recuperação efetiva**, nem ACL/owners omitidos. Ensaio de 29/10 permanece aceito com limites; o dump de 01/11 ainda não foi restaurado integralmente em teste.

## 5. Procedimento técnico de manutenção — preparado, não ativado

**Barreira = contenção dos produtores + revogação de escrita dos consumidores + drenagem observável + exclusividade administrativa.** Interface escondida e locks NOWAIT isolados não bastam.

1. **Autorizar e identificar:** definir responsável técnico, janela, conexão física dedicada e destino pelo painel/projeto, não somente pelo nome postgres; conferir hash do pacote. Manter GESTÃO ITV inacessível ao procedimento.
2. **Conter produtores antes de novas chamadas:** usuários, endpoints de escrita, sincronização manual, diagnóstico, caminho de cron, filas/retries, clientes diretos e operadores com postgres/supabase_admin. Registrar confirmação de cada responsável; cron permanece desativado. O executor atual é somente leitura e não controla esses produtores.
3. **Pré-validar script existente:** proprietários, ACLs/grant options, papéis e memberships; assinaturas/hashes da allowlist; objetos externos capazes de escrever; sequência e defaults. O script rejeita concessões desconhecidas e valida donos de funções/tabelas, mas não audita schema/sequence/herança e não contém o dono. No estado observado não há grants externos de sequência ou memberships dos três consumidores; o acesso administrativo continua exigindo contenção. Divergência implica interrupção, não alteração silenciosa do pacote.
4. **Ativar barreira somente após autorização:** executar MANUTENCAO_PREPARADA em sessão dedicada; exportar manifesto protegido antes de COMMIT. Revogar DML de tabela/coluna e EXECUTE das funções mutadoras para PUBLIC/anon/authenticated/service_role. Não retirar SELECT/RLS, desabilitar gatilhos ou desconectar globalmente o banco. Conferir privilégios efetivos, não apenas as entradas diretas de ACL. Não executar RPC de integração para testar recusa: isso pode chegar à origem.
5. **Drenar:** REVOKE não encerra funções já iniciadas. Acompanhar continuamente `pg_stat_activity`, transações preparadas, locks/esperas e conexões administrativas; confirmar também ausência de HTTP em andamento, filas e retentativas que possam voltar a concluir uma sincronização. Aguardar conclusão normal dentro da janela definida; não cancelar sessões nem expirar sincronizações automaticamente. Timeout, falta de visibilidade ou estado pendente: parar. Uma consulta vazia isolada não prova drenagem.
6. **Capturar ponto final:** com produtores contidos e drenagem comprovada, obter baseline consistente de todas as tabelas/dados/ACLs/owners/sequence e comparação com o snapshot do backup. Se houve qualquer divergência financeira desde o backup, exigir nova captura completa consistente antes de avançar; não ordenar novo backup só porque este executor não recebeu o dump. Registrar RPO e tempo de recuperação medido.
7. **Aplicar somente o SQL final autorizado:** transação única, locks ACCESS EXCLUSIVE NOWAIT; conflito aborta sem espera/retry. Confirmar pelo executor oficial COMMIT/ROLLBACK e registro de migração; perda de resposta exige leitura do estado antes de qualquer repetição.
8. **Verificar ainda selado:** contagens/identificadores/dados das 13 tabelas anteriores, seis aberturas e zero movimentos; novos seis objetos de tabela/11 funções; owners/grants/RLS/gatilhos/dependências; consultas por perfil. Testes reais de escrita financeira ou sincronização ficam proibidos. Só consultas e testes negativos sem efeitos, previamente autorizados, no HML; cenários financeiros continuam isolados.
9. **Relatório antes de publicação:** manter gravações financeiras bloqueadas e interface antiga somente consulta. Não rodar LIBERACAO_DEFINITIVA nem retomada automática. Publicação e liberação dependem de decisão expressa posterior; preservar M5 manual, início contábil 01/11 e tratar saldos reais separadamente.

### Condições de reversão

- **Antes do COMMIT:** rollback da transação de migração; manutenção é transação separada e permanece sob controle. Confirmar catálogo e dados, sem repetir cegamente.
- **Depois do COMMIT:** REVERSAO_FUNCIONAL_DEFINITIVA exige tabelas auxiliares já instaladas, autorização específica, produtores novamente contidos e drenagem. Substitui quatro mutadores por recusas e revoga dez entradas financeiras; preserva consultas, todas as tabelas e histórico. **Não é restauração completa, não desfaz eventos, não contém M5 nem o dono sozinha.**
- **Retomada seletiva:** mesma sessão e manifesto; se sessão cair, recuperar manifesto protegido e revisar o estado. Nunca executar todo CSV como SQL. Não reabrir DML legado, motor privado ou comandos selados.
- **Recuperação por dump:** incidente separado, com autorização, análise de eventos posteriores e recomposição de ACL/owners/dependências; jamais sobrescrever automaticamente o HML. Reversão funcional não depende de ler o dump e não perde registros; não substitui a recuperação integral.

## 6. Riscos residuais e plano para autorização

1. **Recuperação de segurança pendente:** --no-owner/--no-acl exige manifesto complementar e ensaio de recomposição; o dump atual não teve restauração integral comprovada. Auth hospedado e configurações externas continuam fora da prova local simplificada.
2. **Manutenção ainda não comprovada operacionalmente:** responsável/executor dedicado e controle de produtores administrativos/HTTP precisam ser confirmados; esta auditoria não pode fornecê-los por uma consulta.
3. **Permissões reais por perfil:** catálogos permitem verificar ACL/RLS, mas não equivalem a uso autenticado pela API. O ambiente externo não oferece sessão gerenciada neste executor; validação real depende de usuários autorizados no navegador, sem envio de credenciais.
4. **Sem comparação integral histórica certificada nesta etapa:** foi criado baseline atual reproduzível de JSONB agregado por id: itens MD5 `70b3da40fb4fb2d34f0e297a5d5447df`, conferências MD5 `c74025f99a1384ec9666c8f7e4218ea9`. Não comparar esses valores com MD5s históricos sem recuperar o mesmo método de serialização. MD5 aqui é comparador técnico, não hash criptográfico do backup; não há evidência suficiente para afirmar alteração ou identidade integral com aqueles hashes antigos.
5. **Compatibilidade:** banco novo deve permanecer selado até aprovação da publicação compatível; não reabrir caminhos antigos para contornar a interface. Operação financeira não é liberada pela simples instalação.

**Plano de execução para próxima decisão:** completar prova local de recuperação do dump e manifesto de segurança/dependências → confirmar executor e contenção administrativa → autorizar janela/barreira/migração com critérios acima → instalação selada e verificações sem movimentos → entregar relatório pós-migração → aguardar autorização de publicação/liberação. Nenhum desses atos foi autorizado por este relatório.

**Conclusão:** permissões mapeadas e procedimento documentado; comprovação operacional de recuperação/manutenção ainda pendente. Implantação permanece bloqueada, seis aberturas preservadas, sem publicação ou contato com GESTÃO ITV.

### Referências do projeto

MANUTENCAO_PREPARADA.sql (22–66); RETOMADA_SELETIVA_PREPARADA.sql (10–18); ETAPA_2_MIGRACAO_DEFINITIVA.sql (1–419); REVERSAO_FUNCIONAL_DEFINITIVA.sql (1–14); CAPTURA_FUNCIONAL_DEFINITIVA.sql (CSV de quatro funções, não backup); fontes de Auth/clientes em src/integrations/supabase e src/lib/usuarios.functions.ts. Evidências nesta etapa: catálogos vivos por SELECT e auditoria estática independente; suítes já aprovadas de 206 testes app/129 banco não foram repetidas, pois os scripts não foram alterados.