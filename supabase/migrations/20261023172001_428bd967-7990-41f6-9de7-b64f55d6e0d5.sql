DO $$ BEGIN IF EXISTS (SELECT 1 FROM financeiro_hml.contas_financeiras) THEN RAISE EXCEPTION 'M3: contas existentes exigem nova revisão da abertura'; END IF; END $$;
ALTER TABLE financeiro_hml.contas_financeiras ADD COLUMN banco varchar(120), ADD COLUMN agencia varchar(32), ADD COLUMN numero_conta varchar(64), ADD COLUMN atualizado_em timestamptz, ADD COLUMN atualizado_por uuid;
REVOKE INSERT, UPDATE ON financeiro_hml.contas_financeiras FROM authenticated;
GRANT UPDATE(nome,banco,agencia,numero_conta,ativo) ON financeiro_hml.contas_financeiras TO authenticated;
CREATE TABLE financeiro_hml.tesouraria_operacoes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tipo text NOT NULL, data_movimento date NOT NULL, descricao varchar(500) NOT NULL,
 valor numeric(18,2) NOT NULL, conta_origem_id uuid REFERENCES financeiro_hml.contas_financeiras(id) ON DELETE RESTRICT,
 conta_destino_id uuid REFERENCES financeiro_hml.contas_financeiras(id) ON DELETE RESTRICT,
 plano_conta_id uuid REFERENCES financeiro_hml.plano_contas(id) ON DELETE RESTRICT,
 centro_custo_id uuid REFERENCES financeiro_hml.centros_custo(id) ON DELETE RESTRICT,
 classificacao_snapshot jsonb, operacao_original_id uuid REFERENCES financeiro_hml.tesouraria_operacoes(id) ON DELETE RESTRICT,
 justificativa varchar(500), chave_idempotencia uuid NOT NULL, requisicao jsonb NOT NULL,
 criado_em timestamptz NOT NULL DEFAULT clock_timestamp(), criado_por uuid NOT NULL,
 UNIQUE(criado_por,chave_idempotencia), UNIQUE(operacao_original_id),
 CHECK(tipo IN ('abertura','entrada','saida','transferencia','estorno')),
 CHECK(length(btrim(descricao)) BETWEEN 2 AND 500), CHECK(valor>=0)
);
GRANT SELECT ON financeiro_hml.tesouraria_operacoes TO authenticated;
ALTER TABLE financeiro_hml.tesouraria_operacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE financeiro_hml.tesouraria_operacoes FORCE ROW LEVEL SECURITY;
CREATE POLICY tesouraria_operacoes_ler ON financeiro_hml.tesouraria_operacoes FOR SELECT TO authenticated USING(financeiro_hml.papel_atual() IS NOT NULL);
CREATE TABLE financeiro_hml.tesouraria_movimentos (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), operacao_id uuid NOT NULL REFERENCES financeiro_hml.tesouraria_operacoes(id) ON DELETE RESTRICT,
 conta_financeira_id uuid NOT NULL REFERENCES financeiro_hml.contas_financeiras(id) ON DELETE RESTRICT,
 direcao text NOT NULL CHECK(direcao IN ('credito','debito')), valor numeric(18,2) NOT NULL CHECK(valor>0),
 UNIQUE(operacao_id,conta_financeira_id)
);
GRANT SELECT ON financeiro_hml.tesouraria_movimentos TO authenticated;
ALTER TABLE financeiro_hml.tesouraria_movimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE financeiro_hml.tesouraria_movimentos FORCE ROW LEVEL SECURITY;
CREATE POLICY tesouraria_movimentos_ler ON financeiro_hml.tesouraria_movimentos FOR SELECT TO authenticated USING(financeiro_hml.papel_atual() IS NOT NULL);
CREATE INDEX tes_op_data ON financeiro_hml.tesouraria_operacoes(data_movimento,criado_em,id);
CREATE INDEX tes_op_plano ON financeiro_hml.tesouraria_operacoes(plano_conta_id);
CREATE INDEX tes_op_centro ON financeiro_hml.tesouraria_operacoes(centro_custo_id);
CREATE INDEX tes_mov_conta ON financeiro_hml.tesouraria_movimentos(conta_financeira_id,operacao_id);
CREATE FUNCTION financeiro_hml.tes_imutavel() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,financeiro_hml AS $$ BEGIN RAISE EXCEPTION 'TES_IMUTAVEL: registros confirmados não podem ser alterados ou excluídos'; END $$;
REVOKE ALL ON FUNCTION financeiro_hml.tes_imutavel() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER tes_op_imutavel BEFORE UPDATE OR DELETE ON financeiro_hml.tesouraria_operacoes FOR EACH ROW EXECUTE FUNCTION financeiro_hml.tes_imutavel();
CREATE TRIGGER tes_mov_imutavel BEFORE UPDATE OR DELETE ON financeiro_hml.tesouraria_movimentos FOR EACH ROW EXECUTE FUNCTION financeiro_hml.tes_imutavel();
CREATE FUNCTION financeiro_hml.tes_proteger_conta() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,financeiro_hml AS $$
BEGIN
 IF NEW.id IS DISTINCT FROM OLD.id OR NEW.tipo IS DISTINCT FROM OLD.tipo OR NEW.moeda IS DISTINCT FROM OLD.moeda OR NEW.saldo_inicial_centavos IS DISTINCT FROM OLD.saldo_inicial_centavos OR NEW.data_saldo_inicial IS DISTINCT FROM OLD.data_saldo_inicial THEN RAISE EXCEPTION 'TES_ABERTURA_IMUTAVEL: abertura, tipo e moeda não podem mudar'; END IF;
 NEW.atualizado_em:=clock_timestamp(); NEW.atualizado_por:=auth.uid(); RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION financeiro_hml.tes_proteger_conta() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER tes_proteger_conta BEFORE UPDATE ON financeiro_hml.contas_financeiras FOR EACH ROW EXECUTE FUNCTION financeiro_hml.tes_proteger_conta();
