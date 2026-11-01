# ITV FINANCEIRO — auditoria de segurança somente leitura

**Data:** 01/11/2026, 15h11–15h13 Manaus (19h11–19h13 UTC).
**Projeto autorizado:** `ayjppexbzpgdkzbehvzw` • **Esquema:** `financeiro_hml`.
**STATUS: BLOQUEADO PARA MIGRAÇÃO E PUBLICAÇÃO.** Nenhuma alteração, RPC financeira, sincronização, manutenção, restauração ou publicação executada. GESTÃO ITV não acessado.

## 1. Conclusão executiva

Inventário atual concluído: **31 funções (22 SECURITY DEFINER / 9 INVOKER), 13 tabelas com RLS, 7 com FORCE RLS, 23 políticas e 22 gatilhos de usuário habilitados**. Todas as funções e tabelas financeiras pertencem a `postgres`. Não há EXECUTE público nas RPCs financeiras; apenas `autoria_cadastro()` tem ACL nula com EXECUTE padrão para PUBLIC, mas retorna trigger e não é RPC diretamente utilizável.

Há riscos altos nos caminhos financeiros legados, na confiança dos itens de integração, no DML alternativo de conferências/service_role e na recuperação de autoridade. Não foi demonstrado ataque, comprometimento nem execução financeira anônima. A auditoria estática não substitui teste real autorizado de permissões.

O administrador informa que o dump de 01/11 foi restaurado e validado estruturalmente. Isso está registrado como evidência fornecida; **owners e ACLs omitidos por --no-owner --no-acl continuam exigindo recomposição e teste isolado**. Não se exige repetir a validação estrutural já informada, mas completar a prova de segurança.

## 2. Evidências e limites do método

Consultas realizadas pelo papel `supabase_read_only_user`, PostgreSQL 17.11, banco `postgres`, leitura padrão `on`. O vínculo da ferramenta é o projeto autorizado; o nome comum postgres sozinho não identifica o projeto. As consultas leem catálogos e contagens, nunca senhas, tokens, e-mails, identidades individuais ou registros financeiros completos.

| Consulta | Evidência obtida |
|---|---|
| Q1 19:11:59 UTC | Identidade, esquema, pg_roles e pg_auth_members |
| Q2 19:12:16 | 31 definições integrais via pg_get_functiondef, assinaturas, owner, proconfig, proacl, aclexplode/acldefault e has_function_privilege |
| Q3 19:12:18 | Schema, 13 tabelas, ACL por coluna, has_schema/table/column_privilege, 23 pg_policy e pg_default_acl |
| Q4 19:12:31 | Todos os papéis/opções de membership, EXECUTE efetivo para todos os papéis, sequência, 22 gatilhos e contagens |
| Q5 19:12:55 | auth.uid/role, FKs externas, tipos, extensões, ACL do banco e configurações de banco/papel sem segredos |
| Q6 19:13:13 | Seis operações tipo abertura; zero movimentos; zero sync em andamento; owners de tabelas/índices/sequência; leitura on |

O JSON anexo contém os resultados completos normalizados, ACL original e expandida, matrizes efetivas e definições. SHA-256 do JSON: `84601e148be87b86ea15c240510e03cbc2879f6cc3513f3406ca797f1825f5bb`. Hashes dos retornos originais constam de `origens`; comprovam integridade dos arquivos capturados, não uma assinatura externa nem o hash do dump.

Captura em snapshots sucessivos: não é inventário transacional simultâneo nem prova de ausência de concorrência durante toda a janela. Contagens atuais: 49 itens, 49 conferências, 19 sincronizações, 280 auditorias, seis aberturas, zero movimentos. Não alteramos históricos; igualdade de contagem isolada não certifica igualdade byte a byte com o backup.

## 3. Como interpretar concessões e privilégios efetivos

