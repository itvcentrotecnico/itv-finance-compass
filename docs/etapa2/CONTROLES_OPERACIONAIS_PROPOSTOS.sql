-- PROPOSTA ETAPA 2. NÃO APLICADA. Aplicação exige aprovação específica.
-- Sem backfill, sem UPDATE de fonte, sem corte definitivo, sem dados financeiros.
BEGIN;
CREATE TABLE financeiro_hml.conferencia_regras_oficiais (
  plano_conta_id uuid PRIMARY KEY REFERENCES financeiro_hml.plano_contas(id),
  centro_obrigatorio boolean NOT NULL,
  centros_permitidos uuid[] NOT NULL DEFAULT '{}',
  aprovado_por uuid NOT NULL,
  aprovado_em timestamptz NOT NULL
);
GRANT SELECT ON financeiro_hml.conferencia_regras_oficiais TO authenticated;
ALTER TABLE financeiro_hml.conferencia_regras_oficiais ENABLE ROW LEVEL SECURITY;
CREATE POLICY conf_regras_ler ON financeiro_hml.conferencia_regras_oficiais FOR SELECT TO authenticated
 USING (financeiro_hml.tem_papel(ARRAY['admin_geral','admin_financeiro','analista_financeiro','consulta_gerencial']));
-- Sem regra aprovada: falha fechada. Nada é liberado por nome ou pelo simples ativo.
CREATE TABLE financeiro_hml.conferencia_operacao_autorizada (
 id boolean PRIMARY KEY DEFAULT true CHECK(id), corte date NOT NULL, autorizado_por uuid NOT NULL, autorizado_em timestamptz NOT NULL
);
GRANT SELECT ON financeiro_hml.conferencia_operacao_autorizada TO authenticated;
ALTER TABLE financeiro_hml.conferencia_operacao_autorizada ENABLE ROW LEVEL SECURITY;
CREATE POLICY conf_operacao_ler ON financeiro_hml.conferencia_operacao_autorizada FOR SELECT TO authenticated
 USING (financeiro_hml.tem_papel(ARRAY['admin_geral','admin_financeiro','analista_financeiro','consulta_gerencial']));
-- Esta tabela fica VAZIA. Corte 01/11 é proposta documental, não default nem autorização.
CREATE TABLE financeiro_hml.conferencia_controles (
 id uuid PRIMARY KEY REFERENCES financeiro_hml.tesouraria_conferencias(id),
 fonte_hash text NOT NULL,
 versao bigint NOT NULL DEFAULT 0,
 estado text NOT NULL DEFAULT 'pendente' CHECK(estado IN ('pendente','em_conferencia','encaminhado','conciliado','divergente','devolvido','autorizado','lancado')),
 dados jsonb NOT NULL DEFAULT '{}', componentes jsonb NOT NULL DEFAULT '[]',
 preparado_por uuid, aprovado_por uuid, aprovado_em timestamptz, versao_aprovada bigint,
 autorizado_por uuid, autorizado_em timestamptz, justificativa text,
 atualizado_por uuid, atualizado_em timestamptz NOT NULL DEFAULT clock_timestamp(), acao text NOT NULL DEFAULT 'preparar'
);
GRANT SELECT ON financeiro_hml.conferencia_controles TO authenticated;
ALTER TABLE financeiro_hml.conferencia_controles ENABLE ROW LEVEL SECURITY;
CREATE POLICY conf_controles_ler ON financeiro_hml.conferencia_controles FOR SELECT TO authenticated
 USING (financeiro_hml.tem_papel(ARRAY['admin_geral','admin_financeiro','analista_financeiro','consulta_gerencial']));
CREATE TRIGGER conf_controles_auditar AFTER INSERT OR UPDATE ON financeiro_hml.conferencia_controles
 FOR EACH ROW EXECUTE FUNCTION financeiro_hml.tes_conf_auditar();
CREATE TABLE financeiro_hml.conferencia_vinculos (
 conferencia_id uuid NOT NULL REFERENCES financeiro_hml.conferencia_controles(id),
 componente_id uuid NOT NULL, referencia_origem text NOT NULL UNIQUE,
 operacao_id uuid NOT NULL UNIQUE REFERENCES financeiro_hml.tesouraria_operacoes(id),
 PRIMARY KEY(conferencia_id,componente_id)
);
GRANT SELECT ON financeiro_hml.conferencia_vinculos TO authenticated;
ALTER TABLE financeiro_hml.conferencia_vinculos ENABLE ROW LEVEL SECURITY;
CREATE POLICY conf_vinculos_ler ON financeiro_hml.conferencia_vinculos FOR SELECT TO authenticated
 USING (financeiro_hml.tem_papel(ARRAY['admin_geral','admin_financeiro','analista_financeiro','consulta_gerencial']));

