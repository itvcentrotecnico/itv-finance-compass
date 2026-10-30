-- SCRIPT PSQL PROPOSTO. NÃO É MIGRAÇÃO. NÃO EXECUTAR NO HML SEM NOVA AUTORIZAÇÃO.
-- Mesma conexão física até retomada. Antes: escritores privilegiados suspensos.
-- Variáveis psql: banco_esperado, manifesto (caminho protegido, fora do projeto).
-- SET itv.etapa2.autorizacao='MANUTENCAO_EXPLICITAMENTE_AUTORIZADA';
\set ON_ERROR_STOP on
SELECT current_database() = :'banco_esperado' AS destino_correto \gset
\if :destino_correto
\else
  \quit 3
\endif
BEGIN;
SET LOCAL lock_timeout='2s';
DO $$ BEGIN
 IF current_setting('itv.etapa2.autorizacao',true) IS DISTINCT FROM 'MANUTENCAO_EXPLICITAMENTE_AUTORIZADA'
 THEN RAISE EXCEPTION 'ETAPA2_SEM_AUTORIZACAO'; END IF;
 IF to_regclass('pg_temp.etapa2_manifesto') IS NOT NULL THEN RAISE EXCEPTION 'ETAPA2_JA_ATIVA'; END IF;
END $$;
CREATE TEMP TABLE etapa2_manifesto(tipo text NOT NULL, objeto text NOT NULL, comando text NOT NULL, permanente boolean NOT NULL) ON COMMIT PRESERVE ROWS;
CREATE TEMP TABLE etapa2_janela(inicio timestamptz NOT NULL DEFAULT clock_timestamp(), backend integer NOT NULL DEFAULT pg_backend_pid(), encerrada boolean NOT NULL DEFAULT false) ON COMMIT PRESERVE ROWS;
DO $$
DECLARE c record; a record; f record; col record; papel text; comando text; nome text;
 leituras text[] := ARRAY['tem_papel','papel_atual','tesouraria_saldos','tesouraria_extrato','tesouraria_historico_operacoes','integracao_estado_manual','conferencia_consultar','conferencia_historico','conferencia_opcoes'];
 mutadoras text[] := ARRAY['tesouraria_criar_conta','tesouraria_habilitar_conta','tesouraria_lancar','tesouraria_lancar_conferencia','tesouraria_transferir','tesouraria_estornar','integracao_iniciar','integracao_iniciar_automatica','integracao_concluir','diagnostico_reservar','diagnostico_finalizar','conferencia_comandar'];