- **ACL armazenada:** concessão atualmente representada no catálogo; grantor e grant_option preservados. Não permite inferir a instrução histórica GRANT que a originou.
- **ACL nula de função:** aclexplode(acldefault) mostra EXECUTE para proprietário e PUBLIC por padrão interno. Sem entradas pg_default_acl globais ou financeiras nesta captura. Defaults do destino ainda precisam ser comparados.
- **Privilégio efetivo:** calculado por has_*_privilege; inclui PUBLIC, herança e atributos especiais. Direito efetivo não significa que RLS autoriza qualquer linha nem que o corpo da função aceita qualquer pedido.
- **PUBLIC não é papel login:** beneficia todos; é mostrado separadamente nas ACLs, não passado como nome a has_*_privilege.
- **Proprietário:** poderes de alterar/reconceder não dependem apenas da linha EXECUTE na ACL. `postgres` possui BYPASSRLS; `supabase_admin` é superusuário.
- `authenticated`, `anon` e `service_role` não herdam memberships; `postgres` herda papéis consumidores e administrativos. `authenticator` tem memberships com INHERIT=false / SET=true: não herda automaticamente os direitos dos consumidores, mas pode SET ROLE no serviço autorizado.
- `supabase_read_only_user` e `supabase_etl_admin` herdam pg_read_all_data: SELECT/USAGE efetivos sem GRANT por tabela. Ambos possuem BYPASSRLS. O primeiro está configurado como leitura; isto não é garantia universal contra toda função com efeitos e não foi usado para chamá-las.
- `pg_write_all_data` apresenta DML efetivo por atributo predefinido, mas não é concedido aos consumidores financeiros. Papéis de infraestrutura não devem ser recriados indiscriminadamente nem entregues a pessoas financeiras.

## 4. Funções — configuração completa e matriz de execução

Todas pertencem a **postgres**. `A`=authenticated; `N`=anon; `S`=service_role; `P`=PUBLIC na ACL expandida. T/F são EXECUTE efetivo, ainda condicionado a USAGE no esquema; N não tem USAGE. As matrizes para todos os demais papéis estão no JSON.

| Assinatura completa | Segurança | search_path configurado | ACL EXECUTE (beneficiário / origem) | A/N/S/P |
|---|---|---|---|---|
| `financeiro_hml.autoria()` | INVOKER | `search_path=financeiro_hml, pg_temp` | postgres [ACL] | F/F/F/F |
| `financeiro_hml.autoria_cadastro()` | INVOKER | `search_path=financeiro_hml, pg_temp` | PUBLIC [default]; postgres [default] | T/T/T/T |
| `financeiro_hml.diagnostico_finalizar(p_tentativa uuid, p_usuario uuid, p_http integer, p_duracao integer, p_categoria text, p_tipo text)` | DEFINER | `search_path=pg_catalog, financeiro_hml, pg_temp` | postgres [ACL]; service_role [ACL] | F/F/T/F |
| `financeiro_hml.diagnostico_reservar(p_autorizacao uuid, p_recurso text)` | DEFINER | `search_path=pg_catalog, financeiro_hml, pg_temp` | postgres [ACL]; authenticated [ACL] | T/F/F/F |
| `financeiro_hml.integracao_concluir(p jsonb)` | DEFINER | `search_path=pg_catalog, financeiro_hml, pg_temp` | postgres [ACL]; authenticated [ACL]; service_role [ACL] | T/F/T/F |
| `financeiro_hml.integracao_estado_manual()` | INVOKER | `search_path=pg_catalog, financeiro_hml, pg_temp` | postgres [ACL]; authenticated [ACL] | T/F/F/F |
| `financeiro_hml.integracao_expirar_travadas()` | DEFINER | `search_path=pg_catalog, financeiro_hml, pg_temp` | postgres [ACL] | F/F/F/F |
| `financeiro_hml.integracao_iniciar()` | DEFINER | `search_path=pg_catalog, financeiro_hml, pg_temp` | postgres [ACL]; authenticated [ACL] | T/F/F/F |
| `financeiro_hml.integracao_iniciar_automatica(p_inicio date, p_fim date)` | DEFINER | `search_path=pg_catalog, financeiro_hml, pg_temp` | postgres [ACL]; service_role [ACL] | F/F/T/F |
| `financeiro_hml.papel_atual()` | DEFINER | `search_path=financeiro_hml, pg_temp` | postgres [ACL]; authenticated [ACL] | T/F/F/F |
| `financeiro_hml.pc_hierarquia()` | DEFINER | `search_path=financeiro_hml, pg_temp` | postgres [ACL] | F/F/F/F |
| `financeiro_hml.perfis_protecao()` | DEFINER | `search_path=financeiro_hml, pg_temp` | postgres [ACL] | F/F/F/F |
| `financeiro_hml.registrar_auditoria()` | DEFINER | `search_path=financeiro_hml, pg_temp` | postgres [ACL] | F/F/F/F |
| `financeiro_hml.tem_papel(p text[])` | DEFINER | `search_path=financeiro_hml, pg_temp` | postgres [ACL]; authenticated [ACL] | T/F/F/F |
| `financeiro_hml.tes_conf_auditar()` | DEFINER | `search_path=pg_catalog, financeiro_hml, pg_temp` | postgres [ACL] | F/F/F/F |
| `financeiro_hml.tes_conf_proteger()` | INVOKER | `search_path=pg_catalog, financeiro_hml, pg_temp` | postgres [ACL] | F/F/F/F |
| `financeiro_hml.tes_conta_exige_abertura()` | DEFINER | `search_path=pg_catalog, financeiro_hml, pg_temp` | postgres [ACL] | F/F/F/F |
| `financeiro_hml.tes_executar(p jsonb)` | DEFINER | `search_path=pg_catalog, financeiro_hml, pg_temp` | postgres [ACL] | F/F/F/F |
| `financeiro_hml.tes_imutavel()` | INVOKER | `search_path=pg_catalog, financeiro_hml` | postgres [ACL] | F/F/F/F |
| `financeiro_hml.tes_proteger_conta()` | INVOKER | `search_path=pg_catalog, financeiro_hml` | postgres [ACL] | F/F/F/F |
| `financeiro_hml.tes_proteger_natureza()` | DEFINER | `search_path=pg_catalog, financeiro_hml` | postgres [ACL] | F/F/F/F |
| `financeiro_hml.tes_validar_efeitos()` | DEFINER | `search_path=pg_catalog, financeiro_hml, pg_temp` | postgres [ACL] | F/F/F/F |
| `financeiro_hml.tesouraria_criar_conta(p jsonb)` | DEFINER | `search_path=pg_catalog, financeiro_hml` | postgres [ACL]; authenticated [ACL] | T/F/F/F |
| `financeiro_hml.tesouraria_estornar(p jsonb)` | DEFINER | `search_path=pg_catalog, financeiro_hml` | postgres [ACL]; authenticated [ACL] | T/F/F/F |
| `financeiro_hml.tesouraria_extrato(p jsonb)` | INVOKER | `search_path=pg_catalog, financeiro_hml, pg_temp` | postgres [ACL]; authenticated [ACL] | T/F/F/F |
| `financeiro_hml.tesouraria_habilitar_conta(p jsonb)` | DEFINER | `search_path=pg_catalog, financeiro_hml, pg_temp` | postgres [ACL]; authenticated [ACL] | T/F/F/F |
| `financeiro_hml.tesouraria_historico_operacoes(p jsonb)` | INVOKER | `search_path=pg_catalog, financeiro_hml, pg_temp` | postgres [ACL]; authenticated [ACL] | T/F/F/F |
| `financeiro_hml.tesouraria_lancar(p jsonb)` | DEFINER | `search_path=pg_catalog, financeiro_hml` | postgres [ACL]; authenticated [ACL] | T/F/F/F |
| `financeiro_hml.tesouraria_lancar_conferencia(p jsonb)` | DEFINER | `search_path=pg_catalog, financeiro_hml, pg_temp` | postgres [ACL]; authenticated [ACL] | T/F/F/F |
| `financeiro_hml.tesouraria_saldos()` | INVOKER | `search_path=pg_catalog, financeiro_hml` | postgres [ACL]; authenticated [ACL] | T/F/F/F |
| `financeiro_hml.tesouraria_transferir(p jsonb)` | DEFINER | `search_path=pg_catalog, financeiro_hml` | postgres [ACL]; authenticated [ACL] | T/F/F/F |

