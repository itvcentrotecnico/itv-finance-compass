BEGIN;
SET LOCAL lock_timeout = '5s';
LOCK TABLE financeiro_hml.plano_contas IN SHARE ROW EXCLUSIVE MODE NOWAIT;
DO $cadastro$
DECLARE
 itens jsonb := '[{"codigo":"1","descricao":"RECEITAS OPERACIONAIS","natureza":"receita","pai":null,"aceita":false},{"codigo":"1.01","descricao":"Conserto de televisores","natureza":"receita","pai":"1","aceita":true},{"codigo":"1.02","descricao":"Venda de televisores","natureza":"receita","pai":"1","aceita":true},{"codigo":"1.03","descricao":"Serviços técnicos especializados","natureza":"receita","pai":"1","aceita":true},{"codigo":"1.04","descricao":"Venda de acessórios","natureza":"receita","pai":"1","aceita":true},{"codigo":"1.05","descricao":"Reparo de telas COF","natureza":"receita","pai":"1","aceita":true},{"codigo":"1.06","descricao":"Outras receitas operacionais","natureza":"receita","pai":"1","aceita":true},{"codigo":"2","descricao":"DESPESAS OPERACIONAIS","natureza":"despesa","pai":null,"aceita":false},{"codigo":"2.01","descricao":"Compra de peças","natureza":"despesa","pai":"2","aceita":true},{"codigo":"2.02","descricao":"Folha de pagamento","natureza":"despesa","pai":"2","aceita":true},{"codigo":"2.03","descricao":"Comissões","natureza":"despesa","pai":"2","aceita":true},{"codigo":"2.04","descricao":"Aluguel e estrutura","natureza":"despesa","pai":"2","aceita":true},{"codigo":"2.05","descricao":"Transporte e logística","natureza":"despesa","pai":"2","aceita":true},{"codigo":"2.06","descricao":"Marketing","natureza":"despesa","pai":"2","aceita":true},{"codigo":"2.07","descricao":"Despesas administrativas","natureza":"despesa","pai":"2","aceita":true},{"codigo":"2.08","descricao":"Outras despesas operacionais","natureza":"despesa","pai":"2","aceita":true}]'::jsonb;
 item jsonb; existente record; pai_id uuid; tabela text; antes jsonb := '{}'::jsonb; dados jsonb; depois jsonb; plano_anterior jsonb; auditoria_anterior jsonb; criadas integer := 0; ja_existiam integer := 0;
