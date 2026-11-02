-- EVIDENCIA ARQUIVADA PARA ENSAIO LOCAL; NAO APLICAR NO HML.
CREATE OR REPLACE FUNCTION financeiro_hml.autoria()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'financeiro_hml', 'pg_temp'
AS $function$
begin
  if tg_op = 'INSERT' then
    new.criado_em := now();
    if tg_table_name <> 'plano_contas' then new.criado_por := auth.uid(); end if;
  else
    new.criado_em := old.criado_em;
    if tg_table_name <> 'plano_contas' then new.criado_por := old.criado_por; end if;
  end if;
  return new;
end $function$
;
CREATE OR REPLACE FUNCTION financeiro_hml.autoria_cadastro()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'financeiro_hml', 'pg_temp'
AS $function$
begin
  if tg_op = 'INSERT' then
    new.criado_em := now(); new.criado_por := auth.uid();
    new.atualizado_em := null; new.atualizado_por := null;
  else
    if new.id <> old.id then raise exception 'Identificador não pode ser alterado'; end if;
    new.criado_em := old.criado_em; new.criado_por := old.criado_por;
    new.atualizado_em := now(); new.atualizado_por := auth.uid();
  end if;
  return new;
end $function$
;
CREATE OR REPLACE FUNCTION financeiro_hml.diagnostico_finalizar(p_tentativa uuid, p_usuario uuid, p_http integer, p_duracao integer, p_categoria text, p_tipo text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'financeiro_hml', 'pg_temp'
AS $function$
DECLARE t financeiro_hml.diagnostico_tentativas; compativel boolean;
BEGIN
  IF current_setting('request.jwt.claim.role',true) IS DISTINCT FROM 'service_role'
     AND coalesce(current_setting('request.jwt.claims',true),'{}')::jsonb->>'role' IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='DIAG_SERVIDOR_OBRIGATORIO';
  END IF;
  compativel := coalesce(CASE p_categoria
       WHEN 'leitura_valida' THEN p_http BETWEEN 200 AND 299 AND p_tipo IS NULL
       WHEN 'autenticacao_origem' THEN p_http = 401 AND p_tipo IS NULL
       WHEN 'autorizacao_origem' THEN p_http = 403 AND p_tipo IS NULL
       WHEN 'limite_origem' THEN p_http = 429 AND p_tipo IS NULL
       WHEN 'erro_interno_origem' THEN p_http BETWEEN 500 AND 599 AND p_tipo IS NULL
       WHEN 'http_origem' THEN p_http BETWEEN 300 AND 499 AND p_http NOT IN (401,403,429) AND p_tipo IS NULL
       WHEN 'resposta_invalida_origem' THEN (p_http IS NULL OR p_http BETWEEN 200 AND 299) AND p_tipo IS NULL
       WHEN 'timeout_origem' THEN (p_http IS NULL AND p_tipo IS NOT NULL) OR (p_http BETWEEN 200 AND 299 AND p_tipo IS NULL)
       WHEN 'rede_origem' THEN p_http IS NULL AND p_tipo IS NOT NULL
       WHEN 'invocacao_origem' THEN p_http IS NULL AND p_tipo IS NOT NULL
       WHEN 'conexao_origem' THEN p_http IS NULL AND p_tipo IS NOT NULL
       WHEN 'configuracao_origem' THEN p_http IS NULL AND p_tipo IS NULL
       WHEN 'leitura_nao_autorizada' THEN p_http IS NULL AND p_tipo IS NULL
       WHEN 'falha_interna' THEN p_http IS NULL AND p_tipo IS NULL
       ELSE false END, false);
  IF p_categoria IS NULL OR btrim(p_categoria) = '' OR p_duracao IS NULL OR p_duracao < 0 OR p_duracao > 600000
     OR (p_tipo IS NOT NULL AND p_tipo <> ALL(ARRAY['TypeError','Error','AbortError','TimeoutError','DOMException','nao_identificado','codigo_dns','codigo_tls','codigo_conexao']))
     OR NOT compativel THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='DIAG_CONCLUSAO_INVALIDA';
  END IF;
  IF NOT pg_try_advisory_xact_lock(527041,5) THEN RETURN jsonb_build_object('registrada',false); END IF;
  SELECT * INTO t FROM financeiro_hml.diagnostico_tentativas WHERE id=p_tentativa AND usuario_id=p_usuario FOR UPDATE;
  IF NOT FOUND OR t.estado <> 'reservada' THEN RETURN jsonb_build_object('registrada',false); END IF;
  UPDATE financeiro_hml.diagnostico_tentativas SET
    estado=CASE WHEN p_categoria='leitura_valida' THEN 'concluida' ELSE 'falha' END,
    status_http=p_http,duracao_ms=p_duracao,categoria=p_categoria,tipo_excecao=p_tipo,concluido_em=clock_timestamp()
    WHERE id=t.id;
  RETURN jsonb_build_object('registrada',true);
END $function$
;
CREATE OR REPLACE FUNCTION financeiro_hml.diagnostico_reservar(p_autorizacao uuid, p_recurso text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'financeiro_hml', 'pg_temp'
AS $function$
DECLARE a financeiro_hml.diagnostico_autorizacoes; motivo text; tentativa uuid; n smallint;
BEGIN
  IF auth.uid() IS NULL OR NOT financeiro_hml.tem_papel(ARRAY['admin_geral','admin_financeiro']) THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='DIAG_ACESSO_NEGADO';
  END IF;
  IF p_recurso IS NULL OR p_recurso <> ALL(ARRAY['formas_pagamento','recebimentos','pagamentos','recebimentos_titulos','titulos']) THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='DIAG_RECURSO_INVALIDO';
  END IF;
  SELECT * INTO a FROM financeiro_hml.diagnostico_autorizacoes WHERE id=p_autorizacao AND administrador_id=auth.uid();
  IF NOT FOUND THEN RETURN jsonb_build_object('permitida',false,'categoria','autorizacao_inativa'); END IF;
  IF NOT pg_try_advisory_xact_lock(527041,5) THEN motivo := 'concorrencia';
  ELSE
    SELECT * INTO a FROM financeiro_hml.diagnostico_autorizacoes WHERE id=p_autorizacao FOR UPDATE;
    IF NOT a.ativo OR a.encerra_em <= clock_timestamp() THEN motivo := 'autorizacao_inativa';
    ELSIF EXISTS(SELECT 1 FROM financeiro_hml.diagnostico_tentativas WHERE estado='reservada') THEN motivo := 'concorrencia';
    ELSIF a.consumidas >= 5 THEN motivo := 'limite';
    ELSIF EXISTS(SELECT 1 FROM financeiro_hml.diagnostico_tentativas WHERE autorizacao_id=a.id AND recurso=p_recurso AND ordinal IS NOT NULL) THEN motivo := 'repeticao';
    END IF;
  END IF;
  IF motivo IS NOT NULL THEN
    INSERT INTO financeiro_hml.diagnostico_tentativas(autorizacao_id,usuario_id,recurso,estado,categoria,concluido_em)
      VALUES(a.id,auth.uid(),p_recurso,'bloqueada',motivo,clock_timestamp());
    RETURN jsonb_build_object('permitida',false,'categoria',motivo);
  END IF;
  n := a.consumidas + 1;
  INSERT INTO financeiro_hml.diagnostico_tentativas(autorizacao_id,usuario_id,recurso,ordinal,estado)
    VALUES(a.id,auth.uid(),p_recurso,n,'reservada') RETURNING id INTO tentativa;
  UPDATE financeiro_hml.diagnostico_autorizacoes SET consumidas=n WHERE id=a.id;
  RETURN jsonb_build_object('permitida',true,'tentativa_id',tentativa,'ordinal',n);
END $function$
;
CREATE OR REPLACE FUNCTION financeiro_hml.integracao_concluir(p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'financeiro_hml', 'pg_temp'
AS $function$
DECLARE
  s financeiro_hml.integracao_sincronizacoes;
  it jsonb;
  existente financeiro_hml.integracao_itens;
  dup uuid;
  conf_id uuid;
  v_novos int := 0; v_exist int := 0; v_div int := 0; v_env int := 0;
  v_hash text; v_tipo text; v_forma text; v_data date; v_bruto numeric; v_liq numeric; v_desc text;
  v_servidor boolean := coalesce(auth.role(),'') = 'service_role';
BEGIN
  IF NOT v_servidor AND (auth.uid() IS NULL OR NOT financeiro_hml.tem_papel(ARRAY['admin_geral','admin_financeiro'])) THEN
    RAISE EXCEPTION 'INT_PERMISSAO' USING ERRCODE='42501';
  END IF;
  SELECT * INTO s FROM financeiro_hml.integracao_sincronizacoes WHERE id = (p->>'id')::uuid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'INT_SYNC_INEXISTENTE'; END IF;
  IF (s.modo = 'automatica') <> v_servidor THEN
    RAISE EXCEPTION 'INT_PERMISSAO' USING ERRCODE='42501';
  END IF;
  IF s.status <> 'em_andamento' THEN
    RETURN jsonb_build_object('id', s.id, 'repetida', true, 'status', s.status);
  END IF;

  IF (p->>'status') = 'falha' THEN
    UPDATE financeiro_hml.integracao_sincronizacoes
       SET status='falha', concluido_em=clock_timestamp(), erros=p->'erros'
     WHERE id=s.id;
    RETURN jsonb_build_object('id', s.id, 'repetida', false, 'status', 'falha');
  END IF;

  FOR it IN SELECT * FROM jsonb_array_elements(coalesce(p->'itens','[]'::jsonb)) LOOP
    v_tipo := it->>'tipo';
    v_hash := md5(it->>'canonico');
    v_forma := coalesce(it->'resumo'->>'forma','indefinida');
    v_data := (it->'resumo'->>'data')::date;
    v_bruto := (it->'resumo'->>'valor_bruto')::numeric;
    v_liq := nullif(it->'resumo'->>'valor_liquido','')::numeric;
    v_desc := left(coalesce(nullif(it->'resumo'->>'descricao',''),'Recebimento GESTÃO ITV'),500);

    SELECT * INTO existente FROM financeiro_hml.integracao_itens
     WHERE referencia_origem = it->>'referencia' FOR UPDATE;

    IF NOT FOUND THEN
      v_novos := v_novos + 1;
      IF (v_tipo IN ('pagamento','recebimento_titulo')) THEN
        SELECT c.id INTO dup FROM financeiro_hml.tesouraria_conferencias c
         WHERE c.referencia_origem LIKE 'CONTROLE\_CAIXA\_%' ESCAPE '\'
           AND c.data_ocorrencia = v_data AND c.valor_bruto = v_bruto AND c.forma = v_forma
         ORDER BY c.criado_em LIMIT 1;
        IF dup IS NOT NULL THEN
          INSERT INTO financeiro_hml.integracao_itens
            (referencia_origem,tipo,conteudo_hash,resumo,situacao,duplicidade_candidata_id,primeira_sincronizacao_id,ultima_sincronizacao_id)
          VALUES (it->>'referencia',v_tipo,v_hash,it->'resumo','possivel_duplicidade',dup,s.id,s.id);
          v_div := v_div + 1;
        ELSE
          INSERT INTO financeiro_hml.tesouraria_conferencias
            (referencia_origem,natureza,forma,data_ocorrencia,descricao,valor_bruto,valor_liquido,
             boleto_vencimento,boleto_pagamento,boleto_status,status,observacao)
          VALUES
            (it->>'referencia','entrada',v_forma,v_data,v_desc,v_bruto,v_liq,
             nullif(it->'resumo'->>'boleto_vencimento','')::date,
             CASE WHEN (v_tipo = 'recebimento_titulo') THEN v_data END,
             CASE WHEN (v_tipo = 'recebimento_titulo') THEN 'pago' END,
             'pendente',
             left('Origem: GESTÃO ITV · '||coalesce(it->'resumo'->>'contexto',''),500))
          RETURNING id INTO conf_id;
          INSERT INTO financeiro_hml.integracao_itens
            (referencia_origem,tipo,conteudo_hash,resumo,situacao,conferencia_id,primeira_sincronizacao_id,ultima_sincronizacao_id)
          VALUES (it->>'referencia',v_tipo,v_hash,it->'resumo','enviado_conferencia',conf_id,s.id,s.id);
          v_env := v_env + 1;
        END IF;
      ELSE
        INSERT INTO financeiro_hml.integracao_itens
          (referencia_origem,tipo,conteudo_hash,resumo,situacao,primeira_sincronizacao_id,ultima_sincronizacao_id)
        VALUES (it->>'referencia',v_tipo,v_hash,it->'resumo','novo',s.id,s.id);
      END IF;
    ELSE
      IF (existente.conteudo_hash <> v_hash) THEN
        UPDATE financeiro_hml.integracao_itens
           SET conteudo_hash=v_hash, resumo=it->'resumo', situacao='alterado',
               ultima_sincronizacao_id=s.id, atualizado_em=clock_timestamp()
         WHERE id=existente.id;
        v_div := v_div + 1;
      ELSE
        UPDATE financeiro_hml.integracao_itens
           SET ultima_sincronizacao_id=s.id,
               situacao = CASE WHEN (situacao IN ('novo','alterado')) THEN situacao ELSE 'existente' END,
               atualizado_em=clock_timestamp()
         WHERE id=existente.id;
        v_exist := v_exist + 1;
      END IF;
    END IF;
  END LOOP;

  UPDATE financeiro_hml.integracao_sincronizacoes
     SET status='concluida', concluido_em=clock_timestamp(),
         consultados=jsonb_array_length(coalesce(p->'itens','[]'::jsonb)),
         novos=v_novos, existentes=v_exist, divergentes=v_div, enviados_conferencia=v_env,
         erros=p->'erros'
   WHERE id=s.id;
  RETURN jsonb_build_object('id',s.id,'repetida',false,'status','concluida',
    'consultados',jsonb_array_length(coalesce(p->'itens','[]'::jsonb)),
    'novos',v_novos,'existentes',v_exist,'divergentes',v_div,'enviados_conferencia',v_env);
END $function$
;
CREATE OR REPLACE FUNCTION financeiro_hml.integracao_estado_manual()
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'financeiro_hml', 'pg_temp'
AS $function$
DECLARE
  agora timestamptz := clock_timestamp();
  local_agora timestamp := agora AT TIME ZONE 'America/Manaus';
  ultimo timestamptz;
  sucesso_hoje boolean;
  andamento boolean;
  motivo text;
  liberacao timestamptz;
BEGIN
  IF auth.uid() IS NULL OR NOT financeiro_hml.tem_papel(ARRAY['admin_geral','admin_financeiro']) THEN
    RAISE EXCEPTION 'INT_PERMISSAO' USING ERRCODE='42501';
  END IF;
  SELECT max(coalesce(concluido_em,iniciado_em)) INTO ultimo
    FROM financeiro_hml.integracao_sincronizacoes
    WHERE modo='manual' AND status='concluida';
  sucesso_hoje := ultimo IS NOT NULL AND (ultimo AT TIME ZONE 'America/Manaus')::date = local_agora::date;
  SELECT EXISTS(SELECT 1 FROM financeiro_hml.integracao_sincronizacoes
    WHERE status='em_andamento' AND iniciado_em >= agora - interval '15 minutes') INTO andamento;
  liberacao := (local_agora::date + time '18:30') AT TIME ZONE 'America/Manaus';
  IF sucesso_hoje THEN
    motivo := 'sucesso_diario';
    liberacao := (local_agora::date + 1 + time '18:30') AT TIME ZONE 'America/Manaus';
  ELSIF local_agora::time < time '18:30' THEN motivo := 'horario';
  ELSIF andamento THEN motivo := 'em_andamento';
  ELSE motivo := 'liberada';
  END IF;
  RETURN jsonb_build_object('permitida',motivo='liberada','motivo',motivo,
    'agora_servidor',agora,'ultima_sucesso',ultimo,'proxima_liberacao',liberacao);
END $function$
;
CREATE OR REPLACE FUNCTION financeiro_hml.integracao_expirar_travadas()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'financeiro_hml', 'pg_temp'
AS $function$
DECLARE n integer;
BEGIN
  UPDATE financeiro_hml.integracao_sincronizacoes
     SET status='falha', concluido_em=clock_timestamp(),
         erros=coalesce(erros,'[]'::jsonb) || '[{"etapa":"tempo_esgotado"}]'::jsonb
   WHERE status='em_andamento' AND iniciado_em < clock_timestamp() - interval '15 minutes';
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $function$
;
CREATE OR REPLACE FUNCTION financeiro_hml.integracao_iniciar()
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'financeiro_hml', 'pg_temp'
AS $function$
DECLARE s uuid; controle jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT financeiro_hml.tem_papel(ARRAY['admin_geral','admin_financeiro']) THEN
    RAISE EXCEPTION 'INT_PERMISSAO' USING ERRCODE='42501';
  END IF;
  -- Serializa a checagem com INSERT/UPDATE/conclusão de qualquer conexão.
  -- NOWAIT preserva recusa rápida sem aguardar uma sincronização concorrente.
  BEGIN
    LOCK TABLE financeiro_hml.integracao_sincronizacoes IN SHARE ROW EXCLUSIVE MODE NOWAIT;
  EXCEPTION WHEN lock_not_available THEN
    RAISE EXCEPTION 'INT_EM_ANDAMENTO' USING ERRCODE='55P03';
  END;
  controle := financeiro_hml.integracao_estado_manual();
  IF controle->>'motivo' = 'sucesso_diario' THEN
    RAISE EXCEPTION 'INT_SUCESSO_DIARIO' USING ERRCODE='P0001';
  END IF;
  IF controle->>'motivo' = 'horario' THEN
    RAISE EXCEPTION 'INT_HORARIO_MANUAL' USING ERRCODE='P0001';
  END IF;
  IF controle->>'motivo' = 'em_andamento' THEN
    RAISE EXCEPTION 'INT_EM_ANDAMENTO' USING ERRCODE='55P03';
  END IF;
  PERFORM financeiro_hml.integracao_expirar_travadas();
  BEGIN
    INSERT INTO financeiro_hml.integracao_sincronizacoes(responsavel_id,modo)
      VALUES(auth.uid(),'manual') RETURNING id INTO s;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'INT_EM_ANDAMENTO' USING ERRCODE='55P03';
  END;
  RETURN s;
END $function$
;
CREATE OR REPLACE FUNCTION financeiro_hml.integracao_iniciar_automatica(p_inicio date, p_fim date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'financeiro_hml', 'pg_temp'
AS $function$
DECLARE s uuid; hoje date := (clock_timestamp() AT TIME ZONE 'America/Manaus')::date;
BEGIN
  IF coalesce(auth.role(),'') <> 'service_role' THEN
    RAISE EXCEPTION 'INT_PERMISSAO' USING ERRCODE='42501';
  END IF;
  IF p_inicio IS NULL OR p_fim IS NULL OR p_fim < p_inicio OR p_fim - p_inicio > 31 OR p_fim > hoje THEN
    RAISE EXCEPTION 'INT_JANELA_INVALIDA' USING ERRCODE='22023';
  END IF;
  PERFORM financeiro_hml.integracao_expirar_travadas();
  IF EXISTS (SELECT 1 FROM financeiro_hml.integracao_sincronizacoes
              WHERE modo='automatica' AND status='concluida'
                AND (iniciado_em AT TIME ZONE 'America/Manaus')::date = hoje) THEN
    RETURN jsonb_build_object('pular', true, 'motivo', 'ja_concluida_hoje');
  END IF;
  IF (SELECT count(*) FROM financeiro_hml.integracao_sincronizacoes
       WHERE modo='automatica' AND (iniciado_em AT TIME ZONE 'America/Manaus')::date = hoje) >= 6 THEN
    RETURN jsonb_build_object('pular', true, 'motivo', 'limite_tentativas');
  END IF;
  BEGIN
    INSERT INTO financeiro_hml.integracao_sincronizacoes(responsavel_id, modo, janela_inicio, janela_fim)
    VALUES (NULL, 'automatica', p_inicio, p_fim) RETURNING id INTO s;
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('pular', true, 'motivo', 'em_andamento');
  END;
  RETURN jsonb_build_object('pular', false, 'id', s);
END $function$
;
CREATE OR REPLACE FUNCTION financeiro_hml.papel_atual()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'financeiro_hml', 'pg_temp'
AS $function$
  select papel::text from financeiro_hml.perfis where usuario_id = auth.uid() and ativo $function$
;
CREATE OR REPLACE FUNCTION financeiro_hml.pc_hierarquia()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'financeiro_hml', 'pg_temp'
AS $function$
declare pai record; atual uuid; passos int := 0;
begin
  if new.conta_pai_id is not null then
    if new.conta_pai_id = new.id then raise exception 'PC_CICLO: conta não pode ser pai de si mesma'; end if;
    select id, natureza, ativo into pai from financeiro_hml.plano_contas where id = new.conta_pai_id;
    if not found then raise exception 'PC_PAI_INEXISTENTE: conta-pai não encontrada'; end if;
    if pai.natureza <> new.natureza then raise exception 'PC_NATUREZA: natureza deve ser igual à da conta-pai'; end if;
    if new.ativo and not pai.ativo then raise exception 'PC_PAI_INATIVO: conta-pai está inativa'; end if;
    atual := new.conta_pai_id;
    while atual is not null loop
      if atual = new.id then raise exception 'PC_CICLO: a hierarquia formaria um ciclo'; end if;
      passos := passos + 1; if passos > 50 then raise exception 'PC_CICLO: hierarquia muito profunda'; end if;
      select conta_pai_id into atual from financeiro_hml.plano_contas where id = atual;
    end loop;
  end if;
  if tg_op = 'UPDATE' then
    if old.ativo and not new.ativo and exists (select 1 from financeiro_hml.plano_contas where conta_pai_id = new.id and ativo) then
      raise exception 'PC_FILHAS_ATIVAS: inative primeiro as contas-filhas';
    end if;
    if new.natureza <> old.natureza and exists (select 1 from financeiro_hml.plano_contas where conta_pai_id = new.id) then
      raise exception 'PC_NATUREZA: conta com filhas não pode mudar de natureza';
    end if;
  end if;
  return new;
end $function$
;
CREATE OR REPLACE FUNCTION financeiro_hml.perfis_protecao()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'financeiro_hml', 'pg_temp'
AS $function$
begin
  if tg_op = 'UPDATE' then
    if new.usuario_id <> old.usuario_id then raise exception 'Alteração de usuario_id não permitida'; end if;
    new.criado_em := old.criado_em;
  end if;
  if tg_op in ('UPDATE','DELETE') and old.papel = 'admin_geral' and old.ativo
     and (tg_op = 'DELETE' or new.papel <> 'admin_geral' or not new.ativo) then
    if not exists (select 1 from financeiro_hml.perfis where papel = 'admin_geral' and ativo and usuario_id <> old.usuario_id) then
      raise exception 'Não é permitido remover o último Administrador Geral ativo';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $function$
;
CREATE OR REPLACE FUNCTION financeiro_hml.registrar_auditoria()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'financeiro_hml', 'pg_temp'
AS $function$
declare a text;
begin
  if tg_op = 'INSERT' then a := 'criar';
  elsif old.ativo and not new.ativo then a := 'inativar';
  elsif not old.ativo and new.ativo then a := 'reativar';
  else a := 'alterar'; end if;
  insert into financeiro_hml.auditoria (tabela, registro_id, acao, usuario_id, antes, depois)
  values (tg_table_name, new.id, a, auth.uid(),
          case when tg_op = 'UPDATE' then to_jsonb(old) end, to_jsonb(new));
  return null;
end $function$
;
CREATE OR REPLACE FUNCTION financeiro_hml.tem_papel(p text[])
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'financeiro_hml', 'pg_temp'
AS $function$
  select coalesce(financeiro_hml.papel_atual() = any(p), false) $function$
;
CREATE OR REPLACE FUNCTION financeiro_hml.tes_conf_auditar()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'financeiro_hml', 'pg_temp'
AS $function$
BEGIN
  INSERT INTO financeiro_hml.auditoria(tabela, registro_id, acao, usuario_id, antes, depois)
  VALUES (TG_TABLE_NAME, NEW.id, CASE TG_OP WHEN 'INSERT' THEN 'criar' ELSE 'alterar' END, auth.uid(),
          CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) END, to_jsonb(NEW));
  RETURN NULL;
END $function$
;
CREATE OR REPLACE FUNCTION financeiro_hml.tes_conf_proteger()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'financeiro_hml', 'pg_temp'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.criado_por := auth.uid(); NEW.criado_em := clock_timestamp();
    IF auth.uid() IS NOT NULL THEN NEW.operacao_id := NULL; NEW.lancado_por := NULL; NEW.lancado_em := NULL; NEW.original := NULL; END IF;
  ELSE
    IF OLD.operacao_id IS NOT NULL THEN RAISE EXCEPTION 'TES_CONF_LANCADA: conferência já lançada é imutável'; END IF;
    NEW.id := OLD.id; NEW.identificador_origem := OLD.identificador_origem; NEW.referencia_origem := OLD.referencia_origem;
    NEW.original := OLD.original; NEW.natureza := OLD.natureza; NEW.criado_por := OLD.criado_por; NEW.criado_em := OLD.criado_em;
    NEW.atualizado_por := auth.uid(); NEW.atualizado_em := clock_timestamp();
  END IF;
  RETURN NEW;
END $function$
;
CREATE OR REPLACE FUNCTION financeiro_hml.tes_conta_exige_abertura()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'financeiro_hml', 'pg_temp'
AS $function$
BEGIN
 IF (SELECT count(*) FROM financeiro_hml.tesouraria_operacoes o WHERE o.tipo='abertura' AND coalesce(o.conta_origem_id,o.conta_destino_id)=NEW.id)<>1 THEN RAISE EXCEPTION 'TES_INTEGRIDADE: conta sem abertura unica'; END IF;
 RETURN NULL;
END $function$
;
CREATE OR REPLACE FUNCTION financeiro_hml.tes_executar(p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'financeiro_hml', 'pg_temp'
AS $function$
DECLARE uid uuid:=auth.uid(); chave uuid; tipo text; valor numeric; abertura numeric; origem uuid; destino uuid; pc uuid; cc uuid; dt date; descricao text; motivo text; oid uuid:=gen_random_uuid(); cid uuid; snap jsonb; conta record; categoria record; anterior financeiro_hml.tesouraria_operacoes; original financeiro_hml.tesouraria_operacoes; req jsonb; resultado jsonb; campo text;
BEGIN
 IF uid IS NULL OR NOT financeiro_hml.tem_papel(ARRAY['admin_geral','admin_financeiro','analista_financeiro']) THEN RAISE EXCEPTION 'TES_PERMISSAO' USING ERRCODE='42501'; END IF;
 IF p IS NULL OR jsonb_typeof(p)<>'object' THEN RAISE EXCEPTION 'TES_DADOS'; END IF;
 tipo:=p->>'tipo'; chave:=(p->>'chave')::uuid;
 IF chave IS NULL OR tipo IS NULL OR tipo NOT IN ('abertura','entrada','saida','transferencia','estorno') THEN RAISE EXCEPTION 'TES_DADOS: tipo/chave inválidos'; END IF;
 IF tipo IN ('abertura','estorno') AND NOT financeiro_hml.tem_papel(ARRAY['admin_geral','admin_financeiro']) THEN RAISE EXCEPTION 'TES_PERMISSAO' USING ERRCODE='42501'; END IF;
 -- Canonical request v1; no ledger rows exist under the required preflight.
 IF coalesce(p->>'data','')!~'^\d{4}-\d{2}-\d{2}$' THEN RAISE EXCEPTION 'TES_DATA'; END IF;
 p:=jsonb_set(p,'{data}',to_jsonb(((p->>'data')::date)::text));
 IF tipo<>'estorno' THEN
  IF coalesce(p->>'valor','')!~ (CASE WHEN tipo='abertura' THEN '^-?\d{1,16}(\.\d{1,2})?$' ELSE '^\d{1,16}(\.\d{1,2})?$' END) THEN RAISE EXCEPTION 'TES_VALOR'; END IF;
  p:=jsonb_set(p,'{valor}',to_jsonb(((p->>'valor')::numeric(18,2))::text));
 END IF;
 FOREACH campo IN ARRAY ARRAY['origem','destino','plano','centro','original'] LOOP
  IF p ? campo THEN p:=jsonb_set(p,ARRAY[campo],coalesce(to_jsonb((nullif(p->>campo,'')::uuid)::text),'null'::jsonb)); END IF;
 END LOOP;
 FOREACH campo IN ARRAY ARRAY['descricao','nome','banco','agencia','numero_conta','justificativa'] LOOP
  IF p ? campo THEN p:=jsonb_set(p,ARRAY[campo],coalesce(to_jsonb(nullif(btrim(p->>campo),'')),'null'::jsonb)); END IF;
 END LOOP;
 SELECT coalesce(jsonb_object_agg(e.key,e.value),'{}'::jsonb) INTO req FROM jsonb_each(jsonb_strip_nulls(p)) e
 WHERE e.key=ANY(ARRAY['tipo','data','descricao','valor','nome','conta_tipo','banco','agencia','numero_conta','origem','destino','plano','centro','original','justificativa']);
 req:=req||jsonb_build_object('versao',1);
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
  PERFORM pg_advisory_xact_lock(hashtextextended('tes_estorno:'||coalesce(p->>'original',''),0));
  SELECT * INTO original FROM financeiro_hml.tesouraria_operacoes WHERE id=(p->>'original')::uuid;
  IF NOT FOUND OR original.tipo='estorno' THEN RAISE EXCEPTION 'TES_ESTORNO_INVALIDO'; END IF;
  IF EXISTS(SELECT 1 FROM financeiro_hml.tesouraria_operacoes WHERE operacao_original_id=original.id) THEN RAISE EXCEPTION 'TES_JA_ESTORNADA'; END IF;
  IF dt<original.data_movimento THEN RAISE EXCEPTION 'TES_DATA'; END IF;
  origem:=original.conta_destino_id; destino:=original.conta_origem_id; valor:=original.valor; pc:=original.plano_conta_id; cc:=original.centro_custo_id; snap:=original.classificacao_snapshot;
  IF pc IS NOT NULL THEN
   PERFORM 1 FROM financeiro_hml.plano_contas c WHERE c.id=pc AND c.ativo AND c.aceita_lancamentos FOR SHARE;
   IF NOT FOUND THEN RAISE EXCEPTION 'TES_CLASSIFICACAO'; END IF;
  END IF;
  IF cc IS NOT NULL THEN
   PERFORM 1 FROM financeiro_hml.centros_custo c WHERE c.id=cc AND c.ativo FOR SHARE;
   IF NOT FOUND THEN RAISE EXCEPTION 'TES_CENTRO'; END IF;
  END IF;
 ELSE
  IF coalesce(p->>'valor','')!~ (CASE WHEN tipo='abertura' THEN '^-?\d{1,16}(\.\d{1,2})?$' ELSE '^\d{1,16}(\.\d{1,2})?$' END) THEN RAISE EXCEPTION 'TES_VALOR: use precisão de duas casas'; END IF;
  valor:=(p->>'valor')::numeric;
  IF abs(valor)>9999999999999999.99 THEN RAISE EXCEPTION 'TES_VALOR'; END IF;
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
    SELECT c.id,c.codigo,c.descricao,c.natureza,c.ativo,c.aceita_lancamentos INTO categoria FROM financeiro_hml.plano_contas c WHERE c.id=pc FOR SHARE;
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
END $function$
;
CREATE OR REPLACE FUNCTION financeiro_hml.tes_imutavel()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'financeiro_hml'
AS $function$ BEGIN RAISE EXCEPTION 'TES_IMUTAVEL: registros confirmados não podem ser alterados ou excluídos'; END $function$
;
CREATE OR REPLACE FUNCTION financeiro_hml.tes_proteger_conta()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'financeiro_hml'
AS $function$
BEGIN
 IF NEW.id IS DISTINCT FROM OLD.id OR NEW.tipo IS DISTINCT FROM OLD.tipo OR NEW.moeda IS DISTINCT FROM OLD.moeda OR NEW.saldo_inicial_centavos IS DISTINCT FROM OLD.saldo_inicial_centavos OR NEW.data_saldo_inicial IS DISTINCT FROM OLD.data_saldo_inicial THEN RAISE EXCEPTION 'TES_ABERTURA_IMUTAVEL: abertura, tipo e moeda não podem mudar'; END IF;
 NEW.atualizado_em:=clock_timestamp(); NEW.atualizado_por:=auth.uid(); RETURN NEW;
END $function$
;
CREATE OR REPLACE FUNCTION financeiro_hml.tes_proteger_natureza()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'financeiro_hml'
AS $function$ BEGIN
 IF NEW.natureza IS DISTINCT FROM OLD.natureza AND EXISTS(SELECT 1 FROM financeiro_hml.tesouraria_operacoes WHERE plano_conta_id=OLD.id) THEN RAISE EXCEPTION 'TES_NATUREZA: classificação já utilizada não pode mudar de natureza'; END IF; RETURN NEW;
END $function$
;
CREATE OR REPLACE FUNCTION financeiro_hml.tes_validar_efeitos()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'financeiro_hml', 'pg_temp'
AS $function$
DECLARE o financeiro_hml.tesouraria_operacoes; original financeiro_hml.tesouraria_operacoes; n int; creditos numeric; debitos numeric; abertura bigint; oid uuid;
BEGIN
 IF TG_TABLE_NAME='tesouraria_operacoes' THEN oid:=NEW.id; ELSE oid:=NEW.operacao_id; END IF;
 SELECT * INTO o FROM financeiro_hml.tesouraria_operacoes WHERE id=oid;
 IF NOT FOUND THEN RAISE EXCEPTION 'TES_INTEGRIDADE'; END IF;
 IF o.tipo<>'estorno' AND (o.operacao_original_id IS NOT NULL OR o.justificativa IS NOT NULL) THEN RAISE EXCEPTION 'TES_INTEGRIDADE'; END IF;
 SELECT count(*),coalesce(sum(valor) FILTER(WHERE direcao='credito'),0),coalesce(sum(valor) FILTER(WHERE direcao='debito'),0) INTO n,creditos,debitos FROM financeiro_hml.tesouraria_movimentos WHERE operacao_id=o.id;
 IF o.tipo='transferencia' THEN
  IF o.conta_origem_id IS NULL OR o.conta_destino_id IS NULL OR o.conta_origem_id=o.conta_destino_id OR o.valor<=0 OR n<>2 OR creditos<>o.valor OR debitos<>o.valor OR o.plano_conta_id IS NOT NULL OR o.centro_custo_id IS NOT NULL THEN RAISE EXCEPTION 'TES_INTEGRIDADE'; END IF;
 ELSIF o.tipo IN ('entrada','saida') THEN
  IF o.valor<=0 OR n<>1 OR o.plano_conta_id IS NULL OR (o.tipo='entrada' AND (creditos<>o.valor OR debitos<>0 OR o.conta_origem_id IS NOT NULL OR o.conta_destino_id IS NULL)) OR (o.tipo='saida' AND (debitos<>o.valor OR creditos<>0 OR o.conta_destino_id IS NOT NULL OR o.conta_origem_id IS NULL)) THEN RAISE EXCEPTION 'TES_INTEGRIDADE'; END IF;
 ELSIF o.tipo='abertura' THEN
  IF (o.conta_origem_id IS NULL)=(o.conta_destino_id IS NULL) THEN RAISE EXCEPTION 'TES_INTEGRIDADE'; END IF;
  IF o.data_movimento IS DISTINCT FROM (SELECT data_saldo_inicial FROM financeiro_hml.contas_financeiras WHERE id=coalesce(o.conta_origem_id,o.conta_destino_id)) THEN RAISE EXCEPTION 'TES_INTEGRIDADE'; END IF;
  SELECT saldo_inicial_centavos INTO abertura FROM financeiro_hml.contas_financeiras WHERE id=coalesce(o.conta_origem_id,o.conta_destino_id);
  IF abertura IS NULL OR o.valor<>abs(abertura::numeric/100) OR n<>(CASE WHEN abertura=0 THEN 0 ELSE 1 END) OR creditos<>greatest(abertura::numeric/100,0) OR debitos<>greatest(-abertura::numeric/100,0) OR o.plano_conta_id IS NOT NULL OR o.centro_custo_id IS NOT NULL THEN RAISE EXCEPTION 'TES_INTEGRIDADE'; END IF;
 ELSIF o.tipo='estorno' THEN
  SELECT * INTO original FROM financeiro_hml.tesouraria_operacoes WHERE id=o.operacao_original_id;
  IF original.id IS NULL OR original.tipo='estorno' OR o.conta_origem_id IS DISTINCT FROM original.conta_destino_id OR o.conta_destino_id IS DISTINCT FROM original.conta_origem_id OR o.plano_conta_id IS DISTINCT FROM original.plano_conta_id OR o.centro_custo_id IS DISTINCT FROM original.centro_custo_id OR o.classificacao_snapshot IS DISTINCT FROM original.classificacao_snapshot OR o.data_movimento<original.data_movimento OR length(btrim(coalesce(o.justificativa,'')))<5 OR o.valor<>original.valor OR EXISTS(
   (SELECT conta_financeira_id,CASE direcao WHEN 'credito' THEN 'debito' ELSE 'credito' END,valor FROM financeiro_hml.tesouraria_movimentos WHERE operacao_id=original.id EXCEPT SELECT conta_financeira_id,direcao,valor FROM financeiro_hml.tesouraria_movimentos WHERE operacao_id=o.id)
   UNION ALL (SELECT conta_financeira_id,direcao,valor FROM financeiro_hml.tesouraria_movimentos WHERE operacao_id=o.id EXCEPT SELECT conta_financeira_id,CASE direcao WHEN 'credito' THEN 'debito' ELSE 'credito' END,valor FROM financeiro_hml.tesouraria_movimentos WHERE operacao_id=original.id)
  ) THEN RAISE EXCEPTION 'TES_INTEGRIDADE'; END IF;
 ELSE RAISE EXCEPTION 'TES_INTEGRIDADE';
 END IF;
 IF EXISTS(SELECT 1 FROM financeiro_hml.tesouraria_movimentos m JOIN financeiro_hml.contas_financeiras c ON c.id=m.conta_financeira_id WHERE m.operacao_id=o.id AND o.data_movimento<c.data_saldo_inicial) THEN RAISE EXCEPTION 'TES_INTEGRIDADE'; END IF;
 IF o.tipo<>'estorno' AND EXISTS(SELECT 1 FROM financeiro_hml.tesouraria_movimentos m WHERE m.operacao_id=o.id AND m.conta_financeira_id IS DISTINCT FROM CASE WHEN m.direcao='credito' THEN o.conta_destino_id ELSE o.conta_origem_id END) THEN RAISE EXCEPTION 'TES_INTEGRIDADE'; END IF;
 RETURN NULL;
END $function$
;
CREATE OR REPLACE FUNCTION financeiro_hml.tesouraria_criar_conta(p jsonb)
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'financeiro_hml'
AS $function$ SELECT financeiro_hml.tes_executar(p||jsonb_build_object('tipo','abertura')); $function$
;
CREATE OR REPLACE FUNCTION financeiro_hml.tesouraria_estornar(p jsonb)
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'financeiro_hml'
AS $function$ SELECT financeiro_hml.tes_executar(p||jsonb_build_object('tipo','estorno')); $function$
;
CREATE OR REPLACE FUNCTION financeiro_hml.tesouraria_extrato(p jsonb)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'pg_catalog', 'financeiro_hml', 'pg_temp'
AS $function$
 WITH parametros AS (SELECT nullif(p->>'conta','')::uuid conta,nullif(p->>'inicio','')::date inicio,nullif(p->>'fim','')::date fim,nullif(p->>'tipo','') tipo,nullif(p->>'plano','')::uuid plano,least(greatest(coalesce((p->>'pagina')::bigint,0),0),100000) pagina),
 base AS (SELECT o.*,m.id movimento_id,m.conta_financeira_id,m.direcao,m.valor efeito,c.nome conta_nome,orig.tipo tipo_original,orig.classificacao_snapshot snapshot_original,EXISTS(SELECT 1 FROM financeiro_hml.tesouraria_operacoes e WHERE e.operacao_original_id=o.id) estornada FROM financeiro_hml.tesouraria_operacoes o JOIN financeiro_hml.tesouraria_movimentos m ON m.operacao_id=o.id JOIN financeiro_hml.contas_financeiras c ON c.id=m.conta_financeira_id LEFT JOIN financeiro_hml.tesouraria_operacoes orig ON orig.id=o.operacao_original_id CROSS JOIN parametros p WHERE p.conta IS NULL OR m.conta_financeira_id=p.conta),
 filtrado AS (SELECT b.* FROM base b CROSS JOIN parametros p WHERE (p.inicio IS NULL OR b.data_movimento>=p.inicio) AND (p.fim IS NULL OR b.data_movimento<=p.fim) AND (p.tipo IS NULL OR b.tipo=p.tipo) AND (p.plano IS NULL OR b.plano_conta_id=p.plano)),
 pagina AS (SELECT f.* FROM filtrado f ORDER BY data_movimento DESC,criado_em DESC,id DESC,movimento_id DESC LIMIT 50 OFFSET (SELECT pagina*50 FROM parametros)),
 resumo AS (SELECT coalesce(sum(CASE direcao WHEN 'credito' THEN efeito ELSE -efeito END) FILTER(WHERE p.inicio IS NOT NULL AND data_movimento<p.inicio),0)::text saldo_anterior,coalesce(sum(CASE direcao WHEN 'credito' THEN efeito ELSE -efeito END) FILTER(WHERE p.fim IS NULL OR data_movimento<=p.fim),0)::text saldo_final FROM base CROSS JOIN parametros p)
 SELECT jsonb_build_object('linhas',coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'movimento_id',movimento_id,'tipo',tipo,'data',data_movimento,'descricao',descricao,'conta_nome',conta_nome,'conta_id',conta_financeira_id,'direcao',direcao,'valor',efeito::text,'plano_id',plano_conta_id,'centro_id',centro_custo_id,'classificacao',classificacao_snapshot,'original',operacao_original_id,'tipo_original',tipo_original,'estornada',estornada,'justificativa',justificativa,'criado_por',criado_por,'criado_em',criado_em) ORDER BY data_movimento DESC,criado_em DESC,id DESC,movimento_id DESC) FROM pagina),'[]'::jsonb),'total',(SELECT count(*) FROM filtrado),'saldo_anterior',(SELECT saldo_anterior FROM resumo),'saldo_final',(SELECT saldo_final FROM resumo),'subtotal',coalesce((SELECT sum(CASE direcao WHEN 'credito' THEN efeito ELSE -efeito END)::text FROM filtrado),'0'));