**Outros papéis:** postgres e supabase_admin têm EXECUTE efetivo nas 31. Demais papéis sem concessão ou herança de EXECUTE possuem apenas o default PUBLIC de autoria_cadastro (USAGE pode faltar). A matriz `execucao_todos_papeis` permite conferir cada caso; não confundir SET ROLE potencial com herança automática.

### search_path

O motor e a integração usam `pg_catalog, financeiro_hml, pg_temp`; as funções antigas auxiliares usam `financeiro_hml, pg_temp`, com pg_catalog implicitamente antes. Os wrappers criar/lancar/transferir/estornar e algumas auxiliares não colocam pg_temp explicitamente ao final: para relações/tipos, temporários podem ter precedência implícita. **Não foi encontrado caminho explorável nestes wrappers**, que chamam o motor por nome qualificado. Consumidores não podem CREATE no esquema financeiro. Recomenda-se padronizar futuramente, após aprovação e teste, sem apresentar isso como ataque comprovado.

## 5. Esquema, tabelas e colunas

| Papel relevante | USAGE efetivo | CREATE efetivo | Origem |
|---|---|---|---|
| pg_read_all_data | True | False | papel predefinido/herança |
| pg_write_all_data | True | False | papel predefinido/herança |
| postgres | True | True | ACL direta |
| authenticated | True | False | ACL direta |
| anon | False | False | sem concessão efetiva |
| service_role | True | False | ACL direta |
| supabase_admin | True | True | superusuário |
| authenticator | False | False | sem concessão efetiva |
| supabase_read_only_user | True | False | papel predefinido/herança |
| supabase_etl_admin | True | False | papel predefinido/herança |