BEGIN
 -- Defaults de função podem conceder PUBLIC. Capturar ACL efetiva, não apenas proacl não nulo.
 FOR f IN SELECT p.*,format('%I.%I(%s)',n.nspname,p.proname,pg_get_function_identity_arguments(p.oid)) assinatura
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='financeiro_hml' LOOP
  IF f.proowner<>(SELECT oid FROM pg_roles WHERE rolname=current_user) THEN RAISE EXCEPTION 'ETAPA2_PROPRIETARIO_INESPERADO'; END IF;
  IF f.prorettype='trigger'::regtype OR f.proname=ANY(leituras) THEN CONTINUE; END IF;
  FOR a IN SELECT * FROM aclexplode(coalesce(f.proacl,acldefault('f',f.proowner))) WHERE grantee<>f.proowner LOOP
   IF a.grantee<>0 AND NOT EXISTS(SELECT 1 FROM pg_roles WHERE oid=a.grantee AND rolname IN ('anon','authenticated','service_role')) THEN RAISE EXCEPTION 'ETAPA2_PAPEL_NAO_MAPEADO'; END IF;
   IF NOT f.proname=ANY(mutadoras) THEN RAISE EXCEPTION 'ETAPA2_FUNCAO_NAO_MAPEADA: %',f.proname; END IF;
   IF a.grantor<>f.proowner OR a.is_grantable THEN RAISE EXCEPTION 'ETAPA2_CONCESSAO_NAO_SUPORTADA'; END IF;
   papel:=CASE a.grantee WHEN 0 THEN 'PUBLIC' ELSE quote_ident(pg_get_userbyid(a.grantee)) END;
   comando:=format('GRANT EXECUTE ON FUNCTION %s TO %s;',f.assinatura,papel);
   INSERT INTO etapa2_manifesto VALUES('funcao',f.proname,comando,f.proname=ANY(ARRAY['tesouraria_criar_conta','tesouraria_habilitar_conta','tesouraria_lancar','tesouraria_lancar_conferencia','tesouraria_transferir','tesouraria_estornar','conferencia_comandar']));
  END LOOP;
  EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC,anon,authenticated,service_role;',f.assinatura);
 END LOOP;
 FOR c IN SELECT tab.* FROM pg_class tab JOIN pg_namespace n ON n.oid=tab.relnamespace WHERE n.nspname='financeiro_hml' AND tab.relkind='r' LOOP
  IF c.relowner<>(SELECT oid FROM pg_roles WHERE rolname=current_user) THEN RAISE EXCEPTION 'ETAPA2_PROPRIETARIO_INESPERADO'; END IF;
  nome:=format('financeiro_hml.%I',c.relname);
  FOR a IN SELECT * FROM aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) WHERE grantee<>c.relowner AND privilege_type<>'SELECT' LOOP
   IF a.grantee<>0 AND NOT EXISTS(SELECT 1 FROM pg_roles WHERE oid=a.grantee AND rolname IN ('anon','authenticated','service_role')) THEN RAISE EXCEPTION 'ETAPA2_PAPEL_NAO_MAPEADO'; END IF;
   IF a.grantor<>c.relowner OR a.is_grantable THEN RAISE EXCEPTION 'ETAPA2_CONCESSAO_NAO_SUPORTADA'; END IF;
   papel:=CASE a.grantee WHEN 0 THEN 'PUBLIC' ELSE quote_ident(pg_get_userbyid(a.grantee)) END;
   INSERT INTO etapa2_manifesto VALUES('tabela',c.relname,format('GRANT %s ON TABLE %s TO %s;',a.privilege_type,nome,papel),c.relname='tesouraria_conferencias' AND a.grantee=(SELECT oid FROM pg_roles WHERE rolname='authenticated'));
  END LOOP;
  FOR col IN SELECT * FROM pg_attribute WHERE attrelid=c.oid AND attnum>0 AND NOT attisdropped AND attacl IS NOT NULL LOOP
   FOR a IN SELECT * FROM aclexplode(col.attacl) WHERE grantee<>c.relowner AND privilege_type<>'SELECT' LOOP
    IF a.grantee<>0 AND NOT EXISTS(SELECT 1 FROM pg_roles WHERE oid=a.grantee AND rolname IN ('anon','authenticated','service_role')) THEN RAISE EXCEPTION 'ETAPA2_PAPEL_NAO_MAPEADO'; END IF;
    IF a.grantor<>c.relowner OR a.is_grantable THEN RAISE EXCEPTION 'ETAPA2_CONCESSAO_NAO_SUPORTADA'; END IF;
    papel:=CASE a.grantee WHEN 0 THEN 'PUBLIC' ELSE quote_ident(pg_get_userbyid(a.grantee)) END;
    INSERT INTO etapa2_manifesto VALUES('coluna',c.relname,format('GRANT %s (%I) ON TABLE %s TO %s;',a.privilege_type,col.attname,nome,papel),c.relname='tesouraria_conferencias' AND a.grantee=(SELECT oid FROM pg_roles WHERE rolname='authenticated'));
   END LOOP;
   EXECUTE format('REVOKE INSERT (%I),UPDATE (%I),REFERENCES (%I) ON TABLE %s FROM PUBLIC,anon,authenticated,service_role;',col.attname,col.attname,col.attname,nome);
  END LOOP;
  -- Capturar colunas ANTES do REVOKE de tabela, que também pode removê-las.
  EXECUTE format('REVOKE INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER ON TABLE %s FROM PUBLIC,anon,authenticated,service_role;',nome);
 END LOOP;
END $$;
-- Manifesto exportado ANTES do COMMIT, para recuperação se a conexão cair.
-- psql expande variáveis no comando SQL COPY; arquivo deve ser protegido pelo executor.
COPY (SELECT tipo,objeto,comando,permanente FROM etapa2_manifesto ORDER BY tipo,objeto,comando) TO STDOUT WITH CSV HEADER \g :manifesto
COMMIT;
SELECT inicio,backend,encerrada FROM etapa2_janela;
-- NÃO prova drenagem. Chamadas antigas e proprietários exigem contenção operacional.