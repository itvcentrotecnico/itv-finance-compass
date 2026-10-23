"""Real multi-session tests. Fixed local socket only; never reads HML credentials.

Requires psycopg 3 and the disposable PostgreSQL fixture socket used in the review.
Creates isolated databases from the checked-in M1/M2/M3 SQL, then drops them.
Evidence: /tmp/m3-final/resultados.json. No mock locks or production connections.
"""
import json
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from decimal import Decimal
from pathlib import Path

import psycopg
from psycopg.rows import dict_row

ROOT = Path(__file__).resolve().parents[2]
OUT = Path('/tmp/m3-final')
OUT.mkdir(exist_ok=True)
SOCKET = '/tmp/m3-review/socket'
PORT = 55439
USER = '11111111-1111-4111-8111-111111111111'
PLAN = '33333333-3333-4333-8333-333333333333'
CENTER = '44444444-4444-4444-8444-444444444444'
RESULTS = []
DATABASES = []
POOL = ThreadPoolExecutor(max_workers=4)


def connect(db='postgres', auth=False):
    c = psycopg.connect(host=SOCKET, port=PORT, user='postgres', dbname=db,
                         autocommit=True, row_factory=dict_row)
    c.execute("SET client_encoding='UTF8'; SET statement_timeout='15s'; SET deadlock_timeout='100ms'")
    if auth:
        c.execute("SELECT set_config('request.jwt.claim.sub', %s, false)", (USER,))
        c.execute('SET ROLE authenticated')
    return c


def scalar(c, sql, params=None):
    row = c.execute(sql, params).fetchone()
    assert row is not None
    return next(iter(row.values()))


def record(name, fn):
    detail = fn()
    RESULTS.append({'teste': name, 'resultado': 'PASS', 'evidencia': detail})
    print(name, 'PASS', flush=True)


def make_db():
    name = 'm32_local_' + uuid.uuid4().hex[:12]
    with connect() as c:
        c.execute(f'CREATE DATABASE "{name}"')
    DATABASES.append(name)
    with connect(name) as c:
        bootstrap = (ROOT / 'docs/m3/fixture_local.sql').read_text()
        c.execute(bootstrap)
        for path in sorted((ROOT / 'supabase/migrations').glob('*.sql')):
            c.execute(path.read_text())
        c.execute("SELECT set_config('request.jwt.claim.sub', %s, false)", (USER,))
        c.execute('INSERT INTO auth.users VALUES (%s)', (USER,))
        c.execute("INSERT INTO financeiro_hml.perfis(usuario_id,papel) VALUES (%s,'admin_geral')", (USER,))
        c.execute("INSERT INTO financeiro_hml.plano_contas(id,codigo,descricao,natureza) VALUES (%s,'LOCAL','LOCAL TESTE','receita')", (PLAN,))
        c.execute("INSERT INTO financeiro_hml.centros_custo(id,codigo,descricao) VALUES (%s,'LOCAL','LOCAL TESTE')", (CENTER,))
    return name


def request(**extra):
    return {'chave': str(uuid.uuid4()), 'data': '2026-10-23',
            'descricao': 'TESTE LOCAL CONCORRENTE', **extra}


def rpc(c, fn, p):
    return scalar(c, f'SELECT financeiro_hml.{fn}(%s::jsonb)', (json.dumps(p),))


def run_commit(c, action):
    try:
        value = action()
        c.execute('COMMIT')
        return {'ok': True, 'valor': value, 'pid': c.info.backend_pid}
    except psycopg.Error as e:
        c.execute('ROLLBACK')
        return {'ok': False, 'sqlstate': e.sqlstate, 'erro': str(e).splitlines()[0],
                'pid': c.info.backend_pid}


def wait_block(monitor, waiter, blocker):
    end = time.monotonic() + 6
    while time.monotonic() < end:
        if scalar(monitor, 'SELECT %s = ANY(pg_blocking_pids(%s))', (blocker, waiter)):
            return
        time.sleep(.01)
    raise AssertionError(f'Sessions {waiter}/{blocker} did not demonstrably overlap/block')


def pair(db, first, second):
    with connect(db, True) as a, connect(db, True) as b, connect(db) as monitor:
        a.execute('BEGIN ISOLATION LEVEL READ COMMITTED')
        b.execute('BEGIN ISOLATION LEVEL READ COMMITTED')
        value = first(a)
        future = POOL.submit(run_commit, b, lambda: second(b))
        wait_block(monitor, b.info.backend_pid, a.info.backend_pid)
        a.execute('COMMIT')
        return value, future.result(timeout=18)


def counts(c):
    return tuple(scalar(c, f'SELECT count(*) FROM financeiro_hml.{t}') for t in
                 ['tesouraria_operacoes', 'tesouraria_movimentos', 'auditoria'])


