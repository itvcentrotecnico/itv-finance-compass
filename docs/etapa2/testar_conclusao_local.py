"""Conclusão técnica: SOMENTE socket descartável, fixtures sintéticas, sem origem/remoto."""
import subprocess,json,uuid,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
BASE=['psql','-h','/tmp/m5-manual-socket','-p','55441','-U','lovable','-X','-qAt','-v','ON_ERROR_STOP=1']
DB='etapa2_final_'+uuid.uuid4().hex[:10];checks=[]
U='00000000-0000-4000-8000-000000000001';A='00000000-0000-4000-8000-000000000002';G='00000000-0000-4000-8000-000000000003';C='00000000-0000-4000-8000-000000000004'
def run(s,db=DB):return subprocess.run(BASE+['-d',db],input=s,capture_output=True,text=True)
def sql(s,db=DB):
 r=run(s,db)
 if r.returncode:raise RuntimeError(r.stderr)
 return r.stdout.strip()
def check(n,ok):
 if not ok:raise AssertionError(n)
 checks.append(n);print('OK',n)
def actor(u):return f"SET ROLE authenticated; SET request.jwt.claim.sub='{u}';"
def rpc(fn,p,u=U):return run(actor(u)+f"SELECT financeiro_hml.{fn}('{json.dumps(p)}'::jsonb);")
def read(fn,p,u=U):
 r=rpc(fn,p,u)
 if r.returncode:raise RuntimeError(r.stderr)
 return json.loads(r.stdout.strip())
def block(n,fn,p,code,u=U):
 r=rpc(fn,p,u);check(n,r.returncode!=0 and code in r.stderr)
