# ITV FINANCEIRO — Etapa 2: resultado da preparação final

**29/10/2026, verificação HML às 20h21 Manaus.**

## 1. Backup atual: limitação comprovada

Não foi identificado backup hospedado atual nem comprovada sua recuperação. Plano/retencão/PITR/custos continuam desconhecidos. O pacote de 23/10 não foi utilizado como backup válido desta implantação.

Conexão direta SUPABASE_DB_URL não está disponível. A tentativa de exportação automatizada pelo comando de diagnóstico de consulta retornou: **backend externo gerenciado pelo usuário; diagnóstico disponível apenas para ambientes gerenciados pela plataforma**. A integração de consulta disponível permitiu conferir o HML como supabase_read_only_user, mas não fornece arquivo de dump PostgreSQL/backup hospedado. Não inferir inexistência de backup a partir dessa limitação.

**Nenhuma exportação atual completa foi gerada.** Uma extração manual de alguns registros não seria backup completo/consistente; não foi apresentada como tal. Alternativa: responsável autorizado verificar Database → Backups no Supabase e fornecer evidência de data/status/método/isolamento/custo, sem restaurar. Exportação atual por catálogos via ferramenta de leitura é alternativa parcial possível, mas exige mecanismo protegido de persistência e reconstrução completa validada; não foi realizada nesta etapa.

## 2. Ambiente isolado e recuperação

Banco local já disponível, PostgreSQL 17.9 no socket `/tmp/m5-manual-socket`, porta 55441. Nenhum serviço pago foi criado. Todos os ensaios usaram bancos aleatórios locais eliminados ao final, sem credenciais, chamadas à origem, scheduler ou conexão HML. Os testes leem migrações/fixtures locais, não copiam autenticação real.

**Ensaio de restauração do backup atual: não executado**, pois o artefato atual completo está indisponível. Não confundir recriação de migrações locais com recuperação do HML. **Tempo real de recuperação: não mensurado.** Diferença PostgreSQL local 17.9 versus HML 17.11 permanece limite do ensaio.

## 3. Pacote executável preparado e testado

Scripts são propostas psql, não migrações aplicadas e não executáveis pelos botões da aplicação:

- `MANUTENCAO_PREPARADA.sql`: exige autorização explícita e nome do banco, captura grants efetivos incluindo colunas antes de revogá-los, bloqueia funções mutadoras e DML externo, preserva SELECT/RLS, rejeita proprietários/papéis/concessões inesperados, exporta manifesto CSV antes de COMMIT e registra início na sessão.
- `SELAR_CONTROLES_PREPARADO.sql`: após migração, mantém novos comandos e lançamento bloqueados durante a validação. Não elimina o intervalo entre COMMIT da migração e selagem: exige isolamento operacional/barreira contínua nesse intervalo, ou incorporação transacional expressamente aprovada depois. SQL Etapa 2 não foi alterado silenciosamente.
- `RETOMADA_SELETIVA_PREPARADA.sql`: mesma sessão e autorização distinta; repõe apenas grants temporários registrados. Não restaura INSERT/UPDATE da fonte para authenticated nem EXECUTE dos seis wrappers financeiros/novo comando. Registra término e impede retomada repetida.
- `REVERSAO_SELETIVA_PREPARADA.sql`: reutiliza somente a recuperação seletiva das ACLs temporárias; nunca apaga históricos, controles, vínculos ou contas. **Não é reversão funcional completa das definições SQL**. Essa exige captura real atual e migração corretiva separada aprovada.
- `testar_manutencao_local.py` e resultado JSON: ensaio reproduzível exclusivamente no socket local fixo, com remoção do banco descartável ao final.

Execução futura exige conexão psql física fixa, executor proprietário dos objetos e diretório protegido para manifesto. Os scripts usam meta-comandos psql; não colar no SQL Editor nem enviar como migração. Modelo de uso somente após nova autorização:

```text
1. Sessão fixa; umask 077; manifesto fora do projeto, protegido.
2. Definir banco_esperado e manifesto, confirmar produtor/admin suspenso.
3. Autorizar e executar MANUTENCAO_PREPARADA.sql; guardar CSV/checksum.
4. Drenar funções/transações/chamadas antigas; capturar baseline/backup final.
5. Aplicar migração oficial autorizada; validar e selar novos comandos.
6. Publicar versão compatível autorizada; verificar acesso/consultas.
7. Autorizar RETOMADA_SELETIVA_PREPARADA.sql e conferir grants finais.
```

**Limites operacionais importantes:** grants não contêm dono do banco, funções já em execução, serviços Auth Admin ou convites. `inviteUser` envia convite antes de inserir perfil; bloquear perfis não impede esse envio. Suspender convites/rotinas administrativas e conter produtores privilegiados é condição externa necessária. Perda da sessão exige recuperação assistida do manifesto e nova autorização; nunca executar todos seus grants às cegas.

## 4. Testes

**34/34 verificações de manutenção aprovadas** em banco descartável, incluindo autorização ausente recusada, escrita por coluna/tabela bloqueada, sync manual/automática/conclusão inacessíveis, SELECT/saldos/estado manual mantidos, RLS preservada, manifesto exportado, nova sessão sem manifesto recusada, retomada seletiva, integridade da auditoria e migração local → selagem → retomada sem reabrir mutações.

**47/47 regressões SQL dos controles anteriores novamente aprovadas**, em outro banco descartável; dados sintéticos e lançamento de teste apenas nesse banco, nunca no HML. Não repetimos os 201 testes da aplicação, pois nenhum código de aplicação mudou nesta etapa.

Dois defeitos detectados pelo ensaio foram corrigidos exclusivamente nos scripts locais: ambiguidade de variável de catálogo e captura de grants por coluna antes de REVOKE de tabela. Teste de auditoria passou a comparar com baseline real local, sem presumir auditoria inicialmente vazia.

Estes testes não certificam drenagem hospedada, Auth real, recuperação atual ou todos os casos de herança/ACL. Concessões inesperadas fazem o script interromper. Não houve alterações HML de permissão/função/estrutura.

## 5. Integridade HML

Consulta de 30/10 00h21min23s UTC (29/10 20h21 Manaus):

| Indicador | Confirmado |
|---|---:|
| Itens de integração | 49 |
| Conferências, todas pendentes | 49 |
| Sincronizações históricas | 19 |
| Auditorias existentes | 280 |
| Movimentos financeiros | 0 |
| Soma das aberturas em centavos | 0 |

Hashes idênticos ao baseline: itens `f64dc54b9b5b6821d2570a2b3c906782`; conferências `93c55a20c6c20dd66b2b97204f687434`. Três contas oficiais/saldos R$ 0,00 preservados conforme consultas da preparação, sem nenhuma escrita desta etapa. Não houve sincronização, aprovação, cadastro oficial ou publicação.

## 6. Impedimentos restantes e recomendação

**Não recomendar ativação da janela ainda.** O pacote resolve a preparação/teste da barreira seletiva, não o backup atual nem a contenção operacional real.

Faltam somente:

1. Evidência administrativa de backup atual, acesso à exportação protegida e ensaio isolado recuperável; cobertura/custo e tempo conhecidos ou limites aprovados.
2. Executor físico fixo e controle demonstrável de escritores/convites/serviços privilegiados e drenagem; aprovar isolamento contínuo entre migração e selagem.
3. Autorização posterior da janela e publicação coordenada, sem lançamentos reais.

**Próxima ação simples:** verificar a página Backups do Supabase HML, sem iniciar restauração, para decidir o método atual já disponível. Não criar serviços pagos nem pedir senhas/chaves por chat. Se não houver recurso gratuito isolado, apresentar a alternativa parcial e seus limites antes de execução adicional.

**Status: PACOTE DE MANUTENÇÃO/RETOMADA SELETIVA PREPARADO E TESTADO — IMPLANTAÇÃO SUSPENSA ATÉ BACKUP/RECUPERAÇÃO E CONTROLE OPERACIONAL COMPROVADOS.**