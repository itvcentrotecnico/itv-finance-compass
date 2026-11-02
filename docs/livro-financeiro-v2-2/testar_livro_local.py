"""Ensaio descartável LOCAL. Não acessa Supabase, rede ou dados reais.
python3 docs/livro-financeiro-v2-2/testar_livro_local.py
Requer binários PostgreSQL 17 (ou 18) em PATH. Cria/apaga apenas /tmp/itv-livro-teste-*.
"""
import hashlib, json, os, pwd, shutil, subprocess, tempfile
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
WORK = Path(tempfile.mkdtemp(prefix='itv-livro-teste-', dir='/tmp'))
SOCKET = WORK/'socket'; SOCKET.mkdir(); DATA=WORK/'data'
BIN = {k:shutil.which(k) for k in ['psql','initdb','pg_ctl','pg_dump','pg_restore']}
if not all(BIN.values()): raise RuntimeError('Instale PostgreSQL local; nenhum banco remoto será utilizado.')
USER = pwd.getpwnam('lovable') if os.geteuid()==0 else pwd.getpwuid(os.geteuid())
if os.geteuid()==0:
    os.chown(WORK,USER.pw_uid,USER.pw_gid); os.chown(SOCKET,USER.pw_uid,USER.pw_gid)
def demote():
    if os.geteuid()==0: os.setgroups([]); os.setgid(USER.pw_gid); os.setuid(USER.pw_uid)
def cmd(args):
    return subprocess.run(args,text=True,capture_output=True,check=True,preexec_fn=demote)
PORT='55450'
BASE=[BIN['psql'],'-X','-qAt','-h',str(SOCKET),'-p',PORT,'-U',USER.pw_name,'-d','postgres','-v','ON_ERROR_STOP=1']
def sql(s,ok=True):
    r=subprocess.run(BASE,input=s,text=True,capture_output=True)
    if ok and r.returncode: raise RuntimeError(r.stderr[:2200])
    return r.stdout.strip() if ok else r
results=[]
def check(name,value):
    if not value: raise AssertionError(name)
    results.append({'teste':name,'aprovado':True})
def rejected(name,s,message):
    r=sql(s,False);check(name,r.returncode!=0 and message in r.stderr)
