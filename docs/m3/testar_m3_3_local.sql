-- TESTES LOCAIS DESCARTÁVEIS DA M3.3. Nunca executar no HML.
\set ON_ERROR_STOP 1
SET client_min_messages = warning;
INSERT INTO auth.users VALUES ('a0000000-0000-4000-8000-000000000001'),('a0000000-0000-4000-8000-000000000002'),('a0000000-0000-4000-8000-000000000003');
INSERT INTO financeiro_hml.perfis(usuario_id,papel) VALUES ('a0000000-0000-4000-8000-000000000001','admin_geral'),('a0000000-0000-4000-8000-000000000002','analista_financeiro'),('a0000000-0000-4000-8000-000000000003','consulta_gerencial');
INSERT INTO financeiro_hml.plano_contas(id,codigo,descricao,natureza) VALUES ('b0000000-0000-4000-8000-000000000001','R1','RECEITA LOCAL','receita'),('b0000000-0000-4000-8000-000000000002','D1','DESPESA LOCAL','despesa');
CREATE TABLE public.resultado(n serial, teste text, ok boolean, detalhe text);
GRANT ALL ON public.resultado, public.resultado_n_seq TO authenticated, anon;
CREATE FUNCTION public.como(u int) RETURNS void LANGUAGE sql AS $$ SELECT set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-00000000000'||u,false) $$;
CREATE FUNCTION public.falha(q text, padrao text) RETURNS text LANGUAGE plpgsql AS $$
BEGIN EXECUTE q; RETURN 'SEM ERRO'; EXCEPTION WHEN OTHERS THEN IF SQLERRM ~ padrao OR SQLSTATE ~ padrao THEN RETURN 'OK'; END IF; RETURN SQLSTATE||' '||SQLERRM; END $$;
CREATE FUNCTION public.ok(t text, cond boolean, det text DEFAULT '') RETURNS void LANGUAGE sql AS $$ INSERT INTO public.resultado(teste,ok,detalhe) VALUES (t,cond,det) $$;
GRANT EXECUTE ON FUNCTION public.como(int), public.falha(text,text), public.ok(text,boolean,text) TO authenticated;
CREATE FUNCTION public.cprep(n text) RETURNS uuid LANGUAGE sql SECURITY DEFINER AS $$ SELECT id FROM financeiro_hml.contas_preparadas WHERE nome=n $$;
CREATE FUNCTION public.cfin(n text) RETURNS uuid LANGUAGE sql SECURITY DEFINER AS $$ SELECT conta_financeira_id FROM financeiro_hml.contas_preparadas WHERE nome=n $$;
CREATE FUNCTION public.saldo(n text) RETURNS numeric LANGUAGE sql SECURITY DEFINER AS $$ SELECT coalesce(sum(CASE direcao WHEN 'credito' THEN valor ELSE -valor END),0) FROM financeiro_hml.tesouraria_movimentos WHERE conta_financeira_id=public.cfin(n) $$;
GRANT EXECUTE ON FUNCTION public.cprep(text), public.cfin(text), public.saldo(text) TO authenticated;

