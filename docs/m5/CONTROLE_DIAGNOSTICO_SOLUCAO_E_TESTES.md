# Controle limitado do diagnóstico M5 — preparação não aplicada

## Solução

Reutiliza autenticação administrativa `tem_papel`, schema HML e a função existente `tes_conf_auditar` que já audita a integração. Não reutiliza linhas de sincronização ou conferência como trava: isso criaria execuções falsas ou alteraria os domínios financeiros. Duas tabelas mínimas exclusivamente técnicas armazenam autorização e tentativas; não recebem dados retornados pela origem, tokens ou mensagens de exceção.

Uma autorização identificada e vinculada a um administrador possui cinco posições imutáveis, uma por recurso. Reserva é confirmada no banco antes do GET; contador, índice único por recurso/posição, índice global de reserva e trava transacional impedem duplicação e concorrência entre processos/usuários/autorizações. Falha também consome posição. Não há retentativa de GET nem de RPC.

Somente o servidor, depois de autenticação e reserva administrativa, pode finalizar por RPC com papel service_role. Administrador não pode atualizar tabelas, reiniciar orçamento ou liberar reserva pelo navegador. Service_role não recebe acesso direto às tabelas técnicas nem permissão de reservar. Finalização aceita apenas campos técnicos enumerados.

## Autorização e ativação

SQL integral em `M5_CONTROLE_DIAGNOSTICO_PROPOSTO.sql`, **não aplicado**. Não contém autorização criada ou flag ativada. A função não cria novas autorizações pelo navegador: cada rodada requer provisão técnica explícita aprovada, com identificador, administrador e prazo. A preparação mantém bloqueada a leitura sem flag e sem autorização válida. GET de versão continua sem efeitos, e GET de recurso passa a exigir `recurso` e `autorizacao` UUID. POST automático/manual não alterados.

Aplicação no HML exige aprovação expressa da migração antes da publicação. Migração aditiva: duas tabelas, três índices únicos, políticas de leitura administrativa, duas funções e triggers que usam auditoria existente. Sem alteração de tabelas financeiras, M5, perfis ou auditoria existente. Não é limite genérico de tráfego: é orçamento transacional específico de uma autorização de diagnóstico.

## Riscos e comportamento seguro

- Se o servidor cair ou perder resposta após reservar, a tentativa permanece consumida/reservada e bloqueia novos diagnósticos globalmente. Não expira automaticamente: evita que outra instância inicie leitura enquanto a anterior ainda possa estar ativa. Liberação técnica exige intervenção autorizada e comprovação de término; nunca repete o recurso.
- Se conclusão falhar, resposta informa `confirmacao_pendente`; registro de início existe, resultado final pode exigir reconciliação administrativa autorizada. Não afirmar auditoria final completa nessa situação.
- Reserva feita, mas GET não iniciado por queda, ainda consome posição conservadoramente. “Tentativa consumida” não comprova requisição entregue à origem.
- Usuários rejeitados antes da autorização continuam nos registros de acesso existentes, sem linhas técnicas financeiras. Tentativas administrativas bloqueadas para autorização própria são auditadas pelo trigger.
- Autorizações novas não são criadas automaticamente. A criação futura exige uma autorização distinta; não fornece forma de resetar/contornar a rodada pelo cliente.

## Testes

102/102 testes de aplicação aprovados, incluindo dez novos da orquestração: reserva antes de leitura; bloqueios de limite/repetição/concorrência/inatividade; administrador exigido; flag desabilitada; perda de resposta da reserva/conclusão; exceção segura contabilizada sem repetição. Transporte somente simulado.

22/22 verificações PostgreSQL aprovadas pelo script `testar_controle_diagnostico_local.py` em cluster local descartável, nunca HML: cinco recursos; sexta tentativa; falha/repetição; conexões independentes e concorrência durante transação; orçamento sem reset; finalização negada ao navegador; auditoria existente; sentinela financeira intacta. Inclui reinicialização física do banco e persistência da reserva/orçamento. A sentinela prova ausência de escrita no ensaio, não substitui futura verificação do HML após aplicação autorizada. Última regressão 102/102 às 14:39 UTC e verificação automática da aplicação OK às 14:38:58 UTC. Banco descartável encerrado após o ensaio.

## Arquivos afetados

- `src/lib/integracao-diagnostico-controle.server.ts`: orquestração da reserva/leitura/finalização.
- `src/routes/api/public/integracao/diagnostico.ts`: contrato de recurso com autorização UUID; autenticação existente preservada.
- `src/lib/integracao-diagnostico-controle.test.ts` e teste de acesso: cobertura de bloqueios, falhas e ausência de efeitos.
- SQL e testes locais/documentação em `docs/m5`; regra arquitetural em `AGENTS.md`.

## Estado

Preparado para revisão e aprovação da migração; não pronto para operação publicada antes de aplicar/testar o controle no HML com autorização explícita. Nenhuma leitura real, sincronização, escrita HML, publicação ou habilitação de cron executada nesta etapa. Versão publicada administrativa v2 permanece sem alteração.