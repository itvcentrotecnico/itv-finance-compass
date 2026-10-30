-- SCRIPT PSQL PROPOSTO, MESMA SESSÃO. NÃO EXECUTAR HML SEM AUTORIZAÇÃO.
-- NÃO reabre conferência antiga, seis wrappers financeiros ou comandos novos.
-- Após perda de sessão: reconstruir manifesto protegido em recuperação autorizada,
-- validar contra catálogo/captura; não executar automaticamente todo o CSV.
\set ON_ERROR_STOP on
BEGIN;
DO $$
DECLARE r record;
BEGIN
 IF current_setting('itv.etapa2.retomada',true) IS DISTINCT FROM 'RETOMADA_EXPLICITAMENTE_AUTORIZADA' THEN RAISE EXCEPTION 'ETAPA2_SEM_AUTORIZACAO'; END IF;
 IF to_regclass('pg_temp.etapa2_janela') IS NULL OR to_regclass('pg_temp.etapa2_manifesto') IS NULL THEN RAISE EXCEPTION 'ETAPA2_MANIFESTO_AUSENTE'; END IF;
 IF EXISTS(SELECT 1 FROM etapa2_janela WHERE backend<>pg_backend_pid() OR encerrada) THEN RAISE EXCEPTION 'ETAPA2_SESSAO_INVALIDA'; END IF;
 -- Dono controlado é fronteira administrativa; proteger arquivo/manifesto.
 FOR r IN SELECT comando FROM etapa2_manifesto WHERE NOT permanente ORDER BY tipo,objeto,comando LOOP EXECUTE r.comando; END LOOP;
 UPDATE etapa2_janela SET encerrada=true;
END $$;
COMMIT;
SELECT inicio,clock_timestamp() AS termino,backend,encerrada FROM etapa2_janela;