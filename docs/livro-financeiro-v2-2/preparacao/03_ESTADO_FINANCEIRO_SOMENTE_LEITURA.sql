-- PREPARADO; NAO EXECUTADO. SOMENTE LEITURA, projeto ayjppexbzpgdkzbehvzw.
-- Conferir projeto no painel/conexao: current_database()=postgres NAO identifica projeto.
-- Executar arquivo completo apenas em etapa posteriormente autorizada; guardar resultado protegido.
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SELECT jsonb_build_object('capturado_em',clock_timestamp(),
 'contas',(SELECT count(*) FROM financeiro_hml.contas_financeiras),
 'aberturas',(SELECT count(*) FROM financeiro_hml.tesouraria_operacoes WHERE tipo='abertura'),
 'operacoes_totais',(SELECT count(*) FROM financeiro_hml.tesouraria_operacoes),
 'outras_operacoes',(SELECT count(*) FROM financeiro_hml.tesouraria_operacoes WHERE tipo<>'abertura'),
 'movimentos',(SELECT count(*) FROM financeiro_hml.tesouraria_movimentos),
 'auditorias',(SELECT count(*) FROM financeiro_hml.auditoria),
 'contas_detalhes',(SELECT coalesce(jsonb_agg(to_jsonb(c) ORDER BY c.id),'[]'::jsonb) FROM (SELECT id,nome,tipo,moeda,ativo,data_saldo_inicial,saldo_inicial_centavos,criado_por,criado_em FROM financeiro_hml.contas_financeiras) c),
 'operacoes_detalhes',(SELECT coalesce(jsonb_agg(to_jsonb(o) ORDER BY o.id),'[]'::jsonb) FROM (SELECT id,tipo,data_movimento,descricao,valor,conta_origem_id,conta_destino_id,plano_conta_id,chave_idempotencia,criado_por,criado_em FROM financeiro_hml.tesouraria_operacoes) o),
 'auditoria_resumo',(SELECT jsonb_agg(to_jsonb(a) ORDER BY a.tabela,a.acao) FROM (SELECT tabela,acao,count(*) quantidade FROM financeiro_hml.auditoria GROUP BY tabela,acao) a)) AS estado;
SELECT c.id,c.nome,count(o.id) aberturas,
 coalesce(bool_and(o.data_movimento=c.data_saldo_inicial AND o.valor=abs(c.saldo_inicial_centavos::numeric/100)),false) valor_data_coerentes
FROM financeiro_hml.contas_financeiras c LEFT JOIN financeiro_hml.tesouraria_operacoes o ON o.tipo='abertura' AND coalesce(o.conta_origem_id,o.conta_destino_id)=c.id
GROUP BY c.id,c.nome ORDER BY c.id;
-- Fingerprints integrais: auditoria sem exposicao de seu conteudo; uma linha por tabela.
SELECT 'perfis' tabela,count(*) linhas,md5(coalesce(jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text),'[]'::jsonb)::text) hash_md5 FROM financeiro_hml.perfis x
UNION ALL
SELECT 'plano_contas' tabela,count(*) linhas,md5(coalesce(jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text),'[]'::jsonb)::text) hash_md5 FROM financeiro_hml.plano_contas x
UNION ALL
SELECT 'centros_custo' tabela,count(*) linhas,md5(coalesce(jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text),'[]'::jsonb)::text) hash_md5 FROM financeiro_hml.centros_custo x
UNION ALL
SELECT 'contas_financeiras' tabela,count(*) linhas,md5(coalesce(jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text),'[]'::jsonb)::text) hash_md5 FROM financeiro_hml.contas_financeiras x
UNION ALL
SELECT 'contas_preparadas' tabela,count(*) linhas,md5(coalesce(jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text),'[]'::jsonb)::text) hash_md5 FROM financeiro_hml.contas_preparadas x
UNION ALL
SELECT 'tesouraria_conferencias' tabela,count(*) linhas,md5(coalesce(jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text),'[]'::jsonb)::text) hash_md5 FROM financeiro_hml.tesouraria_conferencias x
UNION ALL
SELECT 'tesouraria_operacoes' tabela,count(*) linhas,md5(coalesce(jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text),'[]'::jsonb)::text) hash_md5 FROM financeiro_hml.tesouraria_operacoes x
UNION ALL
SELECT 'tesouraria_movimentos' tabela,count(*) linhas,md5(coalesce(jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text),'[]'::jsonb)::text) hash_md5 FROM financeiro_hml.tesouraria_movimentos x
UNION ALL
SELECT 'auditoria' tabela,count(*) linhas,md5(coalesce(jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text),'[]'::jsonb)::text) hash_md5 FROM financeiro_hml.auditoria x
UNION ALL
SELECT 'integracao_itens' tabela,count(*) linhas,md5(coalesce(jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text),'[]'::jsonb)::text) hash_md5 FROM financeiro_hml.integracao_itens x
UNION ALL
SELECT 'integracao_sincronizacoes' tabela,count(*) linhas,md5(coalesce(jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text),'[]'::jsonb)::text) hash_md5 FROM financeiro_hml.integracao_sincronizacoes x
UNION ALL
SELECT 'diagnostico_autorizacoes' tabela,count(*) linhas,md5(coalesce(jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text),'[]'::jsonb)::text) hash_md5 FROM financeiro_hml.diagnostico_autorizacoes x
UNION ALL
SELECT 'diagnostico_tentativas' tabela,count(*) linhas,md5(coalesce(jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text),'[]'::jsonb)::text) hash_md5 FROM financeiro_hml.diagnostico_tentativas x;

ROLLBACK;