PUBLIC não tem USAGE/CREATE na ACL financeira. Proprietário do esquema: postgres.

### Tabelas (proprietário postgres em todas)

`S/I/U/D` = SELECT/INSERT/UPDATE/DELETE efetivos **de tabela inteira**. Colunas são listadas depois. anon e PUBLIC não possuem concessão nestas tabelas; anon tem todos esses direitos efetivos falsos. postgres/supabase_admin têm os quatro; read_only/etl possuem SELECT por pg_read_all_data, não por concessão direta.

| Tabela | authenticated S/I/U/D | service_role S/I/U/D | RLS | FORCE RLS |
|---|---|---|---|---|
| auditoria | T/F/F/F | T/T/T/T | True | True |
| centros_custo | T/T/T/F | F/F/F/F | True | True |
| contas_financeiras | T/F/F/F | F/F/F/F | True | True |
| contas_preparadas | T/F/F/F | T/T/T/T | True | False |
| diagnostico_autorizacoes | T/F/F/F | F/F/F/F | True | False |
| diagnostico_tentativas | T/F/F/F | F/F/F/F | True | False |
| integracao_itens | T/F/F/F | T/T/T/T | True | False |
| integracao_sincronizacoes | T/F/F/F | T/T/T/T | True | False |
| perfis | T/T/T/F | F/F/F/F | True | True |
| plano_contas | T/T/T/F | F/F/F/F | True | True |
| tesouraria_conferencias | T/F/F/F | T/T/T/T | True | False |
| tesouraria_movimentos | T/F/F/F | F/F/F/F | True | True |
| tesouraria_operacoes | T/F/F/F | F/F/F/F | True | True |

service_role tem ALL (inclui TRUNCATE, REFERENCES, TRIGGER, MAINTAIN além do DML) em auditoria, contas_preparadas, integracao_itens, integracao_sincronizacoes e tesouraria_conferencias; BYPASSRLS não ignora automaticamente gatilhos/constraints. TRUNCATE não aciona os gatilhos de DELETE por linha nem é protegido por RLS; por isso privilégio técnico amplo é risco de alto impacto, não autorização de uso. Nenhuma concessão analisada tem grant_option=true.

### Concessões por coluna

**contas_financeiras**

| Coluna | Beneficiário | Privilégios armazenados | Grantor | Grant option |
|---|---|---|---|---|
| nome | authenticated | UPDATE | postgres | False |
| ativo | authenticated | UPDATE | postgres | False |
| banco | authenticated | UPDATE | postgres | False |
| agencia | authenticated | UPDATE | postgres | False |
| numero_conta | authenticated | UPDATE | postgres | False |

**tesouraria_conferencias**

| Coluna | Beneficiário | Privilégios armazenados | Grantor | Grant option |
|---|---|---|---|---|
| referencia_origem | authenticated | INSERT | postgres | False |
| grupo_id | authenticated | INSERT | postgres | False |
| grupo_id | authenticated | UPDATE | postgres | False |
| valor_total_grupo | authenticated | INSERT | postgres | False |
| valor_total_grupo | authenticated | UPDATE | postgres | False |
| natureza | authenticated | INSERT | postgres | False |
| forma | authenticated | INSERT | postgres | False |
| forma | authenticated | UPDATE | postgres | False |
| data_ocorrencia | authenticated | INSERT | postgres | False |
| data_ocorrencia | authenticated | UPDATE | postgres | False |
| descricao | authenticated | INSERT | postgres | False |
| descricao | authenticated | UPDATE | postgres | False |
| valor_bruto | authenticated | INSERT | postgres | False |
| valor_bruto | authenticated | UPDATE | postgres | False |
| valor_liquido | authenticated | INSERT | postgres | False |
| valor_liquido | authenticated | UPDATE | postgres | False |
| data_liquidacao | authenticated | INSERT | postgres | False |
| data_liquidacao | authenticated | UPDATE | postgres | False |
| boleto_vencimento | authenticated | INSERT | postgres | False |
| boleto_vencimento | authenticated | UPDATE | postgres | False |
| boleto_pagamento | authenticated | INSERT | postgres | False |
| boleto_pagamento | authenticated | UPDATE | postgres | False |
| boleto_status | authenticated | INSERT | postgres | False |
| boleto_status | authenticated | UPDATE | postgres | False |
| conta_financeira_id | authenticated | INSERT | postgres | False |
| conta_financeira_id | authenticated | UPDATE | postgres | False |
| plano_conta_id | authenticated | INSERT | postgres | False |
| plano_conta_id | authenticated | UPDATE | postgres | False |
| centro_custo_id | authenticated | INSERT | postgres | False |
| centro_custo_id | authenticated | UPDATE | postgres | False |
| status | authenticated | INSERT | postgres | False |
| status | authenticated | UPDATE | postgres | False |
| observacao | authenticated | INSERT | postgres | False |
| observacao | authenticated | UPDATE | postgres | False |