SET ROLE authenticated;
-- 1. Cadastro de contas
SELECT como(1);
SELECT ok('01 três contas pendentes sem conta operacional', (SELECT count(*)=3 AND bool_and(situacao='pendente_abertura' AND conta_financeira_id IS NULL) FROM financeiro_hml.contas_preparadas) AND (SELECT count(*)=0 FROM financeiro_hml.contas_financeiras));
SELECT como(2);
SELECT ok('02 analista não habilita conta', falha($$SELECT financeiro_hml.tesouraria_habilitar_conta(jsonb_build_object('id',cprep('CAIXA FÍSICO ITV'),'chave',gen_random_uuid(),'data','2026-09-01','valor','0.00','responsavel','X Y'))$$,'TES_PERMISSAO')='OK');
SELECT como(3);
SELECT ok('03 consulta não habilita conta', falha($$SELECT financeiro_hml.tesouraria_habilitar_conta(jsonb_build_object('id',cprep('CAIXA FÍSICO ITV'),'chave',gen_random_uuid(),'data','2026-09-01','valor','0.00','responsavel','X Y'))$$,'TES_PERMISSAO')='OK');
SELECT como(1);
SELECT ok('04 habilitação exige responsável', falha($$SELECT financeiro_hml.tesouraria_habilitar_conta(jsonb_build_object('id',cprep('CAIXA FÍSICO ITV'),'chave',gen_random_uuid(),'data','2026-09-01','valor','10.00'))$$,'TES_RESPONSAVEL')='OK');
SELECT ok('05 habilitação exige saldo informado', falha($$SELECT financeiro_hml.tesouraria_habilitar_conta(jsonb_build_object('id',cprep('CAIXA FÍSICO ITV'),'chave',gen_random_uuid(),'data','2026-09-01','responsavel','Resp Local'))$$,'TES_DADOS')='OK');
-- 2. Abertura financeira (valores locais fictícios)
SELECT financeiro_hml.tesouraria_habilitar_conta(jsonb_build_object('id',cprep('CAIXA FÍSICO ITV'),'chave','c0000000-0000-4000-8000-000000000001','data','2026-09-01','valor','100.00','responsavel','Resp Local')) IS NOT NULL;
SELECT financeiro_hml.tesouraria_habilitar_conta(jsonb_build_object('id',cprep('SICREDI — CONTA PRINCIPAL'),'chave','c0000000-0000-4000-8000-000000000002','data','2026-09-01','valor','0.00','responsavel','Resp Local')) IS NOT NULL;
SELECT financeiro_hml.tesouraria_habilitar_conta(jsonb_build_object('id',cprep('MERCADO PAGO — RECEBIMENTOS'),'chave','c0000000-0000-4000-8000-000000000003','data','2026-09-01','valor','0.00','responsavel','Resp Local')) IS NOT NULL;
SELECT ok('06 abertura cria conta e saldo validado', saldo('CAIXA FÍSICO ITV')=100 AND (SELECT count(*)=3 FROM financeiro_hml.contas_financeiras) AND (SELECT count(*)=3 FROM financeiro_hml.tesouraria_operacoes WHERE tipo='abertura'));
SELECT ok('07 habilitação repetida não duplica', (financeiro_hml.tesouraria_habilitar_conta(jsonb_build_object('id',cprep('CAIXA FÍSICO ITV'),'chave',gen_random_uuid(),'data','2026-09-02','valor','999.00','responsavel','Outro')))->>'repetida'='true' AND (SELECT count(*)=3 FROM financeiro_hml.contas_financeiras));
-- 3. Pix
SELECT como(2);
INSERT INTO financeiro_hml.tesouraria_conferencias(referencia_origem,natureza,forma,data_ocorrencia,descricao,valor_bruto,plano_conta_id,conta_financeira_id,status)
 VALUES ('T|PIX','entrada','pix','2026-09-05','PIX LOCAL',50.00,'b0000000-0000-4000-8000-000000000001',cfin('SICREDI — CONTA PRINCIPAL'),'pendente');
