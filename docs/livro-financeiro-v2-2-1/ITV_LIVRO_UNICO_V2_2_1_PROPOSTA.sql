-- V2.2.1 (permissões Administrador Geral + Analista Financeiro). Derivada da V2.2 sem alterá-la. PREPARADA; NÃO EXECUTADA.
-- PROPOSTA V2.2 LIVRO NAO APLICADA. Exclusivo ayjppexbzpgdkzbehvzw/financeiro_hml.
-- Requer manifesto UUID aprovado e backup/manutencao/drenagem verificados; nao executar agora.
BEGIN ISOLATION LEVEL READ COMMITTED;
SET LOCAL lock_timeout='5s';
LOCK TABLE financeiro_hml.perfis,financeiro_hml.plano_contas,financeiro_hml.centros_custo,financeiro_hml.contas_financeiras,financeiro_hml.contas_preparadas,financeiro_hml.tesouraria_conferencias,financeiro_hml.tesouraria_operacoes,financeiro_hml.tesouraria_movimentos,financeiro_hml.auditoria,financeiro_hml.integracao_itens,financeiro_hml.integracao_sincronizacoes,financeiro_hml.diagnostico_autorizacoes,financeiro_hml.diagnostico_tentativas IN ACCESS EXCLUSIVE MODE NOWAIT;
DO $pre$
DECLARE f record; expected jsonb := '{"financeiro_hml.autoria()": {"md5": "167f40fd1f0506f0de0a566c3be38da2", "owner": "postgres"}, "financeiro_hml.autoria_cadastro()": {"md5": "4e4f9210bb82bdfb92c104de9cfc71dd", "owner": "postgres"}, "financeiro_hml.diagnostico_finalizar(uuid,uuid,integer,integer,text,text)": {"md5": "4ebe2f56016907cfa4d5633ea8a3f544", "owner": "postgres"}, "financeiro_hml.diagnostico_reservar(uuid,text)": {"md5": "01b85221e475f18a663f10a39ee9e8c2", "owner": "postgres"}, "financeiro_hml.integracao_concluir(jsonb)": {"md5": "d2fcbb76dd8521b4e8742879a33f4216", "owner": "postgres"}, "financeiro_hml.integracao_estado_manual()": {"md5": "12b05c826dd7d702c135f533c5bfb538", "owner": "postgres"}, "financeiro_hml.integracao_expirar_travadas()": {"md5": "7f71d7e5947aa5797d3a1b7a5dee33af", "owner": "postgres"}, "financeiro_hml.integracao_iniciar()": {"md5": "2c08d74468969909eb539130a785c56c", "owner": "postgres"}, "financeiro_hml.integracao_iniciar_automatica(date,date)": {"md5": "0eb46bd9a67f2e0cb14da0fbc8c0b302", "owner": "postgres"}, "financeiro_hml.papel_atual()": {"md5": "ff6e26e80bea9e4e9a8ec60d183915d9", "owner": "postgres"}, "financeiro_hml.pc_hierarquia()": {"md5": "b997693a30edf98768ee9a66d7907ec6", "owner": "postgres"}, "financeiro_hml.perfis_protecao()": {"md5": "61d5750e5d25ba1740159026d9e5a72e", "owner": "postgres"}, "financeiro_hml.registrar_auditoria()": {"md5": "ef434542af5a5735d531640e4a7cbc8c", "owner": "postgres"}, "financeiro_hml.tem_papel(text[])": {"md5": "9652b9d1810b1d2273cdfed0d7a0ea07", "owner": "postgres"}, "financeiro_hml.tes_conf_auditar()": {"md5": "c6a017d70d412451ca0bfc408ec52eed", "owner": "postgres"}, "financeiro_hml.tes_conf_proteger()": {"md5": "05cbdfeaa8957c81393f00fcd16739bb", "owner": "postgres"}, "financeiro_hml.tes_conta_exige_abertura()": {"md5": "f30e26b8e87ebf0a63ac04cf27c9df4e", "owner": "postgres"}, "financeiro_hml.tes_executar(jsonb)": {"md5": "028954f4e03ac8a5402dde2d32f62410", "owner": "postgres"}, "financeiro_hml.tes_imutavel()": {"md5": "3781de7d81ac4d248871565c7700a2fb", "owner": "postgres"}, "financeiro_hml.tes_proteger_conta()": {"md5": "833cba25cdae146f782bb07560574e2b", "owner": "postgres"}, "financeiro_hml.tes_proteger_natureza()": {"md5": "019a3664b770494ff71647be079f2bb5", "owner": "postgres"}, "financeiro_hml.tes_validar_efeitos()": {"md5": "5fc456018ec1207ba0f85b2c4d869305", "owner": "postgres"}, "financeiro_hml.tesouraria_criar_conta(jsonb)": {"md5": "026000de0ad4630239652e25641b5fb5", "owner": "postgres"}, "financeiro_hml.tesouraria_estornar(jsonb)": {"md5": "3d0a9a341dd02642718db613031f63e1", "owner": "postgres"}, "financeiro_hml.tesouraria_extrato(jsonb)": {"md5": "df18ba14c55612a5791499dd459dab5d", "owner": "postgres"}, "financeiro_hml.tesouraria_habilitar_conta(jsonb)": {"md5": "02c3db2711eb0aece17fa4c0d2d88792", "owner": "postgres"}, "financeiro_hml.tesouraria_historico_operacoes(jsonb)": {"md5": "c4be449256a6a03fedc3262f4d0d6b45", "owner": "postgres"}, "financeiro_hml.tesouraria_lancar(jsonb)": {"md5": "12893e4cf1ec633acc2cb9051f6290f3", "owner": "postgres"}, "financeiro_hml.tesouraria_lancar_conferencia(jsonb)": {"md5": "1cce3f157da433610b6983ba7cd1b2b0", "owner": "postgres"}, "financeiro_hml.tesouraria_saldos()": {"md5": "6b5905c5d0f7ffbdc6aa3ad49d353501", "owner": "postgres"}, "financeiro_hml.tesouraria_transferir(jsonb)": {"md5": "d337c33d1e2296addc801835aabd94fc", "owner": "postgres"}}'::jsonb;
BEGIN
 IF current_setting('itv.v22.validacao',true) IS DISTINCT FROM 'BACKUP_DRENAGEM_DESTINO_APROVADOS' THEN RAISE EXCEPTION 'V22_NAO_AUTORIZADA'; END IF;
 IF (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='financeiro_hml')<>(SELECT count(*) FROM jsonb_object_keys(expected)) THEN RAISE EXCEPTION 'V22_SOBRECARGA_DIVERGENTE'; END IF;
 FOR f IN SELECT key,value FROM jsonb_each(expected) LOOP
  IF to_regprocedure(f.key) IS NULL THEN RAISE EXCEPTION 'V22_FUNCAO_AUSENTE: %',f.key; END IF;
  IF md5(pg_get_functiondef(to_regprocedure(f.key)))<>f.value->>'md5' OR (SELECT pg_get_userbyid(proowner) FROM pg_proc WHERE oid=to_regprocedure(f.key))<>f.value->>'owner' THEN RAISE EXCEPTION 'V22_CATALOGO_DIVERGENTE: %',f.key; END IF;
 END LOOP;
 IF (SELECT count(*) FROM financeiro_hml.tesouraria_operacoes WHERE tipo='abertura')<>6 OR EXISTS(SELECT 1 FROM financeiro_hml.tesouraria_operacoes WHERE tipo<>'abertura') OR EXISTS(SELECT 1 FROM financeiro_hml.tesouraria_movimentos) THEN RAISE EXCEPTION 'V22_ESTADO_FINANCEIRO_DIVERGENTE'; END IF;
