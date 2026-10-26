-- TESTES LOCAIS DESCARTÁVEIS DA M4 (integração GESTÃO ITV). Nunca executar no HML.
\set ON_ERROR_STOP 1
SET client_min_messages = warning;
INSERT INTO auth.users VALUES ('a0000000-0000-4000-8000-000000000001'),('a0000000-0000-4000-8000-000000000002'),('a0000000-0000-4000-8000-000000000003');
INSERT INTO financeiro_hml.perfis(usuario_id,papel) VALUES ('a0000000-0000-4000-8000-000000000001','admin_geral'),('a0000000-0000-4000-8000-000000000002','analista_financeiro'),('a0000000-0000-4000-8000-000000000003','consulta_gerencial');
CREATE TABLE public.resultado(n serial, teste text, ok boolean, detalhe text);
GRANT ALL ON public.resultado, public.resultado_n_seq TO authenticated, anon;
CREATE FUNCTION public.como(u int) RETURNS void LANGUAGE sql AS $$ SELECT set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-00000000000'||u,false) $$;
CREATE FUNCTION public.falha(q text, padrao text) RETURNS text LANGUAGE plpgsql AS $$
BEGIN EXECUTE q; RETURN 'SEM ERRO'; EXCEPTION WHEN OTHERS THEN IF SQLERRM ~ padrao OR SQLSTATE ~ padrao THEN RETURN 'OK'; END IF; RETURN SQLSTATE||' '||SQLERRM; END $$;
CREATE FUNCTION public.ok(t text, cond boolean, det text DEFAULT '') RETURNS void LANGUAGE sql AS $$ INSERT INTO public.resultado(teste,ok,detalhe) VALUES (t,cond,det) $$;
GRANT EXECUTE ON FUNCTION public.como(int), public.falha(text,text), public.ok(text,boolean,text) TO authenticated;
CREATE FUNCTION public.sync_admin() RETURNS uuid LANGUAGE sql SECURITY DEFINER AS $$
  SELECT financeiro_hml.integracao_iniciar() $$;
CREATE FUNCTION public.item(ref text) RETURNS financeiro_hml.integracao_itens LANGUAGE sql SECURITY DEFINER AS $$
  SELECT * FROM financeiro_hml.integracao_itens WHERE referencia_origem=ref $$;
CREATE FUNCTION public.confs() RETURNS int LANGUAGE sql SECURITY DEFINER AS $$
  SELECT count(*)::int FROM financeiro_hml.tesouraria_conferencias $$;
CREATE FUNCTION public.movs() RETURNS int LANGUAGE sql SECURITY DEFINER AS $$
  SELECT count(*)::int FROM financeiro_hml.tesouraria_movimentos $$;
GRANT EXECUTE ON FUNCTION public.sync_admin(), public.item(text), public.confs(), public.movs() TO authenticated;

SET ROLE authenticated;
-- 1. Permissões
SELECT como(2);
SELECT ok('01 analista não inicia sincronização', falha($$SELECT financeiro_hml.integracao_iniciar()$$,'INT_PERMISSAO')='OK');
SELECT como(3);
SELECT ok('02 consulta não inicia sincronização', falha($$SELECT financeiro_hml.integracao_iniciar()$$,'INT_PERMISSAO')='OK');
SELECT como(1);
SELECT ok('03 admin inicia e fica em andamento', (SELECT status='em_andamento' AND responsavel_id='a0000000-0000-4000-8000-000000000001' FROM financeiro_hml.integracao_sincronizacoes WHERE id=public.sync_admin()));

