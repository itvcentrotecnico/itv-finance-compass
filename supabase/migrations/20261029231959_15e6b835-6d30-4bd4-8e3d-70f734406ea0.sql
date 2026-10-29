-- Exclusivamente financeiro_hml. Sem alterações de dados, tabelas, RLS ou gatilhos.
BEGIN;

CREATE OR REPLACE FUNCTION financeiro_hml.integracao_estado_manual() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO pg_catalog, financeiro_hml, pg_temp
AS $$
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
END $$;
REVOKE ALL ON FUNCTION financeiro_hml.integracao_estado_manual() FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION financeiro_hml.integracao_estado_manual() TO authenticated;

CREATE OR REPLACE FUNCTION financeiro_hml.integracao_iniciar() RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO pg_catalog, financeiro_hml, pg_temp
AS $$
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
END $$;
-- CREATE OR REPLACE preserva grants; reafirmar ACL restrita existente.
REVOKE ALL ON FUNCTION financeiro_hml.integracao_iniciar() FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION financeiro_hml.integracao_iniciar() TO authenticated;
COMMIT;