SELECT ok('08 pendente não gera lançamento', falha($$SELECT financeiro_hml.tesouraria_lancar_conferencia(jsonb_build_object('id',(SELECT id FROM financeiro_hml.tesouraria_conferencias WHERE referencia_origem='T|PIX')))$$,'TES_CONF_NAO_CONCILIADA')='OK' AND saldo('SICREDI — CONTA PRINCIPAL')=0);
UPDATE financeiro_hml.tesouraria_conferencias SET status='conciliado' WHERE referencia_origem='T|PIX';
SELECT financeiro_hml.tesouraria_lancar_conferencia(jsonb_build_object('id',(SELECT id FROM financeiro_hml.tesouraria_conferencias WHERE referencia_origem='T|PIX')));
SELECT ok('09 Pix conciliado credita Sicredi uma vez', saldo('SICREDI — CONTA PRINCIPAL')=50);
SELECT ok('10 segundo processamento é idempotente', (financeiro_hml.tesouraria_lancar_conferencia(jsonb_build_object('id',(SELECT id FROM financeiro_hml.tesouraria_conferencias WHERE referencia_origem='T|PIX'))))->>'repetida'='true' AND saldo('SICREDI — CONTA PRINCIPAL')=50);
SELECT como(1);
SELECT ok('11 outro usuário também não duplica', (financeiro_hml.tesouraria_lancar_conferencia(jsonb_build_object('id',(SELECT id FROM financeiro_hml.tesouraria_conferencias WHERE referencia_origem='T|PIX'))))->>'repetida'='true' AND saldo('SICREDI — CONTA PRINCIPAL')=50);
SELECT ok('12 lançamento mantém vínculo', (SELECT operacao_id IS NOT NULL AND lancado_por IS NOT NULL FROM financeiro_hml.tesouraria_conferencias WHERE referencia_origem='T|PIX'));
SELECT ok('13 conferência lançada é imutável', falha($$UPDATE financeiro_hml.tesouraria_conferencias SET descricao='ALTERADA' WHERE referencia_origem='T|PIX'$$,'TES_CONF_LANCADA')='OK');
SELECT ok('14 referência de origem repetida é bloqueada', falha($$INSERT INTO financeiro_hml.tesouraria_conferencias(referencia_origem,natureza,forma,data_ocorrencia,descricao,valor_bruto) VALUES ('T|PIX','entrada','pix','2026-09-05','PIX LOCAL',50)$$,'23505')='OK');
SELECT ok('15 usuário não grava vínculo manualmente', falha($$UPDATE financeiro_hml.tesouraria_conferencias SET operacao_id=NULL WHERE referencia_origem='T|PIX'$$,'42501')='OK');
-- 4. Dinheiro
INSERT INTO financeiro_hml.tesouraria_conferencias(referencia_origem,natureza,forma,data_ocorrencia,descricao,valor_bruto,plano_conta_id,conta_financeira_id,status)
 VALUES ('T|DIN','entrada','dinheiro','2026-09-06','DINHEIRO LOCAL',30.00,'b0000000-0000-4000-8000-000000000001',cfin('CAIXA FÍSICO ITV'),'conciliado');
SELECT financeiro_hml.tesouraria_lancar_conferencia(jsonb_build_object('id',(SELECT id FROM financeiro_hml.tesouraria_conferencias WHERE referencia_origem='T|DIN')));
SELECT ok('16 dinheiro credita Caixa Físico', saldo('CAIXA FÍSICO ITV')=130);
-- 5. Cartão e taxa
INSERT INTO financeiro_hml.tesouraria_conferencias(referencia_origem,natureza,forma,data_ocorrencia,descricao,valor_bruto,plano_conta_id,conta_financeira_id,status)
 VALUES ('T|CRED','entrada','credito','2026-09-07','CARTÃO LOCAL',100.00,'b0000000-0000-4000-8000-000000000001',cfin('MERCADO PAGO — RECEBIMENTOS'),'em_conferencia');
