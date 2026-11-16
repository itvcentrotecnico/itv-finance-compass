# Executado DENTRO de docs/livro-financeiro-v2-2-1/testar_livro_local.py (banco local descartável),
# após a V2.2.1 instalada e antes da contenção. Usa sql/caller/check/rejected/users/categories do ensaio.
import json, uuid
from concurrent.futures import ThreadPoolExecutor
sql('SET ROLE postgres;'+(ROOT/'docs/contas-pagar/ITV_CONTAS_PAGAR_V1_PROPOSTA.sql').read_text())
desp=query("SELECT id FROM financeiro_hml.plano_contas WHERE aceita_lancamentos AND natureza='despesa' ORDER BY codigo LIMIT 1")
rec=query("SELECT id FROM financeiro_hml.plano_contas WHERE aceita_lancamentos AND natureza='receita' ORDER BY codigo LIMIT 1")
def cp(fn,p,i=1): return sql(caller("SELECT financeiro_hml."+fn+"('"+json.dumps(p).replace("'","''")+"'::jsonb);",i),False)
def ok(fn,p,i=1):
    r=cp(fn,p,i)
    if r.returncode: raise RuntimeError(r.stderr[:800])
    return json.loads(r.stdout.strip().splitlines()[-1])
def resumo(cid): return json.loads(sql(caller("SELECT row_to_json(r) FROM financeiro_hml.contas_pagar_resumo r WHERE id='"+cid+"';",1)))
def saidas(): return int(query("SELECT count(*) FROM financeiro_hml.tesouraria_operacoes WHERE tipo='saida'"))
def k(): return str(uuid.uuid4())
s0=saidas()
ob={'chave':k(),'fornecedor':'FORNECEDOR SINTETICO','descricao':'SERVICO SINTETICO','plano':desp,'valor':'1000.00','vencimento':'2026-12-10','referencia':'externo:os-1323'}
c=ok('cp_cadastrar',ob)['id']
rs_=resumo(c)
check('CP1: obrigação de R$ 1.000,00 com saldo 1.000,00',rs_['saldo_centavos']==100000 and rs_['pago_centavos']==0 and rs_['situacao']=='aberta')
check('CP1: cadastro não lança despesa no Livro Único',saidas()==s0)
check('CP1: reenvio do cadastro devolve a mesma obrigação',ok('cp_cadastrar',ob)['id']==c and ok('cp_cadastrar',ob)['repetida'] is True)
b={'chave':k(),'conta':c,'data':'2026-12-01','valor':'400.00','modo':'gerar'}
b1=ok('cp_baixar',b)
rs_=resumo(c)
check('CP2: baixa de 400 deixa saldo 600 e situação parcial',rs_['saldo_centavos']==60000 and rs_['situacao']=='parcial')
check('CP2: um único lançamento de 400 com referência da OS',saidas()==s0+1 and query("SELECT valor||'|'||(requisicao->>'referencia') FROM financeiro_hml.tesouraria_operacoes WHERE id='"+b1['operacao_id']+"'")=='400.00|externo:os-1323')
check('CP2: vínculo e autoria registrados na baixa',query("SELECT operacao_id||'|'||criado_por||'|'||modo FROM financeiro_hml.contas_pagar_baixas WHERE id='"+b1['id']+"'")==b1['operacao_id']+'|'+users[1]+'|gerada')
b1r=ok('cp_baixar',b)
check('CP2: reenvio idêntico não altera valores',b1r['repetida'] is True and b1r['id']==b1['id'] and saidas()==s0+1 and resumo(c)['saldo_centavos']==60000)
check('CP2: reenvio com mesma chave e valor diferente é recusado','CP_IDEMPOTENCIA' in cp('cp_baixar',b|{'valor':'10.00'}).stderr)
check('CP3: valor acima do saldo é recusado',' CP_SALDO' in ' '+cp('cp_baixar',{'chave':k(),'conta':c,'data':'2026-12-02','valor':'600.01','modo':'gerar'}).stderr and saidas()==s0+1)
sql("SET ROLE postgres; ALTER TABLE financeiro_hml.contas_pagar DISABLE TRIGGER USER; UPDATE financeiro_hml.contas_pagar SET vencimento='2026-01-10' WHERE id='"+c+"';")
rs_=resumo(c)
check('CP3: vencimento passado com saldo aparece vencida pelo saldo de 600',rs_['situacao']=='vencida' and rs_['saldo_centavos']==60000)
ok('cp_baixar',{'chave':k(),'conta':c,'data':'2026-12-03','valor':'600.00','modo':'gerar'})
check('CP3: quitação passa a paga com saldo zero',resumo(c)['situacao']=='paga' and resumo(c)['saldo_centavos']==0 and saidas()==s0+2)
# Vínculo de despesa já registrada no Livro Único (fluxo oficial direto).
c2=ok('cp_cadastrar',ob|{'chave':k(),'valor':'250.00','referencia':'externo:fatura-55-a'})['id']
op=json.loads(sql(rpc({'tipo':'saida','chave':k(),'data':'2026-12-04','descricao':'DESPESA JA LANCADA','valor':'250.00','plano':desp,'referencia':'externo:fatura-55-a'},1)))['id']
s1=saidas()
v=ok('cp_baixar',{'chave':k(),'conta':c2,'data':'2026-12-04','valor':'250.00','modo':'vincular','operacao':op})
check('CP4: vínculo de despesa existente não cria segundo lançamento',saidas()==s1 and v['operacao_id']==op and resumo(c2)['situacao']=='paga')
c3=ok('cp_cadastrar',ob|{'chave':k(),'valor':'250.00','referencia':'externo:boleto-9'})['id']
check('CP4: mesmo lançamento não pode ser usado em duas baixas','CP_VINCULO_USADO' in cp('cp_baixar',{'chave':k(),'conta':c3,'data':'2026-12-04','valor':'250.00','modo':'vincular','operacao':op}).stderr)
check('CP4: vínculo com valor diferente é recusado','CP_VINCULO_INCOMPATIVEL' in cp('cp_baixar',{'chave':k(),'conta':c3,'data':'2026-12-04','valor':'100.00','modo':'vincular','operacao':op}).stderr)
check('CP4: Consulta Gerencial não cadastra','CP_PERMISSAO' in cp('cp_cadastrar',ob|{'chave':k()},3).stderr)
check('CP4: Consulta Gerencial não baixa','CP_PERMISSAO' in cp('cp_baixar',{'chave':k(),'conta':c3,'data':'2026-12-04','valor':'1.00','modo':'gerar'},3).stderr)
check('CP4: Administrador Financeiro fora do par não gera lançamento (motor recusa, nada gravado)','TES_PERMISSAO' in cp('cp_baixar',{'chave':k(),'conta':c3,'data':'2026-12-04','valor':'1.00','modo':'gerar'},2).stderr and resumo(c3)['pago_centavos']==0)
check('CP4: Consulta Gerencial consulta obrigações',resumo(c3)['saldo_centavos']==25000 and sql(caller("SELECT count(*)>0 FROM financeiro_hml.contas_pagar_resumo;",3))=='t')
check('CP4: escrita direta na tabela é negada','permission denied' in sql(caller("INSERT INTO financeiro_hml.contas_pagar_baixas(conta_pagar_id,data_pagamento,valor_centavos,operacao_id,modo,chave_idempotencia,criado_por) VALUES('"+c3+"','2026-12-04',1,'"+op+"','gerada','"+k()+"','"+users[1]+"');",1),False).stderr)
check('CP4: anon não lê obrigações','permission denied' in sql(caller("SELECT count(*) FROM financeiro_hml.contas_pagar;",None,'anon'),False).stderr)
check('CP4: categoria de receita é recusada no cadastro','CP_CATEGORIA' in cp('cp_cadastrar',ob|{'chave':k(),'plano':rec}).stderr)
# Concorrência: duas baixas de 200 sobre saldo 250 → apenas uma passa.
def par(i): return cp('cp_baixar',{'chave':k(),'conta':c3,'data':'2026-12-05','valor':'200.00','modo':'gerar'},[0,1][i])
s2=saidas()
with ThreadPoolExecutor(2) as ex: rs=list(ex.map(par,[0,1]))
check('CP4: baixas simultâneas não excedem o saldo',sum(x.returncode==0 for x in rs)==1 and resumo(c3)['saldo_centavos']==5000 and saidas()==s2+1)
# Cenário 5: OS 1323 e fatura sem OS.
check('CP5: obrigação com OS 1323 gravada como externo:os-1323',query("SELECT referencia FROM financeiro_hml.contas_pagar WHERE id='"+c+"'")=='externo:os-1323')
check('CP5: obrigação sem OS com fatura baixa no Livro Único sem ajuste de contrato',query("SELECT requisicao->>'referencia' FROM financeiro_hml.tesouraria_operacoes WHERE id='"+op+"'")=='externo:fatura-55-a')
c4=ok('cp_cadastrar',ob|{'chave':k(),'valor':'10.00'})['id']
check('CP: analista não cancela; Administrador Geral cancela obrigação sem baixas','CP_PERMISSAO' in cp('cp_cancelar',{'conta':c4}).stderr and ok('cp_cancelar',{'conta':c4},0)['repetida'] is False and resumo(c4)['situacao']=='cancelada')
check('CP: obrigação com baixas não é cancelada','CP_COM_BAIXAS' in cp('cp_cancelar',{'conta':c},0).stderr)
check('CP: auditoria registra cadastros e baixas',int(query("SELECT count(*) FROM financeiro_hml.auditoria WHERE tabela IN ('contas_pagar','contas_pagar_baixas')"))>=9)
antes=query("SELECT md5(jsonb_agg(to_jsonb(b) ORDER BY id)::text) FROM financeiro_hml.contas_pagar_baixas b")
sql('SET ROLE postgres;'+(ROOT/'docs/contas-pagar/ITV_CONTAS_PAGAR_V1_CONTENCAO.sql').read_text())
check('CP contenção: baixas preservadas e cadastro fechado',antes==query("SELECT md5(jsonb_agg(to_jsonb(b) ORDER BY id)::text) FROM financeiro_hml.contas_pagar_baixas b") and cp('cp_baixar',{}).returncode!=0)
# Somente no ensaio: remove as tabelas sintéticas para que a contingência V2.2.1 (hashes pré-Contas a Pagar) siga testável.
sql("SET ROLE postgres; DROP TABLE financeiro_hml.contas_pagar_baixas, financeiro_hml.contas_pagar; DELETE FROM financeiro_hml.auditoria WHERE tabela IN ('contas_pagar','contas_pagar_baixas');")
