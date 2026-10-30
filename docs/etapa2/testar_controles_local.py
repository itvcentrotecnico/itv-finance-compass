"""Somente PostgreSQL descartável local, socket fixo; sem HML, credenciais ou origem."""
import subprocess,json,uuid,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
BASE=['psql','-h','/tmp/m5-manual-socket','-p','55441','-U','lovable','-X','-qAt','-v','ON_ERROR_STOP=1']
DB='etapa2_'+uuid.uuid4().hex[:10]
def run(s,db=DB):return subprocess.run(BASE+['-d',db,'-c',s],capture_output=True,text=True)
def sql(s,db=DB):
 r=run(s,db)
 if r.returncode:raise RuntimeError(r.stderr)
 return r.stdout.strip()
def check(n,ok):
 if not ok:raise AssertionError(n)
 checks.append(n);print('OK',n)
U='00000000-0000-4000-8000-000000000001';A='00000000-0000-4000-8000-000000000002';G='00000000-0000-4000-8000-000000000003';C='00000000-0000-4000-8000-000000000004'
def actor(u=U):return f"SET ROLE authenticated; SET request.jwt.claim.sub='{u}';"
def rpc(fn,p,u=U):return run(actor(u)+f"SELECT financeiro_hml.{fn}('{json.dumps(p)}'::jsonb);")
def read(fn,p,u=U):
 r=rpc(fn,p,u)
 if r.returncode:raise RuntimeError(r.stderr)
 return json.loads(r.stdout.strip())
def block(n,fn,p,code,u=U):
 r=rpc(fn,p,u);check(n,r.returncode!=0 and code in r.stderr)