SELECT ok('17 cartão sem líquido não concilia', falha($$UPDATE financeiro_hml.tesouraria_conferencias SET status='conciliado' WHERE referencia_origem='T|CRED'$$,'23514')='OK' AND saldo('MERCADO PAGO — RECEBIMENTOS')=0);
SELECT ok('18 líquido acima do bruto é rejeitado', falha($$UPDATE financeiro_hml.tesouraria_conferencias SET valor_liquido=101 WHERE referencia_origem='T|CRED'$$,'23514')='OK');
UPDATE financeiro_hml.tesouraria_conferencias SET valor_liquido=95.37, data_liquidacao='2026-10-07', status='conciliado' WHERE referencia_origem='T|CRED';
SELECT financeiro_hml.tesouraria_lancar_conferencia(jsonb_build_object('id',(SELECT id FROM financeiro_hml.tesouraria_conferencias WHERE referencia_origem='T|CRED')));
SELECT ok('19 cartão lança líquido na data de liquidação, taxa calculada', saldo('MERCADO PAGO — RECEBIMENTOS')=95.37 AND (SELECT taxa=4.63 FROM financeiro_hml.tesouraria_conferencias WHERE referencia_origem='T|CRED') AND EXISTS(SELECT 1 FROM financeiro_hml.tesouraria_operacoes WHERE data_movimento='2026-10-07' AND valor=95.37));
INSERT INTO financeiro_hml.tesouraria_conferencias(referencia_origem,natureza,forma,data_ocorrencia,descricao,valor_bruto,valor_liquido,data_liquidacao,plano_conta_id,conta_financeira_id,status)
 VALUES ('T|DEB','entrada','debito','2026-09-07','DÉBITO LOCAL',40.00,39.40,'2026-09-08','b0000000-0000-4000-8000-000000000001',cfin('MERCADO PAGO — RECEBIMENTOS'),'conciliado');
SELECT financeiro_hml.tesouraria_lancar_conferencia(jsonb_build_object('id',(SELECT id FROM financeiro_hml.tesouraria_conferencias WHERE referencia_origem='T|DEB')));
SELECT ok('20 débito lança líquido', saldo('MERCADO PAGO — RECEBIMENTOS')=134.77);
-- 6. Pagamento misto
INSERT INTO financeiro_hml.tesouraria_conferencias(referencia_origem,grupo_id,natureza,forma,data_ocorrencia,descricao,valor_bruto,status)
 VALUES ('T|MIX','d0000000-0000-4000-8000-000000000001','entrada','misto','2026-09-10','VENDA MISTA LOCAL',1000.00,'pendente');
SELECT ok('21 registro misto não lança sozinho', falha($$UPDATE financeiro_hml.tesouraria_conferencias SET conta_financeira_id=cfin('CAIXA FÍSICO ITV'),plano_conta_id='b0000000-0000-4000-8000-000000000001',status='conciliado' WHERE referencia_origem='T|MIX'; SELECT financeiro_hml.tesouraria_lancar_conferencia(jsonb_build_object('id',(SELECT id FROM financeiro_hml.tesouraria_conferencias WHERE referencia_origem='T|MIX')))$$,'TES_CONF_FORMA')='OK');
INSERT INTO financeiro_hml.tesouraria_conferencias(referencia_origem,grupo_id,natureza,forma,data_ocorrencia,descricao,valor_bruto,plano_conta_id,conta_financeira_id,status)
 VALUES ('T|MIX|1','d0000000-0000-4000-8000-000000000001','entrada','dinheiro','2026-09-10','VENDA MISTA · DINHEIRO',300.00,'b0000000-0000-4000-8000-000000000001',cfin('CAIXA FÍSICO ITV'),'conciliado'),
        ('T|MIX|2','d0000000-0000-4000-8000-000000000001','entrada','credito','2026-09-10','VENDA MISTA · CARTÃO',600.00,'b0000000-0000-4000-8000-000000000001',cfin('MERCADO PAGO — RECEBIMENTOS'),'pendente');