def query(q):return sql(q+';')
originals=json.loads((HERE/'V2_1_ORIGINAL_SHA256.json').read_text())
try:
    cmd([BIN['initdb'],'-D',str(DATA),'-A','trust','--no-locale'])
    cmd([BIN['pg_ctl'],'-D',str(DATA),'-l',str(WORK/'postgres.log'),'-o',f"-k {SOCKET} -p {PORT} -c listen_addresses=''",'-w','start'])
    sql('CREATE ROLE postgres SUPERUSER; CREATE ROLE authenticated; CREATE ROLE anon; CREATE ROLE service_role BYPASSRLS; CREATE ROLE authenticator; CREATE ROLE supabase_auth_admin; CREATE ROLE supabase_admin SUPERUSER; CREATE SCHEMA extensions;')
    sql((ROOT/'docs/m3/fixture_local.sql').read_text())
    sql("CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT coalesce(nullif(current_setting('request.jwt.claim.role',true),''),'authenticated') $$; GRANT EXECUTE ON FUNCTION auth.role() TO authenticated,service_role;")
    for p in sorted((ROOT/'supabase/migrations').glob('*.sql')):
        if p.name.startswith('20261101'):continue
        sql('SET ROLE postgres;'+p.read_text())
    sql('SET ROLE postgres;'+(ROOT/'docs/correcao-minima-v2-1/DEFINICOES_BASE_LOCAL.sql').read_text())
    cat=json.loads((ROOT/'docs/correcao-minima-v2-1/CATALOGO_BASE_20261101.json').read_text())
    sql(';'.join('ALTER FUNCTION '+sig+' OWNER TO postgres' for sig in cat)+';')
    sql("DO $$ DECLARE t record; BEGIN FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='financeiro_hml' LOOP EXECUTE format('ALTER TABLE financeiro_hml.%I OWNER TO postgres',t.tablename); END LOOP; END $$;")
    users=['10000000-0000-4000-8000-'+str(i).zfill(12) for i in range(1,8)]
    sql('INSERT INTO auth.users VALUES '+','.join("('"+u+"')" for u in users)+';')
    for i,role in enumerate(['admin_geral','admin_financeiro','analista_financeiro','consulta_gerencial','admin_geral','admin_financeiro']):
        sql(f"INSERT INTO financeiro_hml.perfis(usuario_id,papel,ativo) VALUES ('{users[i]}','{role}',{str(i<4).lower()});")
    def caller(q,i=0,role='authenticated'):
        uid=users[i] if i is not None else ''
        return f"SET ROLE {role}; SET request.jwt.claim.sub='{uid}'; SET request.jwt.claim.role='{role}'; "+q
    def rpc(p,i=0,role='authenticated',fn='tesouraria_lancar'):
        return caller("SELECT financeiro_hml."+fn+"('"+json.dumps(p,ensure_ascii=False).replace("'","''")+"'::jsonb);",i,role)
    accounts=[]
    names=['SICREDI — CONTA PRINCIPAL','MERCADO PAGO — RECEBIMENTOS','CAIXA FÍSICO ITV','SINTETICA TESTE 4','SINTETICA TESTE 5','SINTETICA TESTE 6']
    for i,name in enumerate(names):
        p={'tipo':'abertura','chave':'20000000-0000-4000-8000-'+str(i+1).zfill(12),'nome':name,'conta_tipo':'caixa' if i==2 else 'banco','data':'2026-11-01','valor':'0.00','descricao':'ABERTURA SINTETICA LOCAL'}
        accounts.append(json.loads(sql(rpc(p,fn='tesouraria_criar_conta')))['conta_id'])
        if i<3:sql(f"UPDATE financeiro_hml.contas_preparadas SET situacao='habilitada',conta_financeira_id='{accounts[-1]}',data_abertura='2026-11-01',saldo_validado=0,responsavel_conferencia='SINTETICO LOCAL' WHERE nome='{name}';")
    sql(caller((ROOT/'supabase/migrations/20261101202655_43ca129d-0415-4574-bd75-076cc0bb5b0c.sql').read_text(),role='postgres'))
    categories=json.loads(query('SELECT json_agg(id ORDER BY codigo) FROM financeiro_hml.plano_contas WHERE aceita_lancamentos'))
    livro='80000000-0000-4000-8000-000000000001'
    manifest={'modo':'livro_unico','contas':[livro],'categorias':categories,'responsaveis':users[:2],'abertura':'80000000-0000-4000-8000-000000000002','chave_abertura':'80000000-0000-4000-8000-000000000003'}
    sql("UPDATE financeiro_hml.perfis SET nome='Responsável sintético' WHERE usuario_id='"+users[0]+"';")
    allbefore=query("SELECT md5(jsonb_agg(to_jsonb(c) ORDER BY id)::text) FROM financeiro_hml.contas_financeiras c")
    audits=query("SELECT count(*) FROM financeiro_hml.auditoria")
    before=query("SELECT md5(jsonb_agg(to_jsonb(o) ORDER BY id)::text) FROM financeiro_hml.tesouraria_operacoes o")
    proposal=(HERE/'ITV_LIVRO_UNICO_V2_2_PROPOSTA.sql').read_text()
    settings="SET request.jwt.claim.sub='"+users[0]+"'; SET ROLE postgres; SET itv.v22.validacao='BACKUP_DRENAGEM_DESTINO_APROVADOS'; SET itv.v22.manifesto='"+json.dumps(manifest)+"';"
    rejected('Proposta sem confirmação técnica é recusada',proposal,'V22_NAO_AUTORIZADA')
    rejected('Manifesto vazio é recusado',"SET ROLE postgres; SET itv.v22.validacao='BACKUP_DRENAGEM_DESTINO_APROVADOS';"+proposal,'V22_MANIFESTO_OFICIAL_AUSENTE')
    sql('ALTER TABLE financeiro_hml.tesouraria_operacoes DISABLE ROW LEVEL SECURITY;')
    rejected('RLS divergente impede implantação',settings+proposal,'V22_ESTRUTURA_DIVERGENTE')
    sql('ALTER TABLE financeiro_hml.tesouraria_operacoes ENABLE ROW LEVEL SECURITY;')
    sql('ALTER TABLE financeiro_hml.tesouraria_operacoes DISABLE TRIGGER tes_op_efeitos;')
    rejected('Gatilho de efeitos desativado impede implantação',settings+proposal,'V22_ESTRUTURA_DIVERGENTE')
    sql('ALTER TABLE financeiro_hml.tesouraria_operacoes ENABLE TRIGGER tes_op_efeitos;')
    sql('GRANT postgres TO authenticated;')
    rejected('Herança de papel privilegiado impede implantação',settings+proposal,'V22_HERANCA_PRIVILEGIADA')
    sql('REVOKE postgres FROM authenticated;')
    # Concurrent writer blocks preflight NOWAIT, never waits for old mutations.
    lockproc=subprocess.Popen(BASE,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
    lockproc.stdin.write("BEGIN; LOCK TABLE financeiro_hml.tesouraria_operacoes IN ROW EXCLUSIVE MODE; SELECT 'locked';\n");lockproc.stdin.flush()
    check('Sessão local de escritor preparada',lockproc.stdout.readline().strip()=='locked')
    rejected('Escritor concorrente impede implantação',settings+proposal,'could not obtain lock')
    lockproc.stdin.write('ROLLBACK;\n');lockproc.stdin.close();lockproc.wait(timeout=5)
    sql(settings+proposal)
    check('Instalação acrescenta somente dois eventos técnicos de auditoria',query('SELECT count(*) FROM financeiro_hml.auditoria')==str(int(audits)+2))
    check('Seis aberturas integralmente preservadas pela proposta',before==query("SELECT md5(jsonb_agg(to_jsonb(o) ORDER BY id)::text) FROM financeiro_hml.tesouraria_operacoes o WHERE id<>'"+manifest['abertura']+"'"))
    check('Proposta não cria movimentos',query('SELECT count(*) FROM financeiro_hml.tesouraria_movimentos')=='0')
    check('Continua com 13 tabelas',query("SELECT count(*) FROM pg_tables WHERE schemaname='financeiro_hml'")=='13')
    check('Continua com 31 funções',query("SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='financeiro_hml'")=='31')
    sonda=json.loads(sql(rpc({'tipo':'sonda'})))
    check('Sonda devolve livro único e categorias, sem identidades de outros usuários',sonda=={'modo':'livro_unico','contas':[livro],'categorias':categories,'contrato':'tesouraria_lancar_livro_v2_2'})
    first={'tipo':'saida','chave':'70000000-0000-4000-8000-000000000001','data':'2026-11-01','valor':'0.01','descricao':'PRIMEIRA DESPESA LOCAL','plano':categories[6],'referencia':'externo:primeira-despesa'}
    sql(caller('BEGIN; '+rpc(first,1)+"SELECT sum(CASE direcao WHEN 'credito' THEN valor ELSE -valor END)::text FROM financeiro_hml.tesouraria_movimentos; ROLLBACK;",1))
    check('Primeira despesa é permitida sem receita de cobertura',query('SELECT count(*) FROM financeiro_hml.tesouraria_movimentos')=='0')
    recipe={'tipo':'entrada','chave':'30000000-0000-4000-8000-000000000001','data':'2026-11-02','valor':'100.10','descricao':'SINTETICO LOCAL','plano':categories[0],'referencia':'externo:nota-1'}
    r=json.loads(sql(rpc(recipe)));check('Administrador Geral registra receita',not r['repetida'])
    repeated=json.loads(sql(rpc(recipe)));check('Mesma chave e conteúdo não duplica',r['id']==repeated['id'] and repeated['repetida'])
    canonical=recipe|{'valor':'100.1','referencia':' EXTERNO:NOTA-1 '};check('Normalização monetária e referência preserva repetição',json.loads(sql(rpc(canonical)))['repetida'])
    rejected('Mesma chave com referência alterada é recusada',rpc(recipe|{'referencia':'externo:nota-2'}),'TES_IDEMPOTENCIA')
    rejected('Mesma chave com valor alterado é recusada',rpc(recipe|{'valor':'100.11'}),'TES_IDEMPOTENCIA')
    check('Referência documental fica persistida',query(f"SELECT requisicao->>'referencia' FROM financeiro_hml.tesouraria_operacoes WHERE id='{r['id']}'")=='externo:nota-1')
    for i,name in [(2,'Analista'),(3,'Consulta'),(4,'Geral inativo'),(5,'Financeiro inativo'),(6,'Sem perfil'),(None,'Sem identidade')]:
        rejected(name+' não lança',rpc(recipe,i),'TES_PERMISSAO')
    rejected('Anon não executa lançamento',rpc(recipe,None,'anon'),'permission denied')
    rejected('Service role não executa lançamento',rpc(recipe,None,'service_role'),'permission denied')
    for mode in ['abertura','transferencia','estorno']:
        rejected(mode+' bloqueada no caminho público',rpc(recipe|{'tipo':mode}),'TES_OPERACAO_BLOQUEADA')
        rejected(mode+' bloqueada também no motor central',rpc(recipe|{'tipo':mode},role='postgres',fn='tes_executar'),'TES_OPERACAO_BLOQUEADA')
    rejected('Motor privado não é API',rpc(recipe,fn='tes_executar'),'permission denied')
    for fn in ['tesouraria_transferir','tesouraria_estornar','tesouraria_criar_conta','tesouraria_habilitar_conta','tesouraria_lancar_conferencia']:
        rejected(fn+' sem EXECUTE',rpc({},fn=fn),'permission denied')
        rejected(fn+' corpo bloqueado mesmo como owner',rpc({},role='postgres',fn=fn),'TES_OPERACAO_BLOQUEADA')
    def fresh(p):return p|{'chave':str(__import__('uuid').uuid4())}
    rejected('Receita com categoria de despesa recusada',rpc(fresh(recipe|{'plano':categories[6]})),'TES_CATEGORIA_NATUREZA')
    expense={'tipo':'saida','data':'2026-11-02','valor':'20.05','descricao':'SINTETICO LOCAL DESPESA','plano':categories[6],'referencia':'externo:despesa-1'}
    rejected('Despesa com categoria de receita recusada',rpc(fresh(expense|{'plano':categories[0]}),1),'TES_CATEGORIA_NATUREZA')
    check('Administrador Financeiro registra despesa',not json.loads(sql(rpc(fresh(expense),1)))['repetida'])
    rejected('Conta de homologação não pode lançar',rpc(fresh(recipe|{'destino':accounts[3]})),'TES_VINCULO_INTERNO')
    rejected('Categoria não oficial não pode lançar',rpc(fresh(recipe|{'plano':'99999999-9999-4999-8999-999999999999'})),'TES_CATEGORIA_OFICIAL')
    rejected('Referência inválida recusada',rpc(fresh(recipe|{'referencia':'nota-1'})),'TES_REFERENCIA')
    rejected('Referência ausente recusada',rpc(fresh({k:v for k,v in recipe.items() if k!='referencia'})),'TES_REFERENCIA')
    rejected('Valor com terceiro centavo recusado',rpc(fresh(recipe|{'valor':'10.001'})),'TES_VALOR')
    rejected('Data anterior à abertura recusada',rpc(fresh(recipe|{'data':'2026-10-31'})),'TES_DATA_ANTERIOR_ABERTURA')
    check('Saldo exato 80.05',query(f"SELECT sum(CASE direcao WHEN 'credito' THEN valor ELSE -valor END)::text FROM financeiro_hml.tesouraria_movimentos WHERE conta_financeira_id='{livro}'")=='80.05')
    check('Histórico público tem seis aberturas e dois lançamentos',json.loads(sql(caller("SELECT financeiro_hml.tesouraria_historico_operacoes('{}');")))['total']==9)
    check('Auditoria rastreia abertura técnica e dois lançamentos',query("SELECT count(*) FROM financeiro_hml.auditoria WHERE tabela='tesouraria_operacoes' AND depois->>'referencia' IS NOT NULL")=='3')
    for role in ['anon','authenticated','service_role']:
        check(role+' sem DML de tabela e coluna',query(f"SELECT count(*) FROM pg_tables WHERE schemaname='financeiro_hml' AND (has_table_privilege('{role}',format('%I.%I',schemaname,tablename),'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') OR has_any_column_privilege('{role}',format('%I.%I',schemaname,tablename),'INSERT,UPDATE,REFERENCES'))")=='0')
    rejected('UPDATE direto em conferências recusado',caller("UPDATE financeiro_hml.tesouraria_conferencias SET status='conciliado';"),'permission denied')
    rejected('INSERT direto em conferências recusado',caller("INSERT INTO financeiro_hml.tesouraria_conferencias(referencia_origem) VALUES ('SINTETICO');"),'permission denied')
    # Real clock untouched: at this time initiating manual sync can correctly reject outside window.
    state=json.loads(sql(caller('SELECT financeiro_hml.integracao_estado_manual();')))
    check('M5 manual consulta relógio do banco',isinstance(state.get('motivo'),str))
    # Set up synthetic running sync as owner, without invoking any external source.
    sid=query(f"INSERT INTO financeiro_hml.integracao_sincronizacoes(responsavel_id,modo,status) VALUES ('{users[0]}','manual','em_andamento') RETURNING id")
    item={'referencia':'SINTETICO_LOCAL_M5','tipo':'pagamento','canonico':'somente ensaio local','resumo':{'forma':'dinheiro','data':'2026-11-02','valor_bruto':'12.34','descricao':'SINTETICO LOCAL M5'}}
    fin=json.loads(sql(caller("SELECT financeiro_hml.integracao_concluir('"+json.dumps({'id':sid,'status':'concluida','itens':[item]})+"');")))
    check('M5 manual conclui lote local sem origem externa',fin['status']=='concluida')
    check('M5 manual conserva conferência pendente sem conciliação',query("SELECT count(*) FROM financeiro_hml.tesouraria_conferencias WHERE referencia_origem='SINTETICO_LOCAL_M5' AND status='pendente' AND operacao_id IS NULL")=='1')
    check('M5 manual não cria operações ou movimentos',query('SELECT count(*) FROM financeiro_hml.tesouraria_operacoes')=='9' and query('SELECT count(*) FROM financeiro_hml.tesouraria_movimentos')=='2')
    rejected('Automação permanece fechada',"SET ROLE service_role; SELECT financeiro_hml.integracao_iniciar_automatica('2026-11-01','2026-11-02');",'permission denied')
    # Concurrent identical request at official public entry: one insert, one repeat.
    concurrent=fresh(recipe|{'valor':'1.01','referencia':'externo:concorrente'})
    with ThreadPoolExecutor(max_workers=2) as pool:pair=list(pool.map(lambda _:json.loads(sql(rpc(concurrent))),range(2)))
    check('Concorrência mesma chave não duplica',pair[0]['id']==pair[1]['id'] and sorted(x['repetida'] for x in pair)==[False,True])
    check('Aberturas intactas após operações sintéticas',before==query("SELECT md5(jsonb_agg(to_jsonb(o) ORDER BY id)::text) FROM financeiro_hml.tesouraria_operacoes o WHERE tipo='abertura' AND id<>'"+manifest['abertura']+"'"))
    rejected('Reexecução não duplica abertura',settings+proposal,'V22_CATALOGO_DIVERGENTE')
    check('Seis contas originais preservadas',allbefore==query("SELECT md5(jsonb_agg(to_jsonb(c) ORDER BY id)::text) FROM financeiro_hml.contas_financeiras c WHERE id<>'"+livro+"'"))
    check('Sete contas e sete aberturas somente',query("SELECT count(*) FROM financeiro_hml.contas_financeiras")=='7' and query("SELECT count(*) FROM financeiro_hml.tesouraria_operacoes WHERE tipo='abertura'")=='7')
    check('Abertura interna zero sem efeitos',query("SELECT count(*) FROM financeiro_hml.tesouraria_movimentos WHERE operacao_id='"+manifest['abertura']+"'")=='0')
    for key in ['origem','destino']:
        rejected('Cliente não atribui '+key+' nem UUID interno',rpc(fresh(recipe|{key:livro})),'TES_VINCULO_INTERNO')
    check('Vínculo do motor é exclusivamente interno',query("SELECT count(*) FROM financeiro_hml.tesouraria_operacoes WHERE tipo IN ('entrada','saida') AND coalesce(conta_origem_id,conta_destino_id)<>'"+livro+"'")=='0')
    # Negative result is permitted: amounts remain positive debits.
    sql(rpc(fresh(expense|{'valor':'200.00','referencia':'externo:negativo'}),1))
    check('Resultado negativo exato -118.94',query("SELECT sum(CASE direcao WHEN 'credito' THEN valor ELSE -valor END)::text FROM financeiro_hml.tesouraria_movimentos WHERE conta_financeira_id='"+livro+"'")=='-118.94')
    history=json.loads(sql(caller("SELECT financeiro_hml.tesouraria_historico_operacoes('{}');")))
    line=next(x for x in history['operacoes'] if x['id']==r['id'])
    check('Histórico devolve referência documental',line['referencia_documental']=='externo:nota-1')
    check('Histórico devolve autoria canônica',line['criado_por']==users[0])
    check('Administrador geral lê nome autorizado',line['responsavel_nome']=='Responsável sintético')
    limited=json.loads(sql(caller("SELECT financeiro_hml.tesouraria_historico_operacoes('{}');",1)))
    check('Nome invisível por RLS não remove histórico',next(x for x in limited['operacoes'] if x['id']==r['id'])['responsavel_nome'] is None)
    # Even another active administrator outside approved pair cannot write.
    sql("UPDATE financeiro_hml.perfis SET ativo=true WHERE usuario_id='"+users[4]+"';")
    rejected('Terceiro administrador não aprovado é recusado',rpc(fresh(recipe),4),'TES_PERMISSAO')
    sql("UPDATE financeiro_hml.perfis SET ativo=false WHERE usuario_id='"+users[4]+"';")
    rejected('UPDATE de operação como owner é imutável',caller("UPDATE financeiro_hml.tesouraria_operacoes SET descricao='alterada' WHERE id='"+r['id']+"';",role='postgres'),'TES_IMUTAVEL')
    rejected('Movimento em conta diferente falha por integridade',caller("BEGIN; INSERT INTO financeiro_hml.tesouraria_movimentos(operacao_id,conta_financeira_id,direcao,valor) VALUES ('"+r['id']+"','"+accounts[0]+"','credito',1); COMMIT;",role='postgres'),'TES_INTEGRIDADE')
    reversal=(HERE/'ITV_CONTENCAO_LIVRO_V2_2_PROPOSTA.sql').read_text()
    rejected('Contenção sem confirmação técnica recusada',reversal,'V22_REVERSAO_NAO_AUTORIZADA')
    snapshot=query("SELECT md5(jsonb_agg(to_jsonb(o) ORDER BY id)::text) FROM financeiro_hml.tesouraria_operacoes o")
    sql("SET ROLE postgres; SET itv.v22.reversao='CONTENCAO_DRENAGEM_APROVADAS';"+reversal)
    check('Contenção preserva todos os registros',snapshot==query("SELECT md5(jsonb_agg(to_jsonb(o) ORDER BY id)::text) FROM financeiro_hml.tesouraria_operacoes o"))
    rejected('Contenção fecha lançamento público',rpc(fresh(recipe)),'permission denied')
    rejected('Contenção sela motor para owner',rpc(fresh(recipe),role='postgres',fn='tes_executar'),'TES_OPERACAO_BLOQUEADA')
    check('Contenção preserva consulta de saldos',bool(sql(caller('SELECT financeiro_hml.tesouraria_saldos();'))))
    check('Contenção preserva estado M5 manual',json.loads(sql(caller('SELECT financeiro_hml.integracao_estado_manual();')))['motivo']=='sucesso_diario')
    # Dump including owner/ACL, restore in clean local database (not HML).
    dump=WORK/'sintetico.dump'
    cmd([BIN['pg_dump'],'-h',str(SOCKET),'-p',PORT,'-U',USER.pw_name,'-d','postgres','-Fc','-f',str(dump)])
    cmd([BIN['pg_restore'],'--list',str(dump)]);sql('CREATE DATABASE recuperacao;')
    cmd([BIN['pg_restore'],'-h',str(SOCKET),'-p',PORT,'-U',USER.pw_name,'-d','recuperacao','--exit-on-error',str(dump)])
    old=BASE[:];BASE[BASE.index('postgres')]='recuperacao'
    check('Restore sintético preserva hash de operações',snapshot==query("SELECT md5(jsonb_agg(to_jsonb(o) ORDER BY id)::text) FROM financeiro_hml.tesouraria_operacoes o"))
    check('Restore sintético preserva EXECUTE fechado',query("SELECT has_function_privilege('authenticated','financeiro_hml.tesouraria_lancar(jsonb)','EXECUTE')")=='f')
    BASE=old
    check('Arquivos originais V2 permanecem intactos',originals=={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in (ROOT/'docs/correcao-minima-v2-1').iterdir() if p.is_file()})
    (HERE/'RESULTADOS_TESTES_LOCAIS.json').write_text(json.dumps({'ambiente':'PostgreSQL local descartável; Auth simplificado; sem rede; sem dados reais','total':len(results),'testes':results},ensure_ascii=False,indent=2))
    print(f'{len(results)}/{len(results)} testes PostgreSQL locais aprovados. Sem SQL hospedado.')
finally:
    if (DATA/'postmaster.pid').exists():cmd([BIN['pg_ctl'],'-D',str(DATA),'-m','fast','-w','stop'])
    shutil.rmtree(WORK)