Essas concessões são do estado legado, **não uma recomendação para reabri-las após migração**. has_column_privilege no JSON contempla também direitos de tabela inteira.

### Sequência e defaults

`auditoria_id_seq`: owner postgres, ACL nula; default de sequência atribui privilégios ao proprietário, não PUBLIC. Matriz de USAGE/SELECT/UPDATE está no JSON; pg_read_all_data e membros possuem leitura efetiva. Não foi capturado is_called nem a posição consistente da sequência; este manifesto é de segurança, não backup de dados ou sequência. A recuperação estrutural deve preservar identidade/OWNED BY/valor/is_called. Tipos compostos, extensões e configurações não sensíveis também constam do anexo.

## 6. RLS — todas as 23 políticas

Todas são PERMISSIVE e aplicadas a authenticated. As políticas de uma mesma operação permissiva combinam-se por OR; privilégio SQL continua necessário. NULL de WITH CHECK significa ausência de expressão explícita (em UPDATE a expressão USING é reutilizada quando aplicável), não liberação irrestrita. Não há política DELETE nestas 23. FORCE RLS não contém BYPASSRLS ou superusuário.

### 1. auditoria.auditoria_ler — SELECT
Papéis: authenticated • PERMISSIVE: True

**USING**
```sql
financeiro_hml.tem_papel(ARRAY['admin_geral'::text, 'admin_financeiro'::text])
```
**WITH CHECK**
```sql
-- NULL: expressão não definida
```

### 2. centros_custo.cc_alterar — UPDATE
Papéis: authenticated • PERMISSIVE: True

**USING**
```sql
financeiro_hml.tem_papel(ARRAY['admin_geral'::text, 'admin_financeiro'::text, 'analista_financeiro'::text])
```
**WITH CHECK**
```sql
financeiro_hml.tem_papel(ARRAY['admin_geral'::text, 'admin_financeiro'::text, 'analista_financeiro'::text])
```

### 3. centros_custo.cc_criar — INSERT
Papéis: authenticated • PERMISSIVE: True

**USING**
```sql
-- NULL: expressão não definida
```
**WITH CHECK**
```sql
financeiro_hml.tem_papel(ARRAY['admin_geral'::text, 'admin_financeiro'::text, 'analista_financeiro'::text])
```

### 4. centros_custo.cc_ler — SELECT
Papéis: authenticated • PERMISSIVE: True

**USING**
```sql
(financeiro_hml.papel_atual() IS NOT NULL)
```
**WITH CHECK**
```sql
-- NULL: expressão não definida
```

### 5. contas_financeiras.cf_alterar — UPDATE
Papéis: authenticated • PERMISSIVE: True

**USING**
```sql
financeiro_hml.tem_papel(ARRAY['admin_geral'::text, 'admin_financeiro'::text])
```
**WITH CHECK**
```sql
financeiro_hml.tem_papel(ARRAY['admin_geral'::text, 'admin_financeiro'::text])
```

### 6. contas_financeiras.cf_criar — INSERT
Papéis: authenticated • PERMISSIVE: True

**USING**
```sql
-- NULL: expressão não definida
```
**WITH CHECK**
```sql
financeiro_hml.tem_papel(ARRAY['admin_geral'::text, 'admin_financeiro'::text])
```

### 7. contas_financeiras.cf_ler — SELECT
Papéis: authenticated • PERMISSIVE: True

**USING**
```sql
(financeiro_hml.papel_atual() IS NOT NULL)
```
**WITH CHECK**
```sql
-- NULL: expressão não definida
```

### 8. contas_preparadas.contas_preparadas_ler — SELECT
Papéis: authenticated • PERMISSIVE: True

**USING**
```sql
financeiro_hml.tem_papel(ARRAY['admin_geral'::text, 'admin_financeiro'::text, 'analista_financeiro'::text, 'consulta_gerencial'::text])
```
**WITH CHECK**
```sql
-- NULL: expressão não definida
```

### 9. diagnostico_autorizacoes.diagnostico_autorizacoes_ler — SELECT
Papéis: authenticated • PERMISSIVE: True