SELECT ok('22 rateio incompleto é bloqueado', falha($$SELECT financeiro_hml.tesouraria_lancar_conferencia(jsonb_build_object('id',(SELECT id FROM financeiro_hml.tesouraria_conferencias WHERE referencia_origem='T|MIX|1')))$$,'TES_CONF_RATEIO')='OK' AND saldo('CAIXA FÍSICO ITV')=130);
UPDATE financeiro_hml.tesouraria_conferencias SET valor_bruto=700.00 WHERE referencia_origem='T|MIX|2';
SELECT financeiro_hml.tesouraria_lancar_conferencia(jsonb_build_object('id',(SELECT id FROM financeiro_hml.tesouraria_conferencias WHERE referencia_origem='T|MIX|1')));
SELECT ok('23 componente em dinheiro lançado; cartão aguarda liquidação', saldo('CAIXA FÍSICO ITV')=430 AND saldo('MERCADO PAGO — RECEBIMENTOS')=134.77);
-- 7. Boleto
INSERT INTO financeiro_hml.tesouraria_conferencias(referencia_origem,natureza,forma,data_ocorrencia,descricao,valor_bruto,boleto_vencimento,boleto_status,plano_conta_id,conta_financeira_id,status)
 VALUES ('T|BOL','entrada','boleto','2026-09-11','BOLETO LOCAL',80.00,'2026-09-20','pendente','b0000000-0000-4000-8000-000000000001',cfin('SICREDI — CONTA PRINCIPAL'),'em_conferencia');
SELECT ok('24 boleto não pago não concilia', falha($$UPDATE financeiro_hml.tesouraria_conferencias SET status='conciliado' WHERE referencia_origem='T|BOL'$$,'23514')='OK');
UPDATE financeiro_hml.tesouraria_conferencias SET boleto_status='pago', boleto_pagamento='2026-09-19', status='conciliado' WHERE referencia_origem='T|BOL';
SELECT financeiro_hml.tesouraria_lancar_conferencia(jsonb_build_object('id',(SELECT id FROM financeiro_hml.tesouraria_conferencias WHERE referencia_origem='T|BOL')));
SELECT ok('25 boleto pago entra na data de pagamento', saldo('SICREDI — CONTA PRINCIPAL')=130 AND EXISTS(SELECT 1 FROM financeiro_hml.tesouraria_operacoes WHERE data_movimento='2026-09-19' AND valor=80));
-- 8. Despesa
INSERT INTO financeiro_hml.tesouraria_conferencias(referencia_origem,natureza,forma,data_ocorrencia,descricao,valor_bruto,plano_conta_id,conta_financeira_id,status)
 VALUES ('T|SAI','saida','indefinida','2026-09-12','DESPESA LOCAL',20.00,'b0000000-0000-4000-8000-000000000002',NULL,'pendente');
