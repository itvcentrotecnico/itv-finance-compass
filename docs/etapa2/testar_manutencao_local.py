"""Testes exclusivamente no socket local descartável; nunca acessa HML/origem."""
import json
import subprocess
import tempfile
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BASE = ['psql', '-h', '/tmp/m5-manual-socket', '-p', '55441', '-U', 'lovable', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1']
DB = 'etapa2_manut_' + uuid.uuid4().hex[:10]
checks = []

def run(text, db=DB):
    return subprocess.run(BASE + ['-d', db], input=text, capture_output=True, text=True)

def sql(text, db=DB):
    result = run(text, db)
    if result.returncode:
        raise RuntimeError(result.stderr)
    return result.stdout.strip()

def check(name, ok):
    if not ok:
        raise AssertionError(name)
    checks.append(name)

def expect(name, text, code):
    result = run(text)
    check(name, result.returncode != 0 and code in result.stderr)

def scalar(text):
    return sql('SELECT ' + text + ';')

try:
    sql(f'CREATE DATABASE {DB};', 'postgres')
    sql((ROOT / 'docs/m3/fixture_local.sql').read_text())
    for f in sorted((ROOT / 'supabase/migrations').glob('*.sql')):
        sql(f.read_text())
    # Nenhum seed financeiro; estrutura e funções reais em banco sem dados.
    empty = scalar('(SELECT count(*) FROM financeiro_hml.tesouraria_movimentos)')
    check('banco local sem movimentos', empty == '0')
    gate = (ROOT / 'docs/etapa2/MANUTENCAO_PREPARADA.sql').read_text()
    resume = (ROOT / 'docs/etapa2/RETOMADA_SELETIVA_PREPARADA.sql').read_text()
    with tempfile.TemporaryDirectory(prefix='etapa2-manifesto-') as folder:
        file = Path(folder) / 'acl.csv'
        header = f"\\set banco_esperado {DB}\n\\set manifesto {file}\n"
        expect('sem autorização não ativa', header + gate, 'ETAPA2_SEM_AUTORIZACAO')
        check('negação mantém EXECUTE manual', scalar("has_function_privilege('authenticated','financeiro_hml.integracao_iniciar()','EXECUTE')") == 't')
        statements = [
            "NOT has_function_privilege('authenticated','financeiro_hml.integracao_iniciar()','EXECUTE')",
            "NOT has_function_privilege('service_role','financeiro_hml.integracao_iniciar_automatica(date,date)','EXECUTE')",
            "NOT has_function_privilege('service_role','financeiro_hml.integracao_concluir(jsonb)','EXECUTE')",
            "NOT has_column_privilege('authenticated','financeiro_hml.tesouraria_conferencias','descricao','UPDATE')",
            "NOT has_column_privilege('authenticated','financeiro_hml.contas_financeiras','nome','UPDATE')",
            "NOT has_table_privilege('authenticated','financeiro_hml.plano_contas','INSERT')",
            "NOT has_table_privilege('service_role','financeiro_hml.integracao_itens','INSERT')",
            "has_table_privilege('authenticated','financeiro_hml.tesouraria_conferencias','SELECT')",
            "has_function_privilege('authenticated','financeiro_hml.tesouraria_saldos()','EXECUTE')",
            "has_function_privilege('authenticated','financeiro_hml.integracao_estado_manual()','EXECUTE')",
            "NOT has_function_privilege('authenticated','financeiro_hml.diagnostico_reservar(uuid,text)','EXECUTE')",
            "(SELECT bool_and(relrowsecurity) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='financeiro_hml' AND c.relkind='r')",
            "(SELECT count(*) FROM financeiro_hml.tesouraria_movimentos)=0",
        ]
        activate = header + "SET itv.etapa2.autorizacao='MANUTENCAO_EXPLICITAMENTE_AUTORIZADA';\n" + gate
        result = sql(activate + '\n' + '\n'.join('SELECT ' + s + ';' for s in statements))
        values = result.splitlines()[-len(statements):]
        for index, value in enumerate(values):
            check(f'barreira/permissões {index+1}', value == 't')
        check('manifesto persistido para recuperação', file.exists() and 'GRANT' in file.read_text())
        expect('chamada sync direta recusada', 'SET ROLE authenticated; SELECT financeiro_hml.integracao_iniciar();', 'permission denied')
        expect('service sync direta recusada', "SET ROLE service_role; SELECT financeiro_hml.integracao_iniciar_automatica('2026-10-23','2026-10-29');", 'permission denied')
        expect('retomada nova sessão falha fechada', "SET itv.etapa2.retomada='RETOMADA_EXPLICITAMENTE_AUTORIZADA';\n" + resume, 'ETAPA2_MANIFESTO_AUSENTE')
        # Recuperar o baseline local somente com manifesto capturado, para repetir
        # o ensaio na mesma sessão; jamais usado como retomada automática HML.
        import csv
        captured = list(csv.DictReader(file.open()))
        sql('\n'.join(row['comando'] for row in captured))
        post = [
            "has_function_privilege('authenticated','financeiro_hml.integracao_iniciar()','EXECUTE')",
            "has_function_privilege('service_role','financeiro_hml.integracao_concluir(jsonb)','EXECUTE')",
            "NOT has_function_privilege('authenticated','financeiro_hml.tesouraria_lancar(jsonb)','EXECUTE')",
            "NOT has_column_privilege('authenticated','financeiro_hml.tesouraria_conferencias','descricao','UPDATE')",
            "has_column_privilege('authenticated','financeiro_hml.contas_financeiras','nome','UPDATE')",
            "has_table_privilege('authenticated','financeiro_hml.plano_contas','INSERT')",
            "(SELECT count(*) FROM financeiro_hml.auditoria)=0",
        ]
        result = sql(activate + "\nSET itv.etapa2.retomada='RETOMADA_EXPLICITAMENTE_AUTORIZADA';\n" + resume + '\n' + '\n'.join('SELECT '+s+';' for s in post))
        for index, value in enumerate(result.splitlines()[-len(post):]):
            check(f'retomada seletiva {index+1}', value == 't')
        check('movimentos continuam zero', scalar('(SELECT count(*) FROM financeiro_hml.tesouraria_movimentos)') == '0')
    output = {'escopo': 'PostgreSQL local descartável sem HML/GET/financeiro', 'aprovados': len(checks), 'checks': checks}
    (ROOT / 'docs/etapa2/RESULTADOS_MANUTENCAO_LOCAL.json').write_text(json.dumps(output, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(output, ensure_ascii=False))
finally:
    sql(f'DROP DATABASE IF EXISTS {DB};', 'postgres')