END $pre$;
DO $estrutura$
BEGIN
 IF md5((SELECT jsonb_build_object('tabelas',(SELECT jsonb_agg(jsonb_build_object('nome',c.relname,'owner',pg_get_userbyid(c.relowner),'rls',c.relrowsecurity,'force',c.relforcerowsecurity) ORDER BY c.relname) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='financeiro_hml' AND c.relkind='r'), 'gatilhos',(SELECT jsonb_agg(jsonb_build_object('tabela',c.relname,'nome',t.tgname,'enabled',t.tgenabled,'def',pg_get_triggerdef(t.oid)) ORDER BY c.relname,t.tgname) FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='financeiro_hml' AND NOT t.tgisinternal), 'politicas',(SELECT jsonb_agg(to_jsonb(p) ORDER BY tablename,policyname) FROM pg_policies p WHERE schemaname='financeiro_hml'), 'constraints',(SELECT jsonb_agg(jsonb_build_object('tabela',r.relname,'nome',c.conname,'def',pg_get_constraintdef(c.oid)) ORDER BY r.relname,c.conname) FROM pg_constraint c JOIN pg_class r ON r.oid=c.conrelid JOIN pg_namespace n ON n.oid=r.relnamespace WHERE n.nspname='financeiro_hml')))::text) <> 'd985be75654eb3c1998218115c5d6f06' THEN RAISE EXCEPTION 'V22_ESTRUTURA_DIVERGENTE'; END IF;
 IF EXISTS(SELECT 1 FROM pg_roles r WHERE r.rolname IN ('anon','authenticated') AND (r.rolsuper OR r.rolbypassrls)) OR EXISTS(SELECT 1 FROM pg_auth_members m JOIN pg_roles r ON r.oid=m.member WHERE r.rolname IN ('anon','authenticated','service_role')) THEN RAISE EXCEPTION 'V22_HERANCA_PRIVILEGIADA'; END IF;
END $estrutura$;
DO $baseline$
DECLARE t record; dados jsonb; b jsonb:='{}';
BEGIN
 FOR t IN SELECT c.oid,c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='financeiro_hml' AND c.relkind='r' LOOP
  EXECUTE format('SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text),''[]''::jsonb) FROM financeiro_hml.%I x',t.relname) INTO dados;
  b:=b||jsonb_build_object(t.relname,dados);
 END LOOP;
 PERFORM set_config('itv.v22.baseline',b::text,true);
