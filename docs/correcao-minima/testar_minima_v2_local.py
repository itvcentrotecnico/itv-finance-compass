"""Somente socket fixo local; não lê credenciais e nunca conecta ao HML.
Requer fixture M1/M2/M3 no PostgreSQL local descrito no relatório.
V2: os dez testes obrigatórios passam pelo intermediário público
tesouraria_lancar com papel autenticado, sem chamada privilegiada ao motor.
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

    # Antes da correção: o legado não conhece a sonda — a interface permanece fechada.
    r = call('tesouraria_lancar', {'tipo': 'sonda'}, users[0])
    check('legado sem sonda: interface permanece fechada antes da correção', r.returncode != 0)

    proposal = (ROOT/'docs/correcao-minima/CORRECAO_MINIMA_V2_PROPOSTA.sql').read_text()
    r = run(proposal)
    check('proposta sem autorização técnica local recusada', r.returncode != 0 and 'MINIMA_NAO_AUTORIZADA' in r.stderr)
    sql("SET itv.minima.validacao='RECUPERACAO_MANUTENCAO_APROVADAS';" + proposal)
    check('nenhuma tabela ou função adicional', counts == sql("SELECT count(*)||':'||(SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='financeiro_hml') FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='financeiro_hml' AND c.relkind='r';"))

    # Contrato real: a sonda confirma a versão corrigida sem efeito financeiro.
    r = call('tesouraria_lancar', {'tipo': 'sonda'}, users[0])
    check('sonda confirma contrato minima_v2 sem efeito financeiro', r.returncode == 0 and json.loads(r.stdout)['contrato'] == 'tesouraria_lancar_minima_v2')
    check('sonda não grava nada', sql("SELECT count(*) FROM financeiro_hml.tesouraria_operacoes WHERE tipo<>'abertura';") == '0')

    # Caminho público autenticado: somente o intermediário tesouraria_lancar.
    p = {'tipo':'entrada', 'chave':str(uuid.uuid4()), 'data':'2026-11-01', 'descricao':'RECEITA SINTETICA', 'valor':'100.10', 'destino':account, 'plano':plans[0]}
    r = call('tesouraria_lancar', p, users[0])
    check('1. Administrador Geral registra receita', r.returncode == 0 and 'id' in json.loads(r.stdout))
    despesa = {'tipo':'saida', 'chave':str(uuid.uuid4()), 'data':'2026-11-01', 'descricao':'DESPESA SINTETICA', 'valor':'20.20', 'origem':account, 'plano':plans[1]}
    r = call('tesouraria_lancar', despesa, users[1])
    check('2. Administrador Financeiro registra despesa', r.returncode == 0 and 'id' in json.loads(r.stdout))
    for i, label in [(2,'analista'),(3,'consulta'),(4,'perfil inativo')]:
        r = call('tesouraria_lancar', {**p, 'chave':str(uuid.uuid4())}, users[i])
        check(f'3. {label} não consegue lançar', r.returncode != 0 and 'TES_PERMISSAO' in r.stderr)
    r = call('tesouraria_lancar', {**p, 'chave':str(uuid.uuid4())}, users[5])
    check('4. usuário sem perfil não consegue lançar', r.returncode != 0 and 'TES_PERMISSAO' in r.stderr)
    r = run(f"SET ROLE authenticated; SELECT financeiro_hml.tesouraria_lancar('{json.dumps({**p, 'chave':str(uuid.uuid4())})}'::jsonb);")
    check('4b. sessão sem identidade não consegue lançar', r.returncode != 0 and 'TES_PERMISSAO' in r.stderr)
    r = call('tesouraria_lancar', {**p, 'plano':plans[1], 'chave':str(uuid.uuid4())}, users[0])
    check('5. receita com categoria de despesa é recusada', r.returncode != 0 and 'TES_CATEGORIA_NATUREZA' in r.stderr)
    r = call('tesouraria_lancar', {**despesa, 'plano':plans[0], 'chave':str(uuid.uuid4())}, users[1])
    check('6. despesa com categoria de receita é recusada', r.returncode != 0 and 'TES_CATEGORIA_NATUREZA' in r.stderr)
    for name, override in [('categoria inativa recusada',{'plano':plans[2]}), ('categoria sem aceite recusada',{'plano':plans[3]})]:
        r = call('tesouraria_lancar', {**p, **override, 'chave':str(uuid.uuid4())}, users[0])
        check(name, r.returncode != 0 and 'TES_CLASSIFICACAO' in r.stderr)
    r = call('tesouraria_lancar', p, users[0]); first = json.loads(r.stdout)
    r = call('tesouraria_lancar', p, users[0]); second = json.loads(r.stdout)
    check('7. repetição da mesma chave não duplica', first['id'] == second['id'] and second['repetida'] is True)
    r = call('tesouraria_lancar', {**p,'valor':'100.11'}, users[0])
    check('7b. mesma chave com outro valor recusada', r.returncode != 0 and 'TES_IDEMPOTENCIA' in r.stderr)
    check('8. saldo exato persistido 180.00', sql(f"SELECT sum(CASE direcao WHEN 'credito' THEN valor ELSE -valor END)::text FROM financeiro_hml.tesouraria_movimentos WHERE conta_financeira_id='{account}';") == '180.00')
    hist = json.loads(sql(actor(users[0])+"SELECT financeiro_hml.tesouraria_historico_operacoes('{}');"))
    check('8b. histórico com seis aberturas e três lançamentos', hist['total'] == 9)
    check('8c. seis aberturas intactas', opening_hash == sql("SELECT md5(jsonb_agg(to_jsonb(t) ORDER BY id)::text) FROM financeiro_hml.tesouraria_operacoes t WHERE tipo='abertura';"))
    for name, override in [('transferência pelo intermediário de lançamento',{'tipo':'transferencia','destino':account}), ('estorno pelo intermediário de lançamento',{'tipo':'estorno','original':first['id']}), ('abertura pelo intermediário de lançamento',{'tipo':'abertura','nome':'LOCAL X','conta_tipo':'caixa'})]:
        r = call('tesouraria_lancar', {**p, **override, 'chave':str(uuid.uuid4())}, users[0])
        check('9. ' + name + ' bloqueada', r.returncode != 0 and 'TES_DADOS' in r.stderr)
    for fn in ['tesouraria_transferir','tesouraria_estornar','tesouraria_criar_conta','tesouraria_habilitar_conta','tesouraria_lancar_conferencia']:
        blocked('9b. permanece fechado: '+fn, fn, p, users[0], 'TES_REVISAO_OBRIGATORIA')
    blocked('10. motor privado não vira API', 'tes_executar', p, users[0], 'permission denied')

    # Manutenção: escritor concorrente real impede aplicação sem espera silenciosa.
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
    reverse = (ROOT/'docs/correcao-minima/REVERSAO_SEGURA_V2_PROPOSTA.sql').read_text()
    r=run(reverse);check('reversão sem autorização recusada',r.returncode != 0 and 'MINIMA_REVERSAO_NAO_AUTORIZADA' in r.stderr)
    sql("SET itv.minima.reversao='REVERSAO_AUTORIZADA';"+reverse)
    r=call('tesouraria_lancar',{**p,'chave':str(uuid.uuid4())},users[0]);check('reversão fecha o intermediário de lançamento',r.returncode != 0 and 'TES_REVISAO_OBRIGATORIA' in r.stderr)
    r=run(f"SET request.jwt.claim.sub='{users[0]}'; SELECT financeiro_hml.tes_executar('{json.dumps({**p,'chave':str(uuid.uuid4())})}'::jsonb);")
    check('reversão fecha motor inclusive privilegiado com identidade',r.returncode != 0 and 'TES_OPERACAO_BLOQUEADA' in r.stderr)
    check('reversão preserva registros',baseline == sql("SELECT md5(jsonb_agg(to_jsonb(t) ORDER BY id)::text) FROM financeiro_hml.tesouraria_operacoes t;"))
    check('reversão preserva consultas',json.loads(sql(actor(users[0])+"SELECT financeiro_hml.tesouraria_historico_operacoes('{}');"))['total']==9)
finally:
    (ROOT/'docs/correcao-minima/RESULTADOS_TESTES_V2_LOCAIS.json').write_text(json.dumps(RESULTS,ensure_ascii=False,indent=2))