def balance(c, account):
    return scalar(c, "SELECT coalesce(sum(CASE direcao WHEN 'credito' THEN valor ELSE -valor END),0) FROM financeiro_hml.tesouraria_movimentos WHERE conta_financeira_id=%s", (account,))


def security(c):
    return c.execute("""SELECT n.nspname,c.relname,c.relrowsecurity,c.relforcerowsecurity,
        c.relacl::text FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
        WHERE n.nspname='financeiro_hml' AND c.relkind='r' ORDER BY c.relname""").fetchall(), c.execute("SELECT * FROM pg_policies WHERE schemaname='financeiro_hml' ORDER BY tablename,policyname").fetchall()


def preserved(c):
    tables = {t: c.execute(f'SELECT * FROM financeiro_hml.{t} ORDER BY 1').fetchall()
              for t in ['perfis', 'plano_contas', 'centros_custo', 'auditoria']}
    funcs = c.execute("""SELECT p.proname,pg_get_functiondef(p.oid) def,p.proacl::text
      FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='financeiro_hml' AND p.proname IN
      ('papel_atual','tem_papel','perfis_protecao','autoria','autoria_cadastro','pc_hierarquia','registrar_auditoria') ORDER BY p.proname""").fetchall()
    return tables, funcs, security(c)


def main():
    sql = (ROOT / 'docs/m3/M3_2_CORRECAO_PROPOSTA.sql').read_text()
    reverse = (ROOT / 'docs/m3/REVERSAO_PROPOSTA.sql').read_text()
    db = make_db()
    with connect(db) as c:
        before = preserved(c)
        c.execute(sql)
        assert preserved(c) == before, 'M1/M2 rows/functions/security changed'
        c.execute(reverse)
        assert preserved(c) == before
        c.execute(sql)
    record('compilacao_reversao_preservacao_M1_M2', lambda: 'SQL completo aplicado/revertido/reaplicado localmente; registros, 7 funcoes, ACLs de tabelas e RLS identicos')

    # Migration locks must fail before preflight if a writer is already active.
    race = make_db()
    with connect(race, True) as a, connect(race) as migration:
        a.execute('BEGIN')
        rpc(a, 'tesouraria_criar_conta', request(nome='LOCAL RACE', conta_tipo='caixa', valor='0.00'))
        outcome = run_commit(migration, lambda: migration.execute(sql))
        assert not outcome['ok'] and outcome['sqlstate'] == '55P03', outcome
        assert scalar(a, "SELECT to_regclass('financeiro_hml.tes_op_abertura_conta_uq') IS NULL")
        a.execute('COMMIT')
        outcome2 = run_commit(migration, lambda: migration.execute(sql))
        assert not outcome2['ok'] and 'existem dados' in outcome2['erro'], outcome2
        assert scalar(migration, 'SELECT count(*) FROM financeiro_hml.contas_financeiras') == 1
    record('migracao_escritor_anterior_e_dados_preservados', lambda: [outcome, outcome2])

    # Hold the actual final script after locked preflight, before remaining DDL.
    for finish in ['COMMIT', 'ROLLBACK']:
        race2 = make_db()
        prefix, suffix = sql.split('CREATE OR REPLACE FUNCTION financeiro_hml.tes_validar_efeitos()', 1)
        with connect(race2) as migration, connect(race2, True) as writer, connect(race2) as mon:
            migration.execute(prefix)
            locks = scalar(mon, "SELECT count(*) FROM pg_locks WHERE pid=%s AND mode='AccessExclusiveLock' AND granted AND relation IN ('financeiro_hml.contas_financeiras'::regclass,'financeiro_hml.tesouraria_operacoes'::regclass,'financeiro_hml.tesouraria_movimentos'::regclass)", (migration.info.backend_pid,))
            assert locks == 3
            writer.execute('BEGIN')
            future = POOL.submit(run_commit, writer, lambda: writer.execute("UPDATE financeiro_hml.contas_financeiras SET nome=nome WHERE false").rowcount)
            wait_block(mon, writer.info.backend_pid, migration.info.backend_pid)
            assert scalar(migration, 'SELECT count(*) FROM financeiro_hml.contas_financeiras') == 0
            if finish == 'COMMIT':
                migration.execute('CREATE OR REPLACE FUNCTION financeiro_hml.tes_validar_efeitos()' + suffix)
            else:
                migration.execute('ROLLBACK')
            result = future.result(timeout=18)
            assert result['ok'], result
            assert scalar(mon, "SELECT count(*) FROM pg_locks WHERE pid=%s AND mode='AccessExclusiveLock' AND granted", (migration.info.backend_pid,)) == 0
        record('migracao_bloqueia_escritor_ate_' + finish.lower(), lambda: {'locks': locks, 'writer': result})

    with connect(db, True) as c:
        aa = rpc(c, 'tesouraria_criar_conta', request(nome='LOCAL A', conta_tipo='caixa', valor='100.00'))['conta_id']
        bb = rpc(c, 'tesouraria_criar_conta', request(nome='LOCAL B', conta_tipo='caixa', valor='100.00'))['conta_id']
    transfer = lambda **kw: request(origem=aa, destino=bb, valor='0.30', **kw)

    with connect(db) as mon:
        p = transfer()
        start = counts(mon)
        first, second = pair(db, lambda c: rpc(c, 'tesouraria_transferir', p),
                             lambda c: rpc(c, 'tesouraria_transferir', {**p, 'valor': '0.3'}))
        assert second['ok'] and second['valor']['id'] == first['id'] and second['valor']['repetida']
        assert counts(mon) == (start[0]+1, start[1]+2, start[2]+1)
        record('mesma_chave_conteudo_equivalente', lambda: {'primeira': first, 'segunda': second, 'delta': [1,2,1]})

        p = transfer()
        start = counts(mon)
        first, second = pair(db, lambda c: rpc(c, 'tesouraria_transferir', p),
                             lambda c: rpc(c, 'tesouraria_transferir', {**p, 'valor': '0.31'}))
        assert not second['ok'] and 'TES_IDEMPOTENCIA' in second['erro'], second
        assert counts(mon) == (start[0]+1, start[1]+2, start[2]+1)
        record('mesma_chave_conteudos_diferentes', lambda: second)

        ba, balb = balance(mon, aa), balance(mon, bb)
        start = counts(mon)
        first, second = pair(db, lambda c: rpc(c, 'tesouraria_transferir', transfer()),
                             lambda c: rpc(c, 'tesouraria_transferir', request(origem=bb,destino=aa,valor='0.30')))
        assert second['ok'] and counts(mon) == (start[0]+2,start[1]+4,start[2]+2)
        assert balance(mon, aa) == ba and balance(mon, bb) == balb
        record('transferencias_sentidos_opostos', lambda: {'pids': second['pid'], 'saldos_preservados': True})

        with connect(db, True) as c:
            original = rpc(c, 'tesouraria_transferir', transfer())['id']
        start = counts(mon)
        rp = request(original=original,justificativa='TESTE LOCAL ESTORNO')
        first, second = pair(db, lambda c: rpc(c, 'tesouraria_estornar', rp),
                             lambda c: rpc(c, 'tesouraria_estornar', {**rp,'chave':str(uuid.uuid4())}))
        assert not second['ok'] and 'TES_JA_ESTORNADA' in second['erro'], second
        assert counts(mon) == (start[0]+1,start[1]+2,start[2]+1)
        assert scalar(mon, 'SELECT count(*) FROM financeiro_hml.tesouraria_operacoes WHERE operacao_original_id=%s', (original,)) == 1
        record('dois_estornos_mesma_operacao', lambda: second)

        # Both serial orders for each independently mutable registry.
        for table, ident, token in [('contas_financeiras',aa,'TES_CONTA_INATIVA'),('plano_contas',PLAN,'TES_CLASSIFICACAO'),('centros_custo',CENTER,'TES_CENTRO')]:
            launch = request(tipo='entrada',destino=aa,plano=PLAN,centro=CENTER,valor='0.10')
            def update(c, active):
                return c.execute(f'UPDATE financeiro_hml.{table} SET ativo=%s WHERE id=%s', (active,ident)).rowcount
            start = counts(mon)
            first, second = pair(db, lambda c: update(c,False),lambda c: rpc(c,'tesouraria_lancar',launch))
            assert not second['ok'] and token in second['erro'], second
            assert counts(mon) == (start[0],start[1],start[2]+1)
            with connect(db,True) as c: update(c,True)
            first2, second2 = pair(db,lambda c: rpc(c,'tesouraria_lancar',launch),lambda c:update(c,False))
            assert second2['ok']
            assert scalar(mon,'SELECT count(*) FROM financeiro_hml.tesouraria_operacoes WHERE id=%s',(first2['id'],)) == 1
            with connect(db,True) as c: update(c,True)
            record('inativacao_' + table + '_ambas_ordens', lambda: {'inativacao_primeiro':second,'lancamento_primeiro':second2})

        # Deliberate mixed-order deadlock: A account->classification; B classification->account.
        p = request(tipo='entrada',destino=aa,plano=PLAN,centro=CENTER,valor='0.10')
        start = counts(mon)
        ba = balance(mon,aa)
        with connect(db,True) as a, connect(db,True) as b:
            a.execute('BEGIN'); b.execute('BEGIN')
            a.execute('UPDATE financeiro_hml.contas_financeiras SET nome=nome WHERE id=%s',(aa,))
            fb = POOL.submit(run_commit,b,lambda:rpc(b,'tesouraria_lancar',p))
            wait_block(mon,b.info.backend_pid,a.info.backend_pid)
            fa = POOL.submit(run_commit,a,lambda:a.execute('UPDATE financeiro_hml.plano_contas SET descricao=descricao WHERE id=%s',(PLAN,)).rowcount)
            ra, rb = fa.result(timeout=18), fb.result(timeout=18)
        victims = [x for x in [ra,rb] if not x['ok']]
        assert len(victims)==1 and victims[0]['sqlstate']=='40P01', [ra,rb]
        with connect(db,True) as c:
            retried = rpc(c,'tesouraria_lancar',p)
            repeated = rpc(c,'tesouraria_lancar',p)
        assert repeated['id']==retried['id'] and repeated['repetida']
        assert scalar(mon,'SELECT count(*) FROM financeiro_hml.tesouraria_operacoes WHERE chave_idempotencia=%s',(p['chave'],))==1
        assert balance(mon,aa)==ba+Decimal('0.10')
        assert scalar(mon,'SELECT count(*) FROM financeiro_hml.tesouraria_movimentos WHERE operacao_id=%s',(retried['id'],))==1
        record('deadlock_40P01_rollback_retry_mesma_chave',lambda:{'sessao_A':ra,'sessao_B':rb,'retry':retried,'replay':repeated})

        # Force deferred failure at COMMIT, then retry original key and ensure no residue.
        p = transfer()
        start = counts(mon)
        with connect(db,True) as writer, connect(db) as breaker:
            breaker.execute("""CREATE FUNCTION financeiro_hml.local_test_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.descricao='TESTE LOCAL CONCORRENTE' THEN RAISE EXCEPTION 'LOCAL_DEFERRED_FAILURE'; END IF; RETURN NULL; END $$;
              CREATE CONSTRAINT TRIGGER local_test_fail AFTER INSERT ON financeiro_hml.tesouraria_operacoes DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION financeiro_hml.local_test_fail();""")
            writer.execute('BEGIN')
            partial=rpc(writer,'tesouraria_transferir',p)
            assert counts(mon)==start, 'Uncommitted effects visible to other session'
            failed=run_commit(writer,lambda: None)
            assert not failed['ok'] and 'LOCAL_DEFERRED_FAILURE' in failed['erro']
            assert counts(mon)==start, 'Partial operation/audit survived failed COMMIT'
            breaker.execute('DROP TRIGGER local_test_fail ON financeiro_hml.tesouraria_operacoes; DROP FUNCTION financeiro_hml.local_test_fail()')
            retry=rpc(writer,'tesouraria_transferir',p)
            replay=rpc(writer,'tesouraria_transferir',p)
            assert retry['id']==replay['id'] and replay['repetida']
            assert counts(mon)==(start[0]+1,start[1]+2,start[2]+1)
        record('falha_commit_sem_operacao_efeitos_auditoria_parciais',lambda:{'falha':failed,'retry':retry})

        # No application role can bypass immutable ledger through direct writes.
        with connect(db,True) as c:
            outcome=run_commit(c,lambda:c.execute('DELETE FROM financeiro_hml.tesouraria_movimentos'))
            assert not outcome['ok'] and outcome['sqlstate']=='42501'
        record('RLS_grants_sem_escrita_direta_ledger',lambda:outcome)
        assert scalar(mon,"""SELECT count(*) FROM financeiro_hml.tesouraria_operacoes o WHERE
          (o.tipo='transferencia' AND ((SELECT count(*) FROM financeiro_hml.tesouraria_movimentos m WHERE m.operacao_id=o.id)<>2 OR
          (SELECT sum(CASE direcao WHEN 'credito' THEN valor ELSE -valor END) FROM financeiro_hml.tesouraria_movimentos m WHERE m.operacao_id=o.id)<>0))""")==0
        assert balance(mon,aa)+balance(mon,bb)==Decimal('200.40')
        record('reconciliacao_final_sem_transferencias_parciais',lambda:{'saldo_A':str(balance(mon,aa)),'saldo_B':str(balance(mon,bb)),'total':'200.40'})


if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        RESULTS.append({'resultado':'FAIL','erro':repr(e)})
        raise
    finally:
        POOL.shutdown(wait=True)
        for db in DATABASES:
            with connect() as c: c.execute(f'DROP DATABASE "{db}" WITH (FORCE)')
        (OUT/'resultados.json').write_text(json.dumps(RESULTS,indent=2,default=str,ensure_ascii=False))