"""Local disposable PostgreSQL only; never reads environment connection credentials or connects to HML. Requires local fixture described in RELATORIO_VALIDACAO.md."""
import subprocess
from pathlib import Path
base='''BEGIN;
INSERT INTO auth.users VALUES('11111111-1111-4111-8111-111111111111');
INSERT INTO financeiro_hml.perfis(usuario_id,papel) VALUES('11111111-1111-4111-8111-111111111111','admin_geral');
SET LOCAL request.jwt.claim.sub='11111111-1111-4111-8111-111111111111';
INSERT INTO financeiro_hml.plano_contas(id,codigo,descricao,natureza) VALUES('33333333-3333-4333-8333-333333333333','LOCAL','TESTE LOCAL','receita');
INSERT INTO financeiro_hml.centros_custo(id,codigo,descricao) VALUES('44444444-4444-4444-8444-444444444444','LOCAL','TESTE LOCAL');
'''
def opening(key,name,value):
 return f"SELECT financeiro_hml.tesouraria_criar_conta('{{\"chave\":\"{key}\",\"data\":\"2026-10-23\",\"descricao\":\"TESTE LOCAL\",\"nome\":\"{name}\",\"conta_tipo\":\"caixa\",\"valor\":\"{value}\"}}');\n"
base+=opening('22222222-2222-4222-8222-222222222222','A','10.00').replace('"nome":"A"','"nome":"LOCAL A"')+opening('22222222-2222-4222-8222-222222222223','LOCAL B','0.00')
a="(SELECT id FROM financeiro_hml.contas_financeiras WHERE nome='LOCAL A')";b="(SELECT id FROM financeiro_hml.contas_financeiras WHERE nome='LOCAL B')"
t=f"jsonb_build_object('chave','55555555-5555-4555-8555-555555555555','data','2026-10-23','descricao','LOCAL TRANSFERENCIA','origem',{a},'destino',{b},'valor','0.30')"
transfer=f'SELECT financeiro_hml.tesouraria_transferir({t});\n'
entry=f"SELECT financeiro_hml.tesouraria_lancar(jsonb_build_object('tipo','entrada','chave',gen_random_uuid(),'data','2026-10-23','descricao','LOCAL ENTRADA','destino',{a},'plano','33333333-3333-4333-8333-333333333333','valor','0.10'));\n"
reverse="SELECT financeiro_hml.tesouraria_estornar(jsonb_build_object('chave',gen_random_uuid(),'data','2026-10-23','descricao','LOCAL ESTORNO','original',(SELECT id FROM financeiro_hml.tesouraria_operacoes WHERE tipo='transferencia'),'justificativa','Teste somente local'));\n"
cases={'transfer':transfer,'entry':entry,'reverse':transfer+reverse,'repeat':transfer+transfer,'inactive_category_reverse':entry+"UPDATE financeiro_hml.plano_contas SET ativo=false WHERE id='33333333-3333-4333-8333-333333333333';\n"+reverse.replace("tipo='transferencia'","tipo='entrada'"),'read_balance':transfer+'SELECT financeiro_hml.tesouraria_saldos(); SELECT financeiro_hml.tesouraria_extrato(\'{"pagina":0}\');\n'}

def fails(sql,token):
 return "DO $$ BEGIN BEGIN "+sql+" RAISE EXCEPTION 'TEST_EXPECTED_FAILURE'; EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE '%"+token+"%' THEN RAISE; END IF; END; END $$;\n"
