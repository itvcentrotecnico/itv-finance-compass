"""Closed admission + voluntary drain, exclusively disposable local PostgreSQL.
No environment credentials, remote connections, cancel, terminate or forced drop.
Run with psycopg 3. Evidence includes actual overlapping PostgreSQL PIDs.
"""
import hashlib
import json
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import psycopg
from psycopg import sql

from testar_concorrencia_local import connect, make_db, request, rpc, scalar, preserved, DATABASES, USER

ROOT = Path(__file__).resolve().parents[2]
FINAL = (ROOT / 'docs/m3/M3_2_CORRECAO_PROPOSTA.sql').read_bytes()
EXPECTED = '66c47b7d9292c45f1580f32f1b59937047ba36b294f0eac9d914f188a1817401'
RESULTS = []
POOL = ThreadPoolExecutor(max_workers=4)


def record(name, evidence):
    RESULTS.append({'teste': name, 'resultado': 'PASS', 'evidencia': evidence})
    print(name, 'PASS', flush=True)


def gate(c, db, opened):
    c.execute(sql.SQL('ALTER DATABASE {} ALLOW_CONNECTIONS {}').format(
        sql.Identifier(db), sql.SQL('true' if opened else 'false')))


def clients(c):
    c.execute('SELECT pg_stat_clear_snapshot()')
    return c.execute("""SELECT pid,state,wait_event_type,wait_event FROM pg_stat_activity
      WHERE datname=current_database() AND backend_type='client backend'
      AND pid<>pg_backend_pid() ORDER BY pid""").fetchall()


def drained(c):
    assert not scalar(c, 'SELECT datallowconn FROM pg_database WHERE datname=current_database()')
    assert not clients(c), 'Drenagem incompleta'
    assert scalar(c, 'SELECT count(*) FROM pg_prepared_xacts WHERE database=current_database()') == 0


def blocked(c, waiter, holder):
    deadline = time.monotonic() + 6
    while time.monotonic() < deadline:
        if scalar(c, 'SELECT %s=ANY(pg_blocking_pids(%s))', (holder, waiter)):
            return
        time.sleep(.01)
    raise AssertionError('Real advisory wait not observed')


def old_call(c, fn, p):
    c.execute('BEGIN')
    try:
        result = rpc(c, fn, p)
        c.execute('ROLLBACK')  # voluntarily finish; never commit local fixture data
        return {'pid': c.info.backend_pid, 'fim': 'ROLLBACK', 'resultado': result}
    except psycopg.Error as e:
        c.execute('ROLLBACK')
        return {'pid': c.info.backend_pid, 'fim': 'ROLLBACK', 'sqlstate': e.sqlstate}


def empty(c):
    return [scalar(c, f'SELECT count(*) FROM financeiro_hml.{t}') for t in
            ['contas_financeiras', 'tesouraria_operacoes', 'tesouraria_movimentos']]


