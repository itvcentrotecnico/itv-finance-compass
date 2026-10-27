"""Somente cluster descartável /tmp/m5-controle-socket: nunca HML."""
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CMD = ['psql', '-h', '/tmp/m5-controle-socket', '-p', '55439', '-U', 'lovable', '-d', 'postgres', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1']
def sql(text):
    return subprocess.check_output(CMD+['-c',text],text=True).strip()
def actor(role='authenticated', admin=True):
    return f"SET ROLE {role}; SET request.jwt.claim.role='{role}'; SET request.jwt.claim.sub='00000000-0000-4000-8000-000000000001'; SET diag.admin='{str(admin).lower()}';"
def call(resource):
    return "SELECT financeiro_hml.diagnostico_reservar('00000000-0000-4000-8000-000000000010','"+resource+"');"
def check(name, condition):
    if not condition: raise AssertionError(name)
    print('OK',name)
sql("""
CREATE ROLE authenticated; CREATE ROLE anon; CREATE ROLE service_role;
CREATE SCHEMA auth; GRANT USAGE ON SCHEMA auth TO authenticated,service_role;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
CREATE SCHEMA financeiro_hml; GRANT USAGE ON SCHEMA financeiro_hml TO authenticated;
CREATE FUNCTION financeiro_hml.tem_papel(text[]) RETURNS boolean LANGUAGE sql AS $$SELECT coalesce(current_setting('diag.admin',true),'false')::boolean$$;
CREATE TABLE financeiro_hml.auditoria(id bigserial,tabela text,registro_id uuid,acao text,usuario_id uuid,antes jsonb,depois jsonb);
CREATE FUNCTION financeiro_hml.tes_conf_auditar() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$BEGIN
INSERT INTO financeiro_hml.auditoria(tabela,registro_id,acao,usuario_id,antes,depois) VALUES(TG_TABLE_NAME,NEW.id,CASE TG_OP WHEN 'INSERT' THEN 'criar' ELSE 'alterar' END,auth.uid(),CASE WHEN TG_OP='UPDATE' THEN to_jsonb(OLD) END,to_jsonb(NEW));RETURN NULL; END$$;
CREATE TABLE financeiro_hml.financeiro_sentinela(id int primary key, saldo numeric); INSERT INTO financeiro_hml.financeiro_sentinela VALUES(1,0);
""")
subprocess.run(CMD+['-f',str(ROOT/'docs/m5/M5_CONTROLE_DIAGNOSTICO_PROPOSTO.sql')],check=True)
sql("INSERT INTO financeiro_hml.diagnostico_autorizacoes(id,administrador_id,encerra_em) VALUES('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000001',clock_timestamp()+interval '1 hour');")
import json
def reserve(resource): return json.loads(sql(actor()+call(resource)))
def finish(t, category='leitura_valida'):
    return sql(actor('service_role')+f"SELECT financeiro_hml.diagnostico_finalizar('{t}','00000000-0000-4000-8000-000000000001',200,12,'{category}',NULL);")
resources=['formas_pagamento','recebimentos','pagamentos','recebimentos_titulos','titulos']
r=reserve(resources[0]);check('primeiro recurso reservado',r['ordinal']==1)
check('concorrência após commit/entre conexões',reserve(resources[1])['categoria']=='concorrencia')
finish(r['tentativa_id'],'rede_origem')
check('falha consome e impede repetição',reserve(resources[0])['categoria']=='repeticao')
for i,resource in enumerate(resources[1:],2):
    r=reserve(resource);check(f'recurso {i} permitido uma vez',r['ordinal']==i);finish(r['tentativa_id'])
check('sexta tentativa bloqueada',reserve(resources[0])['categoria']=='limite')
check('cinco reservas duráveis em novas conexões',sql("SELECT count(*) FROM financeiro_hml.diagnostico_tentativas WHERE ordinal IS NOT NULL;")=='5')
check('falha registrada na auditoria existente',int(sql("SELECT count(*) FROM financeiro_hml.auditoria WHERE depois->>'categoria'='rede_origem';"))>0)
for role,admin in [('authenticated',False),('anon',False)]:
    proc=subprocess.run(CMD+['-c',actor(role,admin)+call(resources[0])],capture_output=True,text=True)
    check('usuário não autorizado bloqueado '+role,proc.returncode!=0)
proc=subprocess.run(CMD+['-c',actor()+"UPDATE financeiro_hml.diagnostico_autorizacoes SET consumidas=0;"],capture_output=True,text=True)
check('administrador não pode resetar orçamento',proc.returncode!=0)
proc=subprocess.run(CMD+['-c',actor()+f"SELECT financeiro_hml.diagnostico_finalizar('{r['tentativa_id']}','00000000-0000-4000-8000-000000000001',200,12,'leitura_valida',NULL);"],capture_output=True,text=True)
check('administrador não pode liberar reserva pelo browser',proc.returncode!=0)
check('ausência de efeitos financeiros',sql('SELECT saldo::text FROM financeiro_hml.financeiro_sentinela WHERE id=1;')=='0')
# Lock físico durante transação em conexão independente: não espera adquirir.
p=subprocess.Popen(CMD+['-c',"BEGIN; SELECT pg_advisory_xact_lock(527041,5); SELECT pg_sleep(3); COMMIT;"],stdout=subprocess.DEVNULL)
import time
for _ in range(30):
    if sql("SELECT count(*) FROM pg_locks WHERE locktype='advisory' AND granted;")=='1': break
    time.sleep(.05)
check('concorrência durante transação bloqueada',reserve(resources[0])['categoria']=='concorrencia')
p.wait()
check('tentativas bloqueadas auditadas',int(sql("SELECT count(*) FROM financeiro_hml.auditoria WHERE depois->>'estado'='bloqueada';"))>=4)
print('Testes PostgreSQL isolados concluídos; nenhuma origem ou HML acessado.')