SELECT ok('26 saída sem conta não concilia', falha($$UPDATE financeiro_hml.tesouraria_conferencias SET status='conciliado' WHERE referencia_origem='T|SAI'$$,'23514')='OK');
UPDATE financeiro_hml.tesouraria_conferencias SET forma='dinheiro', conta_financeira_id=cfin('CAIXA FÍSICO ITV'), status='conciliado' WHERE referencia_origem='T|SAI';
SELECT financeiro_hml.tesouraria_lancar_conferencia(jsonb_build_object('id',(SELECT id FROM financeiro_hml.tesouraria_conferencias WHERE referencia_origem='T|SAI')));
SELECT ok('27 despesa debita a conta escolhida', saldo('CAIXA FÍSICO ITV')=410);
-- 9. Transferência Mercado Pago → Sicredi
SELECT financeiro_hml.tesouraria_transferir(jsonb_build_object('chave',gen_random_uuid(),'data','2026-10-08','descricao','REPASSE MP LOCAL','valor','95.37','origem',cfin('MERCADO PAGO — RECEBIMENTOS'),'destino',cfin('SICREDI — CONTA PRINCIPAL')));
SELECT ok('28 transferência interna não gera receita', saldo('MERCADO PAGO — RECEBIMENTOS')=39.40 AND saldo('SICREDI — CONTA PRINCIPAL')=225.37 AND (SELECT plano_conta_id IS NULL FROM financeiro_hml.tesouraria_operacoes WHERE tipo='transferencia'));
-- 10. Estorno
SELECT financeiro_hml.tesouraria_estornar(jsonb_build_object('chave',gen_random_uuid(),'data','2026-09-20','descricao','Estorno · DESPESA LOCAL','justificativa','Teste local de estorno','original',(SELECT operacao_id FROM financeiro_hml.tesouraria_conferencias WHERE referencia_origem='T|SAI')));
SELECT ok('29 estorno restaura saldo e preserva vínculo', saldo('CAIXA FÍSICO ITV')=430 AND (SELECT operacao_id IS NOT NULL FROM financeiro_hml.tesouraria_conferencias WHERE referencia_origem='T|SAI'));
-- 11. Atomicidade
UPDATE financeiro_hml.tesouraria_conferencias SET valor_liquido=690, data_liquidacao='2026-10-10', status='conciliado' WHERE referencia_origem='T|MIX|2';
RESET ROLE; UPDATE financeiro_hml.plano_contas SET aceita_lancamentos=false WHERE codigo='R1'; SET ROLE authenticated; SELECT como(1);
SELECT ok('30 falha intermediária não lança nem vincula', 'SEM ERRO' <> falha($$SELECT financeiro_hml.tesouraria_lancar_conferencia(jsonb_build_object('id',(SELECT id FROM financeiro_hml.tesouraria_conferencias WHERE referencia_origem='T|MIX|2')))$$,'^$') AND (SELECT operacao_id IS NULL FROM financeiro_hml.tesouraria_conferencias WHERE referencia_origem='T|MIX|2') AND saldo('MERCADO PAGO — RECEBIMENTOS')=39.40);
RESET ROLE; UPDATE financeiro_hml.plano_contas SET aceita_lancamentos=true WHERE codigo='R1'; SET ROLE authenticated;
-- 12. Permissões
SELECT como(3);
SELECT ok('31 consulta lê conferências', (SELECT count(*)>0 FROM financeiro_hml.tesouraria_conferencias));
SELECT ok('32 consulta não cadastra', falha($$INSERT INTO financeiro_hml.tesouraria_conferencias(referencia_origem,natureza,forma,data_ocorrencia,descricao,valor_bruto) VALUES ('T|X','entrada','pix','2026-09-05','X LOCAL',1)$$,'42501|row-level')='OK');
SELECT ok('33 consulta não lança', falha($$SELECT financeiro_hml.tesouraria_lancar_conferencia(jsonb_build_object('id',(SELECT id FROM financeiro_hml.tesouraria_conferencias WHERE referencia_origem='T|MIX|2')))$$,'TES_PERMISSAO')='OK');
SELECT ok('34 ninguém exclui conferência', falha($$DELETE FROM financeiro_hml.tesouraria_conferencias WHERE referencia_origem='T|DIN'$$,'42501')='OK');
SELECT ok('35 contas preparadas não editáveis diretamente', falha($$UPDATE financeiro_hml.contas_preparadas SET situacao='pendente_abertura'$$,'42501')='OK');
RESET ROLE; SET ROLE anon;
SELECT ok('36 anônimo sem acesso', public.falha($$SELECT count(*) FROM financeiro_hml.tesouraria_conferencias$$,'42501')='OK');
RESET ROLE;
-- 13. Auditoria
SELECT ok('37 auditoria registra responsável, data e alteração', (SELECT count(*) FROM financeiro_hml.auditoria WHERE tabela='tesouraria_conferencias' AND usuario_id IS NOT NULL AND criado_em IS NOT NULL)>=10 AND EXISTS(SELECT 1 FROM financeiro_hml.auditoria WHERE tabela='contas_preparadas' AND acao='alterar'));
SELECT ok('38 entradas preservadas na origem', (SELECT count(*)=0 FROM financeiro_hml.tesouraria_conferencias WHERE criado_por IS NULL));
SELECT n, teste, ok, detalhe FROM public.resultado ORDER BY n;
SELECT count(*) FILTER (WHERE ok) AS aprovados, count(*) AS total FROM public.resultado;