END $baseline$;
DO $instalar$
DECLARE m jsonb:=nullif(current_setting('itv.v22.manifesto',true),'')::jsonb; it jsonb; r record; ids uuid[]; contas uuid[]; body text;
BEGIN
 IF m IS NULL OR jsonb_typeof(m) IS DISTINCT FROM 'object' OR jsonb_typeof(m->'contas') IS DISTINCT FROM 'array' OR jsonb_typeof(m->'categorias') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'V22_MANIFESTO_OFICIAL_AUSENTE'; END IF;
 IF jsonb_array_length(m->'contas')<>1 OR jsonb_array_length(m->'categorias')<>14 OR EXISTS(SELECT 1 FROM jsonb_array_elements(m->'contas') x WHERE jsonb_typeof(x) IS DISTINCT FROM 'string') OR EXISTS(SELECT 1 FROM jsonb_array_elements(m->'categorias') x WHERE jsonb_typeof(x) IS DISTINCT FROM 'string') THEN RAISE EXCEPTION 'V22_MANIFESTO_OFICIAL_AUSENTE'; END IF;
 SELECT array_agg(value::uuid ORDER BY value) INTO contas FROM jsonb_array_elements_text(m->'contas');
 SELECT array_agg(value::uuid ORDER BY value) INTO ids FROM jsonb_array_elements_text(m->'categorias');
 IF (SELECT count(DISTINCT x) FROM unnest(contas) x)<>1 OR (SELECT count(DISTINCT x) FROM unnest(ids) x)<>14 THEN RAISE EXCEPTION 'V22_IDS_DUPLICADOS'; END IF;
 FOR it IN SELECT value FROM jsonb_array_elements('[{"codigo": "1", "descricao": "RECEITAS OPERACIONAIS", "natureza": "receita", "pai": null, "aceita": false}, {"codigo": "1.01", "descricao": "Conserto de televisores", "natureza": "receita", "pai": "1", "aceita": true}, {"codigo": "1.02", "descricao": "Venda de televisores", "natureza": "receita", "pai": "1", "aceita": true}, {"codigo": "1.03", "descricao": "Serviços técnicos especializados", "natureza": "receita", "pai": "1", "aceita": true}, {"codigo": "1.04", "descricao": "Venda de acessórios", "natureza": "receita", "pai": "1", "aceita": true}, {"codigo": "1.05", "descricao": "Reparo de telas COF", "natureza": "receita", "pai": "1", "aceita": true}, {"codigo": "1.06", "descricao": "Outras receitas operacionais", "natureza": "receita", "pai": "1", "aceita": true}, {"codigo": "2", "descricao": "DESPESAS OPERACIONAIS", "natureza": "despesa", "pai": null, "aceita": false}, {"codigo": "2.01", "descricao": "Compra de peças", "natureza": "despesa", "pai": "2", "aceita": true}, {"codigo": "2.02", "descricao": "Folha de pagamento", "natureza": "despesa", "pai": "2", "aceita": true}, {"codigo": "2.03", "descricao": "Comissões", "natureza": "despesa", "pai": "2", "aceita": true}, {"codigo": "2.04", "descricao": "Aluguel e estrutura", "natureza": "despesa", "pai": "2", "aceita": true}, {"codigo": "2.05", "descricao": "Transporte e logística", "natureza": "despesa", "pai": "2", "aceita": true}, {"codigo": "2.06", "descricao": "Marketing", "natureza": "despesa", "pai": "2", "aceita": true}, {"codigo": "2.07", "descricao": "Despesas administrativas", "natureza": "despesa", "pai": "2", "aceita": true}, {"codigo": "2.08", "descricao": "Outras despesas operacionais", "natureza": "despesa", "pai": "2", "aceita": true}]'::jsonb) LOOP

  SELECT c.*,p.codigo pai INTO r FROM financeiro_hml.plano_contas c LEFT JOIN financeiro_hml.plano_contas p ON p.id=c.conta_pai_id WHERE c.codigo=it->>'codigo';
  IF NOT FOUND OR r.descricao IS DISTINCT FROM it->>'descricao' OR r.natureza IS DISTINCT FROM it->>'natureza' OR r.pai IS DISTINCT FROM it->>'pai' OR r.aceita_lancamentos IS DISTINCT FROM (it->>'aceita')::boolean OR NOT r.ativo OR (r.aceita_lancamentos AND NOT r.id=ANY(ids)) THEN RAISE EXCEPTION 'V22_CATEGORIA_DIVERGENTE: %',it->>'codigo'; END IF;
 END LOOP;
 IF m->>'modo' IS DISTINCT FROM 'livro_unico' OR jsonb_typeof(m->'responsaveis') IS DISTINCT FROM 'array' OR jsonb_array_length(m->'responsaveis')<>2 THEN RAISE EXCEPTION 'V22_RESPONSAVEIS'; END IF;
 IF (SELECT count(DISTINCT value::uuid) FROM jsonb_array_elements_text(m->'responsaveis'))<>2 OR EXISTS(SELECT 1 FROM jsonb_array_elements_text(m->'responsaveis') v LEFT JOIN financeiro_hml.perfis p ON p.usuario_id=v.value::uuid WHERE p.usuario_id IS NULL OR NOT p.ativo OR p.papel NOT IN ('admin_geral','analista_financeiro')) OR (SELECT count(DISTINCT p.papel) FROM jsonb_array_elements_text(m->'responsaveis') v JOIN financeiro_hml.perfis p ON p.usuario_id=v.value::uuid)<>2 THEN RAISE EXCEPTION 'V22_RESPONSAVEIS'; END IF;
 IF auth.uid() IS NULL OR NOT (m->'responsaveis') ? auth.uid()::text OR NOT EXISTS(SELECT 1 FROM financeiro_hml.perfis WHERE usuario_id=auth.uid() AND ativo AND papel='admin_geral') THEN RAISE EXCEPTION 'V22_AUTORIA_INSTALACAO'; END IF;
 IF (SELECT count(*) FROM financeiro_hml.contas_financeiras)<>6 OR EXISTS(SELECT 1 FROM financeiro_hml.contas_financeiras WHERE id=contas[1] OR tipo='interno' OR nome='LIVRO FINANCEIRO ITV — CONTROLE INTERNO') THEN RAISE EXCEPTION 'V22_CONTROLE_EXISTENTE'; END IF;
 IF nullif(m->>'abertura','')::uuid IS NULL OR nullif(m->>'chave_abertura','')::uuid IS NULL OR EXISTS(SELECT 1 FROM financeiro_hml.tesouraria_operacoes WHERE id=(m->>'abertura')::uuid OR chave_idempotencia=(m->>'chave_abertura')::uuid) THEN RAISE EXCEPTION 'V22_ABERTURA_ID'; END IF;
 -- No disguised bank/cash, no new table. Existing varchar must admit the neutral value.
 IF (SELECT format_type(atttypid,atttypmod) FROM pg_attribute WHERE attrelid='financeiro_hml.contas_financeiras'::regclass AND attname='tipo') NOT IN ('character varying','text') THEN RAISE EXCEPTION 'V22_TIPO_EXIGE_REVISAO'; END IF;
 INSERT INTO financeiro_hml.contas_financeiras(id,nome,tipo,moeda,saldo_inicial_centavos,data_saldo_inicial,banco,agencia,numero_conta)
 VALUES(contas[1],'LIVRO FINANCEIRO ITV — CONTROLE INTERNO','interno','BRL',0,'2026-11-01',NULL,NULL,NULL);
 INSERT INTO financeiro_hml.tesouraria_operacoes(id,tipo,data_movimento,descricao,valor,conta_destino_id,chave_idempotencia,requisicao,criado_por)
 VALUES((m->>'abertura')::uuid,'abertura','2026-11-01','Abertura técnica zero do livro financeiro — não é saldo bancário',0,contas[1],(m->>'chave_abertura')::uuid,jsonb_build_object('versao','2.2','modo','livro_unico','referencia','tecnico:abertura-livro-unico'),auth.uid());
 INSERT INTO financeiro_hml.auditoria(tabela,registro_id,acao,usuario_id,antes,depois)
 VALUES('tesouraria_operacoes',(m->>'abertura')::uuid,'criar',auth.uid(),NULL,jsonb_build_object('tipo','abertura','valor','0.00','referencia','tecnico:abertura-livro-unico'));
 -- Embed literal approved UUIDs; no runtime/session setting can replace them.
 body := $motor$CREATE OR REPLACE FUNCTION financeiro_hml.tes_executar(p jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,financeiro_hml,pg_temp AS $fn$
 DECLARE uid uuid:=auth.uid(); perfil record; chave uuid; tipo text; valor numeric(18,2); origem uuid; destino uuid; pc uuid; cc uuid; dt date; descricao text; ref text; oid uuid:=gen_random_uuid(); req jsonb; anterior financeiro_hml.tesouraria_operacoes; categoria record; conta record; m jsonb:=__MANIFESTO__::jsonb;
 BEGIN
  SELECT papel,ativo INTO perfil FROM financeiro_hml.perfis WHERE usuario_id=uid FOR SHARE;
  IF uid IS NULL OR NOT FOUND OR NOT perfil.ativo OR perfil.papel NOT IN ('admin_geral','analista_financeiro') THEN RAISE EXCEPTION 'TES_PERMISSAO' USING ERRCODE='42501'; END IF;
  IF NOT (m->'responsaveis') ? uid::text THEN RAISE EXCEPTION 'TES_PERMISSAO' USING ERRCODE='42501'; END IF;
  IF p IS NULL OR jsonb_typeof(p)<>'object' THEN RAISE EXCEPTION 'TES_DADOS'; END IF;
  tipo:=p->>'tipo';
  IF tipo IS NULL OR tipo NOT IN ('entrada','saida') THEN RAISE EXCEPTION 'TES_OPERACAO_BLOQUEADA' USING ERRCODE='42501'; END IF;
  IF p ? 'origem' OR p ? 'destino' THEN RAISE EXCEPTION 'TES_VINCULO_INTERNO' USING ERRCODE='42501'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_object_keys(p) k WHERE k NOT IN ('tipo','chave','data','descricao','valor','plano','centro','referencia')) THEN RAISE EXCEPTION 'TES_DADOS'; END IF;
  chave:=nullif(p->>'chave','')::uuid; IF chave IS NULL THEN RAISE EXCEPTION 'TES_DADOS'; END IF;
  IF coalesce(p->>'data','')!~'^\d{4}-\d{2}-\d{2}$' THEN RAISE EXCEPTION 'TES_DATA'; END IF; dt:=(p->>'data')::date;
  IF coalesce(p->>'valor','')!~'^\d{1,16}(\.\d{1,2})?$' THEN RAISE EXCEPTION 'TES_VALOR'; END IF;
  valor:=(p->>'valor')::numeric(18,2); IF valor<=0 THEN RAISE EXCEPTION 'TES_VALOR'; END IF;
  descricao:=btrim(coalesce(p->>'descricao','')); IF length(descricao) NOT BETWEEN 2 AND 500 THEN RAISE EXCEPTION 'TES_DESCRICAO'; END IF;
  ref:=lower(btrim(coalesce(p->>'referencia','')));
  IF length(ref)>200 OR ref !~'^externo:[a-z0-9][a-z0-9._:/-]+$' THEN RAISE EXCEPTION 'TES_REFERENCIA'; END IF;
  origem:=CASE WHEN tipo='saida' THEN (m->'contas'->>0)::uuid END; destino:=CASE WHEN tipo='entrada' THEN (m->'contas'->>0)::uuid END; pc:=nullif(p->>'plano','')::uuid; cc:=nullif(p->>'centro','')::uuid;
  IF (tipo='entrada' AND (destino IS NULL OR origem IS NOT NULL)) OR (tipo='saida' AND (origem IS NULL OR destino IS NOT NULL)) THEN RAISE EXCEPTION 'TES_CONTA_DADOS'; END IF;
  req:=jsonb_strip_nulls(jsonb_build_object('versao','2.2','tipo',tipo,'data',dt::text,'descricao',descricao,'valor',valor::text,'origem',origem::text,'destino',destino::text,'plano',pc::text,'centro',cc::text,'referencia',ref));
  PERFORM pg_advisory_xact_lock(hashtextextended(uid::text||chave::text,0));
  SELECT * INTO anterior FROM financeiro_hml.tesouraria_operacoes WHERE criado_por=uid AND chave_idempotencia=chave;
  IF FOUND THEN
   IF anterior.requisicao IS DISTINCT FROM req THEN RAISE EXCEPTION 'TES_IDEMPOTENCIA'; END IF;
   RETURN jsonb_build_object('id',anterior.id,'conta_id',coalesce(anterior.conta_destino_id,anterior.conta_origem_id),'repetida',true);
  END IF;
  IF NOT (m->'categorias') ? coalesce(pc::text,'') THEN RAISE EXCEPTION 'TES_CATEGORIA_OFICIAL'; END IF;
  SELECT * INTO categoria FROM financeiro_hml.plano_contas WHERE id=pc FOR SHARE;
  IF NOT FOUND OR NOT categoria.ativo OR NOT categoria.aceita_lancamentos THEN RAISE EXCEPTION 'TES_CLASSIFICACAO'; END IF;
  IF categoria.natureza IS DISTINCT FROM (CASE tipo WHEN 'entrada' THEN 'receita' ELSE 'despesa' END) THEN RAISE EXCEPTION 'TES_CATEGORIA_NATUREZA'; END IF;
  IF NOT (m->'contas') ? coalesce(coalesce(origem,destino)::text,'') THEN RAISE EXCEPTION 'TES_CONTA_OFICIAL'; END IF;
  SELECT * INTO conta FROM financeiro_hml.contas_financeiras WHERE id=coalesce(origem,destino) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'TES_CONTA_INEXISTENTE'; END IF;
  IF NOT conta.ativo THEN RAISE EXCEPTION 'TES_CONTA_INATIVA'; END IF;
  IF conta.tipo IS DISTINCT FROM 'interno' OR conta.moeda IS DISTINCT FROM 'BRL' OR conta.saldo_inicial_centavos<>0 OR conta.data_saldo_inicial IS DISTINCT FROM '2026-11-01'::date OR conta.banco IS NOT NULL OR conta.agencia IS NOT NULL OR conta.numero_conta IS NOT NULL THEN RAISE EXCEPTION 'TES_VINCULO_INTERNO'; END IF;
  IF (SELECT count(*) FROM financeiro_hml.tesouraria_operacoes o WHERE o.tipo='abertura' AND o.conta_destino_id=conta.id AND o.id=(m->>'abertura')::uuid AND o.valor=0)<>1 THEN RAISE EXCEPTION 'TES_INTEGRIDADE'; END IF;
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
  IF auth.uid() IS NULL OR NOT financeiro_hml.tem_papel(ARRAY['admin_geral','analista_financeiro']) THEN RAISE EXCEPTION 'TES_PERMISSAO' USING ERRCODE='42501'; END IF;
  IF NOT (m->'responsaveis') ? auth.uid()::text THEN RAISE EXCEPTION 'TES_PERMISSAO' USING ERRCODE='42501'; END IF;
  IF p='{"tipo":"sonda"}'::jsonb THEN RETURN jsonb_build_object('contas',m->'contas','categorias',m->'categorias','modo','livro_unico','contrato','tesouraria_lancar_livro_v2_2_1'); END IF;
  RETURN financeiro_hml.tes_executar(p);
 END $fn$;$wrapper$;
 EXECUTE replace(body,'__MANIFESTO__',quote_literal(m::text));