**USING**
```sql
((administrador_id = auth.uid()) AND financeiro_hml.tem_papel(ARRAY['admin_geral'::text, 'admin_financeiro'::text]))
```
**WITH CHECK**
```sql
-- NULL: expressão não definida
```

### 10. diagnostico_tentativas.diagnostico_tentativas_ler — SELECT
Papéis: authenticated • PERMISSIVE: True

**USING**
```sql
((usuario_id = auth.uid()) AND financeiro_hml.tem_papel(ARRAY['admin_geral'::text, 'admin_financeiro'::text]))
```
**WITH CHECK**
```sql
-- NULL: expressão não definida
```

### 11. integracao_itens.int_itens_ler — SELECT
Papéis: authenticated • PERMISSIVE: True

**USING**
```sql
financeiro_hml.tem_papel(ARRAY['admin_geral'::text, 'admin_financeiro'::text, 'analista_financeiro'::text, 'consulta_gerencial'::text])
```
**WITH CHECK**
```sql
-- NULL: expressão não definida
```

### 12. integracao_sincronizacoes.int_sync_ler — SELECT
Papéis: authenticated • PERMISSIVE: True

**USING**
```sql
financeiro_hml.tem_papel(ARRAY['admin_geral'::text, 'admin_financeiro'::text, 'analista_financeiro'::text, 'consulta_gerencial'::text])
```
**WITH CHECK**
```sql
-- NULL: expressão não definida
```

### 13. perfis.perfis_alterar — UPDATE
Papéis: authenticated • PERMISSIVE: True

**USING**
```sql
(financeiro_hml.tem_papel(ARRAY['admin_geral'::text]) AND (usuario_id <> auth.uid()))
```
**WITH CHECK**
```sql
(financeiro_hml.tem_papel(ARRAY['admin_geral'::text]) AND (usuario_id <> auth.uid()))
```

### 14. perfis.perfis_criar — INSERT
Papéis: authenticated • PERMISSIVE: True

**USING**
```sql
-- NULL: expressão não definida
```
**WITH CHECK**
```sql
(financeiro_hml.tem_papel(ARRAY['admin_geral'::text]) AND (usuario_id <> auth.uid()))
```

### 15. perfis.perfis_ler — SELECT
Papéis: authenticated • PERMISSIVE: True

**USING**
```sql
((usuario_id = auth.uid()) OR financeiro_hml.tem_papel(ARRAY['admin_geral'::text]))
```
**WITH CHECK**
```sql
-- NULL: expressão não definida
```

### 16. plano_contas.pc_alterar — UPDATE
Papéis: authenticated • PERMISSIVE: True

**USING**
```sql
financeiro_hml.tem_papel(ARRAY['admin_geral'::text, 'admin_financeiro'::text])
```
**WITH CHECK**
```sql
financeiro_hml.tem_papel(ARRAY['admin_geral'::text, 'admin_financeiro'::text])
```

### 17. plano_contas.pc_criar — INSERT
Papéis: authenticated • PERMISSIVE: True

**USING**
```sql
-- NULL: expressão não definida
```
**WITH CHECK**
```sql
financeiro_hml.tem_papel(ARRAY['admin_geral'::text, 'admin_financeiro'::text])
```

### 18. plano_contas.pc_ler — SELECT
Papéis: authenticated • PERMISSIVE: True

**USING**
```sql
(financeiro_hml.papel_atual() IS NOT NULL)
```
**WITH CHECK**
```sql
-- NULL: expressão não definida
```

### 19. tesouraria_conferencias.conf_editar — UPDATE
Papéis: authenticated • PERMISSIVE: True

**USING**
```sql
financeiro_hml.tem_papel(ARRAY['admin_geral'::text, 'admin_financeiro'::text, 'analista_financeiro'::text])
```
**WITH CHECK**
```sql
financeiro_hml.tem_papel(ARRAY['admin_geral'::text, 'admin_financeiro'::text, 'analista_financeiro'::text])
```

### 20. tesouraria_conferencias.conf_inserir — INSERT
Papéis: authenticated • PERMISSIVE: True

**USING**
```sql
-- NULL: expressão não definida
```
**WITH CHECK**
```sql
financeiro_hml.tem_papel(ARRAY['admin_geral'::text, 'admin_financeiro'::text, 'analista_financeiro'::text])
```

### 21. tesouraria_conferencias.conf_ler — SELECT
Papéis: authenticated • PERMISSIVE: True

**USING**
```sql
financeiro_hml.tem_papel(ARRAY['admin_geral'::text, 'admin_financeiro'::text, 'analista_financeiro'::text, 'consulta_gerencial'::text])
```
**WITH CHECK**
```sql
-- NULL: expressão não definida
```

