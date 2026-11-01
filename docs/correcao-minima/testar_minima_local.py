"""Somente socket fixo local; não lê credenciais e nunca conecta ao HML.
Requer fixture M1/M2/M3 no PostgreSQL local descrito no relatório.
"""
import json
import subprocess
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BASE = ['psql', '-X', '-qAt', '-h', '/tmp/itv-minima/socket', '-p', '55447', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1']
RESULTS = []

def run(sql):
    return subprocess.run(BASE, input=sql, text=True, capture_output=True)

def sql(text):
    r = run(text)
    if r.returncode:
        raise RuntimeError(r.stderr)
    return r.stdout.strip()

def check(name, ok):
    if not ok:
        raise AssertionError(name)
    RESULTS.append({'teste': name, 'resultado': 'PASS'})
    print('PASS', name, flush=True)

def actor(user):
    return f"SET ROLE authenticated; SET request.jwt.claim.sub='{user}';"

def call(name, p, user):
    return run(actor(user) + f"SELECT financeiro_hml.{name}('{json.dumps(p)}'::jsonb);")

def blocked(name, fn, p, user, token):
    r = call(fn, p, user)
    check(name, r.returncode != 0 and token in r.stderr)

def engine(p, user):
    # Only isolated privileged test harness enters the private engine.
    # A public production wrapper is never opened to bypass required review.
    return run(f"SET request.jwt.claim.sub='{user}'; SELECT financeiro_hml.tes_executar('{json.dumps(p)}'::jsonb);")

try:
    sql(Path('/tmp/itv-minima/definicoes-originais.sql').read_text())
    users = [str(uuid.uuid4()) for _ in range(6)]
    for user, role in zip(users[:5], ['admin_geral', 'admin_financeiro', 'analista_financeiro', 'consulta_gerencial', 'admin_financeiro']):
        sql(f"INSERT INTO auth.users VALUES('{user}'); INSERT INTO financeiro_hml.perfis(usuario_id,papel,nome,ativo) VALUES('{user}','{role}','SINTETICO',{'false' if user==users[4] else 'true'});")
    sql(f"INSERT INTO auth.users VALUES('{users[5]}');")
    account = ''
    for n in range(6):
        r = call('tesouraria_criar_conta', {'chave': str(uuid.uuid4()), 'data':'2026-11-01', 'descricao':'ABERTURA SINTETICA', 'nome':f'LOCAL {n}', 'conta_tipo':'caixa', 'valor':'0.00'}, users[0])
        if r.returncode:
            raise RuntimeError(r.stderr)
        if n == 0:
            account = json.loads(r.stdout)['conta_id']
    plans = [str(uuid.uuid4()) for _ in range(4)]
    for i, nature in enumerate(['receita', 'despesa', 'receita', 'despesa']):
        sql(f"INSERT INTO financeiro_hml.plano_contas(id,codigo,descricao,natureza,ativo,aceita_lancamentos) VALUES('{plans[i]}','LOCAL{i}','SINTETICA','{nature}',{'false' if i==2 else 'true'},{'false' if i==3 else 'true'});")
    opening_hash = sql("SELECT md5(jsonb_agg(to_jsonb(t) ORDER BY id)::text) FROM financeiro_hml.tesouraria_operacoes t WHERE tipo='abertura';")
    counts = sql("SELECT count(*)||':'||(SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='financeiro_hml') FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='financeiro_hml' AND c.relkind='r';")
    proposal = (ROOT/'docs/correcao-minima/CORRECAO_MINIMA_PROPOSTA.sql').read_text()
    r = run(proposal)
    check('proposta sem autorização técnica local recusada', r.returncode != 0 and 'MINIMA_NAO_AUTORIZADA' in r.stderr)
    sql("SET itv.minima.validacao='RECUPERACAO_MANUTENCAO_APROVADAS';" + proposal)
    check('nenhuma tabela ou função adicional', counts == sql("SELECT count(*)||':'||(SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='financeiro_hml') FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='financeiro_hml' AND c.relkind='r';"))
    p = {'tipo':'entrada', 'chave':str(uuid.uuid4()), 'data':'2026-11-01', 'descricao':'RECEITA SINTETICA', 'valor':'100.10', 'destino':account, 'plano':plans[0]}
    for i, label in [(0,'geral'),(1,'financeiro')]:
        q = {**p, 'chave':str(uuid.uuid4())}
        r = engine(q, users[i])
        check(f'motor aceita administrador {label}', r.returncode == 0 and 'id' in json.loads(r.stdout))
    for i, label in [(2,'analista'),(3,'consulta'),(4,'perfil inativo'),(5,'sem perfil')]:
        r = engine({**p, 'chave':str(uuid.uuid4())}, users[i])
        check(f'motor recusa {label}', r.returncode != 0 and 'TES_PERMISSAO' in r.stderr)
    r = engine(p, '')
    check('motor recusa ausência de identidade', r.returncode != 0 and 'TES_PERMISSAO' in r.stderr)
    for name, override, token in [
        ('receita com categoria despesa',{'plano':plans[1]},'TES_CATEGORIA_NATUREZA'),
        ('despesa com categoria receita',{'tipo':'saida','origem':account,'destino':None},'TES_CATEGORIA_NATUREZA'),
        ('categoria inativa',{'plano':plans[2]},'TES_CLASSIFICACAO'),
        ('categoria sem aceite',{'plano':plans[3]},'TES_CLASSIFICACAO')]:
        r = engine({**p, **override, 'chave':str(uuid.uuid4())}, users[0])
        check(name, r.returncode != 0 and token in r.stderr)
    debit = {**p, 'tipo':'saida', 'chave':str(uuid.uuid4()), 'descricao':'DESPESA SINTETICA', 'origem':account, 'destino':None, 'plano':plans[1], 'valor':'20.20'}
    r = engine(debit, users[1])
    check('motor aceita despesa compatível', r.returncode == 0)
    r = engine(p, users[0]); first = json.loads(r.stdout)
    r = engine(p, users[0]); second = json.loads(r.stdout)
    check('mesma chave não duplica', first['id'] == second['id'] and second['repetida'] is True)
    r = engine({**p,'valor':'100.11'}, users[0])
    check('mesma chave com outro valor recusada', r.returncode != 0 and 'TES_IDEMPOTENCIA' in r.stderr)
    check('saldo exato persistido 280.10', sql(f"SELECT sum(CASE direcao WHEN 'credito' THEN valor ELSE -valor END)::text FROM financeiro_hml.tesouraria_movimentos WHERE conta_financeira_id='{account}';") == '280.10')
    hist = sql(actor(users[0])+"SELECT financeiro_hml.tesouraria_historico_operacoes('{}');")
    check('histórico persistido seis aberturas e quatro lançamentos', json.loads(hist)['total'] == 10)
    check('seis aberturas intactas', opening_hash == sql("SELECT md5(jsonb_agg(to_jsonb(t) ORDER BY id)::text) FROM financeiro_hml.tesouraria_operacoes t WHERE tipo='abertura';"))
    blocked('motor privado não vira API', 'tes_executar', p, users[0], 'permission denied')
    for fn in ['tesouraria_lancar','tesouraria_transferir','tesouraria_estornar','tesouraria_criar_conta','tesouraria_habilitar_conta','tesouraria_lancar_conferencia']:
        blocked('revisão obrigatória: '+fn, fn, p, users[0], 'TES_REVISAO_OBRIGATORIA')
    # A real independent writer prevents NOWAIT maintenance application.
    lock = subprocess.Popen(BASE, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    lock.stdin.write("BEGIN; LOCK TABLE financeiro_hml.tesouraria_operacoes IN ROW EXCLUSIVE MODE; SELECT 'LOCKED'; SELECT pg_sleep(3); ROLLBACK;\n")
    lock.stdin.close()
    while lock.stdout.readline().strip() != 'LOCKED':
        if lock.poll() is not None:
            raise RuntimeError('lock unavailable')
    r = run("SET itv.minima.validacao='RECUPERACAO_MANUTENCAO_APROVADAS';"+proposal)
    check('manutenção recusa escritor concorrente sem esperar', r.returncode != 0 and 'could not obtain lock' in r.stderr)
    lock.wait(timeout=10)
    baseline = sql("SELECT md5(jsonb_agg(to_jsonb(t) ORDER BY id)::text) FROM financeiro_hml.tesouraria_operacoes t;")
    reverse = (ROOT/'docs/correcao-minima/REVERSAO_SEGURA_PROPOSTA.sql').read_text()
    r=run(reverse);check('reversão sem autorização recusada',r.returncode != 0 and 'MINIMA_REVERSAO_NAO_AUTORIZADA' in r.stderr)
    sql("SET itv.minima.reversao='REVERSAO_AUTORIZADA';"+reverse)
    r=engine({**p,'chave':str(uuid.uuid4())},users[0]);check('reversão fecha motor inclusive privilegiado com identidade',r.returncode != 0 and 'TES_OPERACAO_BLOQUEADA' in r.stderr)
    check('reversão preserva registros',baseline == sql("SELECT md5(jsonb_agg(to_jsonb(t) ORDER BY id)::text) FROM financeiro_hml.tesouraria_operacoes t;"))
    check('reversão preserva consultas',json.loads(sql(actor(users[0])+"SELECT financeiro_hml.tesouraria_historico_operacoes('{}');"))['total']==10)
finally:
    (ROOT/'docs/correcao-minima/RESULTADOS_TESTES_LOCAIS.json').write_text(json.dumps(RESULTS,ensure_ascii=False,indent=2))