-- 2. Sincronização com pagamento simples, misto, cartão, boleto e título em aberto
WITH s AS (SELECT public.sync_admin() AS id)
SELECT financeiro_hml.integracao_concluir(jsonb_build_object('id',(SELECT id FROM s),'status','concluida','itens',jsonb_build_array(
  jsonb_build_object('referencia','gestao_itv:caixa_pagamentos:p1','tipo','pagamento','canonico','p1|2026-09-08|150.00|pix',
    'resumo',jsonb_build_object('data','2026-09-08','valor_bruto','150.00','forma','pix','descricao','OS 100 · CLIENTE A','contexto','Lançamento L1 · servicos')),
  jsonb_build_object('referencia','gestao_itv:caixa_pagamentos:p2a','tipo','pagamento','canonico','p2a|2026-09-08|200.00|dinheiro',
    'resumo',jsonb_build_object('data','2026-09-08','valor_bruto','200.00','forma','dinheiro','descricao','OS 101 · CLIENTE B','contexto','Lançamento L2 (misto 1/2)')),
  jsonb_build_object('referencia','gestao_itv:caixa_pagamentos:p2b','tipo','pagamento','canonico','p2b|2026-09-08|300.00|credito',
    'resumo',jsonb_build_object('data','2026-09-08','valor_bruto','300.00','valor_liquido','291.00','forma','credito','descricao','OS 101 · CLIENTE B','contexto','Lançamento L2 (misto 2/2)')),
  jsonb_build_object('referencia','gestao_itv:contas_receber_recebimentos:r1','tipo','recebimento_titulo','canonico','r1|2026-09-10|500.00|boleto',
    'resumo',jsonb_build_object('data','2026-09-10','valor_bruto','500.00','forma','boleto','descricao','OS 102 · EMPRESA C','boleto_vencimento','2026-09-10','contexto','Título T1 · boleto')),
  jsonb_build_object('referencia','gestao_itv:contas_receber:t2','tipo','titulo_aberto','canonico','t2|2026-10-01|700.00',
    'resumo',jsonb_build_object('data','2026-10-01','valor_bruto','700.00','forma','indefinida','descricao','OS 103 · EMPRESA D','contexto','Título em aberto'))
))) ->> 'status' = 'concluida' AS sinc1;

SELECT ok('04 quatro recebimentos viram conferências pendentes', public.confs()=4 AND (SELECT count(*)=4 FROM financeiro_hml.tesouraria_conferencias WHERE status='pendente' AND referencia_origem LIKE 'gestao_itv:%'));
SELECT ok('05 título em aberto não vira conferência', (SELECT situacao='novo' AND conferencia_id IS NULL FROM public.item('gestao_itv:contas_receber:t2')));
SELECT ok('06 pagamento misto gera duas conferências distintas', (SELECT count(*)=2 FROM financeiro_hml.tesouraria_conferencias WHERE referencia_origem IN ('gestao_itv:caixa_pagamentos:p2a','gestao_itv:caixa_pagamentos:p2b')));
SELECT ok('07 cartão preserva líquido e taxa calculada', (SELECT valor_liquido=291.00 AND taxa=9.00 FROM financeiro_hml.tesouraria_conferencias WHERE referencia_origem='gestao_itv:caixa_pagamentos:p2b'));
SELECT ok('08 boleto registrado como pago na data do recebimento', (SELECT boleto_status='pago' AND boleto_pagamento='2026-09-10' AND boleto_vencimento='2026-09-10' FROM financeiro_hml.tesouraria_conferencias WHERE referencia_origem='gestao_itv:contas_receber_recebimentos:r1'));
SELECT ok('09 sincronização não gera movimentação financeira', public.movs()=0);
SELECT ok('10 contadores da sincronização', (SELECT consultados=5 AND novos=5 AND enviados_conferencia=4 AND divergentes=0 FROM financeiro_hml.integracao_sincronizacoes ORDER BY iniciado_em DESC LIMIT 1));

-- 3. Idempotência: mesma sincronização repetida
WITH s AS (SELECT public.sync_admin() AS id)
SELECT financeiro_hml.integracao_concluir(jsonb_build_object('id',(SELECT id FROM s),'status','concluida','itens',jsonb_build_array(
  jsonb_build_object('referencia','gestao_itv:caixa_pagamentos:p1','tipo','pagamento','canonico','p1|2026-09-08|150.00|pix',
    'resumo',jsonb_build_object('data','2026-09-08','valor_bruto','150.00','forma','pix','descricao','OS 100 · CLIENTE A','contexto','Lançamento L1 · servicos'))
))) ->> 'status' = 'concluida' AS sinc2;
SELECT ok('11 repetição não duplica conferência', public.confs()=4 AND (SELECT existentes=1 AND novos=0 FROM financeiro_hml.integracao_sincronizacoes ORDER BY iniciado_em DESC LIMIT 1));

-- 4. Conclusão repetida do mesmo id não reprocessa
SELECT ok('12 concluir de novo é repetida', (SELECT (financeiro_hml.integracao_concluir(jsonb_build_object('id',id,'status','concluida','itens','[]'::jsonb)))->>'repetida'='true' FROM financeiro_hml.integracao_sincronizacoes ORDER BY iniciado_em DESC LIMIT 1) AND public.confs()=4);

