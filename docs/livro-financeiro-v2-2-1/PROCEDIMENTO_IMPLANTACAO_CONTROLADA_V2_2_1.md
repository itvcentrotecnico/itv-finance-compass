# Procedimento controlado V2.2.1 — preparado, não executar nesta etapa

## Antes da autorização
1. Destino exclusivo: ayjppexbzpgdkzbehvzw, financeiro_hml. Não acessar GESTÃO ITV.
2. Aprovar a proposta revisada e seu SHA-256. A ampliação de `contas_financeiras_tipo_check` permite `interno`, preservando `banco` e `caixa`; não muda valores nem classificações existentes. É uma alteração de regra que exige aprovação explícita.
3. Aprovar manifesto: UUIDs dos 14 itens analíticos existentes, um admin_geral e um analista_financeiro ativos; reservar UUIDs novos para controle, operação técnica e chave. MANIFESTO_PENDENTE.json permanece vazio deliberadamente. Não criar os IDs no banco por consulta ou navegação.
4. Comprovar backup atual restaurável e recomposição de owners/ACLs. Não repetir testes locais concluídos sem mudança relevante.
5. Confirmar pelo analista o acesso à página de Lançamentos na versão que será usada; e-mail confirmado e last_sign_in_at não substituem verificação completa.
6. Agendar janela, identificar executor com privilégios e produtores de escrita (interfaces antigas, administradores, chamadas HTTP, jobs externos). Suspender produtores, registrar barreira de admissão comprometida e aguardar drenagem. Um snapshot sem atividade e NOWAIT isoladamente não comprovam essa suspensão.

## Execução futura, somente com autorização expressa
- Não executar instaladores V2.2/V2.1 ou Etapa 2: versões anteriores são referências históricas, não pré-requisitos para este instalador.
- Atualizar evidências de leitura no início da janela e guardar snapshot protegido das 13 tabelas, catálogo, grants e owners. Não fazer lançamentos de teste reais.
- Configurar na sessão dedicada `itv.v22.validacao=BACKUP_DRENAGEM_DESTINO_APROVADOS`, `request.jwt.claim.sub` do admin aprovado e manifesto revisado em `itv.v22.manifesto`. Esses marcadores são travas procedimentais, não prova de autenticação, destino ou backup. Executar como proprietário aprovado.
- Aplicar apenas ITV_LIVRO_UNICO_V2_2_1_PROPOSTA.sql pela ferramenta oficial de migração. Seu BEGIN/COMMIT, locks NOWAIT e exceções tornam a alteração transacional; qualquer divergência aborta. Após erro, encerrar/ROLLBACK a transação antes de outras ações; jamais ignorar checks, remover travas ou trocar hashes para forçar passagem.
- Esperado: 13 tabelas/31 funções; 7 contas e 7 operações (6 aberturas antigas + abertura técnica de R$ 0,00 em 01/11/2026), zero movimentos, 298 auditorias se baseline ainda for 296. A comparação integral das 13 tabelas exclui somente controle/abertura e dois eventos técnicos novos.
- Conferir pós-condições, ACLs/RLS, autoria, categorias, histórico/referência e hashes; leitura de sonda com sessão real dos dois usuários. Não registrar dinheiro real sem autorização operacional própria.
- Publicar apenas sob autorização posterior específica e compatibilidade coordenada. Enquanto a versão nova não estiver disponível, manter escritores antigos contidos. A interface não constitui barreira de segurança.

## Contingência
- Falha antes de COMMIT: ROLLBACK integral; nenhuma abertura parcial deve permanecer.
- Falha depois de COMMIT: conter admissão, drenar, registrar snapshot; somente após autorização configurar `itv.v22.reversao=CONTENCAO_DRENAGEM_APROVADAS` e aplicar ITV_CONTENCAO_LIVRO_V2_2_1_PROPOSTA.sql.
- Contenção preserva dados, leitura, histórico, referência e controle interno; fecha lançamentos inclusive no motor e cadastros. Não restaura funções vulneráveis, não apaga abertura, não reduz CHECK enquanto `interno` existe. Não é retorno à operação anterior.
- M5 mantém funções de início/conclusão manual e leitura; agendamento automático continua fechado. O ensaio local não comprova transporte externo nem corrige falha histórica de integração.

## Backup gratuito e limites
Em computador autorizado, usar PostgreSQL compatível (servidor observado 17.11), conexão direta/session pooler apropriada, TLS e senha em arquivo protegido/passfile. Nunca colocar credenciais em chat, scripts entregues, logs ou código.

```bash
# PG* e credenciais configurados localmente com proteção; nenhuma senha no comando.
pg_dump --format=custom --file=ITV_FINANCEIRO_PRE_V221.dump
pg_restore --list ITV_FINANCEIRO_PRE_V221.dump > ITV_FINANCEIRO_PRE_V221.catalogo.txt
sha256sum ITV_FINANCEIRO_PRE_V221.dump
```

Guardar archive, catálogo, SHA-256 e inventário de owners/ACLs/dependências fora do banco, com acesso restrito. Um dump integral lógico só cobre os objetos que a conexão consegue ler. Não prometer cobertura de schemas geridos sem conferir catálogo e relatório de erros. Inventariar configurações Auth/URLs/provedores, extensões, roles, grants e infraestrutura separadamente; secrets em cofre, não em SQL ou relatório. Objetos/imagens Storage, configuração do projeto e serviço Auth hospedado não são recuperados automaticamente por dump financeiro.

Para archive anterior `--no-owner --no-acl`, recomposição explícita de proprietários e privilégios é obrigatória, obtida do inventário e provada em destino isolado. Não transferir credenciais, criar superusuários irrestritos ou modificar schemas reservados hospedados para restaurar. Testar restauração em destino isolado sem rede/origem externa, conferindo as 13 contagens/hashes, funções, triggers, RLS, ACLs e dependências. `pg_restore --exit-on-error` deve terminar sem falhas. Restore com Auth simplificado não prova recuperação Supabase integral.

Este processo não exige plano Pro ou PITR, mas tem recuperação no último dump (perda potencial após snapshot) e depende de acesso concedido à conexão. Snapshot SQL/JSON não substitui archive. Backup sintético de testes não substitui backup real.