END $instalar$;
CREATE OR REPLACE FUNCTION financeiro_hml.tesouraria_transferir(p jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,financeiro_hml,pg_temp AS $$ BEGIN RAISE EXCEPTION 'TES_OPERACAO_BLOQUEADA' USING ERRCODE='42501'; END $$;
CREATE OR REPLACE FUNCTION financeiro_hml.tesouraria_estornar(p jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,financeiro_hml,pg_temp AS $$ BEGIN RAISE EXCEPTION 'TES_OPERACAO_BLOQUEADA' USING ERRCODE='42501'; END $$;
CREATE OR REPLACE FUNCTION financeiro_hml.tesouraria_criar_conta(p jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,financeiro_hml,pg_temp AS $$ BEGIN RAISE EXCEPTION 'TES_OPERACAO_BLOQUEADA' USING ERRCODE='42501'; END $$;
CREATE OR REPLACE FUNCTION financeiro_hml.tesouraria_habilitar_conta(p jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,financeiro_hml,pg_temp AS $$ BEGIN RAISE EXCEPTION 'TES_OPERACAO_BLOQUEADA' USING ERRCODE='42501'; END $$;
CREATE OR REPLACE FUNCTION financeiro_hml.tesouraria_lancar_conferencia(p jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,financeiro_hml,pg_temp AS $$ BEGIN RAISE EXCEPTION 'TES_OPERACAO_BLOQUEADA' USING ERRCODE='42501'; END $$;
CREATE OR REPLACE FUNCTION financeiro_hml.tesouraria_historico_operacoes(p jsonb)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'pg_catalog', 'financeiro_hml', 'pg_temp'
AS $function$
 WITH parametros AS (SELECT nullif(p->>'conta','')::uuid conta,nullif(p->>'inicio','')::date inicio,nullif(p->>'fim','')::date fim,nullif(p->>'tipo','') tipo,nullif(p->>'plano','')::uuid plano,least(greatest(coalesce((p->>'pagina')::bigint,0),0),100000) pagina),
 filtrado AS (SELECT o.* FROM financeiro_hml.tesouraria_operacoes o CROSS JOIN parametros p WHERE (p.conta IS NULL OR o.conta_origem_id=p.conta OR o.conta_destino_id=p.conta) AND (p.inicio IS NULL OR o.data_movimento>=p.inicio) AND (p.fim IS NULL OR o.data_movimento<=p.fim) AND (p.tipo IS NULL OR o.tipo=p.tipo) AND (p.plano IS NULL OR o.plano_conta_id=p.plano)),
 pagina AS (SELECT * FROM filtrado ORDER BY data_movimento DESC,criado_em DESC,id DESC LIMIT 50 OFFSET (SELECT pagina*50 FROM parametros))
 SELECT jsonb_build_object('total',(SELECT count(*) FROM filtrado),'operacoes',coalesce((SELECT jsonb_agg(to_jsonb(o)-'requisicao'||jsonb_build_object('efeitos',coalesce((SELECT jsonb_agg(jsonb_build_object('id',m.id,'conta_id',m.conta_financeira_id,'direcao',m.direcao,'valor',m.valor::text) ORDER BY m.id) FROM financeiro_hml.tesouraria_movimentos m WHERE m.operacao_id=o.id),'[]'::jsonb),'valor',o.valor::text,'referencia_documental',o.requisicao->>'referencia','responsavel_nome',(SELECT nullif(btrim(pr.nome),'') FROM financeiro_hml.perfis pr WHERE pr.usuario_id=o.criado_por)) ORDER BY o.data_movimento DESC,o.criado_em DESC,o.id DESC) FROM pagina o),'[]'::jsonb));
$function$
;

-- Somente permissões enumeradas, nunca GRANT ALL. Mantém RLS/gatilhos/owners.
DO $acl$
DECLARE t text; cols text; f record;
BEGIN
 FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='financeiro_hml' LOOP
  EXECUTE format('REVOKE SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER ON financeiro_hml.%I FROM PUBLIC,anon,authenticated,service_role',t);
  SELECT string_agg(quote_ident(attname),',') INTO cols FROM pg_attribute WHERE attrelid=format('financeiro_hml.%I',t)::regclass AND attnum>0 AND NOT attisdropped;
  EXECUTE format('REVOKE SELECT (%s),INSERT (%s),UPDATE (%s),REFERENCES (%s) ON financeiro_hml.%I FROM PUBLIC,anon,authenticated,service_role',cols,cols,cols,cols,t);
 END LOOP;
 -- Fecha cada sobrecarga; catálogo divergente é recusado antes desta etapa.
 FOR f IN SELECT p.oid::regprocedure assinatura FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='financeiro_hml' LOOP
  EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC,anon,authenticated,service_role',f.assinatura);
 END LOOP;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA financeiro_hml FROM PUBLIC,anon,authenticated,service_role;
END $acl$;
GRANT USAGE ON SCHEMA financeiro_hml TO authenticated,service_role;
REVOKE CREATE ON SCHEMA financeiro_hml FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON financeiro_hml.perfis,financeiro_hml.plano_contas,financeiro_hml.centros_custo,financeiro_hml.contas_financeiras,financeiro_hml.contas_preparadas,financeiro_hml.tesouraria_conferencias,financeiro_hml.tesouraria_operacoes,financeiro_hml.tesouraria_movimentos,financeiro_hml.auditoria,financeiro_hml.integracao_itens,financeiro_hml.integracao_sincronizacoes,financeiro_hml.diagnostico_autorizacoes,financeiro_hml.diagnostico_tentativas TO authenticated;
GRANT EXECUTE ON FUNCTION financeiro_hml.tem_papel(text[]),financeiro_hml.papel_atual(),financeiro_hml.tesouraria_saldos(),financeiro_hml.tesouraria_extrato(jsonb),financeiro_hml.tesouraria_historico_operacoes(jsonb),financeiro_hml.integracao_estado_manual(),financeiro_hml.integracao_iniciar(),financeiro_hml.integracao_concluir(jsonb),financeiro_hml.diagnostico_reservar(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION financeiro_hml.diagnostico_finalizar(uuid,uuid,integer,integer,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION financeiro_hml.tesouraria_lancar(jsonb) TO authenticated;
-- V2.2.1: administração preservada somente sob RLS (perfis: Administrador Geral; categorias: políticas atuais; centros de custo: Administrador Geral). Sem DELETE, sem contas financeiras.
GRANT INSERT,UPDATE ON financeiro_hml.perfis,financeiro_hml.plano_contas,financeiro_hml.centros_custo TO authenticated;
DROP POLICY cc_criar ON financeiro_hml.centros_custo;
DROP POLICY cc_alterar ON financeiro_hml.centros_custo;
CREATE POLICY cc_criar ON financeiro_hml.centros_custo FOR INSERT TO authenticated WITH CHECK (financeiro_hml.tem_papel(ARRAY['admin_geral']));
CREATE POLICY cc_alterar ON financeiro_hml.centros_custo FOR UPDATE TO authenticated USING (financeiro_hml.tem_papel(ARRAY['admin_geral'])) WITH CHECK (financeiro_hml.tem_papel(ARRAY['admin_geral']));
SET CONSTRAINTS ALL IMMEDIATE;
DO $baseline$
DECLARE t record; dados jsonb; b jsonb:=current_setting('itv.v22.baseline')::jsonb; m jsonb:=current_setting('itv.v22.manifesto')::jsonb; extra text;
BEGIN
 FOR t IN SELECT c.oid,c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='financeiro_hml' AND c.relkind='r' LOOP
  extra:=CASE t.relname WHEN 'contas_financeiras' THEN format(' WHERE id<>%L::uuid',m->'contas'->>0) WHEN 'tesouraria_operacoes' THEN format(' WHERE id<>%L::uuid',m->>'abertura') WHEN 'auditoria' THEN format(' WHERE NOT ((tabela=''tesouraria_operacoes'' AND registro_id=%L::uuid) OR (tabela=''contas_financeiras'' AND registro_id=%L::uuid))',m->>'abertura',m->'contas'->>0) ELSE '' END;
  EXECUTE format('SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY to_jsonb(x)::text),''[]''::jsonb) FROM financeiro_hml.%I x%s',t.relname,extra) INTO dados;
  IF dados IS DISTINCT FROM b->t.relname THEN RAISE EXCEPTION 'V22_PRESERVACAO_FALHOU: %',t.relname; END IF;
 END LOOP;
 IF (SELECT count(*) FROM financeiro_hml.contas_financeiras)<>7 OR (SELECT count(*) FROM financeiro_hml.tesouraria_operacoes)<>7 OR EXISTS(SELECT 1 FROM financeiro_hml.tesouraria_movimentos) OR (SELECT count(*) FROM financeiro_hml.auditoria)<>jsonb_array_length(b->'auditoria')+2 THEN RAISE EXCEPTION 'V22_ACRESCIMOS_DIVERGENTES'; END IF;
 IF (SELECT count(*) FROM financeiro_hml.auditoria WHERE tabela='tesouraria_operacoes' AND registro_id=(m->>'abertura')::uuid AND acao='criar' AND usuario_id=auth.uid())<>1 OR (SELECT count(*) FROM financeiro_hml.auditoria WHERE tabela='contas_financeiras' AND registro_id=(m->'contas'->>0)::uuid AND usuario_id=auth.uid())<>1 THEN RAISE EXCEPTION 'V22_AUDITORIA_TECNICA'; END IF;
 IF (SELECT criado_por FROM financeiro_hml.contas_financeiras WHERE id=(m->'contas'->>0)::uuid) IS DISTINCT FROM auth.uid() OR (SELECT criado_por FROM financeiro_hml.tesouraria_operacoes WHERE id=(m->>'abertura')::uuid) IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'V22_AUTORIA_INSTALACAO'; END IF;
END $baseline$;
DO $pos$
DECLARE t record; r text; f record; allowed text[];
BEGIN
 FOREACH r IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
  FOR t IN SELECT c.oid,c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='financeiro_hml' AND c.relkind='r' LOOP
   IF r='authenticated' AND t.relname IN ('perfis','plano_contas','centros_custo') THEN
    IF NOT has_table_privilege(r,t.oid,'INSERT') OR NOT has_table_privilege(r,t.oid,'UPDATE') OR has_table_privilege(r,t.oid,'DELETE,TRUNCATE,REFERENCES,TRIGGER') OR has_any_column_privilege(r,t.oid,'REFERENCES') THEN RAISE EXCEPTION 'V22_DML_RESIDUAL: % %',r,t.relname; END IF;
   ELSIF has_table_privilege(r,t.oid,'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') OR has_any_column_privilege(r,t.oid,'INSERT,UPDATE,REFERENCES') THEN RAISE EXCEPTION 'V22_DML_RESIDUAL: % %',r,t.relname; END IF;
  END LOOP;
  allowed:=CASE r WHEN 'authenticated' THEN ARRAY['tem_papel','papel_atual','tesouraria_saldos','tesouraria_extrato','tesouraria_historico_operacoes','integracao_estado_manual','integracao_iniciar','integracao_concluir','diagnostico_reservar','tesouraria_lancar'] WHEN 'service_role' THEN ARRAY['diagnostico_finalizar'] ELSE ARRAY[]::text[] END;
  FOR f IN SELECT p.oid,p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='financeiro_hml' LOOP
   IF has_function_privilege(r,f.oid,'EXECUTE') IS DISTINCT FROM (f.proname=ANY(allowed)) THEN RAISE EXCEPTION 'V22_EXECUTE_DIVERGENTE: % %',r,f.proname; END IF;
  END LOOP;
 END LOOP;
END $pos$;
DO $estrutura$
BEGIN
 IF md5((SELECT jsonb_build_object('tabelas',(SELECT jsonb_agg(jsonb_build_object('nome',c.relname,'owner',pg_get_userbyid(c.relowner),'rls',c.relrowsecurity,'force',c.relforcerowsecurity) ORDER BY c.relname) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='financeiro_hml' AND c.relkind='r'), 'gatilhos',(SELECT jsonb_agg(jsonb_build_object('tabela',c.relname,'nome',t.tgname,'enabled',t.tgenabled,'def',pg_get_triggerdef(t.oid)) ORDER BY c.relname,t.tgname) FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='financeiro_hml' AND NOT t.tgisinternal), 'politicas',(SELECT jsonb_agg(to_jsonb(p) ORDER BY tablename,policyname) FROM pg_policies p WHERE schemaname='financeiro_hml'), 'constraints',(SELECT jsonb_agg(jsonb_build_object('tabela',r.relname,'nome',c.conname,'def',pg_get_constraintdef(c.oid)) ORDER BY r.relname,c.conname) FROM pg_constraint c JOIN pg_class r ON r.oid=c.conrelid JOIN pg_namespace n ON n.oid=r.relnamespace WHERE n.nspname='financeiro_hml')))::text) <> 'd985be75654eb3c1998218115c5d6f06' THEN RAISE EXCEPTION 'V22_ESTRUTURA_DIVERGENTE'; END IF;
 IF EXISTS(SELECT 1 FROM pg_roles r WHERE r.rolname IN ('anon','authenticated') AND (r.rolsuper OR r.rolbypassrls)) OR EXISTS(SELECT 1 FROM pg_auth_members m JOIN pg_roles r ON r.oid=m.member WHERE r.rolname IN ('anon','authenticated','service_role')) THEN RAISE EXCEPTION 'V22_HERANCA_PRIVILEGIADA'; END IF;
END $estrutura$;
COMMIT;