CREATE FUNCTION financeiro_hml.conf_dinheiro(v text) RETURNS numeric
LANGUAGE plpgsql IMMUTABLE SET search_path=pg_catalog AS $$
BEGIN
 IF v IS NULL OR v !~ '^\d{1,16}(\.\d{1,2})?$' OR v::numeric<=0 THEN RAISE EXCEPTION 'CONF_VALOR'; END IF;
 RETURN v::numeric;
END $$;
CREATE FUNCTION financeiro_hml.conf_validar(d jsonb, natureza text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,financeiro_hml,pg_temp AS $$
DECLARE conta financeiro_hml.contas_financeiras; plano financeiro_hml.plano_contas; regra financeiro_hml.conferencia_regras_oficiais; bruto numeric; liquido numeric; dt date;
BEGIN
 IF d IS NULL OR jsonb_typeof(d)<>'object' THEN RAISE EXCEPTION 'CONF_DADOS'; END IF;
 bruto:=financeiro_hml.conf_dinheiro(d->>'valor_bruto');
 IF coalesce(d->>'forma','') NOT IN ('dinheiro','pix','credito','debito','parcelado','boleto') THEN RAISE EXCEPTION 'CONF_FORMA'; END IF;
 IF coalesce(d->>'data_ocorrencia','') !~ '^\d{4}-\d{2}-\d{2}$' OR length(btrim(coalesce(d->>'descricao',''))) NOT BETWEEN 2 AND 500 THEN RAISE EXCEPTION 'CONF_DADOS'; END IF;
 dt:=(d->>'data_ocorrencia')::date;
 SELECT c.* INTO conta FROM financeiro_hml.contas_financeiras c JOIN financeiro_hml.contas_preparadas p ON p.conta_financeira_id=c.id AND p.situacao='habilitada' WHERE c.id=(d->>'conta_financeira_id')::uuid AND c.ativo FOR SHARE OF c,p;
 IF NOT FOUND THEN RAISE EXCEPTION 'CONF_CONTA_OFICIAL'; END IF;
 SELECT * INTO plano FROM financeiro_hml.plano_contas WHERE id=(d->>'plano_conta_id')::uuid AND ativo AND aceita_lancamentos FOR SHARE;
 IF NOT FOUND OR plano.natureza<>(CASE natureza WHEN 'entrada' THEN 'receita' WHEN 'saida' THEN 'despesa' ELSE '' END) THEN RAISE EXCEPTION 'CONF_CATEGORIA'; END IF;
 SELECT * INTO regra FROM financeiro_hml.conferencia_regras_oficiais WHERE plano_conta_id=plano.id FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'CONF_CATEGORIA_OFICIAL'; END IF;
 IF regra.centro_obrigatorio AND nullif(d->>'centro_custo_id','') IS NULL THEN RAISE EXCEPTION 'CONF_CENTRO'; END IF;
 IF nullif(d->>'centro_custo_id','') IS NOT NULL THEN
  IF NOT ((d->>'centro_custo_id')::uuid=ANY(regra.centros_permitidos)) OR NOT EXISTS(SELECT 1 FROM financeiro_hml.centros_custo WHERE id=(d->>'centro_custo_id')::uuid AND ativo) THEN RAISE EXCEPTION 'CONF_CENTRO'; END IF;
  PERFORM 1 FROM financeiro_hml.centros_custo WHERE id=(d->>'centro_custo_id')::uuid FOR SHARE;
 END IF;
 IF d->>'forma' IN ('credito','debito','parcelado') THEN
  liquido:=financeiro_hml.conf_dinheiro(d->>'valor_liquido');
  IF liquido>bruto OR coalesce(d->>'data_liquidacao','') !~ '^\d{4}-\d{2}-\d{2}$' THEN RAISE EXCEPTION 'CONF_CARTAO'; END IF;
  dt:=(d->>'data_liquidacao')::date;
 ELSIF d->>'forma'='boleto' THEN
  IF d->>'boleto_status' IS DISTINCT FROM 'pago' OR coalesce(d->>'boleto_pagamento','') !~ '^\d{4}-\d{2}-\d{2}$' THEN RAISE EXCEPTION 'CONF_BOLETO'; END IF;
  dt:=(d->>'boleto_pagamento')::date;
 END IF;
 IF dt<conta.data_saldo_inicial THEN RAISE EXCEPTION 'CONF_DATA_ABERTURA'; END IF;
END $$;
CREATE FUNCTION financeiro_hml.conf_validar_grupo(d jsonb, componentes jsonb, natureza text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,financeiro_hml,pg_temp AS $$
DECLARE parte jsonb; soma numeric:=0; ids uuid[]:='{}'; ident uuid;
BEGIN
 IF d->>'forma'<>'misto' THEN
  IF componentes<>'[]'::jsonb THEN RAISE EXCEPTION 'CONF_RATEIO'; END IF;
  PERFORM financeiro_hml.conf_validar(d,natureza); RETURN;
 END IF;
 IF jsonb_typeof(componentes)<>'array' OR jsonb_array_length(componentes)<2 OR jsonb_array_length(componentes)>50 THEN RAISE EXCEPTION 'CONF_RATEIO'; END IF;
 FOR parte IN SELECT value FROM jsonb_array_elements(componentes) LOOP
  ident:=(parte->>'id')::uuid;
  IF ident IS NULL OR ident=ANY(ids) THEN RAISE EXCEPTION 'CONF_DUPLICIDADE'; END IF;
  ids:=array_append(ids,ident);
  PERFORM financeiro_hml.conf_validar(parte,natureza);
  soma:=soma+financeiro_hml.conf_dinheiro(parte->>'valor_bruto');
 END LOOP;
 IF soma<>financeiro_hml.conf_dinheiro(d->>'valor_bruto') THEN RAISE EXCEPTION 'CONF_RATEIO'; END IF;
END $$;

CREATE FUNCTION financeiro_hml.conferencia_consultar(p jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,financeiro_hml,pg_temp AS $$
DECLARE fonte financeiro_hml.tesouraria_conferencias; controle financeiro_hml.conferencia_controles; d jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT financeiro_hml.tem_papel(ARRAY['admin_geral','admin_financeiro','analista_financeiro','consulta_gerencial']) THEN RAISE EXCEPTION 'CONF_PERMISSAO' USING ERRCODE='42501'; END IF;
 SELECT * INTO fonte FROM financeiro_hml.tesouraria_conferencias WHERE id=(p->>'id')::uuid;
 IF NOT FOUND THEN RAISE EXCEPTION 'CONF_INEXISTENTE'; END IF;
 SELECT * INTO controle FROM financeiro_hml.conferencia_controles WHERE id=fonte.id;
 d:=to_jsonb(fonte)||jsonb_build_object('valor_bruto',fonte.valor_bruto::text,'valor_liquido',fonte.valor_liquido::text,'taxa',fonte.taxa::text);
 RETURN jsonb_build_object('id',fonte.id,'versao',coalesce(controle.versao,0)::text,'estado',coalesce(controle.estado,fonte.status),'fonte_hash',md5(to_jsonb(fonte)::text),'dados',d||coalesce(controle.dados,'{}'),'componentes',coalesce(controle.componentes,'[]'),'controle',to_jsonb(controle));
END $$;
CREATE FUNCTION financeiro_hml.conferencia_comandar(p jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,financeiro_hml,pg_temp AS $$
DECLARE fonte financeiro_hml.tesouraria_conferencias; c financeiro_hml.conferencia_controles; esperado bigint; acao text:=p->>'acao'; motivo text:=btrim(coalesce(p->>'justificativa','')); d jsonb; partes jsonb; parte jsonb; ident uuid; ids uuid[]:='{}'; k text;
BEGIN
 IF auth.uid() IS NULL OR NOT financeiro_hml.tem_papel(ARRAY['admin_geral','admin_financeiro','analista_financeiro']) THEN RAISE EXCEPTION 'CONF_PERMISSAO' USING ERRCODE='42501'; END IF;
 IF acao NOT IN ('salvar','divergir','encaminhar','aprovar','devolver','autorizar') OR acao IS NULL OR coalesce(p->>'versao','') !~ '^\d+$' THEN RAISE EXCEPTION 'CONF_DADOS'; END IF;
 IF acao IN ('aprovar','devolver','autorizar') AND NOT financeiro_hml.tem_papel(ARRAY['admin_geral','admin_financeiro']) THEN RAISE EXCEPTION 'CONF_PERMISSAO' USING ERRCODE='42501'; END IF;
 esperado:=(p->>'versao')::bigint;
 SELECT * INTO fonte FROM financeiro_hml.tesouraria_conferencias WHERE id=(p->>'id')::uuid;
 IF NOT FOUND THEN RAISE EXCEPTION 'CONF_INEXISTENTE'; END IF;
 -- Mesma trava para toda mutação e lançamento do grupo; não trava somente um filho.
 PERFORM pg_advisory_xact_lock(hashtextextended('conf_grupo:'||fonte.grupo_id::text,0));
 SELECT * INTO fonte FROM financeiro_hml.tesouraria_conferencias WHERE id=fonte.id FOR SHARE;
 IF fonte.operacao_id IS NOT NULL THEN RAISE EXCEPTION 'CONF_IMUTAVEL'; END IF;
 IF p->>'fonte_hash' IS DISTINCT FROM md5(to_jsonb(fonte)::text) THEN RAISE EXCEPTION 'CONF_CONFLITO'; END IF;
 INSERT INTO financeiro_hml.conferencia_controles(id,fonte_hash) VALUES(fonte.id,md5(to_jsonb(fonte)::text)) ON CONFLICT(id) DO NOTHING;
 SELECT * INTO c FROM financeiro_hml.conferencia_controles WHERE id=fonte.id FOR UPDATE;
 IF c.versao<>esperado OR c.fonte_hash<>md5(to_jsonb(fonte)::text) THEN RAISE EXCEPTION 'CONF_CONFLITO'; END IF;
 IF c.estado='lancado' THEN RAISE EXCEPTION 'CONF_IMUTAVEL'; END IF;
 IF acao IN ('divergir','devolver') AND length(motivo) NOT BETWEEN 5 AND 500 THEN RAISE EXCEPTION 'CONF_JUSTIFICATIVA'; END IF;
 IF acao IN ('salvar','divergir') THEN
  d:=p->'dados'; partes:=coalesce(p->'componentes','[]');
  IF d IS NULL OR jsonb_typeof(d)<>'object' OR jsonb_typeof(partes)<>'array' OR jsonb_array_length(partes)>50 THEN RAISE EXCEPTION 'CONF_DADOS'; END IF;
  FOR k IN SELECT jsonb_object_keys(d) LOOP
   IF k<>ALL(ARRAY['forma','descricao','data_ocorrencia','valor_bruto','valor_liquido','data_liquidacao','boleto_vencimento','boleto_pagamento','boleto_status','conta_financeira_id','plano_conta_id','centro_custo_id','observacao']) THEN RAISE EXCEPTION 'CONF_DADOS'; END IF;
  END LOOP;
  -- Fonte financeira permanece imutável: total e data histórica não podem ser reescritos.
  IF financeiro_hml.conf_dinheiro(d->>'valor_bruto')<>fonte.valor_bruto OR (d->>'data_ocorrencia')::date<>fonte.data_ocorrencia THEN RAISE EXCEPTION 'CONF_FONTE_IMUTAVEL'; END IF;
  IF d->>'forma' IS NULL OR d->>'forma' NOT IN ('dinheiro','pix','credito','debito','parcelado','boleto','misto','indefinida') OR length(btrim(coalesce(d->>'descricao',''))) NOT BETWEEN 2 AND 500 THEN RAISE EXCEPTION 'CONF_DADOS'; END IF;
  IF d->>'forma'<>'misto' AND partes<>'[]'::jsonb THEN RAISE EXCEPTION 'CONF_RATEIO'; END IF;
  FOR parte IN SELECT value FROM jsonb_array_elements(partes) LOOP
   ident:=(parte->>'id')::uuid;
   IF ident IS NULL OR ident=ANY(ids) THEN RAISE EXCEPTION 'CONF_DUPLICIDADE'; END IF;
   ids:=array_append(ids,ident);
   -- Só persistir componentes completos com valores realmente informados.
   PERFORM financeiro_hml.conf_validar(parte,fonte.natureza);
  END LOOP;
  c.dados:=d; c.componentes:=partes; c.preparado_por:=auth.uid();
  c.estado:=CASE acao WHEN 'divergir' THEN 'divergente' ELSE 'em_conferencia' END;
  c.aprovado_por:=NULL; c.aprovado_em:=NULL; c.versao_aprovada:=NULL; c.autorizado_por:=NULL; c.autorizado_em:=NULL;
 ELSIF acao='encaminhar' THEN
  IF c.estado NOT IN ('em_conferencia','divergente','devolvido') THEN RAISE EXCEPTION 'CONF_ESTADO'; END IF;
  PERFORM financeiro_hml.conf_validar_grupo(c.dados,c.componentes,fonte.natureza); c.estado:='encaminhado';
 ELSIF acao='aprovar' THEN
  IF c.estado<>'encaminhado' THEN RAISE EXCEPTION 'CONF_ESTADO'; END IF;
  IF c.preparado_por=auth.uid() THEN RAISE EXCEPTION 'CONF_REVISOR_DISTINTO'; END IF;
  PERFORM financeiro_hml.conf_validar_grupo(c.dados,c.componentes,fonte.natureza);
  c.estado:='conciliado'; c.aprovado_por:=auth.uid(); c.aprovado_em:=clock_timestamp(); c.versao_aprovada:=c.versao+1;
 ELSIF acao='devolver' THEN
  IF c.estado NOT IN ('encaminhado','conciliado','autorizado') THEN RAISE EXCEPTION 'CONF_ESTADO'; END IF;
  c.estado:='devolvido'; c.aprovado_por:=NULL; c.aprovado_em:=NULL; c.versao_aprovada:=NULL; c.autorizado_por:=NULL; c.autorizado_em:=NULL;
 ELSIF acao='autorizar' THEN
  IF c.estado<>'conciliado' OR c.versao_aprovada<>c.versao OR c.aprovado_por IS NULL THEN RAISE EXCEPTION 'CONF_ESTADO'; END IF;
  PERFORM financeiro_hml.conf_validar_grupo(c.dados,c.componentes,fonte.natureza);
  c.estado:='autorizado'; c.autorizado_por:=auth.uid(); c.autorizado_em:=clock_timestamp(); c.versao_aprovada:=c.versao+1;
 END IF;
 UPDATE financeiro_hml.conferencia_controles SET dados=c.dados,componentes=c.componentes,estado=c.estado,versao=c.versao+1,preparado_por=c.preparado_por,aprovado_por=c.aprovado_por,aprovado_em=c.aprovado_em,versao_aprovada=c.versao_aprovada,autorizado_por=c.autorizado_por,autorizado_em=c.autorizado_em,justificativa=nullif(motivo,''),atualizado_por=auth.uid(),atualizado_em=clock_timestamp(),acao=acao WHERE id=c.id;
 RETURN financeiro_hml.conferencia_consultar(jsonb_build_object('id',c.id));
END $$;

CREATE FUNCTION financeiro_hml.conferencia_historico(p jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,financeiro_hml,pg_temp AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT financeiro_hml.tem_papel(ARRAY['admin_geral','admin_financeiro','analista_financeiro','consulta_gerencial']) THEN RAISE EXCEPTION 'CONF_PERMISSAO' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS(SELECT 1 FROM financeiro_hml.tesouraria_conferencias WHERE id=(p->>'id')::uuid) THEN RAISE EXCEPTION 'CONF_INEXISTENTE'; END IF;
 RETURN coalesce((SELECT jsonb_agg(ev ORDER BY numero DESC) FROM (
  SELECT a.id::text numero,a.acao, a.depois->>'acao' acao_fluxo,a.antes->>'estado' estado_anterior,coalesce(a.depois->>'estado',a.depois->>'status') estado_posterior,a.usuario_id,
   pr.nome responsavel,a.ocorrido_em,a.depois->>'justificativa' justificativa
  FROM financeiro_hml.auditoria a LEFT JOIN financeiro_hml.perfis pr ON pr.usuario_id=a.usuario_id
  WHERE a.registro_id=(p->>'id')::uuid AND a.tabela IN ('tesouraria_conferencias','conferencia_controles') AND (p->>'antes' IS NULL OR a.id<(p->>'antes')::bigint)
  ORDER BY a.id DESC LIMIT 50
 ) ev),'[]'::jsonb);
END $$;
CREATE FUNCTION financeiro_hml.conferencia_opcoes() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,financeiro_hml,pg_temp AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT financeiro_hml.tem_papel(ARRAY['admin_geral','admin_financeiro','analista_financeiro','consulta_gerencial']) THEN RAISE EXCEPTION 'CONF_PERMISSAO' USING ERRCODE='42501'; END IF;
 RETURN jsonb_build_object('contas',coalesce((SELECT jsonb_agg(c.id) FROM financeiro_hml.contas_preparadas p JOIN financeiro_hml.contas_financeiras c ON c.id=p.conta_financeira_id WHERE p.situacao='habilitada' AND c.ativo),'[]'),'regras',coalesce((SELECT jsonb_agg(to_jsonb(r)) FROM financeiro_hml.conferencia_regras_oficiais r),'[]'),'operacao_liberada',EXISTS(SELECT 1 FROM financeiro_hml.conferencia_operacao_autorizada),'corte',(SELECT corte FROM financeiro_hml.conferencia_operacao_autorizada));
END $$;
-- Lançamento revisado: nunca altera a fonte, usa vínculo auxiliar e grupo atômico.
CREATE OR REPLACE FUNCTION financeiro_hml.tesouraria_lancar_conferencia(p jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,financeiro_hml,pg_temp AS $$
DECLARE fonte financeiro_hml.tesouraria_conferencias; c financeiro_hml.conferencia_controles; parte jsonb; partes jsonb; ident uuid; v text; dt text; r jsonb; ids jsonb:='[]'; corte date;
BEGIN
 IF auth.uid() IS NULL OR NOT financeiro_hml.tem_papel(ARRAY['admin_geral','admin_financeiro']) THEN RAISE EXCEPTION 'CONF_PERMISSAO' USING ERRCODE='42501'; END IF;
 SELECT * INTO fonte FROM financeiro_hml.tesouraria_conferencias WHERE id=(p->>'id')::uuid;
 IF NOT FOUND THEN RAISE EXCEPTION 'CONF_INEXISTENTE'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('conf_grupo:'||fonte.grupo_id::text,0));
 SELECT * INTO fonte FROM financeiro_hml.tesouraria_conferencias WHERE id=fonte.id FOR SHARE;
 SELECT * INTO c FROM financeiro_hml.conferencia_controles WHERE id=fonte.id FOR UPDATE;
 IF NOT FOUND OR p->>'versao' IS NULL THEN RAISE EXCEPTION 'CONF_APROVACAO'; END IF;
 IF c.estado='lancado' THEN RETURN jsonb_build_object('id',(SELECT operacao_id FROM financeiro_hml.conferencia_vinculos WHERE conferencia_id=c.id ORDER BY componente_id LIMIT 1),'repetida',true); END IF;
 IF c.estado<>'autorizado' OR c.versao<>(p->>'versao')::bigint OR c.versao_aprovada<>c.versao OR c.fonte_hash<>md5(to_jsonb(fonte)::text) THEN RAISE EXCEPTION 'CONF_APROVACAO'; END IF;
 SELECT a.corte INTO corte FROM financeiro_hml.conferencia_operacao_autorizada a WHERE a.id FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'CONF_OPERACAO_BLOQUEADA'; END IF;
 IF fonte.data_ocorrencia<corte THEN RAISE EXCEPTION 'CONF_HISTORICO'; END IF;
 IF fonte.operacao_id IS NOT NULL OR EXISTS(SELECT 1 FROM financeiro_hml.tesouraria_conferencias s WHERE s.grupo_id=fonte.grupo_id AND s.id<>fonte.id) THEN RAISE EXCEPTION 'CONF_DUPLICIDADE'; END IF;
 IF EXISTS(SELECT 1 FROM financeiro_hml.integracao_itens i WHERE i.conferencia_id=fonte.id AND (i.duplicidade_candidata_id IS NOT NULL OR i.situacao IN ('alterado','possivel_duplicidade'))) THEN RAISE EXCEPTION 'CONF_DUPLICIDADE'; END IF;
 PERFORM financeiro_hml.conf_validar_grupo(c.dados,c.componentes,fonte.natureza);
 partes:=CASE c.dados->>'forma' WHEN 'misto' THEN c.componentes ELSE jsonb_build_array(c.dados||jsonb_build_object('id',fonte.identificador_origem)) END;
 -- Ordem global das contas evita inversões entre grupos independentes.
 PERFORM 1 FROM financeiro_hml.contas_financeiras WHERE id IN(SELECT (value->>'conta_financeira_id')::uuid FROM jsonb_array_elements(partes)) ORDER BY id FOR UPDATE;
 FOR parte IN SELECT value FROM jsonb_array_elements(partes) ORDER BY value->>'id' LOOP
  ident:=(parte->>'id')::uuid;
  v:=CASE WHEN parte->>'forma' IN ('credito','debito','parcelado') THEN parte->>'valor_liquido' ELSE parte->>'valor_bruto' END;
  dt:=CASE WHEN parte->>'forma' IN ('credito','debito','parcelado') THEN parte->>'data_liquidacao' WHEN parte->>'forma'='boleto' THEN parte->>'boleto_pagamento' ELSE parte->>'data_ocorrencia' END;
  r:=financeiro_hml.tes_executar(jsonb_build_object('tipo',fonte.natureza,'chave',ident,'data',dt,'descricao',parte->>'descricao','valor',v,CASE fonte.natureza WHEN 'entrada' THEN 'destino' ELSE 'origem' END,parte->>'conta_financeira_id','plano',parte->>'plano_conta_id','centro',parte->>'centro_custo_id'));
  INSERT INTO financeiro_hml.conferencia_vinculos(conferencia_id,componente_id,referencia_origem,operacao_id) VALUES(c.id,ident,fonte.referencia_origem||CASE c.dados->>'forma' WHEN 'misto' THEN ':'||ident::text ELSE '' END,(r->>'id')::uuid);
  ids:=ids||jsonb_build_array(r->>'id');
 END LOOP;
 UPDATE financeiro_hml.conferencia_controles SET estado='lancado',versao=versao+1,atualizado_por=auth.uid(),atualizado_em=clock_timestamp(),acao='lancar' WHERE id=c.id;
 RETURN jsonb_build_object('id',ids->>0,'operacoes',ids,'repetida',false);
END $$;
-- Caminho avulso não prova origem/approval: fechado, não tenta deduzir duplicidade por valor.
CREATE OR REPLACE FUNCTION financeiro_hml.tesouraria_lancar(p jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,financeiro_hml AS $$
BEGIN RAISE EXCEPTION 'CONF_FLUXO_OBRIGATORIO'; END $$;
CREATE OR REPLACE FUNCTION financeiro_hml.tesouraria_transferir(p jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,financeiro_hml AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT financeiro_hml.tem_papel(ARRAY['admin_geral','admin_financeiro']) THEN RAISE EXCEPTION 'CONF_PERMISSAO' USING ERRCODE='42501'; END IF;
 -- Não liberar movimentação real implicitamente na instalação da Etapa 2.
 RAISE EXCEPTION 'CONF_OPERACAO_BLOQUEADA';
END $$;
-- Fechar DML legado sem alterar políticas/identidade/RPCs internos da M5.
REVOKE INSERT (referencia_origem,grupo_id,valor_total_grupo,natureza,forma,data_ocorrencia,descricao,valor_bruto,valor_liquido,data_liquidacao,boleto_vencimento,boleto_pagamento,boleto_status,conta_financeira_id,plano_conta_id,centro_custo_id,status,observacao) ON financeiro_hml.tesouraria_conferencias FROM authenticated;
REVOKE UPDATE (grupo_id,valor_total_grupo,forma,data_ocorrencia,descricao,valor_bruto,valor_liquido,data_liquidacao,boleto_vencimento,boleto_pagamento,boleto_status,conta_financeira_id,plano_conta_id,centro_custo_id,status,observacao) ON financeiro_hml.tesouraria_conferencias FROM authenticated;
REVOKE ALL ON FUNCTION financeiro_hml.conf_dinheiro(text),financeiro_hml.conf_validar(jsonb,text),financeiro_hml.conf_validar_grupo(jsonb,jsonb,text),financeiro_hml.conferencia_consultar(jsonb),financeiro_hml.conferencia_comandar(jsonb),financeiro_hml.conferencia_historico(jsonb),financeiro_hml.conferencia_opcoes() FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION financeiro_hml.conferencia_consultar(jsonb),financeiro_hml.conferencia_comandar(jsonb),financeiro_hml.conferencia_historico(jsonb),financeiro_hml.conferencia_opcoes() TO authenticated;
COMMIT;