CREATE TRIGGER tes_auditoria_conta AFTER INSERT OR UPDATE ON financeiro_hml.contas_financeiras FOR EACH ROW EXECUTE FUNCTION financeiro_hml.registrar_auditoria();
CREATE FUNCTION financeiro_hml.tes_proteger_natureza() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,financeiro_hml AS $$ BEGIN
 IF NEW.natureza IS DISTINCT FROM OLD.natureza AND EXISTS(SELECT 1 FROM financeiro_hml.tesouraria_operacoes WHERE plano_conta_id=OLD.id) THEN RAISE EXCEPTION 'TES_NATUREZA: classificação já utilizada não pode mudar de natureza'; END IF; RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION financeiro_hml.tes_proteger_natureza() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER tes_proteger_natureza BEFORE UPDATE ON financeiro_hml.plano_contas FOR EACH ROW EXECUTE FUNCTION financeiro_hml.tes_proteger_natureza();
CREATE FUNCTION financeiro_hml.tes_validar_efeitos() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,financeiro_hml AS $$
DECLARE o financeiro_hml.tesouraria_operacoes; original financeiro_hml.tesouraria_operacoes; n int; creditos numeric; debitos numeric; abertura bigint;
BEGIN
 SELECT * INTO o FROM financeiro_hml.tesouraria_operacoes WHERE id=CASE WHEN TG_TABLE_NAME='tesouraria_operacoes' THEN NEW.id ELSE NEW.operacao_id END;
 SELECT count(*),coalesce(sum(valor) FILTER(WHERE direcao='credito'),0),coalesce(sum(valor) FILTER(WHERE direcao='debito'),0) INTO n,creditos,debitos FROM financeiro_hml.tesouraria_movimentos WHERE operacao_id=o.id;
 IF o.tipo='transferencia' THEN
  IF o.conta_origem_id IS NULL OR o.conta_destino_id IS NULL OR o.conta_origem_id=o.conta_destino_id OR o.valor<=0 OR n<>2 OR creditos<>o.valor OR debitos<>o.valor OR o.plano_conta_id IS NOT NULL OR o.centro_custo_id IS NOT NULL THEN RAISE EXCEPTION 'TES_INTEGRIDADE: transferência inválida'; END IF;
 ELSIF o.tipo IN ('entrada','saida') THEN
  IF o.valor<=0 OR n<>1 OR o.plano_conta_id IS NULL OR (o.tipo='entrada' AND (creditos<>o.valor OR debitos<>0 OR o.conta_origem_id IS NOT NULL OR o.conta_destino_id IS NULL)) OR (o.tipo='saida' AND (debitos<>o.valor OR creditos<>0 OR o.conta_destino_id IS NOT NULL OR o.conta_origem_id IS NULL)) THEN RAISE EXCEPTION 'TES_INTEGRIDADE: lançamento inválido'; END IF;
 ELSIF o.tipo='abertura' THEN
  SELECT saldo_inicial_centavos INTO abertura FROM financeiro_hml.contas_financeiras WHERE id=coalesce(o.conta_origem_id,o.conta_destino_id);
  IF abertura IS NULL OR o.valor<>abs(abertura::numeric/100) OR n<>(CASE WHEN abertura=0 THEN 0 ELSE 1 END) OR creditos<>greatest(abertura::numeric/100,0) OR debitos<>greatest(-abertura::numeric/100,0) OR o.plano_conta_id IS NOT NULL OR o.centro_custo_id IS NOT NULL THEN RAISE EXCEPTION 'TES_INTEGRIDADE: abertura inválida'; END IF;
 ELSIF o.tipo='estorno' THEN
  SELECT * INTO original FROM financeiro_hml.tesouraria_operacoes WHERE id=o.operacao_original_id;
  IF original.id IS NULL OR original.tipo='estorno' OR length(btrim(coalesce(o.justificativa,'')))<5 OR o.valor<>original.valor OR EXISTS(
    (SELECT conta_financeira_id,CASE direcao WHEN 'credito' THEN 'debito' ELSE 'credito' END,valor FROM financeiro_hml.tesouraria_movimentos WHERE operacao_id=original.id EXCEPT SELECT conta_financeira_id,direcao,valor FROM financeiro_hml.tesouraria_movimentos WHERE operacao_id=o.id)
    UNION ALL
    (SELECT conta_financeira_id,direcao,valor FROM financeiro_hml.tesouraria_movimentos WHERE operacao_id=o.id EXCEPT SELECT conta_financeira_id,CASE direcao WHEN 'credito' THEN 'debito' ELSE 'credito' END,valor FROM financeiro_hml.tesouraria_movimentos WHERE operacao_id=original.id)
  ) THEN RAISE EXCEPTION 'TES_INTEGRIDADE: estorno inválido'; END IF;
 END IF;
 IF o.tipo<>'estorno' AND EXISTS(SELECT 1 FROM financeiro_hml.tesouraria_movimentos m WHERE m.operacao_id=o.id AND (m.conta_financeira_id IS DISTINCT FROM CASE WHEN m.direcao='credito' THEN o.conta_destino_id ELSE o.conta_origem_id END)) THEN RAISE EXCEPTION 'TES_INTEGRIDADE: conta do efeito inválida'; END IF;
 RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION financeiro_hml.tes_validar_efeitos() FROM PUBLIC,anon,authenticated;
