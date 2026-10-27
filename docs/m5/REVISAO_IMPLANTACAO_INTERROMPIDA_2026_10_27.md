# Revisão final M5 — implantação interrompida antes de aplicação

Autorização de 27/10/2026 14:45 UTC exige interromper ante qualquer divergência, sem correções extras não autorizadas.

## Conferências aprovadas

Destino SUPABASE_URL corresponde exclusivamente ao HML ayjppexbzpgdkzbehvzw. SELECT real confirma tem_papel e tes_conf_auditar compatíveis com a proposta. Duas tabelas técnicas ainda não existem no HML. SQL não contém operações financeiras, destruição ou acesso ao GESTÃO ITV; transação BEGIN/COMMIT abrange a criação. 102/102 testes da aplicação novamente aprovados às 14:46 UTC. As 22 verificações anteriores não cobriam valores nulos de conclusão.

## Divergência comprovada — auditoria incompleta aceita

No cluster descartável local, uma reserva válida foi finalizada como service_role passando NULL em status HTTP, duração, categoria e tipo de exceção. Resultado retornado: `{"registrada":true}`. Linha técnica passou a `estado=falha`, `categoria=NULL`, `duracao_ms=NULL`.

HTTP e tipo de exceção podem legitimamente ser nulos quando indisponíveis; categoria e duração são obrigatórias para o diagnóstico seguro completo. As colunas não têm NOT NULL, e CHECK com NULL não rejeita a linha. A função diagnostico_finalizar não valida esses campos antes de liberar a reserva. Assim, confirma registro final mesmo sem categoria/duração e abre caminho para outra tentativa sem evidência técnica final completa.

Esse defeito é reproduzido, não hipótese de rede/origem. Não afeta comprovação dos cinco recursos em testes normais, mas impede aprovar a revisão sob a condição de zero divergências.

## Solução objetiva proposta — não implementada

Exigir categoria de resultado e duração não nulas, validar categoria exclusiva de conclusão (sucesso/falha, não motivos de bloqueio), coerência entre sucesso e HTTP e valores fechados de exceção. Recusar antes de qualquer atualização; preservar reserva e contador diante de conclusão incompleta. Adicionar regressão SQL isolada de NULL/categorias de bloqueio e completar validação de orquestração. Após aprovação, revisar o SQL integral e repetir ensaio antes de aplicação.

## Estado das fases

Fase 1 interrompida. Migração não aplicada. Fases 2–4 não iniciadas: nenhuma publicação nem autorização real provisionada. Nenhum GET da origem, sincronização ou habilitação cron. Nenhuma correção do SQL/código feita durante esta revisão. Só registros documentais atualizados.

## Integridade HML consultada

16 registros, 16 conferências, zero movimentos, 12 sincronizações, total aberturas 0.00, zero operações diferentes de abertura ou com valor não zero. Saldos continuam R$ 0,00. Ensaio de divergência ocorreu exclusivamente em banco descartável, encerrado após teste. Nenhum efeito financeiro HML.

## Recuperação

Não há recuperação HML a executar: nada aplicado. SQL atual está envolto em transação, mas não aprovar aplicação antes de corrigir a validação. A versão pública administrativa v2 permanece; publicação nova não solicitada. Não declarar implantação concluída.