### 22. tesouraria_movimentos.tesouraria_movimentos_ler — SELECT
Papéis: authenticated • PERMISSIVE: True

**USING**
```sql
(financeiro_hml.papel_atual() IS NOT NULL)
```
**WITH CHECK**
```sql
-- NULL: expressão não definida
```

### 23. tesouraria_operacoes.tesouraria_operacoes_ler — SELECT
Papéis: authenticated • PERMISSIVE: True

**USING**
```sql
(financeiro_hml.papel_atual() IS NOT NULL)
```
**WITH CHECK**
```sql
-- NULL: expressão não definida
```

## 7. Riscos classificados e caminhos de execução

| ID | Criticidade | Constatação | Recomendação não aplicada |
|---|---|---|---|
| R1 | ALTA | Wrappers legados SECURITY DEFINER executam o motor proprietário sem aprovação por segundo usuário. Motor admite analista para entrada/saída/transferência; administradores para abertura/estorno. | Somente após autorização, instalar controles aprovados selados e testar chamadas diretas, não apenas interface. |
| R2 | ALTA | authenticated pode editar/inserir colunas de conferências sob RLS; analista pode tornar status conciliado e chamar tesouraria_lancar_conferencia sem revisor distinto no corpo atual. | Fechar DML legado e validar fluxo segregado aprovado em isolamento; não reabrir ACL antiga. |
| R3 | ALTA | integracao_concluir aceita payload do cliente, verifica perfil/modo mas não vincula conclusão ao iniciador nem comprova origem oficial dos itens. | Projetar verificação server-only/contrato de identidade e vínculo/idempotência, mediante autorização específica; não chamar integração para teste nesta etapa. |
| R4 | ALTA | service_role BYPASSRLS e ALL em cinco tabelas oferecem caminhos técnicos fora de RPC; owner/BYPASSRLS/superuser permanecem fora da contenção comum. | Reduzir privilégios ao mínimo necessário após revisão dos caminhos/serviço e conter produtores administrativos na manutenção. Não alterar papéis hospedados automaticamente. |
| R5 | ALTA / bloqueio de recuperação | Dump sem owners/ACL pode trocar autoridade DEFINER e recriar EXECUTE default PUBLIC; manifesto ainda não recomposto/testado em isolamento. | Usar este inventário para mapa de owners/ACLs/defaults/memberships, revisar destino e testar positivos/negativos antes de autorizar migração. |
| R6 | MÉDIA | search_path sem pg_temp final em alguns wrappers; nomes de chamada qualificados limitam risco observado. | Padronizar sob aprovação; não há exploração demonstrada. |
| R7 | MÉDIA / integridade | Motor não exige compatibilidade natureza da categoria x entrada/saída nem corte contábil geral de 01/11; valida conta/data de abertura e categoria ativa. | Validar requisitos e pacote aprovado isoladamente; não alterar datas ou históricos. |
| R8 | BAIXA | autoria_cadastro tem EXECUTE default PUBLIC com retorno trigger. anon tem EXECUTE mas não USAGE do esquema; não é RPC financeira chamável normalmente. | Registrar default e avaliar endurecimento futuro sem quebrar triggers; não classificar como acesso anônimo ao motor. |

### Tesouraria: alcance indireto do motor privado
```text
authenticated + USAGE + EXECUTE do wrapper
  -> tesouraria_lancar / transferir / estornar / criar_conta (DEFINER postgres)
  -> tes_executar (DEFINER postgres; ACL só postgres)
  -> auth.uid + tem_papel -> papel_atual -> perfis
  -> validações, locks, idempotência -> operações/movimentos/auditoria
```
O EXECUTE negado no motor impede acesso direto do consumidor, **não a chamada interna pelo wrapper privilegiado**. Cliente com acesso API pode dispensar a validação da tela; segurança precisa estar no banco. Criar conta força tipo abertura; transferir força transferência; estornar força estorno; lançar restringe entrada/saída. Não aceitam arbitrariamente todo tipo pelo wrapper.

Controles positivos: identidade e perfil ativos, valores/datas/contas válidos, categoria ativa, locks/idempotência, estorno único, gatilhos de efeitos/imutabilidade e abertura única por conta. tesouraria_habilitar_conta devolve operação anterior quando já habilitada. **As seis aberturas não foram duplicadas nem reconciliadas nesta auditoria.**

