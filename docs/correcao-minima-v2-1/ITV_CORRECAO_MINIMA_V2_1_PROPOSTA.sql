-- PROPOSTA V2.1 NAO APLICADA. Exclusivo ayjppexbzpgdkzbehvzw/financeiro_hml.
-- Requer manifesto UUID aprovado e backup/manutencao/drenagem verificados; nao executar agora.
BEGIN ISOLATION LEVEL READ COMMITTED;
SET LOCAL lock_timeout='5s';
LOCK TABLE financeiro_hml.perfis,financeiro_hml.plano_contas,financeiro_hml.centros_custo,financeiro_hml.contas_financeiras,financeiro_hml.contas_preparadas,financeiro_hml.tesouraria_conferencias,financeiro_hml.tesouraria_operacoes,financeiro_hml.tesouraria_movimentos,financeiro_hml.auditoria,financeiro_hml.integracao_itens,financeiro_hml.integracao_sincronizacoes,financeiro_hml.diagnostico_autorizacoes,financeiro_hml.diagnostico_tentativas IN ACCESS EXCLUSIVE MODE NOWAIT;
DO $pre$
DECLARE f record; expected jsonb := '{"financeiro_hml.autoria()": {"md5": "167f40fd1f0506f0de0a566c3be38da2", "owner": "postgres"}, "financeiro_hml.autoria_cadastro()": {"md5": "4e4f9210bb82bdfb92c104de9cfc71dd", "owner": "postgres"}, "financeiro_hml.diagnostico_finalizar(uuid,uuid,integer,integer,text,text)": {"md5": "4ebe2f56016907cfa4d5633ea8a3f544", "owner": "postgres"}, "financeiro_hml.diagnostico_reservar(uuid,text)": {"md5": "01b85221e475f18a663f10a39ee9e8c2", "owner": "postgres"}, "financeiro_hml.integracao_concluir(jsonb)": {"md5": "d2fcbb76dd8521b4e8742879a33f4216", "owner": "postgres"}, "financeiro_hml.integracao_estado_manual()": {"md5": "12b05c826dd7d702c135f533c5bfb538", "owner": "postgres"}, "financeiro_hml.integracao_expirar_travadas()": {"md5": "7f71d7e5947aa5797d3a1b7a5dee33af", "owner": "postgres"}, "financeiro_hml.integracao_iniciar()": {"md5": "2c08d74468969909eb539130a785c56c", "owner": "postgres"}, "financeiro_hml.integracao_iniciar_automatica(date,date)": {"md5": "0eb46bd9a67f2e0cb14da0fbc8c0b302", "owner": "postgres"}, "financeiro_hml.papel_atual()": {"md5": "ff6e26e80bea9e4e9a8ec60d183915d9", "owner": "postgres"}, "financeiro_hml.pc_hierarquia()": {"md5": "b997693a30edf98768ee9a66d7907ec6", "owner": "postgres"}, "financeiro_hml.perfis_protecao()": {"md5": "61d5750e5d25ba1740159026d9e5a72e", "owner": "postgres"}, "financeiro_hml.registrar_auditoria()": {"md5": "ef434542af5a5735d531640e4a7cbc8c", "owner": "postgres"}, "financeiro_hml.tem_papel(text[])": {"md5": "9652b9d1810b1d2273cdfed0d7a0ea07", "owner": "postgres"}, "financeiro_hml.tes_conf_auditar()": {"md5": "c6a017d70d412451ca0bfc408ec52eed", "owner": "postgres"}, "financeiro_hml.tes_conf_proteger()": {"md5": "05cbdfeaa8957c81393f00fcd16739bb", "owner": "postgres"}, "financeiro_hml.tes_conta_exige_abertura()": {"md5": "f30e26b8e87ebf0a63ac04cf27c9df4e", "owner": "postgres"}, "financeiro_hml.tes_executar(jsonb)": {"md5": "028954f4e03ac8a5402dde2d32f62410", "owner": "postgres"}, "financeiro_hml.tes_imutavel()": {"md5": "3781de7d81ac4d248871565c7700a2fb", "owner": "postgres"}, "financeiro_hml.tes_proteger_conta()": {"md5": "833cba25cdae146f782bb07560574e2b", "owner": "postgres"}, "financeiro_hml.tes_proteger_natureza()": {"md5": "019a3664b770494ff71647be079f2bb5", "owner": "postgres"}, "financeiro_hml.tes_validar_efeitos()": {"md5": "5fc456018ec1207ba0f85b2c4d869305", "owner": "postgres"}, "financeiro_hml.tesouraria_criar_conta(jsonb)": {"md5": "026000de0ad4630239652e25641b5fb5", "owner": "postgres"}, "financeiro_hml.tesouraria_estornar(jsonb)": {"md5": "3d0a9a341dd02642718db613031f63e1", "owner": "postgres"}, "financeiro_hml.tesouraria_extrato(jsonb)": {"md5": "df18ba14c55612a5791499dd459dab5d", "owner": "postgres"}, "financeiro_hml.tesouraria_habilitar_conta(jsonb)": {"md5": "02c3db2711eb0aece17fa4c0d2d88792", "owner": "postgres"}, "financeiro_hml.tesouraria_historico_operacoes(jsonb)": {"md5": "c4be449256a6a03fedc3262f4d0d6b45", "owner": "postgres"}, "financeiro_hml.tesouraria_lancar(jsonb)": {"md5": "12893e4cf1ec633acc2cb9051f6290f3", "owner": "postgres"}, "financeiro_hml.tesouraria_lancar_conferencia(jsonb)": {"md5": "1cce3f157da433610b6983ba7cd1b2b0", "owner": "postgres"}, "financeiro_hml.tesouraria_saldos()": {"md5": "6b5905c5d0f7ffbdc6aa3ad49d353501", "owner": "postgres"}, "financeiro_hml.tesouraria_transferir(jsonb)": {"md5": "d337c33d1e2296addc801835aabd94fc", "owner": "postgres"}}'::jsonb;
BEGIN
 IF current_setting('itv.v21.validacao',true) IS DISTINCT FROM 'BACKUP_DRENAGEM_DESTINO_APROVADOS' THEN RAISE EXCEPTION 'V21_NAO_AUTORIZADA'; END IF;
 IF (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='financeiro_hml')<>(SELECT count(*) FROM jsonb_object_keys(expected)) THEN RAISE EXCEPTION 'V21_SOBRECARGA_DIVERGENTE'; END IF;
 FOR f IN SELECT key,value FROM jsonb_each(expected) LOOP
  IF to_regprocedure(f.key) IS NULL THEN RAISE EXCEPTION 'V21_FUNCAO_AUSENTE: %',f.key; END IF;
  IF md5(pg_get_functiondef(to_regprocedure(f.key)))<>f.value->>'md5' OR (SELECT pg_get_userbyid(proowner) FROM pg_proc WHERE oid=to_regprocedure(f.key))<>f.value->>'owner' THEN RAISE EXCEPTION 'V21_CATALOGO_DIVERGENTE: %',f.key; END IF;
 END LOOP;
 IF (SELECT count(*) FROM financeiro_hml.tesouraria_operacoes WHERE tipo='abertura')<>6 OR EXISTS(SELECT 1 FROM financeiro_hml.tesouraria_operacoes WHERE tipo<>'abertura') OR EXISTS(SELECT 1 FROM financeiro_hml.tesouraria_movimentos) THEN RAISE EXCEPTION 'V21_ESTADO_FINANCEIRO_DIVERGENTE'; END IF;
