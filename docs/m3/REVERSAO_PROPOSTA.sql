-- PROPOSTA DE REVERSAO: SOMENTE APOS AUTORIZACAO. Retorna ao estado anterior, inclusive seus defeitos conhecidos.
-- Exige manutencao e drenagem de RPCs/transacoes; nunca repetir automaticamente.
BEGIN;
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
LOCK TABLE financeiro_hml.contas_financeiras,
 financeiro_hml.tesouraria_operacoes,
 financeiro_hml.tesouraria_movimentos IN ACCESS EXCLUSIVE MODE NOWAIT;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM financeiro_hml.tesouraria_operacoes)
 OR EXISTS(SELECT 1 FROM financeiro_hml.tesouraria_movimentos)
 OR EXISTS(SELECT 1 FROM financeiro_hml.contas_financeiras)
 THEN RAISE EXCEPTION 'Reversao exige reconciliacao: existem contas/operacoes/movimentos'; END IF; END $$;
DROP TRIGGER tes_conta_abertura ON financeiro_hml.contas_financeiras;
DROP FUNCTION financeiro_hml.tes_conta_exige_abertura();
DROP FUNCTION financeiro_hml.tesouraria_historico_operacoes(jsonb);
DROP INDEX financeiro_hml.tes_op_abertura_conta_uq;
CREATE OR REPLACE FUNCTION financeiro_hml.tes_validar_efeitos()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'financeiro_hml'
AS $function$
DECLARE o financeiro_hml.tesouraria_operacoes; original financeiro_hml.tesouraria_operacoes; n int; creditos numeric; debitos numeric; abertura bigint; oid uuid;
BEGIN
 IF TG_TABLE_NAME='tesouraria_operacoes' THEN oid:=NEW.id; ELSE oid:=NEW.operacao_id; END IF;
 SELECT * INTO o FROM financeiro_hml.tesouraria_operacoes WHERE id=oid;
 SELECT count(*),coalesce(sum(valor) FILTER(WHERE direcao='credito'),0),coalesce(sum(valor) FILTER(WHERE direcao='debito'),0) INTO n,creditos,debitos FROM financeiro_hml.tesouraria_movimentos WHERE operacao_id=o.id;
 IF o.tipo='transferencia' THEN
  IF o.conta_origem_id IS NULL OR o.conta_destino_id IS NULL OR o.conta_origem_id=o.conta_destino_id OR o.valor<=0 OR n<>2 OR creditos<>o.valor OR debitos<>o.valor OR o.plano_conta_id IS NOT NULL OR o.centro_custo_id IS NOT NULL THEN RAISE EXCEPTION 'TES_INTEGRIDADE'; END IF;
 ELSIF o.tipo IN ('entrada','saida') THEN
  IF o.valor<=0 OR n<>1 OR o.plano_conta_id IS NULL OR (o.tipo='entrada' AND (creditos<>o.valor OR debitos<>0 OR o.conta_origem_id IS NOT NULL OR o.conta_destino_id IS NULL)) OR (o.tipo='saida' AND (debitos<>o.valor OR creditos<>0 OR o.conta_destino_id IS NOT NULL OR o.conta_origem_id IS NULL)) THEN RAISE EXCEPTION 'TES_INTEGRIDADE'; END IF;
 ELSIF o.tipo='abertura' THEN
  SELECT saldo_inicial_centavos INTO abertura FROM financeiro_hml.contas_financeiras WHERE id=coalesce(o.conta_origem_id,o.conta_destino_id);
  IF abertura IS NULL OR o.valor<>abs(abertura::numeric/100) OR n<>(CASE WHEN abertura=0 THEN 0 ELSE 1 END) OR creditos<>greatest(abertura::numeric/100,0) OR debitos<>greatest(-abertura::numeric/100,0) THEN RAISE EXCEPTION 'TES_INTEGRIDADE'; END IF;
 ELSIF o.tipo='estorno' THEN
  SELECT * INTO original FROM financeiro_hml.tesouraria_operacoes WHERE id=o.operacao_original_id;
  IF original.id IS NULL OR original.tipo='estorno' OR length(btrim(coalesce(o.justificativa,'')))<5 OR o.valor<>original.valor OR EXISTS(
   (SELECT conta_financeira_id,CASE direcao WHEN 'credito' THEN 'debito' ELSE 'credito' END,valor FROM financeiro_hml.tesouraria_movimentos WHERE operacao_id=original.id EXCEPT SELECT conta_financeira_id,direcao,valor FROM financeiro_hml.tesouraria_movimentos WHERE operacao_id=o.id)
   UNION ALL (SELECT conta_financeira_id,direcao,valor FROM financeiro_hml.tesouraria_movimentos WHERE operacao_id=o.id EXCEPT SELECT conta_financeira_id,CASE direcao WHEN 'credito' THEN 'debito' ELSE 'credito' END,valor FROM financeiro_hml.tesouraria_movimentos WHERE operacao_id=original.id)
  ) THEN RAISE EXCEPTION 'TES_INTEGRIDADE'; END IF;
 END IF;
 IF o.tipo<>'estorno' AND EXISTS(SELECT 1 FROM financeiro_hml.tesouraria_movimentos m WHERE m.operacao_id=o.id AND m.conta_financeira_id IS DISTINCT FROM CASE WHEN m.direcao='credito' THEN o.conta_destino_id ELSE o.conta_origem_id END) THEN RAISE EXCEPTION 'TES_INTEGRIDADE'; END IF;
 RETURN NULL;