CREATE CONSTRAINT TRIGGER tes_op_efeitos AFTER INSERT ON financeiro_hml.tesouraria_operacoes DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION financeiro_hml.tes_validar_efeitos();
CREATE CONSTRAINT TRIGGER tes_mov_efeitos AFTER INSERT ON financeiro_hml.tesouraria_movimentos DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION financeiro_hml.tes_validar_efeitos();
CREATE FUNCTION financeiro_hml.tes_executar(p jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,financeiro_hml AS $$
DECLARE uid uuid:=auth.uid(); chave uuid; tipo text; valor numeric; abertura numeric; origem uuid; destino uuid; pc uuid; cc uuid; dt date; descricao text; motivo text; oid uuid:=gen_random_uuid(); cid uuid; snap jsonb; conta record; categoria record; anterior financeiro_hml.tesouraria_operacoes; original financeiro_hml.tesouraria_operacoes; req jsonb; resultado jsonb;
BEGIN
 IF uid IS NULL OR NOT financeiro_hml.tem_papel(ARRAY['admin_geral','admin_financeiro','analista_financeiro']) THEN RAISE EXCEPTION 'TES_PERMISSAO' USING ERRCODE='42501'; END IF;
 tipo:=p->>'tipo'; chave:=(p->>'chave')::uuid;
 IF chave IS NULL OR tipo NOT IN ('abertura','entrada','saida','transferencia','estorno') THEN RAISE EXCEPTION 'TES_DADOS: tipo/chave inválidos'; END IF;
 IF tipo IN ('abertura','estorno') AND NOT financeiro_hml.tem_papel(ARRAY['admin_geral','admin_financeiro']) THEN RAISE EXCEPTION 'TES_PERMISSAO' USING ERRCODE='42501'; END IF;
 req:=jsonb_strip_nulls(p-'chave');
 PERFORM pg_advisory_xact_lock(hashtextextended(uid::text||chave::text,0));
 SELECT * INTO anterior FROM financeiro_hml.tesouraria_operacoes WHERE criado_por=uid AND chave_idempotencia=chave;
 IF FOUND THEN
  IF anterior.requisicao<>req THEN RAISE EXCEPTION 'TES_IDEMPOTENCIA: mesma chave com conteúdo diferente'; END IF;
  RETURN jsonb_build_object('id',anterior.id,'conta_id',coalesce(anterior.conta_destino_id,anterior.conta_origem_id),'repetida',true);
 END IF;
 IF coalesce(p->>'data','')!~'^\d{4}-\d{2}-\d{2}$' THEN RAISE EXCEPTION 'TES_DATA'; END IF;
 dt:=(p->>'data')::date;
 descricao:=btrim(coalesce(p->>'descricao',''));
 IF length(descricao) NOT BETWEEN 2 AND 500 THEN RAISE EXCEPTION 'TES_DESCRICAO'; END IF;
 IF tipo='estorno' THEN
  motivo:=btrim(coalesce(p->>'justificativa',''));
  IF length(motivo) NOT BETWEEN 5 AND 500 THEN RAISE EXCEPTION 'TES_JUSTIFICATIVA'; END IF;
  SELECT * INTO original FROM financeiro_hml.tesouraria_operacoes WHERE id=(p->>'original')::uuid FOR UPDATE;
  IF NOT FOUND OR original.tipo='estorno' THEN RAISE EXCEPTION 'TES_ESTORNO_INVALIDO'; END IF;
  IF EXISTS(SELECT 1 FROM financeiro_hml.tesouraria_operacoes WHERE operacao_original_id=original.id) THEN RAISE EXCEPTION 'TES_JA_ESTORNADA'; END IF;
  IF dt<original.data_movimento THEN RAISE EXCEPTION 'TES_DATA'; END IF;
  origem:=original.conta_destino_id; destino:=original.conta_origem_id; valor:=original.valor; pc:=original.plano_conta_id; cc:=original.centro_custo_id; snap:=original.classificacao_snapshot;
 ELSE
  IF coalesce(p->>'valor','')!~ (CASE WHEN tipo='abertura' THEN '^-?\d{1,16}(\.\d{1,2})?$' ELSE '^\d{1,16}(\.\d{1,2})?$' END) THEN RAISE EXCEPTION 'TES_VALOR: use precisão de duas casas'; END IF;
  valor:=(p->>'valor')::numeric;
  IF tipo<>'abertura' AND valor<=0 THEN RAISE EXCEPTION 'TES_VALOR'; END IF;
  IF tipo='abertura' THEN
   IF length(btrim(coalesce(p->>'nome',''))) NOT BETWEEN 2 AND 160 OR coalesce(p->>'conta_tipo','') NOT IN ('banco','caixa') THEN RAISE EXCEPTION 'TES_CONTA_DADOS'; END IF;
   abertura:=valor; cid:=gen_random_uuid();
   INSERT INTO financeiro_hml.contas_financeiras(id,nome,tipo,moeda,saldo_inicial_centavos,data_saldo_inicial,banco,agencia,numero_conta) VALUES(cid,btrim(p->>'nome'),p->>'conta_tipo','BRL',(abertura*100)::bigint,dt,nullif(btrim(p->>'banco'),''),nullif(btrim(p->>'agencia'),''),nullif(btrim(p->>'numero_conta'),''));
   IF abertura<0 THEN origem:=cid; ELSE destino:=cid; END IF; valor:=abs(abertura);
  ELSE
   origem:=nullif(p->>'origem','')::uuid; destino:=nullif(p->>'destino','')::uuid;
   IF tipo='transferencia' THEN
    IF origem IS NULL OR destino IS NULL OR origem=destino OR p->>'plano' IS NOT NULL OR p->>'centro' IS NOT NULL THEN RAISE EXCEPTION 'TES_MESMA_CONTA_OU_CLASSIFICACAO'; END IF;
   ELSE
    IF (tipo='entrada' AND (destino IS NULL OR origem IS NOT NULL)) OR (tipo='saida' AND (origem IS NULL OR destino IS NOT NULL)) THEN RAISE EXCEPTION 'TES_CONTA_DADOS'; END IF;
    pc:=nullif(p->>'plano','')::uuid; cc:=nullif(p->>'centro','')::uuid;
    SELECT id,codigo,descricao,natureza,ativo,aceita_lancamentos INTO categoria FROM financeiro_hml.plano_contas WHERE id=pc FOR SHARE;
    IF NOT FOUND OR NOT categoria.ativo OR NOT categoria.aceita_lancamentos THEN RAISE EXCEPTION 'TES_CLASSIFICACAO'; END IF;
    snap:=jsonb_build_object('codigo',categoria.codigo,'descricao',categoria.descricao,'natureza',categoria.natureza);
    IF cc IS NOT NULL THEN
     PERFORM 1 FROM financeiro_hml.centros_custo WHERE id=cc AND ativo FOR SHARE;
     IF NOT FOUND THEN RAISE EXCEPTION 'TES_CENTRO'; END IF;
    END IF;
   END IF;
  END IF;
 END IF;
 FOR conta IN SELECT id,ativo,data_saldo_inicial FROM financeiro_hml.contas_financeiras WHERE id IN(origem,destino) ORDER BY id FOR UPDATE LOOP
  IF NOT conta.ativo THEN RAISE EXCEPTION 'TES_CONTA_INATIVA'; END IF;
  IF dt<conta.data_saldo_inicial THEN RAISE EXCEPTION 'TES_DATA_ANTERIOR_ABERTURA'; END IF;
 END LOOP;
 IF origem IS NOT NULL AND NOT EXISTS(SELECT 1 FROM financeiro_hml.contas_financeiras WHERE id=origem) OR destino IS NOT NULL AND NOT EXISTS(SELECT 1 FROM financeiro_hml.contas_financeiras WHERE id=destino) THEN RAISE EXCEPTION 'TES_CONTA_INEXISTENTE'; END IF;
 INSERT INTO financeiro_hml.tesouraria_operacoes(id,tipo,data_movimento,descricao,valor,conta_origem_id,conta_destino_id,plano_conta_id,centro_custo_id,classificacao_snapshot,operacao_original_id,justificativa,chave_idempotencia,requisicao,criado_por) VALUES(oid,tipo,dt,descricao,valor,origem,destino,pc,cc,snap,CASE WHEN tipo='estorno' THEN original.id END,motivo,chave,req,uid);
 IF tipo='estorno' THEN
  INSERT INTO financeiro_hml.tesouraria_movimentos(operacao_id,conta_financeira_id,direcao,valor) SELECT oid,conta_financeira_id,CASE direcao WHEN 'credito' THEN 'debito' ELSE 'credito' END,valor FROM financeiro_hml.tesouraria_movimentos WHERE operacao_id=original.id;
 ELSE
  IF valor>0 AND origem IS NOT NULL THEN INSERT INTO financeiro_hml.tesouraria_movimentos(operacao_id,conta_financeira_id,direcao,valor) VALUES(oid,origem,'debito',valor); END IF;
  IF valor>0 AND destino IS NOT NULL THEN INSERT INTO financeiro_hml.tesouraria_movimentos(operacao_id,conta_financeira_id,direcao,valor) VALUES(oid,destino,'credito',valor); END IF;
 END IF;
 INSERT INTO financeiro_hml.auditoria(tabela,registro_id,acao,usuario_id,antes,depois) VALUES('tesouraria_operacoes',oid,'criar',uid,NULL,jsonb_build_object('tipo',tipo,'valor',valor::text,'original',original.id));
 RETURN jsonb_build_object('id',oid,'conta_id',coalesce(destino,origem),'repetida',false);
END $$;
REVOKE ALL ON FUNCTION financeiro_hml.tes_executar(jsonb) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION financeiro_hml.tesouraria_criar_conta(p jsonb) RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,financeiro_hml AS $$ SELECT financeiro_hml.tes_executar(p||jsonb_build_object('tipo','abertura')); $$;
CREATE FUNCTION financeiro_hml.tesouraria_lancar(p jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,financeiro_hml AS $$ BEGIN IF coalesce(p->>'tipo','') NOT IN ('entrada','saida') THEN RAISE EXCEPTION 'TES_DADOS'; END IF; RETURN financeiro_hml.tes_executar(p); END $$;
CREATE FUNCTION financeiro_hml.tesouraria_transferir(p jsonb) RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,financeiro_hml AS $$ SELECT financeiro_hml.tes_executar(p||jsonb_build_object('tipo','transferencia')); $$;
CREATE FUNCTION financeiro_hml.tesouraria_estornar(p jsonb) RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,financeiro_hml AS $$ SELECT financeiro_hml.tes_executar(p||jsonb_build_object('tipo','estorno')); $$;
REVOKE ALL ON FUNCTION financeiro_hml.tesouraria_criar_conta(jsonb),financeiro_hml.tesouraria_lancar(jsonb),financeiro_hml.tesouraria_transferir(jsonb),financeiro_hml.tesouraria_estornar(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION financeiro_hml.tesouraria_criar_conta(jsonb),financeiro_hml.tesouraria_lancar(jsonb),financeiro_hml.tesouraria_transferir(jsonb),financeiro_hml.tesouraria_estornar(jsonb) TO authenticated;
CREATE FUNCTION financeiro_hml.tesouraria_saldos() RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog,financeiro_hml AS $$
 SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY t.nome,t.id),'[]'::jsonb) FROM (
 SELECT c.id,c.nome,c.tipo,c.moeda,c.ativo,c.banco,c.agencia,c.numero_conta,c.data_saldo_inicial,c.criado_em,c.saldo_inicial_centavos::text AS saldo_inicial_centavos,coalesce(sum(CASE m.direcao WHEN 'credito' THEN m.valor ELSE -m.valor END),0)::text AS saldo
 FROM financeiro_hml.contas_financeiras c LEFT JOIN financeiro_hml.tesouraria_movimentos m ON m.conta_financeira_id=c.id GROUP BY c.id)t;
$$;
CREATE FUNCTION financeiro_hml.tesouraria_extrato(p jsonb) RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog,financeiro_hml AS $$
 WITH parametros AS (SELECT nullif(p->>'conta','')::uuid conta,nullif(p->>'inicio','')::date inicio,nullif(p->>'fim','')::date fim,nullif(p->>'tipo','') tipo,nullif(p->>'plano','')::uuid plano,greatest(coalesce((p->>'pagina')::int,0),0) pagina),
 base AS (SELECT o.*,m.id movimento_id,m.conta_financeira_id,m.direcao,m.valor efeito,c.nome conta_nome,orig.tipo tipo_original,orig.classificacao_snapshot snapshot_original,EXISTS(SELECT 1 FROM financeiro_hml.tesouraria_operacoes e WHERE e.operacao_original_id=o.id) estornada FROM financeiro_hml.tesouraria_operacoes o JOIN financeiro_hml.tesouraria_movimentos m ON m.operacao_id=o.id JOIN financeiro_hml.contas_financeiras c ON c.id=m.conta_financeira_id LEFT JOIN financeiro_hml.tesouraria_operacoes orig ON orig.id=o.operacao_original_id CROSS JOIN parametros p WHERE p.conta IS NULL OR m.conta_financeira_id=p.conta),
 filtrado AS (SELECT b.* FROM base b CROSS JOIN parametros p WHERE (p.inicio IS NULL OR b.data_movimento>=p.inicio) AND (p.fim IS NULL OR b.data_movimento<=p.fim) AND (p.tipo IS NULL OR b.tipo=p.tipo) AND (p.plano IS NULL OR b.plano_conta_id=p.plano)),
 pagina AS (SELECT f.* FROM filtrado f ORDER BY data_movimento DESC,criado_em DESC,id DESC,movimento_id DESC LIMIT 50 OFFSET (SELECT pagina*50 FROM parametros)),
 resumo AS (SELECT coalesce(sum(CASE direcao WHEN 'credito' THEN efeito ELSE -efeito END) FILTER(WHERE p.inicio IS NOT NULL AND data_movimento<p.inicio),0)::text saldo_anterior,coalesce(sum(CASE direcao WHEN 'credito' THEN efeito ELSE -efeito END) FILTER(WHERE p.fim IS NULL OR data_movimento<=p.fim),0)::text saldo_final FROM base CROSS JOIN parametros p)
 SELECT jsonb_build_object('linhas',coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'movimento_id',movimento_id,'tipo',tipo,'data',data_movimento,'descricao',descricao,'conta_nome',conta_nome,'conta_id',conta_financeira_id,'direcao',direcao,'valor',efeito::text,'plano_id',plano_conta_id,'centro_id',centro_custo_id,'classificacao',classificacao_snapshot,'original',operacao_original_id,'tipo_original',tipo_original,'estornada',estornada,'justificativa',justificativa,'criado_por',criado_por,'criado_em',criado_em) ORDER BY data_movimento DESC,criado_em DESC,id DESC,movimento_id DESC) FROM pagina),'[]'::jsonb),'total',(SELECT count(*) FROM filtrado),'saldo_anterior',(SELECT saldo_anterior FROM resumo),'saldo_final',(SELECT saldo_final FROM resumo),'subtotal',coalesce((SELECT sum(CASE direcao WHEN 'credito' THEN efeito ELSE -efeito END)::text FROM filtrado),'0'));
$$;
REVOKE ALL ON FUNCTION financeiro_hml.tesouraria_saldos(),financeiro_hml.tesouraria_extrato(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION financeiro_hml.tesouraria_saldos(),financeiro_hml.tesouraria_extrato(jsonb) TO authenticated;