BEGIN
 IF NOT has_schema_privilege(current_user,'financeiro_hml','USAGE') OR NOT has_table_privilege(current_user,'financeiro_hml.plano_contas','INSERT') THEN RAISE EXCEPTION 'CADASTRO_SEM_PERMISSAO'; END IF;
 IF (SELECT count(*) FROM financeiro_hml.tesouraria_operacoes WHERE tipo='abertura') <> 6 OR EXISTS(SELECT 1 FROM financeiro_hml.tesouraria_operacoes WHERE tipo<>'abertura') OR EXISTS(SELECT 1 FROM financeiro_hml.tesouraria_movimentos) THEN RAISE EXCEPTION 'ESTADO_FINANCEIRO_DIVERGENTE'; END IF;
 FOREACH tabela IN ARRAY ARRAY['contas_financeiras','tesouraria_operacoes','tesouraria_movimentos','tesouraria_conferencias','integracao_itens','integracao_sincronizacoes','contas_preparadas','centros_custo','perfis','diagnostico_autorizacoes','diagnostico_tentativas'] LOOP
  EXECUTE format('SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text),''[]''::jsonb) FROM financeiro_hml.%I t',tabela) INTO dados;
  antes := antes || jsonb_build_object(tabela,dados);
 END LOOP;
 SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY id),'[]'::jsonb) INTO plano_anterior FROM financeiro_hml.plano_contas t;
 SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY id),'[]'::jsonb) INTO auditoria_anterior FROM financeiro_hml.auditoria t;
 -- Valida todo o conjunto antes de inserir qualquer linha; nenhuma sobrescrita.
 FOR item IN SELECT value FROM jsonb_array_elements(itens) LOOP
  SELECT c.*,p.codigo AS codigo_pai INTO existente FROM financeiro_hml.plano_contas c LEFT JOIN financeiro_hml.plano_contas p ON p.id=c.conta_pai_id WHERE c.codigo=item->>'codigo';
  IF FOUND THEN
   IF existente.descricao IS DISTINCT FROM item->>'descricao' OR existente.natureza IS DISTINCT FROM item->>'natureza' OR existente.codigo_pai IS DISTINCT FROM item->>'pai' OR existente.aceita_lancamentos IS DISTINCT FROM (item->>'aceita')::boolean OR existente.ativo IS DISTINCT FROM true THEN RAISE EXCEPTION 'CONFLITO_CONTA: %',item->>'codigo'; END IF;
   ja_existiam := ja_existiam + 1;
  END IF;
  IF EXISTS(SELECT 1 FROM financeiro_hml.plano_contas WHERE lower(btrim(descricao))=lower(item->>'descricao') AND codigo<>item->>'codigo') THEN RAISE EXCEPTION 'CONFLITO_DESCRICAO: %',item->>'codigo'; END IF;
 END LOOP;
 FOR item IN SELECT value FROM jsonb_array_elements(itens) LOOP
  IF EXISTS(SELECT 1 FROM financeiro_hml.plano_contas WHERE codigo=item->>'codigo') THEN CONTINUE; END IF;
  pai_id := NULL;
  IF item->>'pai' IS NOT NULL THEN
   SELECT id INTO pai_id FROM financeiro_hml.plano_contas WHERE codigo=item->>'pai' AND natureza=item->>'natureza' AND ativo AND NOT aceita_lancamentos;
   IF pai_id IS NULL THEN RAISE EXCEPTION 'PAI_INVALIDO: %',item->>'codigo'; END IF;
  END IF;
  INSERT INTO financeiro_hml.plano_contas(codigo,descricao,natureza,conta_pai_id,aceita_lancamentos,ativo) VALUES(item->>'codigo',item->>'descricao',item->>'natureza',pai_id,(item->>'aceita')::boolean,true);
  criadas := criadas + 1;
 END LOOP;
 -- Asserções por conta: valores, natureza, atividade, aceite e pai aprovados.
 FOR item IN SELECT value FROM jsonb_array_elements(itens) LOOP
  IF NOT EXISTS(SELECT 1 FROM financeiro_hml.plano_contas c LEFT JOIN financeiro_hml.plano_contas p ON p.id=c.conta_pai_id WHERE c.codigo=item->>'codigo' AND c.descricao=item->>'descricao' AND c.natureza=item->>'natureza' AND c.ativo AND c.aceita_lancamentos=(item->>'aceita')::boolean AND p.codigo IS NOT DISTINCT FROM item->>'pai') THEN RAISE EXCEPTION 'VALIDACAO_FINAL_FALHOU: %',item->>'codigo'; END IF;
 END LOOP;
 IF criadas + ja_existiam <> 16 THEN RAISE EXCEPTION 'TOTAL_DIVERGENTE'; END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY id),'[]'::jsonb) INTO depois FROM financeiro_hml.plano_contas t WHERE id IN(SELECT (value->>'id')::uuid FROM jsonb_array_elements(plano_anterior));
 IF depois IS DISTINCT FROM plano_anterior THEN RAISE EXCEPTION 'PLANO_PREEXISTENTE_ALTERADO'; END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY id),'[]'::jsonb) INTO depois FROM financeiro_hml.auditoria t WHERE id IN(SELECT (value->>'id')::bigint FROM jsonb_array_elements(auditoria_anterior));
 IF depois IS DISTINCT FROM auditoria_anterior THEN RAISE EXCEPTION 'AUDITORIA_PREEXISTENTE_ALTERADA'; END IF;
 IF (SELECT count(*) FROM financeiro_hml.auditoria) <> jsonb_array_length(auditoria_anterior)+criadas THEN RAISE EXCEPTION 'AUDITORIA_TOTAL_DIVERGENTE'; END IF;
 FOREACH tabela IN ARRAY ARRAY['contas_financeiras','tesouraria_operacoes','tesouraria_movimentos','tesouraria_conferencias','integracao_itens','integracao_sincronizacoes','contas_preparadas','centros_custo','perfis','diagnostico_autorizacoes','diagnostico_tentativas'] LOOP
  EXECUTE format('SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text),''[]''::jsonb) FROM financeiro_hml.%I t',tabela) INTO dados;
  IF dados IS DISTINCT FROM antes->tabela THEN RAISE EXCEPTION 'PRESERVACAO_FALHOU: %',tabela; END IF;
 END LOOP;
 RAISE NOTICE 'Cadastro validado: % criadas, % ja existentes; nenhum movimento financeiro.',criadas,ja_existiam;
END $cadastro$;
COMMIT;