CREATE OR REPLACE FUNCTION financeiro_hml.tes_validar_efeitos() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,financeiro_hml AS $$
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
END $$;
DO $$ DECLARE def text; BEGIN
 SELECT pg_get_functiondef('financeiro_hml.tes_executar(jsonb)'::regprocedure) INTO def;
 def:=replace(def,'SELECT oid,conta_financeira_id,CASE direcao WHEN ''credito'' THEN ''debito'' ELSE ''credito'' END,valor FROM financeiro_hml.tesouraria_movimentos WHERE operacao_id=original.id','SELECT oid,m.conta_financeira_id,CASE m.direcao WHEN ''credito'' THEN ''debito'' ELSE ''credito'' END,m.valor FROM financeiro_hml.tesouraria_movimentos m WHERE m.operacao_id=original.id');
 EXECUTE def;
END $$;