checks=[]
try:
 sql(f'CREATE DATABASE {DB};','postgres')
 sql((ROOT/'docs/m3/fixture_local.sql').read_text())
 for f in sorted((ROOT/'supabase/migrations').glob('*.sql')):
  # Base real M1/M2/M3, correção decimal e M3.3; integração não é executada.
  if f.name[:14]<='20261026224858':sql(f.read_text())
 sql("""CREATE TABLE financeiro_hml.integracao_itens(conferencia_id uuid,duplicidade_candidata_id uuid,situacao text);""")
 for u,role in [(U,'analista_financeiro'),(A,'admin_financeiro'),(G,'admin_geral'),(C,'consulta_gerencial')]:
  sql(f"INSERT INTO auth.users VALUES('{u}'); INSERT INTO financeiro_hml.perfis(usuario_id,papel,nome) VALUES('{u}','{role}','TESTE LOCAL {role}');")
 # Todas as fixtures financeiras só neste banco descartável.
 account='10000000-0000-4000-8000-000000000001';plan='20000000-0000-4000-8000-000000000001';center='30000000-0000-4000-8000-000000000001'
 sql(f"INSERT INTO financeiro_hml.contas_financeiras(id,nome,tipo,data_saldo_inicial) VALUES('{account}','TESTE LOCAL OFICIAL','banco','2026-10-29'); UPDATE financeiro_hml.contas_preparadas SET situacao='habilitada',conta_financeira_id='{account}',data_abertura='2026-10-29',saldo_validado=0,responsavel_conferencia='TESTE LOCAL' WHERE nome='SICREDI — CONTA PRINCIPAL'; INSERT INTO financeiro_hml.plano_contas(id,codigo,descricao,natureza) VALUES('{plan}','LOCAL','TESTE LOCAL RECEITA','receita'); INSERT INTO financeiro_hml.centros_custo(id,codigo,descricao) VALUES('{center}','LOCAL','TESTE LOCAL CENTRO');")
 sql("INSERT INTO financeiro_hml.tesouraria_conferencias(referencia_origem,natureza,forma,data_ocorrencia,descricao,valor_bruto) SELECT 'TESTE_LOCAL_'||n,'entrada','pix','2026-11-01','TESTE LOCAL',100 FROM generate_series(1,49) n;")
 baseline=sql("SELECT md5(string_agg(to_jsonb(c)::text,'|' ORDER BY id)) FROM financeiro_hml.tesouraria_conferencias c;")
 audit_before=sql('SELECT count(*) FROM financeiro_hml.auditoria;')
 sql((ROOT/'docs/etapa2/CONTROLES_OPERACIONAIS_PROPOSTOS.sql').read_text())
 check('migração não altera 49 fontes',baseline==sql("SELECT md5(string_agg(to_jsonb(c)::text,'|' ORDER BY id)) FROM financeiro_hml.tesouraria_conferencias c;"))
 check('migração não gera auditoria financeira',audit_before==sql('SELECT count(*) FROM financeiro_hml.auditoria;'))
 check('sem corte ativo',sql('SELECT count(*) FROM financeiro_hml.conferencia_operacao_autorizada;')=='0')
 check('sem cadastros oficiais presumidos',sql('SELECT count(*) FROM financeiro_hml.conferencia_regras_oficiais;')=='0')
 ident=sql("SELECT id FROM financeiro_hml.tesouraria_conferencias WHERE referencia_origem='TESTE_LOCAL_1';")
 rev=read('conferencia_consultar',{'id':ident})
 check('consulta não cria workflow',sql('SELECT count(*) FROM financeiro_hml.conferencia_controles;')=='0')
 d={'forma':'pix','descricao':'TESTE LOCAL','data_ocorrencia':'2026-11-01','valor_bruto':'100.00','valor_liquido':None,'data_liquidacao':None,'boleto_vencimento':None,'boleto_pagamento':None,'boleto_status':None,'conta_financeira_id':account,'plano_conta_id':plan,'centro_custo_id':center,'observacao':None}
 def command(acao,u=U,**changes):
  global rev
  p={'id':ident,'versao':rev['versao'],'fonte_hash':rev['fonte_hash'],'acao':acao,'justificativa':'TESTE LOCAL JUSTIFICATIVA',**changes}
  rev=read('conferencia_comandar',p,u);return rev
 command('salvar',dados=d,componentes=[])
 check('analista prepara',rev['estado']=='em_conferencia')
 stale={'id':ident,'versao':'0','fonte_hash':rev['fonte_hash'],'acao':'salvar','dados':d,'componentes':[]}
 block('versão obsoleta rejeitada','conferencia_comandar',stale,'CONF_CONFLITO')
 block('consulta gerencial não salva','conferencia_comandar',{**stale,'versao':rev['versao']},'CONF_PERMISSAO',C)
 block('analista não aprova','conferencia_comandar',{**stale,'versao':rev['versao'],'acao':'aprovar'},'CONF_PERMISSAO')
 block('analista não autoriza','conferencia_comandar',{**stale,'versao':rev['versao'],'acao':'autorizar'},'CONF_PERMISSAO')
 block('analista não lança','tesouraria_lancar_conferencia',{'id':ident,'versao':rev['versao']},'CONF_PERMISSAO')
 block('categoria não aprovada bloqueia encaminhamento','conferencia_comandar',{**stale,'versao':rev['versao'],'acao':'encaminhar'},'CONF_CATEGORIA_OFICIAL')
 # Regra sintética autorizada apenas para testes locais, não na proposta/HML.
 sql(f"INSERT INTO financeiro_hml.conferencia_regras_oficiais VALUES('{plan}',true,ARRAY['{center}']::uuid[],'{A}',now());")
 command('encaminhar');check('encaminhamento formal',rev['estado']=='encaminhado')
 command('devolver',A);check('devolução formal',rev['estado']=='devolvido')
 command('encaminhar');command('aprovar',A);check('aprovação administrador',rev['estado']=='conciliado' and rev['controle']['aprovado_por']==A)
 command('autorizar',A);check('autorização distinta',rev['estado']=='autorizado')
 block('operação real bloqueada sem liberação','tesouraria_lancar_conferencia',{'id':ident,'versao':rev['versao']},'CONF_OPERACAO_BLOQUEADA',A)
 command('salvar',dados=d,componentes=[]);check('edição invalida aprovação',rev['controle']['aprovado_por'] is None and rev['estado']=='em_conferencia')
 # Validações por RPC interna usando proprietário apenas no banco local.
 def validate(n,data,code):
  r=run(f"SELECT financeiro_hml.conf_validar('{json.dumps(data)}','entrada');");check(n,r.returncode!=0 and code in r.stderr)
 validate('conta não oficial rejeitada',{**d,'conta_financeira_id':None},'CONF_CONTA_OFICIAL')
 validate('centro obrigatório',{**d,'centro_custo_id':None},'CONF_CENTRO')
 validate('categoria incompatível',{**d,'plano_conta_id':None},'CONF_CATEGORIA')
 validate('cartão sem liquidação',{**d,'forma':'credito','valor_liquido':'90.00'},'CONF_CARTAO')
 validate('boleto não pago',{**d,'forma':'boleto','boleto_status':'pendente'},'CONF_BOLETO')
 validate('data anterior à abertura',{**d,'data_ocorrencia':'2026-10-28'},'CONF_DATA_ABERTURA')
 validate('valor não informado',{**d,'valor_bruto':''},'CONF_VALOR')
 p1={**d,'id':str(uuid.uuid4()),'valor_bruto':'40.00'};p2={**d,'id':str(uuid.uuid4()),'valor_bruto':'60.00'}
 command('salvar',dados={**d,'forma':'misto'},componentes=[p1,p2]);command('encaminhar');check('rateio real completo',rev['estado']=='encaminhado')
 block('rateio sem valor não persiste','conferencia_comandar',{**stale,'versao':rev['versao'],'dados':{**d,'forma':'misto'},'componentes':[{**p1,'valor_bruto':''},p2]},'CONF_VALOR')
 block('rateio duplicado não persiste','conferencia_comandar',{**stale,'versao':rev['versao'],'dados':{**d,'forma':'misto'},'componentes':[p1,{**p2,'id':p1['id']}]},'CONF_DUPLICIDADE')
 hist=read('conferencia_historico',{'id':ident});check('histórico individual inclui ações',any(e['acao_fluxo']=='aprovar' for e in hist))
 check('histórico preserva autor nulo',any(e['usuario_id'] is None for e in hist))
 r=run(actor()+"SELECT * FROM financeiro_hml.auditoria;");check('analista sem auditoria geral',r.returncode!=0 or not r.stdout.strip())
 r=run(actor()+f"UPDATE financeiro_hml.tesouraria_conferencias SET status='conciliado' WHERE id='{ident}';");check('DML antigo fechado',r.returncode!=0 and 'permission denied' in r.stderr)
 block('entrada avulsa não contorna aprovação','tesouraria_lancar',{},'CONF_FLUXO_OBRIGATORIO',A)
 block('transferência analista bloqueada','tesouraria_transferir',{},'CONF_PERMISSAO')
 # Trava física de grupo em sessão independente, com mesma revisão.
 group=sql(f"SELECT grupo_id FROM financeiro_hml.tesouraria_conferencias WHERE id='{ident}';")
 hold=subprocess.Popen(BASE+['-d',DB,'-c',f"BEGIN; SELECT pg_advisory_xact_lock(hashtextextended('conf_grupo:{group}',0)); SELECT pg_sleep(1.5); COMMIT;"],stdout=subprocess.DEVNULL)
 for _ in range(50):
  if sql("SELECT count(*) FROM pg_locks WHERE locktype='advisory' AND granted;")!='0':break
  time.sleep(.02)
 start=time.monotonic();command('salvar',dados=d,componentes=[]);duration=time.monotonic()-start;hold.wait()
 check('grupo aguarda trava física de outra sessão',duration>0.7)
 check('49 fontes intactas após workflow',baseline==sql("SELECT md5(string_agg(to_jsonb(c)::text,'|' ORDER BY id)) FROM financeiro_hml.tesouraria_conferencias c;"))
 check('nenhum movimento nos testes de preparo',sql('SELECT count(*) FROM financeiro_hml.tesouraria_movimentos;')=='0')
 check('saldos iniciais preservados',sql('SELECT sum(saldo_inicial_centavos) FROM financeiro_hml.contas_financeiras;')=='0')
 # Liberar só fixture local para validar lançamento real transacional/idempotente.
 sql(f"INSERT INTO financeiro_hml.conferencia_operacao_autorizada VALUES(true,'2026-11-01','{A}',now());")
 command('encaminhar');command('aprovar',A);command('autorizar',A)
 result=read('tesouraria_lancar_conferencia',{'id':ident,'versao':rev['versao']},A)
 again=read('tesouraria_lancar_conferencia',{'id':ident,'versao':rev['versao']},G)
 check('idempotência entre administradores',result['id']==again['id'] and again['repetida'])
 check('uma operação vinculada',sql(f"SELECT count(*) FROM financeiro_hml.conferencia_vinculos WHERE conferencia_id='{ident}';")=='1')
 check('fonte intacta até após lançamento isolado',baseline==sql("SELECT md5(string_agg(to_jsonb(c)::text,'|' ORDER BY id)) FROM financeiro_hml.tesouraria_conferencias c;"))
 print(f'{len(checks)} testes PostgreSQL isolados aprovados.')
finally:
 sql(f'DROP DATABASE IF EXISTS {DB} WITH (FORCE);','postgres')
