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
    http,tipo=('200','NULL') if category=='leitura_valida' else ('NULL',"'TypeError'")
    return sql(actor('service_role')+f"SELECT financeiro_hml.diagnostico_finalizar('{t}','00000000-0000-4000-8000-000000000001',{http},12,'{category}',{tipo});")
def finish_raw(t, http, dur, cat, tipo):
    return subprocess.run(CMD+['-c',actor('service_role')+f"SELECT financeiro_hml.diagnostico_finalizar('{t}','00000000-0000-4000-8000-000000000001',{http},{dur},{cat},{tipo});"],capture_output=True,text=True)
def state(t): return sql(f"SELECT estado||'|'||coalesce(categoria,'-')||'|'||coalesce(duracao_ms::text,'-') FROM financeiro_hml.diagnostico_tentativas WHERE id='{t}';")
resources=['formas_pagamento','recebimentos','pagamentos','recebimentos_titulos','titulos']
r=reserve(resources[0]);check('primeiro recurso reservado',r['ordinal']==1)
invalidos=[('categoria ausente','200','12','NULL','NULL'),('categoria vazia','200','12',"''",'NULL'),('categoria inválida','200','12',"'xyz'",'NULL'),
 ('categoria de bloqueio','NULL','12',"'limite'",'NULL'),('duração ausente','200','NULL',"'leitura_valida'",'NULL'),('duração negativa','200','-1',"'leitura_valida'",'NULL'),
 ('duração não finita',"200","'NaN'::float::int","'leitura_valida'",'NULL'),('duração excessiva','200','600001',"'leitura_valida'",'NULL'),
 ('HTTP incompatível com sucesso','500','12',"'leitura_valida'",'NULL'),('sucesso sem HTTP','NULL','12',"'leitura_valida'",'NULL'),
 ('HTTP 401 incompatível','403','12',"'autenticacao_origem'",'NULL'),('rede com HTTP','200','12',"'rede_origem'","'TypeError'"),
 ('rede sem tipo','NULL','12',"'rede_origem'",'NULL'),('tipo livre','NULL','12',"'rede_origem'","'segredo'")]
for nome,h,d,c,tp in invalidos:
    pr=finish_raw(r['tentativa_id'],h,d,c,tp)
    check('rejeita '+nome,pr.returncode!=0 and state(r['tentativa_id'])=='reservada|-|-')
check('conclusão inválida não libera nova leitura',reserve(resources[1])['categoria']=='concorrencia')
# Falha durante a conclusão: UPDATE válido seguido de erro na mesma transação é desfeito.
pr=subprocess.run(CMD+['-c',actor('service_role')+f"BEGIN; SELECT financeiro_hml.diagnostico_finalizar('{r['tentativa_id']}','00000000-0000-4000-8000-000000000001',NULL,12,'rede_origem','TypeError'); SELECT 1/0; COMMIT;"],capture_output=True,text=True)
check('falha durante conclusão desfeita integralmente',pr.returncode!=0 and state(r['tentativa_id'])=='reservada|-|-')
pc=subprocess.Popen(CMD+['-c',"BEGIN; SELECT pg_advisory_xact_lock(527041,5); SELECT pg_sleep(2); COMMIT;"],stdout=subprocess.DEVNULL)
import time
for _ in range(40):
    if sql("SELECT count(*) FROM pg_locks WHERE locktype='advisory' AND granted;")=='1': break
    time.sleep(.05)
check('conclusão concorrente recusada sem alterar',json.loads(finish(r['tentativa_id'],'rede_origem'))['registrada'] is False and state(r['tentativa_id'])=='reservada|-|-')
pc.wait()
check('concorrência após commit/entre conexões',reserve(resources[1])['categoria']=='concorrencia')
check('conclusão válida registrada',json.loads(finish(r['tentativa_id'],'rede_origem'))['registrada'] is True)
check('conclusão duplicada recusada',json.loads(finish(r['tentativa_id'],'leitura_valida'))['registrada'] is False and state(r['tentativa_id'])=='falha|rede_origem|12')
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
sql("INSERT INTO financeiro_hml.diagnostico_autorizacoes(id,administrador_id,encerra_em) VALUES('00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000001',clock_timestamp()+interval '1 hour');")
r=json.loads(sql(actor()+"SELECT financeiro_hml.diagnostico_reservar('00000000-0000-4000-8000-000000000011','pagamentos');"))
check('nova autorização não reseta a anterior',sql("SELECT consumidas FROM financeiro_hml.diagnostico_autorizacoes WHERE id='00000000-0000-4000-8000-000000000010';")=='5')
subprocess.run(['setpriv','--reuid=1000','--regid=1000','--clear-groups','pg_ctl','-D','/tmp/m5-controle-pg','restart','-m','fast'],check=True,stdout=subprocess.DEVNULL)
check('orçamento continua cinco após reinicialização',sql("SELECT consumidas FROM financeiro_hml.diagnostico_autorizacoes WHERE id='00000000-0000-4000-8000-000000000010';")=='5')
check('reserva perdida sobrevive reinicialização e bloqueia concorrência',reserve(resources[0])['categoria']=='concorrencia')
proc=subprocess.run(CMD+['-c',actor('service_role')+f"SELECT financeiro_hml.diagnostico_finalizar('{r['tentativa_id']}','00000000-0000-4000-8000-000000000001',200,12,'mensagem-livre-proibida',NULL);"],capture_output=True,text=True)
check('auditoria rejeita categoria livre sensível',proc.returncode!=0)
check('reserva não liberada após resultado inválido',reserve(resources[0])['categoria']=='concorrencia')
pr=finish_raw(r['tentativa_id'],'NULL','NULL',"'falha_interna'",'NULL')
check('reserva após reinicialização rejeita conclusão incompleta',pr.returncode!=0 and state(r['tentativa_id'])=='reservada|-|-')
finish(r['tentativa_id'],'rede_origem')
check('reutilizar reserva consumida recusado',json.loads(finish(r['tentativa_id'],'rede_origem'))['registrada'] is False)
check('recurso consumido não volta a ficar disponível',json.loads(sql(actor()+"SELECT financeiro_hml.diagnostico_reservar('00000000-0000-4000-8000-000000000011','pagamentos');"))['categoria']=='repeticao')
check('administrador não grava diretamente',subprocess.run(CMD+['-c',actor()+"UPDATE financeiro_hml.diagnostico_tentativas SET estado='falha';"],capture_output=True).returncode!=0)
check('saldos sentinela inalterados ao final',sql('SELECT saldo::text FROM financeiro_hml.financeiro_sentinela WHERE id=1;')=='0')
print('Testes PostgreSQL isolados concluídos; nenhuma origem ou HML acessado.')