# Livro financeiro único V2.2 — procedimento proposto

**Preparado, não aplicado. Não executar nesta etapa.** Exclusivo ITV FINANCEIRO HML ayjppexbzpgdkzbehvzw, esquema financeiro_hml. GESTÃO ITV totalmente isolado.

## Escopo e diferença para V2.1
- Mesmas 13 tabelas e 31 funções. Nenhuma nova aba/tabela/integração bancária.
- Nova linha em contas_financeiras com tipo interno (não banco/caixa), sem dados bancários; nova abertura técnica zero em 01/11/2026, sem movimentos. Resultado após instalação: sete contas/sete aberturas, das quais seis anteriores integralmente preservadas.
- Instalação gera exatamente dois eventos de auditoria: cadastro pelo gatilho existente e abertura pelo motor SQL. Sem dados operacionais automáticos.
- Motor aceita apenas entrada/saída, resolve o vínculo fixado, rejeita origem/destino enviados inclusive null/UUID correto. Somente duas identidades aprovadas com perfil administrador ativo. Nenhum papel criado/alterado.
- As 14 categorias oficiais continuam fixadas por UUID e validadas com natureza/hierarquia. Categoria sintética/TESTE não lança.
- Histórico mantém RLS do chamador, projeta referência da requisição, UUID autor e nome atual apenas quando visível. Não expõe Auth nem usa identidade privilegiada para nomes.
- Resultado pode ser negativo. Valor de cada movimento permanece positivo, sinal é direção. Nenhuma trava de saldo suficiente é adicionada/removida.
- V2.1 original preservada por hashes. Esta instalação parte do catálogo original, NÃO é atualização de V2.1 instalada; se catálogo divergir, abortar e revisar, nunca contornar hashes.

## 1. Aprovação específica futura
A direção deve autorizar o SQL V2.2 revisado e identificado por SHA-256, cadastro técnico/abertura, janela e publicação coordenada em decisão específica futura. Esta autorização de preparação não permite isso.
Confirmar os dois usuários reais responsáveis, categorias UUID reais, um UUID novo do controle, UUID novo da abertura e chave única de abertura. Preencher MANIFESTO_PENDENTE.json fora de testes com identidades aprovadas; não usar os UUIDs sintéticos do ensaio.

## 2. Evidências antes da janela
1. Backup imediatamente anterior, arquivo Custom, SHA-256, catálogo e ensaio isolado íntegro. Supabase Free; não requer Pro. Dump --no-owner --no-acl exige recomposição separada de owners/ACL/grants e evidência de teste. Auth/configuração/Storage fora do ensaio sintético; não presumir cobertura.
2. Somente leitura previamente autorizada para comparar funções, owners, tabelas, colunas, constraints, RLS/FORCE, gatilhos e dependências com o catálogo arquivado. Tipo de contas_financeiras deve ser varchar/text sem regra impedindo interno; se enum/domínio/limite/check divergente, abortar. Não mascarar como caixa nem remover constraint.
3. Seis contas/seis aberturas/zero demais operações/zero movimentos; comparar hashes de TODAS as tabelas. Qualquer estado financeiro novo exige revisão, não apagar dados para passar.
4. Verificar sessão real de ambos e nomes/perfis; não cadastrar usuários ou mudar permissões nesta proposta.
5. Pedidos pendentes em todos navegadores: consultar chave original, nunca converter payload antigo para livro nem criar chave substituta para resultado incerto. Resolver previamente ou manter bloqueado.

## 3. Manutenção e drenagem
- Responsável técnico suspende manualmente todos produtores HTTP/RPC e escritores privilegiados, inclusive M5 durante a janela, agendadores já desativados e ferramentas administrativas. Nenhuma chamada à origem.
- Usar MANUTENCAO_PREPARADA_REUSO.sql apenas após autorização e inspeção de owners/ACL. É script psql, não migração; captura ACL em arquivo protegido antes do commit, revoga admissão de escrita e mantém consultas. Requer mesma conexão física/manifesto protegido. Não prova drenagem sozinho.
- Monitorar pg_stat_activity/transações/locks (VERIFICACOES_SOMENTE_LEITURA.sql), esperar término das transações anteriores e provar escritores owners/service_role suspensos. Não cancelar sessões automaticamente. Ausência pontual ou navegador fechado não prova drenagem.
- SQL de instalação obtém locks ACCESS EXCLUSIVE NOWAIT antes da pré-verificação; falha interrompe transação. Locks curtos bloqueiam consultas durante instalação, fora deles consultas preservadas. Não repetir automaticamente.

