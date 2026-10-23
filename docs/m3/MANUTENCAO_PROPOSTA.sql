-- PROPOSTA SOMENTE: NAO EXECUTAR NO HML SEM APROVACAO.
-- Roteiro para duas sessoes FIXAS no MESMO cluster. Nao e uma migracao unica.
-- Variavel psql banco_alvo deve conter o nome REAL verificado; nao o Project ID.
-- A: sessao fixa no banco alvo. B: sessao administrativa fixa em OUTRO banco.
-- Nao usar executor que reconecta/transaction pooling entre estas etapas.
-- A conexao B deve ter autoridade comprovada para alterar o banco alvo.
-- Antes: confirmar ayjppexbzpgdkzbehvzw por controle de conexao, SHA do pacote,
-- SQL final, identidade do cluster, poderes/visibilidade e gestores dos workers.

-- SESSAO B: registrar valor inicial e dono. Exigir datallowconn=true.
SELECT oid,datname,datallowconn,pg_get_userbyid(datdba) AS proprietario
FROM pg_database WHERE datname=:'banco_alvo';
-- EXIGIR banco_alvo <> current_database(): PostgreSQL 17 recusa fechar o atual.
-- Fechar admissao; COMMIT separado e obrigatorio ANTES da drenagem.
BEGIN;
ALTER DATABASE :"banco_alvo" ALLOW_CONNECTIONS false;
COMMIT;

-- SESSAO A: parar produtores e solicitar desconexao graciosa dos pools e admins.
-- Repetir consultas em autocommit, sem snapshot antigo; nunca cancelar/terminar.
SELECT pg_stat_clear_snapshot();
SELECT pid,usename,backend_type,state,xact_start,query_start,
       wait_event_type,wait_event
FROM pg_stat_activity
WHERE datname=current_database() AND pid<>pg_backend_pid()
ORDER BY backend_type,pid;
SELECT gid,owner,prepared FROM pg_prepared_xacts
WHERE database=current_database();
-- Resultado deve convergir a zero outros clients e zero prepared xacts.
-- Idle, idle-in-transaction e advisory waiters TAMBEM devem desconectar.
-- Inventariar/pause graciosa dos workers, cron, replicacao e jobs do provedor.
-- Nenhuma ausencia de query/lock isoladamente comprova drenagem.

-- SESSAO A: verificacao imediatamente anterior ao SQL, gate fechado.
DO $$ BEGIN
 PERFORM pg_stat_clear_snapshot();
 IF (SELECT datallowconn FROM pg_database WHERE datname=current_database()) THEN
  RAISE EXCEPTION 'MANUTENCAO: admissao nao fechada';
 END IF;
 IF EXISTS(SELECT 1 FROM pg_stat_activity WHERE datname=current_database()
   AND backend_type='client backend' AND pid<>pg_backend_pid()) THEN
  RAISE EXCEPTION 'MANUTENCAO: drenagem incompleta';
 END IF;
 IF EXISTS(SELECT 1 FROM pg_prepared_xacts WHERE database=current_database()) THEN
  RAISE EXCEPTION 'MANUTENCAO: transacoes preparadas pendentes';
 END IF;
END $$;
-- Esta verificacao nao substitui o controle dos workers nem partidas em transito.
-- Exigir reconciliacao de todos os PIDs/partidas com os responsaveis pelos pools.
-- Executar SOMENTE o M3_2_CORRECAO_PROPOSTA.sql byte-identico NA SESSAO A.
-- Ele ja contem BEGIN, locks ACCESS EXCLUSIVE NOWAIT antes das contagens,
-- READ COMMITTED e COMMIT. Nao adicionar BEGIN externo.
-- Falha: ROLLBACK explicito, sem retry automatico; validar o estado ainda fechado.
-- Validar M1/M2, dados, RLS, ACLs, funcoes, indice e trigger antes de reabrir.

-- SESSAO B: SOMENTE depois de resultado e validacao conhecidos, ou abortar antes
-- da aplicacao e comprovar encerramento/rollback de A. Nunca reabrir prematuramente.
BEGIN;
ALTER DATABASE :"banco_alvo" ALLOW_CONNECTIONS true;
COMMIT;
-- Reiniciar produtores/pools graciosamente e conferir leituras; sem dados reais.
-- Se A desaparecer, seu trabalho nao confirmado sofre rollback, mas gate segue
-- fechado. B verifica se houve COMMIT, recupera controle e so entao reabre.