### Integração
```text
authenticated administrador -> integracao_iniciar -> sincronização manual em andamento
  -> integracao_concluir({id,status,itens}) DEFINER
service_role -> integracao_iniciar_automatica -> conclusão do modo automático
```
O corpo concluir rejeita perfis inválidos, exige modo manual/automático correspondente ao contexto e bloqueia repetição pelo status. Entretanto permite payload administrativo direto sem vínculo ao iniciador. Cron permanece desativado conforme diretriz; existência da ACL automática não comprova cron ativo nem endpoint inacessível. Não houve contato com GESTÃO ITV.

### Identidade de Auth e conexões diretas

auth.uid()/auth.role() leem request.jwt.claim.* / request.jwt.claims. Não verificam assinatura JWT sozinhas: a API/Auth valida o contexto. Conexões SQL com capacidade de manipular o contexto precisam de controle operacional; contexto simulado local não prova login hospedado. Não coletamos nem publicamos valores de claims reais.

## 8. Inventário para recomposição e ensaio isolado

O JSON cobre as configurações de segurança **atuais capturadas**: owners de schema/tabelas/funções/sequência; ACLs originais e expandidas com grantor/opções/defaults; coluna; matrizes efetivas para todos os papéis (colunas por quatro consumidores/proprietário); memberships com ADMIN/INHERIT/SET; definições completas das 31 funções, dependências Auth, 23 políticas, FORCE/RLS, gatilhos, tipos/extensões e configurações não secretas.

É complemento do dump estrutural restaurado, **não substituto de backup completo**. OIDs são evidência do banco atual, não identificadores portáveis de restauração: resolver objetos por schema/nome/assinatura. Todos os papéis e ACLs técnicos capturados não são uma ordem de recriação de infraestrutura Supabase.

### Ensaio proposto — não executado, depende de autorização

1. Usar o PostgreSQL isolado restaurado, sem API pública, cron, consumidores ou conexão a GESTÃO ITV; conservar cópia íntegra do estado antes de testar.
2. Revisar o mapeamento do proprietário postgres e papéis de aplicação; evitar superuser/BYPASSRLS concedidos a usuários financeiros. Não recriar indiscriminadamente papéis gerenciados.
3. Reconstituir proprietários e ACLs por assinatura/objeto/coluna, incluindo PUBLIC/defaults/grant options; aplicar o estado do ponto de recuperação, não misturar permissões pós-migração.
4. Comparar configuração efetiva e direta, RLS/FORCE/políticas/definições/gatilhos e dependências Auth contra este manifesto; reconciliar eventuais diferenças entre o snapshot do dump e esta captura.
5. Rodar testes concretos: anon sem USAGE/RPC; perfil inativo sem dados; consulta sem escrita; analista sem aprovação/estorno/abertura no desenho-alvo; segundo administrador distinto; motor privado inacessível diretamente; chamadas indiretas conforme contrato; grants por coluna; ausência de PUBLIC inesperado; tentativa de elevar o próprio perfil recusada; fluxo service_role limitado.
6. Dados sintéticos exclusivamente no isolamento; Auth simulado serve a regra SQL, não à validação hosted. Registrar resultados, hashes e divergências; depois validar API/Auth reais com usuários autorizados, sem enviar credenciais.
7. Somente com segurança recomposta/testada, responsáveis e contenção/drenagem comprovados, solicitar autorização expressa de manutenção/migração. Publicação requer autorização separada.

## 9. Limitações e bloqueios restantes

- Catálogos solicitados foram acessíveis; nenhuma recusa de privilégio impediu owners/ACLs/RLS/definições. Execução real financeira, SET ROLE ou alteração para testar foi deliberadamente não realizada.
- Não inspecionamos o dump local, nem executamos sua restauração/recomposição. Validação estrutural de 01/11 é informada pelo administrador; eficácia dos privilégios restaurados ainda não demonstrada.
- Não verificamos configurações hospedadas da API, sign-up, e-mail, segredos, agendas externas ou sessões reais nesta auditoria. Nenhum deles pode ser presumido a partir de catálogos.
- Snapshot de sincronização vazia não prova contenção contínua de HTTP/filas/administradores. Manutenção/drenagem e plano de reversão permanecem preparados, não ativados.
- Análise de corpos/ACLs identifica capacidades e lacunas; não é teste de exploração, nem prova universal contra todo SQL dinâmico, cliente ou dependência externa.
- Não alteramos SQL aprovado, aplicação, saldos, datas, categorias ou seis aberturas. Saldo real será tratado separadamente sob aprovação. Início contábil de 01/11/2026 mantido como requisito administrativo; não imposto por modificação nesta etapa.

**Resultado final:** configuração atual documentada e inventário independente entregue; segurança restaurada e uso real ainda pendentes de teste autorizado. Nenhuma correção aplicada. Aguardar autorização expressa, mantendo migração e publicação bloqueadas.