def main():
    assert hashlib.sha256(FINAL).hexdigest() == EXPECTED
    record('SQL_M3_2_byte_identico', {'sha256': EXPECTED})
    db = make_db()
    # Recovery is a different database in this same isolated cluster.
    recovery = connect('postgres')
    maintenance = connect(db)
    holder = connect(db)
    existing = connect(db)
    try:
        before = preserved(maintenance)
        cases = [
            ('tesouraria_criar_conta', request(nome='LOCAL', conta_tipo='caixa', valor='0.00')),
            ('tesouraria_lancar', request(tipo='entrada', destino=USER, plano=USER, valor='0.10')),
            ('tesouraria_transferir', request(origem=USER, destino='22222222-2222-4222-8222-222222222222', valor='0.10')),
            ('tesouraria_estornar', request(original=USER, justificativa='SOMENTE LOCAL')),
        ]
        for fn, p in cases:
            writer = connect(db, True)
            try:
                holder.execute('BEGIN')
                holder.execute('SELECT pg_advisory_xact_lock(hashtextextended(%s,0))', (USER+p['chave'],))
                future = POOL.submit(old_call, writer, fn, p)
                blocked(maintenance, writer.info.backend_pid, holder.info.backend_pid)
                assert scalar(maintenance, """SELECT count(*) FROM pg_locks WHERE pid=%s
                  AND relation IN ('financeiro_hml.contas_financeiras'::regclass,
                  'financeiro_hml.tesouraria_operacoes'::regclass,
                  'financeiro_hml.tesouraria_movimentos'::regclass)""", (writer.info.backend_pid,)) == 0
                gate(recovery, db, False)
                assert clients(maintenance), 'Old clients unexpectedly vanished'
                holder.execute('ROLLBACK')
                outcome = future.result(timeout=18)
                assert outcome['fim'] == 'ROLLBACK'
                assert empty(maintenance) == [0, 0, 0]
                record('RPC_antiga_antes_de_lock_' + fn, outcome)
            finally:
                writer.close()
            # Existing connection deliberately reused: proves why complete drain is necessary.
            if fn != cases[-1][0]:
                # New connections require reopening between the distinct controlled test cases.
                # Reopen only to create next simulated pre-existing client.
                gate(recovery, db, True)
        gate(recovery, db, False)
        denied = []
        for attempt in range(2):
            try:
                unexpected = connect(db)
            except psycopg.OperationalError as e:
                assert 'not currently accepting connections' in str(e)
                denied.append('owner/superuser refused')
            else:
                unexpected.close()
                raise AssertionError('Admission gate bypassed')
        record('novas_conexoes_administrativas_recusadas', denied)
        # Idle physical connections remain able to submit genuine direct DML.
        existing.execute('BEGIN')
        existing.execute("SELECT set_config('request.jwt.claim.sub',%s,false)", (USER,))
        assert existing.execute("UPDATE financeiro_hml.plano_contas SET descricao='LOCAL ADMIN MANUTENCAO'").rowcount == 1
        existing.execute('ROLLBACK')
        assert preserved(maintenance) == before
        assert clients(maintenance)
        record('sessao_idle_admin_sobrevive_bloqueia_drenagem', clients(maintenance))
        existing.close()
        holder.close()
        drained(maintenance)
        record('drenagem_total_sem_cancelar_sessoes', {'outros_clients': clients(maintenance)})
        maintenance.execute(FINAL.decode())
        assert empty(maintenance) == [0, 0, 0]
        assert preserved(maintenance) == before
        assert scalar(maintenance, "SELECT to_regclass('financeiro_hml.tes_op_abertura_conta_uq') IS NOT NULL")
        record('M3_2_apos_drenagem_M1_M2_RLS_preservadas', {'vazias': empty(maintenance)})
        gate(recovery, db, True)
        with connect(db, True) as resumed:
            p = request(nome='LOCAL RETOMADA', conta_tipo='caixa', valor='0.00')
            resumed.execute('BEGIN')
            result = rpc(resumed, 'tesouraria_criar_conta', p)
            resumed.execute('COMMIT')
            assert empty(maintenance) == [1, 1, 0]
            assert rpc(resumed, 'tesouraria_criar_conta', p)['id'] == result['id']
            assert empty(maintenance) == [1, 1, 0]
        record('retomada_RPC_idempotente_apos_commit', {'contas_operacoes_movimentos': empty(maintenance)})
    finally:
        existing.close(); holder.close()
        gate(recovery, db, True)
        maintenance.close(); recovery.close()

    # Real administrative financial write: drain completed but committed data must abort M3.2.
    occupied = make_db()
    with connect('postgres') as recovery, connect(occupied) as maintenance:
        with connect(occupied, True) as admin:
            gate(recovery, occupied, False)
            rpc(admin, 'tesouraria_criar_conta', request(nome='LOCAL ADMIN', conta_tipo='caixa', valor='0.00'))
        drained(maintenance)
        original = preserved(maintenance)
        try:
            maintenance.execute(FINAL.decode())
        except psycopg.Error as e:
            assert 'existem dados' in str(e)
            maintenance.execute('ROLLBACK')
        else:
            raise AssertionError('Nonempty database accepted')
        assert empty(maintenance) == [1, 1, 0] and preserved(maintenance) == original
        assert scalar(maintenance, "SELECT to_regclass('financeiro_hml.tes_op_abertura_conta_uq') IS NULL")
        gate(recovery, occupied, True)
        record('escrita_financeira_anterior_commit_aborta_sem_perda', {'vazias': False, 'dados_preservados': True})

    for failure in ['erro_DDL', 'perda_conexao']:
        target = make_db()
        recovery = connect('postgres')
        maintenance = connect(target)
        try:
            gate(recovery, target, False)
            drained(maintenance)
            # Execute exact prefix through new index/function/trigger inside same transaction.
            prefix, suffix = FINAL.decode().split('-- Historico completo separado', 1)
            maintenance.execute(prefix)
            if failure == 'erro_DDL':
                try:
                    maintenance.execute('SELECT 1/0')
                except psycopg.Error as e:
                    assert e.sqlstate == '22012'
                    maintenance.execute('ROLLBACK')
                assert empty(maintenance) == [0, 0, 0]
                assert scalar(maintenance, "SELECT to_regclass('financeiro_hml.tes_op_abertura_conta_uq') IS NULL")
            else:
                # Voluntary disconnection simulates connection loss, not backend cancellation.
                maintenance.close()
            gate(recovery, target, True)
            with connect(target) as check:
                assert empty(check) == [0, 0, 0]
                assert scalar(check, "SELECT to_regclass('financeiro_hml.tes_op_abertura_conta_uq') IS NULL")
            record(failure + '_rollback_recuperacao_outro_banco_mesmo_cluster', {'parcial': False})
        finally:
            gate(recovery, target, True)
            maintenance.close(); recovery.close()


if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        RESULTS.append({'resultado': 'FAIL', 'erro': repr(e)})
        raise
    finally:
        POOL.shutdown(wait=True)
        # All test sessions are explicitly closed; cleanup is never FORCE.
        for db in DATABASES:
            with connect('postgres') as c:
                gate(c, db, True)
                c.execute(sql.SQL('DROP DATABASE {}').format(sql.Identifier(db)))
        out = ROOT / 'docs/m3/RESULTADOS_MANUTENCAO_LOCAL.json'
        out.write_text(json.dumps(RESULTS, ensure_ascii=False, indent=2, default=str))