## 4. Execução futura em conexão dedicada
Não é comando para execução agora. Procedimento técnico após todos critérios:
- Confirmar destino por painel + conexão/catálogo; a variável de confirmação NÃO prova destino nem manutenção.
- Administrador técnico registra, na conexão dedicada, auth.uid da identidade aprovada que responde pela abertura; não é login de usuário público nem autorização por flag. Apenas owner pode instalar, evidência administrativa deve existir. Não desabilitar autoria/gatilhos.
- Carregar manifesto aprovado em itv.v22.manifesto e confirmação BACKUP_DRENAGEM_DESTINO_APROVADOS em itv.v22.validacao, somente depois das evidências.
- Executar integralmente ITV_LIVRO_UNICO_V2_2_PROPOSTA.sql com ON_ERROR_STOP, única transação READ COMMITTED. Não executar pedaços, criar controle separado ou reaplicar V2.1.
- Postchecks forçam constraints antes de commit e comparam todos registros antigos; aceitam apenas a conta, abertura e dois eventos de auditoria previstos.
- Capturar catálogo instalado, UUIDs reais, hash/horário/responsável/comprovante; não armazenar tokens em relatório.

## 5. Validação e publicação futura
- Repetir leituras: sete contas/sete aberturas, seis antigas idênticas, zero movimentos, categorias/integração/conferências intactas, auditoria anterior intacta +2.
- Confirmar privilégios efetivos positivos, DML de tabela/coluna fechado, intermediários fechados, leitura histórica disponível e M5 manual preservada. Lista positiva restringe escrita de cadastros/perfis: tela atual de usuários/cadastros pode ficar sem gravação, impacto herdado da V2.1, não restaure grants amplos.
- Publicar somente após autorização separada/coordenada e verificação de compatibilidade, mantendo produtores suspensos até conclusão. Não usar RETOMADA_SELETIVA antiga: ela reabre privilégios capturados e pode contrariar a lista positiva V2.2. Instalação já concede somente direitos permitidos; fim da janela é retomada operacional manual dos produtores autorizados, sem GRANT adicional.
- Testar login real dos dois responsáveis, sonda sem efeitos, consultas/filtros/detalhes e ausência de seleção bancária. Testes de receita/despesa só em ambiente isolado; primeiro registro real é do gestor após liberação expressa.
- Início oficial 01/11/2026. Receitas/despesas/resultado por período não são saldos bancários. Outras telas legadas permanecem consulta e não devem ser tomadas como patrimônio consolidado.

## 6. Contenção/reversão segura
- Antes do commit qualquer falha faz ROLLBACK integral, sem controle parcial; confirmar registros.
- Após commit: suspender produtores e drenar novamente, registrar itv.v22.reversao=CONTENCAO_DRENAGEM_APROVADAS só após prova e executar contenção integral autorizada. Sela mutadores, retira EXECUTE de gravação, preserva TODOS registros incluindo controle/abertura/novas operações. Não restaura motor vulnerável, não apaga história, não restaura dump sobre HML.
- Consultas históricas e SELECT sob RLS permanecem. Recuperação existente usa consultarEnvioTesouraria com criado_por+chave_idempotencia ANTES de qualquer RPC de escrita; por isso resposta perdida confirmada continua recuperável em contenção. O auditor inicial não havia lido esse adaptador; testes específicos comprovam caminho caller-owned.
- Pedido não localizado permanece incerto/pendente; NÃO liberar chave substituta, não reenviar durante contenção. Nova retomada exige revisão de catálogo instalado, SQL de liberação específico e nova aprovação, nunca repetir instalação (ela aborta em catálogo já instalado).

## Limites
Catálogos são evidência local arquivada, não inspeção hospedada atual. Manifesto real ainda pendente. Sem acesso autenticado hospedado neste executor externo, não há validação financeira real ponta a ponta. Ensaio PostgreSQL usa auth.uid simplificado e dados sintéticos, não comprova recuperação completa Supabase nem identidade real. Segurança de owners depende da contenção administrativa, pois proprietários controlam o banco.