-- 5. Divergência: conteúdo alterado na origem
WITH s AS (SELECT public.sync_admin() AS id)
SELECT financeiro_hml.integracao_concluir(jsonb_build_object('id',(SELECT id FROM s),'status','concluida','itens',jsonb_build_array(
  jsonb_build_object('referencia','gestao_itv:caixa_pagamentos:p1','tipo','pagamento','canonico','p1|2026-09-08|180.00|pix',
    'resumo',jsonb_build_object('data','2026-09-08','valor_bruto','180.00','forma','pix','descricao','OS 100 · CLIENTE A','contexto','Lançamento L1 · servicos'))
))) ->> 'status' = 'concluida' AS sinc3;
SELECT ok('13 alteração na origem marca divergência sem tocar na conferência', (SELECT situacao='alterado' FROM public.item('gestao_itv:caixa_pagamentos:p1')) AND (SELECT valor_bruto=150.00 FROM financeiro_hml.tesouraria_conferencias WHERE referencia_origem='gestao_itv:caixa_pagamentos:p1'));

-- 6. Cruzamento com a planilha (referência CONTROLE_CAIXA)
INSERT INTO financeiro_hml.tesouraria_conferencias(referencia_origem,natureza,forma,data_ocorrencia,descricao,valor_bruto)
 VALUES ('CONTROLE_CAIXA_2026|SETEMBRO 24 - CAIXA|F47','entrada','pix','2026-09-08','VENDA',150.00);
WITH s AS (SELECT public.sync_admin() AS id)
SELECT financeiro_hml.integracao_concluir(jsonb_build_object('id',(SELECT id FROM s),'status','concluida','itens',jsonb_build_array(
  jsonb_build_object('referencia','gestao_itv:caixa_pagamentos:p9','tipo','pagamento','canonico','p9|2026-09-08|150.00|pix',
    'resumo',jsonb_build_object('data','2026-09-08','valor_bruto','150.00','forma','pix','descricao','OS 200 · CLIENTE PLANILHA','contexto','Lançamento L9')),
  jsonb_build_object('referencia','gestao_itv:caixa_pagamentos:p10','tipo','pagamento','canonico','p10|2026-09-08|150.00|dinheiro',
    'resumo',jsonb_build_object('data','2026-09-08','valor_bruto','150.00','forma','dinheiro','descricao','OS 201 · MESMO VALOR OUTRA FORMA','contexto','Lançamento L10'))
))) ->> 'status' = 'concluida' AS sinc4;
SELECT ok('14 mesmo valor/data/forma da planilha é retido para revisão, sem conferência', (SELECT situacao='possivel_duplicidade' AND conferencia_id IS NULL AND duplicidade_candidata_id IS NOT NULL FROM public.item('gestao_itv:caixa_pagamentos:p9')));
SELECT ok('15 mesmo valor e data com forma diferente NÃO é duplicidade', (SELECT situacao='enviado_conferencia' AND conferencia_id IS NOT NULL FROM public.item('gestao_itv:caixa_pagamentos:p10')));

-- 7. Falha registrada
WITH s AS (SELECT public.sync_admin() AS id)
SELECT financeiro_hml.integracao_concluir(jsonb_build_object('id',(SELECT id FROM s),'status','falha','erros',jsonb_build_array(jsonb_build_object('etapa','leitura_origem')))) ->> 'status' = 'falha' AS sinc5;
SELECT ok('16 falha registrada com erros', (SELECT status='falha' AND erros IS NOT NULL AND concluido_em IS NOT NULL FROM financeiro_hml.integracao_sincronizacoes ORDER BY iniciado_em DESC LIMIT 1));

-- 8. Leitura por perfis e isolamento de escrita
SELECT como(3);
SELECT ok('17 consulta gerencial lê itens e sincronizações', (SELECT count(*) > 0 FROM financeiro_hml.integracao_itens) AND (SELECT count(*) > 0 FROM financeiro_hml.integracao_sincronizacoes));
SELECT ok('18 perfis não escrevem itens diretamente', falha($$INSERT INTO financeiro_hml.integracao_itens(referencia_origem,tipo,conteudo_hash,resumo,situacao) VALUES ('x','pagamento','h','{}','novo')$$,'42501')='OK');
RESET ROLE;
SELECT ok('19 anon não lê itens', (SELECT count(*)=0 FROM financeiro_hml.integracao_itens));
SELECT ok('20 auditoria registrou sincronizações e itens', (SELECT count(*) > 0 FROM financeiro_hml.auditoria WHERE tabela IN ('integracao_sincronizacoes','integracao_itens')));
SELECT ok('21 nenhuma movimentação financeira em toda a suíte', public.movs()=0);

TABLE public.resultado;
