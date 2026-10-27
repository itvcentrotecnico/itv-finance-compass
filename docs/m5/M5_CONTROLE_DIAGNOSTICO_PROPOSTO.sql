-- PROPOSTA: NÃO APLICADA. Requer aprovação explícita da migração HML.
-- Sem INSERT de autorização: esta migração não autoriza leitura real.
BEGIN;
CREATE TABLE financeiro_hml.diagnostico_autorizacoes (
  id uuid PRIMARY KEY,
  administrador_id uuid NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT clock_timestamp(),
  encerra_em timestamptz NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  consumidas smallint NOT NULL DEFAULT 0 CHECK (consumidas BETWEEN 0 AND 5),
  CHECK (encerra_em > criado_em)
);
REVOKE ALL ON financeiro_hml.diagnostico_autorizacoes FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON financeiro_hml.diagnostico_autorizacoes TO authenticated;
ALTER TABLE financeiro_hml.diagnostico_autorizacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY diagnostico_autorizacoes_ler ON financeiro_hml.diagnostico_autorizacoes
  FOR SELECT TO authenticated USING (administrador_id = auth.uid() AND financeiro_hml.tem_papel(ARRAY['admin_geral','admin_financeiro']));

CREATE TABLE financeiro_hml.diagnostico_tentativas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  autorizacao_id uuid NOT NULL REFERENCES financeiro_hml.diagnostico_autorizacoes(id),
  usuario_id uuid NOT NULL,
  recurso text NOT NULL CHECK (recurso IN ('formas_pagamento','recebimentos','pagamentos','recebimentos_titulos','titulos')),
  ordinal smallint CHECK (ordinal BETWEEN 1 AND 5),
  estado text NOT NULL CHECK (estado IN ('reservada','concluida','falha','bloqueada')),
  categoria text CHECK (categoria IN ('leitura_valida','autenticacao_origem','autorizacao_origem','limite_origem','erro_interno_origem','http_origem','resposta_invalida_origem','timeout_origem','configuracao_origem','rede_origem','invocacao_origem','conexao_origem','leitura_nao_autorizada','falha_interna','concorrencia','repeticao','limite','autorizacao_inativa')),
  status_http smallint CHECK (status_http BETWEEN 100 AND 599),
  duracao_ms integer CHECK (duracao_ms >= 0),
  tipo_excecao text CHECK (tipo_excecao IN ('TypeError','Error','AbortError','TimeoutError','DOMException','nao_identificado','codigo_dns','codigo_tls','codigo_conexao')),
  criado_em timestamptz NOT NULL DEFAULT clock_timestamp(),
  concluido_em timestamptz,
  CHECK ((estado = 'bloqueada') = (ordinal IS NULL))
);
REVOKE ALL ON financeiro_hml.diagnostico_tentativas FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON financeiro_hml.diagnostico_tentativas TO authenticated;
ALTER TABLE financeiro_hml.diagnostico_tentativas ENABLE ROW LEVEL SECURITY;
CREATE POLICY diagnostico_tentativas_ler ON financeiro_hml.diagnostico_tentativas
  FOR SELECT TO authenticated USING (usuario_id=auth.uid() AND financeiro_hml.tem_papel(ARRAY['admin_geral','admin_financeiro']));
CREATE UNIQUE INDEX diagnostico_recurso_unico ON financeiro_hml.diagnostico_tentativas(autorizacao_id,recurso) WHERE ordinal IS NOT NULL;
CREATE UNIQUE INDEX diagnostico_ordinal_unico ON financeiro_hml.diagnostico_tentativas(autorizacao_id,ordinal) WHERE ordinal IS NOT NULL;
-- Uma reserva física em todo o diagnóstico, não somente por usuário ou autorização.
CREATE UNIQUE INDEX diagnostico_reserva_global ON financeiro_hml.diagnostico_tentativas((1)) WHERE estado='reservada';
CREATE TRIGGER diagnostico_autorizacoes_auditar AFTER INSERT OR UPDATE ON financeiro_hml.diagnostico_autorizacoes
  FOR EACH ROW EXECUTE FUNCTION financeiro_hml.tes_conf_auditar();
CREATE TRIGGER diagnostico_tentativas_auditar AFTER INSERT OR UPDATE ON financeiro_hml.diagnostico_tentativas
  FOR EACH ROW EXECUTE FUNCTION financeiro_hml.tes_conf_auditar();

CREATE FUNCTION financeiro_hml.diagnostico_reservar(p_autorizacao uuid, p_recurso text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,financeiro_hml,pg_temp AS $$
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
END $$;
REVOKE ALL ON FUNCTION financeiro_hml.diagnostico_reservar(uuid,text) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION financeiro_hml.diagnostico_reservar(uuid,text) TO authenticated;

-- Só o servidor finaliza: um administrador não consegue liberar a reserva
-- pelo browser enquanto a leitura ainda está em andamento.
CREATE FUNCTION financeiro_hml.diagnostico_finalizar(p_tentativa uuid,p_usuario uuid,p_http integer,p_duracao integer,p_categoria text,p_tipo text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,financeiro_hml,pg_temp AS $$
DECLARE t financeiro_hml.diagnostico_tentativas;
BEGIN
  IF current_setting('request.jwt.claim.role',true) IS DISTINCT FROM 'service_role'
     AND coalesce(current_setting('request.jwt.claims',true),'{}')::jsonb->>'role' IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='DIAG_SERVIDOR_OBRIGATORIO';
  END IF;
  IF NOT pg_try_advisory_xact_lock(527041,5) THEN RETURN jsonb_build_object('registrada',false); END IF;
  SELECT * INTO t FROM financeiro_hml.diagnostico_tentativas WHERE id=p_tentativa AND usuario_id=p_usuario FOR UPDATE;
  IF NOT FOUND OR t.estado <> 'reservada' THEN RETURN jsonb_build_object('registrada',false); END IF;
  UPDATE financeiro_hml.diagnostico_tentativas SET
    estado=CASE WHEN p_categoria='leitura_valida' THEN 'concluida' ELSE 'falha' END,
    status_http=p_http,duracao_ms=p_duracao,categoria=p_categoria,tipo_excecao=p_tipo,concluido_em=clock_timestamp()
    WHERE id=t.id;
  RETURN jsonb_build_object('registrada',true);
END $$;
REVOKE ALL ON FUNCTION financeiro_hml.diagnostico_finalizar(uuid,uuid,integer,integer,text,text) FROM PUBLIC,anon,authenticated;
GRANT USAGE ON SCHEMA financeiro_hml TO service_role;
GRANT EXECUTE ON FUNCTION financeiro_hml.diagnostico_finalizar(uuid,uuid,integer,integer,text,text) TO service_role;
COMMIT;