def decidir(s,u=A):return read('tesouraria_decidir',{'id':s['id'],'versao':'0','acao':'executar'},u)
try:
 sql(f'CREATE DATABASE {DB};','postgres');sql((ROOT/'docs/m3/fixture_local.sql').read_text())
 for f in sorted((ROOT/'supabase/migrations').glob('*.sql')):
  if f.name[:14]<='20261026224858':sql(f.read_text())
 sql('CREATE TABLE financeiro_hml.integracao_itens(conferencia_id uuid,duplicidade_candidata_id uuid,situacao text);')
 for u,r in [(U,'analista_financeiro'),(A,'admin_financeiro'),(G,'admin_geral'),(C,'consulta_gerencial')]:
  sql(f"INSERT INTO auth.users VALUES('{u}'); INSERT INTO financeiro_hml.perfis(usuario_id,papel,nome) VALUES('{u}','{r}','TESTE LOCAL');")
 contas=[]
 for nome in ['SICREDI — CONTA PRINCIPAL','MERCADO PAGO — RECEBIMENTOS']:
  prepared=sql(f"SELECT id FROM financeiro_hml.contas_preparadas WHERE nome='{nome}';")
  contas.append(read('tesouraria_habilitar_conta',{'id':prepared,'chave':str(uuid.uuid4()),'data':'2026-10-29','valor':'0.00','responsavel':'TESTE LOCAL'},A)['id'])
 plan='20000000-0000-4000-8000-000000000001';out='20000000-0000-4000-8000-000000000002'
 sql(f"INSERT INTO financeiro_hml.plano_contas(id,codigo,descricao,natureza) VALUES('{plan}','LOCAL-R','TESTE LOCAL','receita'),('{out}','LOCAL-D','TESTE LOCAL','despesa');")
 sql("INSERT INTO financeiro_hml.tesouraria_conferencias(referencia_origem,natureza,forma,data_ocorrencia,descricao,valor_bruto) SELECT 'gestao_itv:teste:'||n,'entrada','pix','2026-10-30','TESTE LOCAL',100 FROM generate_series(1,49)n;")
 baseline=sql("SELECT md5(string_agg(to_jsonb(c)::text,'|' ORDER BY id)) FROM financeiro_hml.tesouraria_conferencias c;")
 audit=sql('SELECT count(*) FROM financeiro_hml.auditoria;')
 sql((ROOT/'docs/etapa2/ETAPA_2_MIGRACAO_DEFINITIVA.sql').read_text())
 check('complemento não altera fonte',baseline==sql("SELECT md5(string_agg(to_jsonb(c)::text,'|' ORDER BY id)) FROM financeiro_hml.tesouraria_conferencias c;"))
 check('complemento não gera auditoria/movimento',audit==sql('SELECT count(*) FROM financeiro_hml.auditoria;') and sql('SELECT count(*) FROM financeiro_hml.tesouraria_movimentos;')=='0')
 check('instalação selada',sql("SELECT has_function_privilege('authenticated','financeiro_hml.tesouraria_decidir(jsonb)','EXECUTE');")=='f')
 r=run((ROOT/'docs/etapa2/LIBERACAO_DEFINITIVA.sql').read_text());check('liberação sem autorização recusada',r.returncode!=0 and 'ETAPA2_LIBERACAO_NAO_AUTORIZADA' in r.stderr)
 sql("SET itv.etapa2.liberacao='COMPATIBILIDADE_E_RECUPERACAO_VALIDADAS';"+(ROOT/'docs/etapa2/LIBERACAO_DEFINITIVA.sql').read_text())
 block('motor privado inacessível','tes_executar',{},'permission denied',A)
 sql(f"INSERT INTO financeiro_hml.conferencia_regras_oficiais VALUES('{plan}',false,'{{}}','{A}',now()),('{out}',false,'{{}}','{A}',now());")
 p={'tipo':'entrada','chave':str(uuid.uuid4()),'data':'2026-10-30','descricao':'TESTE LOCAL ENTRADA','valor':'1000.00','destino':contas[0],'plano':plan,'referencia':'externo:local-001'}
 s=read('tesouraria_lancar',p)
 check('solicitar não movimenta',sql('SELECT count(*) FROM financeiro_hml.tesouraria_movimentos;')=='0')
 again=read('tesouraria_lancar',p);check('solicitar mesma chave retorna registro',s['id']==again['id'] and again['repetida'])
 block('mesma chave conteúdo distinto','tesouraria_lancar',{**p,'valor':'999.00'},'TES_IDEMPOTENCIA')
 block('referência global duplicada','tesouraria_lancar',{**p,'chave':str(uuid.uuid4())},'CONF_DUPLICIDADE',G)
 block('referência importada recusada','tesouraria_lancar',{**p,'chave':str(uuid.uuid4()),'referencia':'gestao_itv:teste:1'},'SOL_REFERENCIA')
 block('autoaprovação recusada','tesouraria_decidir',{'id':s['id'],'versao':'0','acao':'executar'},'TES_PERMISSAO')
 own=read('tesouraria_lancar',{**p,'chave':str(uuid.uuid4()),'referencia':'externo:local-admin'},A)
 block('administrador não aprova própria preparação','tesouraria_decidir',{'id':own['id'],'versao':'0','acao':'executar'},'CONF_REVISOR_DISTINTO',A)
 block('consulta não solicita','tesouraria_lancar',{**p,'chave':str(uuid.uuid4())},'TES_PERMISSAO',C)
 block('sem liberação financeira','tesouraria_decidir',{'id':s['id'],'versao':'0','acao':'executar'},'CONF_OPERACAO_BLOQUEADA',A)
 sql(f"INSERT INTO financeiro_hml.conferencia_operacao_autorizada VALUES(true,'2026-10-30','{A}',now());")
 block('versão obsoleta','tesouraria_decidir',{'id':s['id'],'versao':'2','acao':'executar'},'CONF_CONFLITO',A)
 result=decidir(s);check('entrada autorizada 1000 exatos',sql(f"SELECT valor::text FROM financeiro_hml.tesouraria_operacoes WHERE id='{result['id']}';")=='1000.00')
 replay=decidir(s,G);check('dois administradores idempotentes',replay['id']==result['id'] and replay['repetida'])
 saida=read('tesouraria_lancar',{'tipo':'saida','chave':str(uuid.uuid4()),'data':'2026-10-30','descricao':'TESTE LOCAL SAIDA','valor':'80.00','origem':contas[0],'plano':out,'referencia':'externo:local-saida'})
 debit=decidir(saida)
 transfer={'tipo':'transferencia','chave':str(uuid.uuid4()),'data':'2026-10-30','descricao':'TESTE LOCAL TRANSFER','valor':'150.00','origem':contas[0],'destino':contas[1]}
 block('mesma conta recusada','tesouraria_transferir',{**transfer,'destino':contas[0]},'TES_MESMA_CONTA')
 block('transferência não recebe categoria','tesouraria_transferir',{**transfer,'plano':plan},'TES_MESMA_CONTA')
 t=read('tesouraria_transferir',transfer);tr=decidir(t)
 check('transferência dois efeitos vinculados e neutros',sql(f"SELECT count(*)=2 AND sum(CASE direcao WHEN 'credito' THEN valor ELSE -valor END)=0 FROM financeiro_hml.tesouraria_movimentos WHERE operacao_id='{tr['id']}';")=='t')
 check('transferência sem receita/despesa',sql(f"SELECT plano_conta_id IS NULL AND centro_custo_id IS NULL FROM financeiro_hml.tesouraria_operacoes WHERE id='{tr['id']}';")=='t')
 est={'tipo':'estorno','chave':str(uuid.uuid4()),'data':'2026-10-30','descricao':'TESTE LOCAL ESTORNO','original':debit['id'],'justificativa':'TESTE LOCAL MOTIVO'}
 block('estorno não aceita valor inventado','tesouraria_estornar',{**est,'valor':'1.00'},'SOL_DADOS')
 e=read('tesouraria_estornar',est);er=decidir(e)
 check('estorno rastreável do valor original',sql(f"SELECT valor::text||':'||operacao_original_id::text FROM financeiro_hml.tesouraria_operacoes WHERE id='{er['id']}';")=='80.00:'+debit['id'])
 check('estorno não apaga original',sql(f"SELECT count(*) FROM financeiro_hml.tesouraria_operacoes WHERE id='{debit['id']}';")=='1')
 block('segundo estorno recusado','tesouraria_estornar',{**est,'chave':str(uuid.uuid4())},'TES_JA_ESTORNADA')
 check('saldos exatos 850 e 150',sql(f"SELECT string_agg(v,'|' ORDER BY id) FROM (SELECT c.id,coalesce(sum(CASE m.direcao WHEN 'credito' THEN m.valor ELSE -m.valor END),0)::numeric(18,2)::text v FROM financeiro_hml.contas_financeiras c LEFT JOIN financeiro_hml.tesouraria_movimentos m ON m.conta_financeira_id=c.id GROUP BY c.id)x;")=='|'.join(v for _,v in sorted([(contas[0],'850.00'),(contas[1],'150.00')])))
 block('terceira casa recusada','tesouraria_lancar',{**p,'chave':str(uuid.uuid4()),'referencia':'externo:local-precisao','valor':'1.001'},'CONF_VALOR')
 # Concorrência real: dois revisores em conexões separadas executam o mesmo pedido.
 concurrent=read('tesouraria_transferir',{**transfer,'chave':str(uuid.uuid4()),'valor':'1.00'})
 text=json.dumps({'id':concurrent['id'],'versao':'0','acao':'executar'})
 procs=[subprocess.Popen(BASE+['-d',DB],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True) for _ in range(2)]
 for proc,u in zip(procs,[A,G]):proc.stdin.write(actor(u)+f"SELECT financeiro_hml.tesouraria_decidir('{text}'::jsonb);");proc.stdin.close();proc.stdin=None
 results=[proc.communicate(timeout=15) for proc in procs]
 check('dois revisores concorrentes retornam mesmo resultado',all(proc.returncode==0 for proc in procs) and json.loads(results[0][0])['id']==json.loads(results[1][0])['id'])
 check('concorrência só cria uma operação',sql(f"SELECT count(*) FROM financeiro_hml.tesouraria_operacoes WHERE chave_idempotencia='{concurrent['id']}';")=='1')
 # Pedidos distintos nas mesmas contas: trava global evita upgrade compartilhado/exclusivo.
 distinct=[read('tesouraria_transferir',{**transfer,'chave':str(uuid.uuid4()),'valor':'1.00'}) for _ in range(2)]
 procs=[subprocess.Popen(BASE+['-d',DB],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True) for _ in range(2)]
 for proc,req,u in zip(procs,distinct,[A,G]):
  proc.stdin.write(actor(u)+f"SELECT financeiro_hml.tesouraria_decidir('{json.dumps({'id':req['id'],'versao':'0','acao':'executar'})}'::jsonb);");proc.stdin.close();proc.stdin=None
 results=[proc.communicate(timeout=15) for proc in procs]
 check('pedidos distintos concorrentes sem deadlock',all(proc.returncode==0 for proc in procs))
 # Conferência: preparador administrador não pode recuperar a autorização após revisão alheia.
 ident=sql("SELECT id FROM financeiro_hml.tesouraria_conferencias ORDER BY id LIMIT 1;")
 rev=read('conferencia_consultar',{'id':ident},A)
 d={'forma':'pix','descricao':'TESTE LOCAL','data_ocorrencia':'2026-10-30','valor_bruto':'100.00','valor_liquido':None,'data_liquidacao':None,'boleto_vencimento':None,'boleto_pagamento':None,'boleto_status':None,'conta_financeira_id':contas[0],'plano_conta_id':plan,'centro_custo_id':None,'observacao':None}
 for acao,u in [('salvar',A),('encaminhar',A),('aprovar',G)]:
  rev=read('conferencia_comandar',{'id':ident,'versao':rev['versao'],'fonte_hash':rev['fonte_hash'],'acao':acao,'dados':d,'componentes':[]},u)
 block('preparador não autoriza conferência','conferencia_comandar',{'id':ident,'versao':rev['versao'],'fonte_hash':rev['fonte_hash'],'acao':'autorizar'},'CONF_REVISOR_DISTINTO',A)
 # Trigger diferida força falha no commit: nenhum efeito ou decisão parcial.
 broken=read('tesouraria_transferir',{**transfer,'chave':str(uuid.uuid4()),'valor':'2.00'})
 before=sql('SELECT count(*) FROM financeiro_hml.tesouraria_operacoes;')
 sql("CREATE FUNCTION financeiro_hml.local_falha_commit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'TESTE_COMMIT'; END $$; CREATE CONSTRAINT TRIGGER local_falha AFTER INSERT ON financeiro_hml.tesouraria_movimentos DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION financeiro_hml.local_falha_commit();")
 block('falha no commit transacional','tesouraria_decidir',{'id':broken['id'],'versao':'0','acao':'executar'},'TESTE_COMMIT',A)
 check('falha não cria operação parcial',before==sql('SELECT count(*) FROM financeiro_hml.tesouraria_operacoes;'))
 check('falha não grava aprovação',sql(f"SELECT estado||':'||versao::text FROM financeiro_hml.tesouraria_solicitacoes WHERE id='{broken['id']}';")=='pendente:0')
 sql('DROP TRIGGER local_falha ON financeiro_hml.tesouraria_movimentos; DROP FUNCTION financeiro_hml.local_falha_commit();')
 # Captura verificável das definições definitivas para reativação sem DDL destrutivo.
 definitions=sql("SELECT string_agg(pg_get_functiondef(p.oid),E';\\n' ORDER BY proname) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='financeiro_hml' AND proname IN ('conferencia_comandar','tesouraria_lancar_conferencia','tesouraria_solicitar','tesouraria_decidir');")+';'
 # Reversão não destrói nem reescreve dados e bloqueia também o corpo das funções.
 snapshots={table:sql(f"SELECT md5(coalesce(string_agg(to_jsonb(t)::text,'|' ORDER BY id),'')) FROM financeiro_hml.{table} t;") for table in ['tesouraria_conferencias','tesouraria_solicitacoes','tesouraria_operacoes','tesouraria_movimentos','auditoria']}
 r=run((ROOT/'docs/etapa2/REVERSAO_FUNCIONAL_DEFINITIVA.sql').read_text());check('reversão sem autorização falha',r.returncode!=0 and 'ETAPA2_REVERSAO_NAO_AUTORIZADA' in r.stderr)
 sql("SET itv.etapa2.reversao='REVERSAO_FUNCIONAL_AUTORIZADA';"+(ROOT/'docs/etapa2/REVERSAO_FUNCIONAL_DEFINITIVA.sql').read_text())
 for table,digest in snapshots.items():check('reversão preserva '+table,digest==sql(f"SELECT md5(coalesce(string_agg(to_jsonb(t)::text,'|' ORDER BY id),'')) FROM financeiro_hml.{table} t;"))
 check('consulta de saldos após reversão',len(json.loads(sql(actor(A)+'SELECT financeiro_hml.tesouraria_saldos();')))==2)
 block('reversão recusa comando','tesouraria_decidir',{'id':s['id'],'versao':'0','acao':'executar'},'permission denied',A)
 sql('GRANT EXECUTE ON FUNCTION financeiro_hml.tesouraria_decidir(jsonb) TO authenticated;')
 block('corpo revertido também falha fechado','tesouraria_decidir',{'id':s['id'],'versao':'0','acao':'executar'},'CONF_OPERACAO_BLOQUEADA',A)
 sql('BEGIN;'+definitions+'REVOKE EXECUTE ON FUNCTION financeiro_hml.tesouraria_decidir(jsonb) FROM authenticated;COMMIT;')
 check('reinstalação continua selada',sql("SELECT has_function_privilege('authenticated','financeiro_hml.tesouraria_decidir(jsonb)','EXECUTE');")=='f')
 sql("SET itv.etapa2.liberacao='COMPATIBILIDADE_E_RECUPERACAO_VALIDADAS';"+(ROOT/'docs/etapa2/LIBERACAO_DEFINITIVA.sql').read_text())
 restored=decidir(broken)
 check('reativação das definições definitivas executa pedido preservado',sql(f"SELECT valor::text FROM financeiro_hml.tesouraria_operacoes WHERE id='{restored['id']}';")=='2.00')
 check('lista devolve versão como string',isinstance(read('tesouraria_listar_solicitacoes',{'pagina':0},A)['solicitacoes'][0]['versao'],str))
 check('49 fontes sempre intactas',baseline==sql("SELECT md5(string_agg(to_jsonb(c)::text,'|' ORDER BY id)) FROM financeiro_hml.tesouraria_conferencias c;"))
 check('service role sem escrita em solicitações',sql("SELECT has_table_privilege('service_role','financeiro_hml.tesouraria_solicitacoes','UPDATE');")=='f')
 print(f'{len(checks)} testes de conclusão SQL aprovados.')
finally:sql(f'DROP DATABASE IF EXISTS {DB} WITH (FORCE);','postgres')