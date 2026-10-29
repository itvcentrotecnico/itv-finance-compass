"""Testes apenas no cluster descartável /tmp/m5-manual-socket: nunca HML/origem."""
import json
import subprocess
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CMD = ['psql', '-h', '/tmp/m5-manual-socket', '-p', '55441', '-U', 'lovable', '-d', 'postgres', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1']
checks = 0
def sql(text):
    return subprocess.check_output(CMD + ['-c', text], text=True).strip()
def check(name, ok):
    global checks
    if not ok: raise AssertionError(name)
    checks += 1
    print('OK', name)
def actor(at='2026-10-29T22:30:00Z', admin=True, role='authenticated'):
    return f"SET ROLE {role}; SET request.jwt.claim.sub='00000000-0000-4000-8000-000000000001'; SET test.admin='{str(admin).lower()}'; SET test.agora='{at}';"
def state(at='2026-10-29T22:30:00Z'):
    return json.loads(sql(actor(at) + 'SELECT financeiro_hml.integracao_estado_manual();'))
def start(at='2026-10-29T22:30:00Z', admin=True, role='authenticated'):
    return subprocess.run(CMD + ['-c', actor(at, admin, role) + 'SELECT financeiro_hml.integracao_iniciar();'], text=True, capture_output=True)
def blocked(name, code, **kwargs):
    before = sql('SELECT count(*) FROM financeiro_hml.integracao_sincronizacoes;')
    r = start(**kwargs)
    check(name, r.returncode != 0 and code in r.stderr and before == sql('SELECT count(*) FROM financeiro_hml.integracao_sincronizacoes;'))
def reset(): sql('TRUNCATE financeiro_hml.integracao_sincronizacoes;')
def seed(status='concluida', modo='manual', at='2026-10-29T22:34:00Z', end=True, novos=0):
    sql(f"INSERT INTO financeiro_hml.integracao_sincronizacoes(modo,status,iniciado_em,concluido_em,novos) VALUES('{modo}','{status}','{at}',{repr(at) if end else 'NULL'},{novos});")

sql("""
CREATE ROLE authenticated; CREATE ROLE anon; CREATE ROLE service_role;
CREATE SCHEMA auth; GRANT USAGE ON SCHEMA auth TO authenticated,anon,service_role;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
CREATE SCHEMA financeiro_hml; GRANT USAGE ON SCHEMA financeiro_hml TO authenticated,anon,service_role;
CREATE FUNCTION financeiro_hml.tem_papel(text[]) RETURNS boolean LANGUAGE sql AS $$SELECT coalesce(current_setting('test.admin',true),'false')::boolean$$;
CREATE FUNCTION financeiro_hml.test_agora() RETURNS timestamptz LANGUAGE sql AS $$SELECT current_setting('test.agora')::timestamptz$$;
CREATE TABLE financeiro_hml.integracao_sincronizacoes(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),responsavel_id uuid,modo text NOT NULL DEFAULT 'manual',status text NOT NULL DEFAULT 'em_andamento',iniciado_em timestamptz NOT NULL DEFAULT financeiro_hml.test_agora(),concluido_em timestamptz,novos integer NOT NULL DEFAULT 0,erros jsonb);
CREATE UNIQUE INDEX integracao_sync_uma_em_andamento ON financeiro_hml.integracao_sincronizacoes((true)) WHERE status='em_andamento';
GRANT SELECT ON financeiro_hml.integracao_sincronizacoes TO authenticated;
CREATE FUNCTION financeiro_hml.integracao_expirar_travadas() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $$DECLARE n integer; BEGIN UPDATE financeiro_hml.integracao_sincronizacoes SET status='falha',concluido_em=financeiro_hml.test_agora(),erros='[{"etapa":"tempo_esgotado"}]' WHERE status='em_andamento' AND iniciado_em < financeiro_hml.test_agora()-interval '15 minutes';GET DIAGNOSTICS n=ROW_COUNT;RETURN n;END$$;
REVOKE ALL ON FUNCTION financeiro_hml.integracao_expirar_travadas() FROM PUBLIC;
CREATE TABLE financeiro_hml.auditoria(id bigserial,event jsonb);
CREATE FUNCTION financeiro_hml.auditar() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$BEGIN INSERT INTO financeiro_hml.auditoria(event) VALUES(to_jsonb(NEW));RETURN NEW;END$$;
CREATE TRIGGER auditar AFTER INSERT OR UPDATE ON financeiro_hml.integracao_sincronizacoes FOR EACH ROW EXECUTE FUNCTION financeiro_hml.auditar();
CREATE TABLE financeiro_hml.registros_sentinela(id int,saldo numeric); INSERT INTO financeiro_hml.registros_sentinela SELECT n,0 FROM generate_series(1,49) n;
CREATE TABLE financeiro_hml.conferencias_sentinela(id int); INSERT INTO financeiro_hml.conferencias_sentinela SELECT generate_series(1,49);
CREATE TABLE financeiro_hml.movimentos_sentinela(id int);
""")
# Única substituição para testar fronteiras determinísticas: não há parâmetro de relógio no SQL de produção.
proposal = (ROOT / 'docs/m5/M5_CONTROLES_MANUAIS_PROPOSTO.sql').read_text()
sql(proposal.replace('clock_timestamp()', 'financeiro_hml.test_agora()'))
sql((ROOT / 'docs/m5/M5_ESTADO_MANUAL_PERMISSOES.sql').read_text())
blocked('bloqueio 18h29 por chamada direta', 'INT_HORARIO_MANUAL', at='2026-10-29T22:29:00Z')
blocked('bloqueio 18h29min59s', 'INT_HORARIO_MANUAL', at='2026-10-29T22:29:59Z')
check('estado bloqueia 18h29', state('2026-10-29T22:29:00Z')['permitida'] is False)
check('liberação às 18h30 Manaus/22h30 UTC', state()['permitida'] is True and start().returncode == 0)
blocked('segunda execução concorrente após commit', 'INT_EM_ANDAMENTO')
sql("UPDATE financeiro_hml.integracao_sincronizacoes SET status='falha',concluido_em='2026-10-29T22:30:01Z';")
check('nova tentativa manual após falha', start(at='2026-10-29T22:31:00Z').returncode == 0)
sql("UPDATE financeiro_hml.integracao_sincronizacoes SET status='concluida',concluido_em='2026-10-29T22:31:01Z',novos=0 WHERE status='em_andamento';")
blocked('sucesso zero novos conta para limite diário', 'INT_SUCESSO_DIARIO', at='2026-10-29T22:32:00Z')
s = state('2026-10-29T22:32:00Z')
check('último sucesso e liberação amanhã informados', s['motivo']=='sucesso_diario' and s['ultima_sucesso'].startswith('2026-10-29T22:31:01') and s['proxima_liberacao'].startswith('2026-10-30T22:30:00'))
blocked('bloqueio amanhã antes 18h30', 'INT_HORARIO_MANUAL', at='2026-10-30T22:29:00Z')
check('liberação dia seguinte às 18h30', start(at='2026-10-30T22:30:00Z').returncode == 0)
reset(); seed(novos=8)
blocked('sucesso histórico anterior à migração conta', 'INT_SUCESSO_DIARIO', at='2026-10-29T23:00:00Z')
reset(); seed(end=False)
blocked('legado sem conclusão usa início', 'INT_SUCESSO_DIARIO', at='2026-10-29T23:00:00Z')
reset(); seed(modo='automatica')
check('sucesso automático não conta como sucesso manual', start(at='2026-10-29T23:00:00Z').returncode==0)
reset()
blocked('administrador não autorizado', 'INT_PERMISSAO', admin=False)
blocked('anônimo sem EXECUTE', 'permission denied', role='anon')
blocked('service_role sem EXECUTE', 'permission denied', role='service_role')
r = subprocess.run(CMD+['-c',actor()+"RESET request.jwt.claim.sub; SELECT financeiro_hml.integracao_iniciar();"],capture_output=True,text=True)
check('sem identidade autenticada', r.returncode!=0 and 'INT_PERMISSAO' in r.stderr)
r = subprocess.run(CMD+['-c',actor(admin=False)+"SELECT financeiro_hml.integracao_estado_manual();"],capture_output=True,text=True)
check('estado recusa perfil não administrador',r.returncode!=0 and 'INT_PERMISSAO' in r.stderr)
check('23h59min59s permitido', start(at='2026-10-30T03:59:59Z').returncode==0)
reset()
blocked('meia-noite Manaus bloqueada', 'INT_HORARIO_MANUAL', at='2026-10-30T04:00:00Z')
seed(at='2026-10-30T03:59:59Z')
check('UTC já dia 30 mas sucesso pertence dia 29', state('2026-10-30T22:30:00Z')['permitida'] is True)
reset(); seed(at='2026-10-30T04:00:01Z')
blocked('conclusão após meia-noite conta para dia 30', 'INT_SUCESSO_DIARIO', at='2026-10-30T22:30:00Z')
reset(); seed(status='em_andamento',at='2026-10-29T22:10:00Z',end=False)
check('expiração existente preservada',start().returncode==0 and sql("SELECT count(*) FROM financeiro_hml.integracao_sincronizacoes WHERE status='falha';")=='1')
reset()
# Locks físicos em sessões independentes: disputa com início e com conclusão.
for mode in ['SHARE ROW EXCLUSIVE','ROW EXCLUSIVE']:
    p=subprocess.Popen(CMD+['-c',f"BEGIN; LOCK TABLE financeiro_hml.integracao_sincronizacoes IN {mode} MODE; SELECT pg_sleep(1.5); COMMIT;"],stdout=subprocess.DEVNULL)
    for _ in range(40):
        if sql("SELECT count(*) FROM pg_locks WHERE relation='financeiro_hml.integracao_sincronizacoes'::regclass AND granted AND mode IN ('ShareRowExclusiveLock','RowExclusiveLock');")!='0':break
        time.sleep(.03)
    blocked('concorrência física '+mode,'INT_EM_ANDAMENTO')
    p.wait()
reset()
before=sql('SELECT count(*) FROM financeiro_hml.auditoria;')
state()
check('consulta de disponibilidade não escreve auditoria',before==sql('SELECT count(*) FROM financeiro_hml.auditoria;'))
check('gatilho de auditoria preservado',int(before)>0)
check('49 registros e saldos sentinela preservados',sql('SELECT count(*)||\'|\'||sum(saldo)::text FROM financeiro_hml.registros_sentinela;')=='49|0')
check('49 conferências preservadas',sql('SELECT count(*) FROM financeiro_hml.conferencias_sentinela;')=='49')
check('zero movimentos automáticos',sql('SELECT count(*) FROM financeiro_hml.movimentos_sentinela;')=='0')
check('relógio não é parâmetro das funções de produção',sql("SELECT sum(pronargs) FROM pg_proc JOIN pg_namespace ON pronamespace=pg_namespace.oid WHERE nspname='financeiro_hml' AND proname IN ('integracao_iniciar','integracao_estado_manual');")=='0')
print(f'{checks} testes PostgreSQL isolados aprovados. Sem HML, origem ou sincronização real.')