END $function$;
CREATE OR REPLACE FUNCTION financeiro_hml.tes_executar(p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'financeiro_hml'
AS $function$
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
  INSERT INTO financeiro_hml.tesouraria_movimentos(operacao_id,conta_financeira_id,direcao,valor) SELECT oid,m.conta_financeira_id,CASE m.direcao WHEN 'credito' THEN 'debito' ELSE 'credito' END,m.valor FROM financeiro_hml.tesouraria_movimentos m WHERE m.operacao_id=original.id;
 ELSE
  IF valor>0 AND origem IS NOT NULL THEN INSERT INTO financeiro_hml.tesouraria_movimentos(operacao_id,conta_financeira_id,direcao,valor) VALUES(oid,origem,'debito',valor); END IF;
  IF valor>0 AND destino IS NOT NULL THEN INSERT INTO financeiro_hml.tesouraria_movimentos(operacao_id,conta_financeira_id,direcao,valor) VALUES(oid,destino,'credito',valor); END IF;
 END IF;
 INSERT INTO financeiro_hml.auditoria(tabela,registro_id,acao,usuario_id,antes,depois) VALUES('tesouraria_operacoes',oid,'criar',uid,NULL,jsonb_build_object('tipo',tipo,'valor',valor::text,'original',original.id));
 RETURN jsonb_build_object('id',oid,'conta_id',coalesce(destino,origem),'repetida',false);
END $function$;
CREATE OR REPLACE FUNCTION financeiro_hml.tesouraria_extrato(p jsonb)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'pg_catalog', 'financeiro_hml'
AS $function$
 WITH parametros AS (SELECT nullif(p->>'conta','')::uuid conta,nullif(p->>'inicio','')::date inicio,nullif(p->>'fim','')::date fim,nullif(p->>'tipo','') tipo,nullif(p->>'plano','')::uuid plano,greatest(coalesce((p->>'pagina')::int,0),0) pagina),
 base AS (SELECT o.*,m.id movimento_id,m.conta_financeira_id,m.direcao,m.valor efeito,c.nome conta_nome,orig.tipo tipo_original,orig.classificacao_snapshot snapshot_original,EXISTS(SELECT 1 FROM financeiro_hml.tesouraria_operacoes e WHERE e.operacao_original_id=o.id) estornada FROM financeiro_hml.tesouraria_operacoes o JOIN financeiro_hml.tesouraria_movimentos m ON m.operacao_id=o.id JOIN financeiro_hml.contas_financeiras c ON c.id=m.conta_financeira_id LEFT JOIN financeiro_hml.tesouraria_operacoes orig ON orig.id=o.operacao_original_id CROSS JOIN parametros p WHERE p.conta IS NULL OR m.conta_financeira_id=p.conta),
 filtrado AS (SELECT b.* FROM base b CROSS JOIN parametros p WHERE (p.inicio IS NULL OR b.data_movimento>=p.inicio) AND (p.fim IS NULL OR b.data_movimento<=p.fim) AND (p.tipo IS NULL OR b.tipo=p.tipo) AND (p.plano IS NULL OR b.plano_conta_id=p.plano)),
 pagina AS (SELECT f.* FROM filtrado f ORDER BY data_movimento DESC,criado_em DESC,id DESC,movimento_id DESC LIMIT 50 OFFSET (SELECT pagina*50 FROM parametros)),
 resumo AS (SELECT coalesce(sum(CASE direcao WHEN 'credito' THEN efeito ELSE -efeito END) FILTER(WHERE p.inicio IS NOT NULL AND data_movimento<p.inicio),0)::text saldo_anterior,coalesce(sum(CASE direcao WHEN 'credito' THEN efeito ELSE -efeito END) FILTER(WHERE p.fim IS NULL OR data_movimento<=p.fim),0)::text saldo_final FROM base CROSS JOIN parametros p)
 SELECT jsonb_build_object('linhas',coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'movimento_id',movimento_id,'tipo',tipo,'data',data_movimento,'descricao',descricao,'conta_nome',conta_nome,'conta_id',conta_financeira_id,'direcao',direcao,'valor',efeito::text,'plano_id',plano_conta_id,'centro_id',centro_custo_id,'classificacao',classificacao_snapshot,'original',operacao_original_id,'tipo_original',tipo_original,'estornada',estornada,'justificativa',justificativa,'criado_por',criado_por,'criado_em',criado_em) ORDER BY data_movimento DESC,criado_em DESC,id DESC,movimento_id DESC) FROM pagina),'[]'::jsonb),'total',(SELECT count(*) FROM filtrado),'saldo_anterior',(SELECT saldo_anterior FROM resumo),'saldo_final',(SELECT saldo_final FROM resumo),'subtotal',coalesce((SELECT sum(CASE direcao WHEN 'credito' THEN efeito ELSE -efeito END)::text FROM filtrado),'0'));
$function$;
COMMIT;