checks={
'same_account':fails('PERFORM financeiro_hml.tesouraria_transferir('+t+"||jsonb_build_object('destino',"+a+'));','TES_MESMA_CONTA'),
'decimal_precision':fails('PERFORM financeiro_hml.tesouraria_transferir('+t+"||jsonb_build_object('valor','0.001'));",'TES_VALOR'),
'inactive_account':f'UPDATE financeiro_hml.contas_financeiras SET ativo=false WHERE id={b};\n'+fails('PERFORM financeiro_hml.tesouraria_transferir('+t+');','TES_CONTA_INATIVA'),
'initial_balance_immutable':fails(f'UPDATE financeiro_hml.contas_financeiras SET saldo_inicial_centavos=900 WHERE id={a};','TES_ABERTURA_IMUTAVEL'),
'ledger_immutable':transfer+fails("DELETE FROM financeiro_hml.tesouraria_movimentos WHERE operacao_id=(SELECT id FROM financeiro_hml.tesouraria_operacoes WHERE tipo='transferencia');",'TES_IMUTAVEL'),
'canonical_retry':transfer+f"SELECT financeiro_hml.tesouraria_transferir({t}||jsonb_build_object('valor','0.3'));\n"+"DO $$ BEGIN IF (SELECT count(*) FROM financeiro_hml.tesouraria_operacoes WHERE tipo='transferencia')<>1 THEN RAISE EXCEPTION 'TEST_DUPLICATE'; END IF; END $$;\n",
'conflicting_retry':transfer+fails('PERFORM financeiro_hml.tesouraria_transferir('+t+"||jsonb_build_object('valor','0.31'));",'TES_IDEMPOTENCIA'),
'double_reverse':transfer+reverse+fails(reverse.replace('SELECT ','PERFORM ',1),'TES_JA_ESTORNADA'),
'reversal_inactive_category':entry+"UPDATE financeiro_hml.plano_contas SET ativo=false WHERE id='33333333-3333-4333-8333-333333333333';\n"+fails(reverse.replace("tipo='transferencia'","tipo='entrada'").replace('SELECT financeiro','PERFORM financeiro'),'TES_CLASSIFICACAO'),
'zero_history':"DO $$ BEGIN IF (financeiro_hml.tesouraria_historico_operacoes('{}')->>'total')::int<>2 THEN RAISE EXCEPTION 'TEST_ZERO_HISTORY'; END IF; END $$;\n",
'exact_balances':transfer+reverse+f"DO $$ BEGIN IF (SELECT sum(CASE direcao WHEN 'credito' THEN valor ELSE -valor END) FROM financeiro_hml.tesouraria_movimentos WHERE conta_financeira_id={a})<>10.00 THEN RAISE EXCEPTION 'TEST_BALANCE'; END IF; END $$;\n",
'rollback_constraint':fails("INSERT INTO financeiro_hml.tesouraria_operacoes(tipo,data_movimento,descricao,valor,conta_origem_id,conta_destino_id,chave_idempotencia,requisicao,criado_por) VALUES('transferencia','2026-10-23','LOCAL INCOMPLETA',1,"+a+','+b+",gen_random_uuid(),'{}',auth.uid()); SET CONSTRAINTS ALL IMMEDIATE;",'TES_INTEGRIDADE'),
'large_page':"SELECT financeiro_hml.tesouraria_extrato('{\"pagina\":2147483647}');\n",
}
# caller roles verified in local isolated fixture
for role in ['admin_geral','admin_financeiro','analista_financeiro','consulta_gerencial']:
 change=f"INSERT INTO auth.users VALUES('11111111-1111-4111-8111-111111111112'); INSERT INTO financeiro_hml.perfis(usuario_id,papel) VALUES('11111111-1111-4111-8111-111111111112','admin_geral'); UPDATE financeiro_hml.perfis SET papel='{role}' WHERE usuario_id=auth.uid(); SET LOCAL ROLE authenticated;\n"
 checks['role_'+role]=change+(fails('PERFORM financeiro_hml.tesouraria_transferir('+t+');','TES_PERMISSAO') if role=='consulta_gerencial' else transfer)+'RESET ROLE;\n'
for name,sql in checks.items():
 f=Path('/tmp/m3-review/check_'+name+'.sql');f.write_text(base+sql+'SET CONSTRAINTS ALL IMMEDIATE; ROLLBACK;')
 r=subprocess.run(['psql','-h','/tmp/m3-review/socket','-p','55439','-U','postgres','-v','ON_ERROR_STOP=1','-f',str(f)],capture_output=True,text=True)
 Path('/tmp/m3-review/check_'+name+'.log').write_text(r.stdout+r.stderr)
 print(name,'PASS' if r.returncode==0 else r.stderr[-900:])