END $pre$;
DO $baseline$
DECLARE t record; dados jsonb; b jsonb:='{}';
BEGIN
 FOR t IN SELECT c.oid,c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='financeiro_hml' AND c.relkind='r' LOOP
  EXECUTE format('SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text),'[]'::jsonb) FROM financeiro_hml.%I x',t.relname) INTO dados;
  b:=b||jsonb_build_object(t.relname,dados);
 END LOOP;
 PERFORM set_config('itv.v21.baseline',b::text,true);
END $baseline$;
DO $instalar$
DECLARE m jsonb:=nullif(current_setting('itv.v21.manifesto',true),'')::jsonb; it jsonb; r record; ids uuid[]; contas uuid[]; body text;
BEGIN
 IF m IS NULL OR jsonb_typeof(m->'contas')<>'array' OR jsonb_typeof(m->'categorias')<>'array' OR jsonb_array_length(m->'contas')<>3 OR jsonb_array_length(m->'categorias')<>14 THEN RAISE EXCEPTION 'V21_MANIFESTO_OFICIAL_AUSENTE'; END IF;
 SELECT array_agg(value::uuid ORDER BY value) INTO contas FROM jsonb_array_elements_text(m->'contas');
 SELECT array_agg(value::uuid ORDER BY value) INTO ids FROM jsonb_array_elements_text(m->'categorias');
 IF (SELECT count(DISTINCT x) FROM unnest(contas) x)<>3 OR (SELECT count(DISTINCT x) FROM unnest(ids) x)<>14 THEN RAISE EXCEPTION 'V21_IDS_DUPLICADOS'; END IF;
 FOR it IN SELECT value FROM jsonb_array_elements('[{"codigo": "1", "descricao": "RECEITAS OPERACIONAIS", "natureza": "receita", "pai": null, "aceita": false}, {"codigo": "1.01", "descricao": "Conserto de televisores", "natureza": "receita", "pai": "1", "aceita": true}, {"codigo": "1.02", "descricao": "Venda de televisores", "natureza": "receita", "pai": "1", "aceita": true}, {"codigo": "1.03", "descricao": "Serviços técnicos especializados", "natureza": "receita", "pai": "1", "aceita": true}, {"codigo": "1.04", "descricao": "Venda de acessórios", "natureza": "receita", "pai": "1", "aceita": true}, {"codigo": "1.05", "descricao": "Reparo de telas COF", "natureza": "receita", "pai": "1", "aceita": true}, {"codigo": "1.06", "descricao": "Outras receitas operacionais", "natureza": "receita", "pai": "1", "aceita": true}, {"codigo": "2", "descricao": "DESPESAS OPERACIONAIS", "natureza": "despesa", "pai": null, "aceita": false}, {"codigo": "2.01", "descricao": "Compra de peças", "natureza": "despesa", "pai": "2", "aceita": true}, {"codigo": "2.02", "descricao": "Folha de pagamento", "natureza": "despesa", "pai": "2", "aceita": true}, {"codigo": "2.03", "descricao": "Comissões", "natureza": "despesa", "pai": "2", "aceita": true}, {"codigo": "2.04", "descricao": "Aluguel e estrutura", "natureza": "despesa", "pai": "2", "aceita": true}, {"codigo": "2.05", "descricao": "Transporte e logística", "natureza": "despesa", "pai": "2", "aceita": true}, {"codigo": "2.06", "descricao": "Marketing", "natureza": "despesa", "pai": "2", "aceita": true}, {"codigo": "2.07", "descricao": "Despesas administrativas", "natureza": "despesa", "pai": "2", "aceita": true}, {"codigo": "2.08", "descricao": "Outras despesas operacionais", "natureza": "despesa", "pai": "2", "aceita": true}]'::jsonb) LOOP

  SELECT c.*,p.codigo pai INTO r FROM financeiro_hml.plano_contas c LEFT JOIN financeiro_hml.plano_contas p ON p.id=c.conta_pai_id WHERE c.codigo=it->>'codigo';
  IF NOT FOUND OR r.descricao IS DISTINCT FROM it->>'descricao' OR r.natureza IS DISTINCT FROM it->>'natureza' OR r.pai IS DISTINCT FROM it->>'pai' OR r.aceita_lancamentos IS DISTINCT FROM (it->>'aceita')::boolean OR NOT r.ativo OR (r.aceita_lancamentos AND NOT r.id=ANY(ids)) THEN RAISE EXCEPTION 'V21_CATEGORIA_DIVERGENTE: %',it->>'codigo'; END IF;
 END LOOP;
 IF (SELECT count(*) FROM financeiro_hml.contas_financeiras c WHERE c.id=ANY(contas) AND c.ativo AND c.moeda='BRL' AND c.nome=ANY(ARRAY['SICREDI — CONTA PRINCIPAL','MERCADO PAGO — RECEBIMENTOS','CAIXA FÍSICO ITV']) AND EXISTS(SELECT 1 FROM financeiro_hml.contas_preparadas p WHERE p.conta_financeira_id=c.id AND p.nome=c.nome AND p.status='habilitada'))<>3 OR (SELECT count(DISTINCT nome) FROM financeiro_hml.contas_financeiras WHERE id=ANY(contas))<>3 THEN RAISE EXCEPTION 'V21_CONTAS_DIVERGENTES'; END IF;
 -- Embed literal approved UUIDs; no runtime/session setting can replace them.
 body := $motor$CREATE OR REPLACE FUNCTION financeiro_hml.tes_executar(p jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,financeiro_hml,pg_temp AS $fn$
 DECLARE uid uuid:=auth.uid(); perfil record; chave uuid; tipo text; valor numeric(18,2); origem uuid; destino uuid; pc uuid; cc uuid; dt date; descricao text; ref text; oid uuid:=gen_random_uuid(); req jsonb; anterior financeiro_hml.tesouraria_operacoes; categoria record; conta record; m jsonb:=__MANIFESTO__::jsonb;
 BEGIN
  SELECT papel,ativo INTO perfil FROM financeiro_hml.perfis WHERE usuario_id=uid FOR SHARE;
  IF uid IS NULL OR NOT FOUND OR NOT perfil.ativo OR perfil.papel NOT IN ('admin_geral','admin_financeiro') THEN RAISE EXCEPTION 'TES_PERMISSAO' USING ERRCODE='42501'; END IF;
  IF p IS NULL OR jsonb_typeof(p)<>'object' THEN RAISE EXCEPTION 'TES_DADOS'; END IF;
  tipo:=p->>'tipo';
  IF tipo IS NULL OR tipo NOT IN ('entrada','saida') THEN RAISE EXCEPTION 'TES_OPERACAO_BLOQUEADA' USING ERRCODE='42501'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_object_keys(p) k WHERE k NOT IN ('tipo','chave','data','descricao','valor','origem','destino','plano','centro','referencia')) THEN RAISE EXCEPTION 'TES_DADOS'; END IF;
  chave:=nullif(p->>'chave','')::uuid; IF chave IS NULL THEN RAISE EXCEPTION 'TES_DADOS'; END IF;
  IF coalesce(p->>'data','')!~'^\d{4}-\d{2}-\d{2}$' THEN RAISE EXCEPTION 'TES_DATA'; END IF; dt:=(p->>'data')::date;
  IF coalesce(p->>'valor','')!~'^\d{1,16}(\.\d{1,2})?$' THEN RAISE EXCEPTION 'TES_VALOR'; END IF;
  valor:=(p->>'valor')::numeric(18,2); IF valor<=0 THEN RAISE EXCEPTION 'TES_VALOR'; END IF;
  descricao:=btrim(coalesce(p->>'descricao','')); IF length(descricao) NOT BETWEEN 2 AND 500 THEN RAISE EXCEPTION 'TES_DESCRICAO'; END IF;
  ref:=lower(btrim(coalesce(p->>'referencia','')));
  IF length(ref)>200 OR ref !~'^externo:[a-z0-9][a-z0-9._:/-]+$' THEN RAISE EXCEPTION 'TES_REFERENCIA'; END IF;
  origem:=nullif(p->>'origem','')::uuid; destino:=nullif(p->>'destino','')::uuid; pc:=nullif(p->>'plano','')::uuid; cc:=nullif(p->>'centro','')::uuid;
  IF (tipo='entrada' AND (destino IS NULL OR origem IS NOT NULL)) OR (tipo='saida' AND (origem IS NULL OR destino IS NOT NULL)) THEN RAISE EXCEPTION 'TES_CONTA_DADOS'; END IF;
  req:=jsonb_strip_nulls(jsonb_build_object('versao','2.1','tipo',tipo,'data',dt::text,'descricao',descricao,'valor',valor::text,'origem',origem::text,'destino',destino::text,'plano',pc::text,'centro',cc::text,'referencia',ref));
  PERFORM pg_advisory_xact_lock(hashtextextended(uid::text||chave::text,0));
  SELECT * INTO anterior FROM financeiro_hml.tesouraria_operacoes WHERE criado_por=uid AND chave_idempotencia=chave;
  IF FOUND THEN
   IF anterior.requisicao IS DISTINCT FROM req THEN RAISE EXCEPTION 'TES_IDEMPOTENCIA'; END IF;
   RETURN jsonb_build_object('id',anterior.id,'conta_id',coalesce(anterior.conta_destino_id,anterior.conta_origem_id),'repetida',true);
  END IF;
  IF NOT (m->'categorias') ? coalesce(pc::text,'') THEN RAISE EXCEPTION 'TES_CATEGORIA_OFICIAL'; END IF;
  SELECT * INTO categoria FROM financeiro_hml.plano_contas WHERE id=pc FOR SHARE;
  IF NOT FOUND OR NOT categoria.ativo OR NOT categoria.aceita_lancamentos THEN RAISE EXCEPTION 'TES_CLASSIFICACAO'; END IF;
  IF categoria.natureza IS DISTINCT FROM CASE tipo WHEN 'entrada' THEN 'receita' ELSE 'despesa' END THEN RAISE EXCEPTION 'TES_CATEGORIA_NATUREZA'; END IF;
  IF NOT (m->'contas') ? coalesce(coalesce(origem,destino)::text,'') THEN RAISE EXCEPTION 'TES_CONTA_OFICIAL'; END IF;
  SELECT * INTO conta FROM financeiro_hml.contas_financeiras WHERE id=coalesce(origem,destino) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'TES_CONTA_INEXISTENTE'; END IF;
  IF NOT conta.ativo THEN RAISE EXCEPTION 'TES_CONTA_INATIVA'; END IF;
  IF dt<conta.data_saldo_inicial THEN RAISE EXCEPTION 'TES_DATA_ANTERIOR_ABERTURA'; END IF;
  IF cc IS NOT NULL THEN PERFORM 1 FROM financeiro_hml.centros_custo WHERE id=cc AND ativo FOR SHARE; IF NOT FOUND THEN RAISE EXCEPTION 'TES_CENTRO'; END IF; END IF;
  INSERT INTO financeiro_hml.tesouraria_operacoes(id,tipo,data_movimento,descricao,valor,conta_origem_id,conta_destino_id,plano_conta_id,centro_custo_id,classificacao_snapshot,chave_idempotencia,requisicao,criado_por) VALUES(oid,tipo,dt,descricao,valor,origem,destino,pc,cc,jsonb_build_object('codigo',categoria.codigo,'descricao',categoria.descricao,'natureza',categoria.natureza),chave,req,uid);
  INSERT INTO financeiro_hml.tesouraria_movimentos(operacao_id,conta_financeira_id,direcao,valor) VALUES(oid,conta.id,CASE tipo WHEN 'entrada' THEN 'credito' ELSE 'debito' END,valor);
  INSERT INTO financeiro_hml.auditoria(tabela,registro_id,acao,usuario_id,antes,depois) VALUES('tesouraria_operacoes',oid,'criar',uid,NULL,jsonb_build_object('tipo',tipo,'valor',valor::text,'referencia',ref));
  RETURN jsonb_build_object('id',oid,'conta_id',conta.id,'repetida',false);
 END $fn$;$motor$;
 EXECUTE replace(body,'__MANIFESTO__',quote_literal(m::text));
 body := $wrapper$CREATE OR REPLACE FUNCTION financeiro_hml.tesouraria_lancar(p jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,financeiro_hml,pg_temp AS $fn$
 DECLARE m jsonb:=__MANIFESTO__::jsonb;
 BEGIN
  IF auth.uid() IS NULL OR NOT financeiro_hml.tem_papel(ARRAY['admin_geral','admin_financeiro']) THEN RAISE EXCEPTION 'TES_PERMISSAO' USING ERRCODE='42501'; END IF;
  IF p='{"tipo":"sonda"}'::jsonb THEN RETURN m||jsonb_build_object('contrato','tesouraria_lancar_minima_v2_1'); END IF;
  RETURN financeiro_hml.tes_executar(p);
 END $fn$;$wrapper$;
 EXECUTE replace(body,'__MANIFESTO__',quote_literal(m::text));
END $instalar$;
CREATE OR REPLACE FUNCTION financeiro_hml.tesouraria_transferir(p jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,financeiro_hml,pg_temp AS $$ BEGIN RAISE EXCEPTION 'TES_OPERACAO_BLOQUEADA' USING ERRCODE='42501'; END $$;
CREATE OR REPLACE FUNCTION financeiro_hml.tesouraria_estornar(p jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,financeiro_hml,pg_temp AS $$ BEGIN RAISE EXCEPTION 'TES_OPERACAO_BLOQUEADA' USING ERRCODE='42501'; END $$;
CREATE OR REPLACE FUNCTION financeiro_hml.tesouraria_criar_conta(p jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,financeiro_hml,pg_temp AS $$ BEGIN RAISE EXCEPTION 'TES_OPERACAO_BLOQUEADA' USING ERRCODE='42501'; END $$;
CREATE OR REPLACE FUNCTION financeiro_hml.tesouraria_habilitar_conta(p jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,financeiro_hml,pg_temp AS $$ BEGIN RAISE EXCEPTION 'TES_OPERACAO_BLOQUEADA' USING ERRCODE='42501'; END $$;
CREATE OR REPLACE FUNCTION financeiro_hml.tesouraria_lancar_conferencia(p jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,financeiro_hml,pg_temp AS $$ BEGIN RAISE EXCEPTION 'TES_OPERACAO_BLOQUEADA' USING ERRCODE='42501'; END $$;
-- Somente permissões enumeradas, nunca GRANT ALL. Mantém RLS/gatilhos/owners.
DO $acl$
DECLARE t text; cols text; f record;
BEGIN
 FOREACH t IN ARRAY ARRAY['contas_financeiras','contas_preparadas','tesouraria_conferencias','tesouraria_operacoes','tesouraria_movimentos','auditoria'] LOOP
  EXECUTE format('REVOKE INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER ON financeiro_hml.%I FROM PUBLIC,anon,authenticated,service_role',t);
  SELECT string_agg(quote_ident(attname),',') INTO cols FROM pg_attribute WHERE attrelid=format('financeiro_hml.%I',t)::regclass AND attnum>0 AND NOT attisdropped;
  EXECUTE format('REVOKE INSERT (%s),UPDATE (%s),REFERENCES (%s) ON financeiro_hml.%I FROM PUBLIC,anon,authenticated,service_role',cols,cols,cols,t);
 END LOOP;
 -- Fecha cada sobrecarga; catálogo divergente é recusado antes desta etapa.
 FOR f IN SELECT p.oid::regprocedure assinatura FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='financeiro_hml' LOOP
  EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC,anon,authenticated,service_role',f.assinatura);
 END LOOP;
END $acl$;
GRANT USAGE ON SCHEMA financeiro_hml TO authenticated,service_role;
REVOKE CREATE ON SCHEMA financeiro_hml FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON financeiro_hml.perfis,financeiro_hml.plano_contas,financeiro_hml.centros_custo,financeiro_hml.contas_financeiras,financeiro_hml.contas_preparadas,financeiro_hml.tesouraria_conferencias,financeiro_hml.tesouraria_operacoes,financeiro_hml.tesouraria_movimentos,financeiro_hml.auditoria,financeiro_hml.integracao_itens,financeiro_hml.integracao_sincronizacoes,financeiro_hml.diagnostico_autorizacoes,financeiro_hml.diagnostico_tentativas TO authenticated;
GRANT EXECUTE ON FUNCTION financeiro_hml.tem_papel(text[]),financeiro_hml.papel_atual(),financeiro_hml.tesouraria_saldos(),financeiro_hml.tesouraria_extrato(jsonb),financeiro_hml.tesouraria_historico_operacoes(jsonb),financeiro_hml.integracao_estado_manual(),financeiro_hml.integracao_iniciar(),financeiro_hml.integracao_concluir(jsonb),financeiro_hml.diagnostico_reservar(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION financeiro_hml.diagnostico_finalizar(uuid,uuid,integer,integer,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION financeiro_hml.tesouraria_lancar(jsonb) TO authenticated;
DO $baseline$
DECLARE t record; dados jsonb; b jsonb:=current_setting('itv.v21.baseline')::jsonb;
BEGIN
 FOR t IN SELECT c.oid,c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='financeiro_hml' AND c.relkind='r' LOOP
  EXECUTE format('SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text),'[]'::jsonb) FROM financeiro_hml.%I x',t.relname) INTO dados;
  IF dados IS DISTINCT FROM b->t.relname THEN RAISE EXCEPTION 'V21_PRESERVACAO_FALHOU: %',t.relname; END IF;
 END LOOP;
 
END $baseline$;
COMMIT;