$function$
;
CREATE OR REPLACE FUNCTION financeiro_hml.tesouraria_habilitar_conta(p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'financeiro_hml', 'pg_temp'
AS $function$
DECLARE c financeiro_hml.contas_preparadas; r jsonb; resp text := btrim(coalesce(p->>'responsavel',''));
BEGIN
  IF auth.uid() IS NULL OR NOT financeiro_hml.tem_papel(ARRAY['admin_geral','admin_financeiro']) THEN RAISE EXCEPTION 'TES_PERMISSAO' USING ERRCODE='42501'; END IF;
  SELECT * INTO c FROM financeiro_hml.contas_preparadas WHERE id = (p->>'id')::uuid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'TES_CONTA_INEXISTENTE'; END IF;
  IF c.situacao = 'habilitada' THEN RETURN jsonb_build_object('id', c.conta_financeira_id, 'repetida', true); END IF;
  IF length(resp) NOT BETWEEN 2 AND 160 THEN RAISE EXCEPTION 'TES_RESPONSAVEL'; END IF;
  IF coalesce(p->>'valor','') = '' OR coalesce(p->>'data','') = '' THEN RAISE EXCEPTION 'TES_DADOS: data e saldo validados são obrigatórios'; END IF;
  r := financeiro_hml.tes_executar(jsonb_build_object('tipo','abertura','chave',p->>'chave','data',p->>'data','valor',p->>'valor',
        'nome',c.nome,'conta_tipo',c.tipo,'banco',c.banco,'descricao','Abertura · '||c.nome));
  UPDATE financeiro_hml.contas_preparadas SET situacao='habilitada', conta_financeira_id=(r->>'conta_id')::uuid,
    data_abertura=(p->>'data')::date, saldo_validado=(p->>'valor')::numeric, responsavel_conferencia=resp,
    habilitada_por=auth.uid(), habilitada_em=clock_timestamp() WHERE id=c.id;
  RETURN jsonb_build_object('id', r->>'conta_id', 'repetida', false);
END $function$
;
CREATE OR REPLACE FUNCTION financeiro_hml.tesouraria_historico_operacoes(p jsonb)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'pg_catalog', 'financeiro_hml', 'pg_temp'
AS $function$
 WITH parametros AS (SELECT nullif(p->>'conta','')::uuid conta,nullif(p->>'inicio','')::date inicio,nullif(p->>'fim','')::date fim,nullif(p->>'tipo','') tipo,nullif(p->>'plano','')::uuid plano,least(greatest(coalesce((p->>'pagina')::bigint,0),0),100000) pagina),
 filtrado AS (SELECT o.* FROM financeiro_hml.tesouraria_operacoes o CROSS JOIN parametros p WHERE (p.conta IS NULL OR o.conta_origem_id=p.conta OR o.conta_destino_id=p.conta) AND (p.inicio IS NULL OR o.data_movimento>=p.inicio) AND (p.fim IS NULL OR o.data_movimento<=p.fim) AND (p.tipo IS NULL OR o.tipo=p.tipo) AND (p.plano IS NULL OR o.plano_conta_id=p.plano)),
 pagina AS (SELECT * FROM filtrado ORDER BY data_movimento DESC,criado_em DESC,id DESC LIMIT 50 OFFSET (SELECT pagina*50 FROM parametros))
 SELECT jsonb_build_object('total',(SELECT count(*) FROM filtrado),'operacoes',coalesce((SELECT jsonb_agg(to_jsonb(o)-'requisicao'||jsonb_build_object('efeitos',coalesce((SELECT jsonb_agg(jsonb_build_object('id',m.id,'conta_id',m.conta_financeira_id,'direcao',m.direcao,'valor',m.valor::text) ORDER BY m.id) FROM financeiro_hml.tesouraria_movimentos m WHERE m.operacao_id=o.id),'[]'::jsonb),'valor',o.valor::text) ORDER BY o.data_movimento DESC,o.criado_em DESC,o.id DESC) FROM pagina o),'[]'::jsonb));
$function$
;
CREATE OR REPLACE FUNCTION financeiro_hml.tesouraria_lancar(p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'financeiro_hml'
AS $function$ BEGIN IF coalesce(p->>'tipo','') NOT IN ('entrada','saida') THEN RAISE EXCEPTION 'TES_DADOS'; END IF; RETURN financeiro_hml.tes_executar(p); END $function$
;
CREATE OR REPLACE FUNCTION financeiro_hml.tesouraria_lancar_conferencia(p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'financeiro_hml', 'pg_temp'
AS $function$
DECLARE c financeiro_hml.tesouraria_conferencias; pai financeiro_hml.tesouraria_conferencias; soma numeric; v numeric; d date; r jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT financeiro_hml.tem_papel(ARRAY['admin_geral','admin_financeiro','analista_financeiro']) THEN RAISE EXCEPTION 'TES_PERMISSAO' USING ERRCODE='42501'; END IF;
  SELECT * INTO c FROM financeiro_hml.tesouraria_conferencias WHERE id = (p->>'id')::uuid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'TES_CONF_INEXISTENTE'; END IF;
  IF c.operacao_id IS NOT NULL THEN RETURN jsonb_build_object('id', c.operacao_id, 'repetida', true); END IF;
  IF c.status <> 'conciliado' THEN RAISE EXCEPTION 'TES_CONF_NAO_CONCILIADA'; END IF;
  IF c.forma IN ('misto','indefinida') THEN RAISE EXCEPTION 'TES_CONF_FORMA: informe a forma ou o rateio'; END IF;
  IF c.plano_conta_id IS NULL THEN RAISE EXCEPTION 'TES_CLASSIFICACAO'; END IF;
  SELECT * INTO pai FROM financeiro_hml.tesouraria_conferencias WHERE grupo_id = c.grupo_id AND forma = 'misto' AND id <> c.id FOR SHARE;
  IF FOUND THEN
    SELECT sum(valor_bruto) INTO soma FROM financeiro_hml.tesouraria_conferencias WHERE grupo_id = c.grupo_id AND forma <> 'misto';
    IF soma <> pai.valor_bruto THEN RAISE EXCEPTION 'TES_CONF_RATEIO: soma das formas difere do total'; END IF;
  END IF;
  IF c.forma IN ('credito','debito','parcelado') THEN v := c.valor_liquido; d := c.data_liquidacao;
  ELSIF c.forma = 'boleto' THEN v := c.valor_bruto; d := c.boleto_pagamento;
  ELSE v := c.valor_bruto; d := c.data_ocorrencia; END IF;
  r := financeiro_hml.tes_executar(jsonb_build_object('tipo',c.natureza,'chave',c.identificador_origem,'data',d::text,'descricao',c.descricao,'valor',v::text,
        CASE c.natureza WHEN 'entrada' THEN 'destino' ELSE 'origem' END, c.conta_financeira_id,'plano',c.plano_conta_id,'centro',c.centro_custo_id));
  UPDATE financeiro_hml.tesouraria_conferencias SET operacao_id=(r->>'id')::uuid, lancado_por=auth.uid(), lancado_em=clock_timestamp() WHERE id=c.id;
  RETURN jsonb_build_object('id', r->>'id', 'repetida', false);
END $function$
;
CREATE OR REPLACE FUNCTION financeiro_hml.tesouraria_saldos()
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'pg_catalog', 'financeiro_hml'
AS $function$
 SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY t.nome,t.id),'[]'::jsonb) FROM (
 SELECT c.id,c.nome,c.tipo,c.moeda,c.ativo,c.banco,c.agencia,c.numero_conta,c.data_saldo_inicial,c.criado_em,c.saldo_inicial_centavos::text AS saldo_inicial_centavos,coalesce(sum(CASE m.direcao WHEN 'credito' THEN m.valor ELSE -m.valor END),0)::text AS saldo
 FROM financeiro_hml.contas_financeiras c LEFT JOIN financeiro_hml.tesouraria_movimentos m ON m.conta_financeira_id=c.id GROUP BY c.id)t;
$function$
;
CREATE OR REPLACE FUNCTION financeiro_hml.tesouraria_transferir(p jsonb)
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'financeiro_hml'
AS $function$ SELECT financeiro_hml.tes_executar(p||jsonb_build_object('tipo','transferencia')); $function$
;