-- TESTES LOCAIS DESCARTÁVEIS DA M5. Executar após testar_m4_local.sql. Nunca no HML.
\set ON_ERROR_STOP 1
SET client_min_messages = warning;
TRUNCATE public.resultado;
CREATE FUNCTION public.como_servidor() RETURNS void LANGUAGE sql AS $$ SELECT set_config('request.jwt.claim.sub','',false), set_config('request.jwt.claim.role','service_role',false) $$;
CREATE FUNCTION public.como_usuario(u int) RETURNS void LANGUAGE sql AS $$ SELECT set_config('request.jwt.claim.role','authenticated',false), public.como(u) $$;
CREATE FUNCTION public.ultima() RETURNS financeiro_hml.integracao_sincronizacoes LANGUAGE sql SECURITY DEFINER AS $$ SELECT * FROM financeiro_hml.integracao_sincronizacoes ORDER BY iniciado_em DESC LIMIT 1 $$;
CREATE FUNCTION public.em_andamento() RETURNS int LANGUAGE sql SECURITY DEFINER AS $$ SELECT count(*)::int FROM financeiro_hml.integracao_sincronizacoes WHERE status='em_andamento' $$;
CREATE FUNCTION public.envelhecer() RETURNS void LANGUAGE sql SECURITY DEFINER AS $$ UPDATE financeiro_hml.integracao_sincronizacoes SET iniciado_em = iniciado_em - interval '20 minutes' WHERE status='em_andamento' $$;
CREATE FUNCTION public.nitens() RETURNS int LANGUAGE sql SECURITY DEFINER AS $$ SELECT count(*)::int FROM financeiro_hml.integracao_itens $$;
GRANT EXECUTE ON FUNCTION public.como_servidor(), public.como_usuario(int), public.ultima(), public.em_andamento(), public.envelhecer(), public.nitens() TO authenticated, service_role;
GRANT USAGE ON SCHEMA public TO service_role; GRANT ALL ON public.resultado, public.resultado_n_seq TO service_role;
GRANT EXECUTE ON FUNCTION public.ok(text,boolean,text), public.falha(text,text), public.movs(), public.confs() TO service_role;

\set hoje `TZ=America/Manaus date +%F`
\set antes `TZ=America/Manaus date -d '-6 day' +%F`

-- A. Perfis de usuário não acionam a automática
SET ROLE authenticated;
SELECT como_usuario(1);
SELECT ok('01 administrador não aciona a sincronização automática', falha(format($q$SELECT financeiro_hml.integracao_iniciar_automatica(%L,%L)$q$, :'antes', :'hoje'),'42501')='OK');
SELECT como_usuario(2);
SELECT ok('02 analista não aciona a automática', falha(format($q$SELECT financeiro_hml.integracao_iniciar_automatica(%L,%L)$q$, :'antes', :'hoje'),'42501')='OK');
RESET ROLE;
SET ROLE anon;
SELECT ok('03 anônimo não aciona a automática', falha(format($q$SELECT financeiro_hml.integracao_iniciar_automatica(%L,%L)$q$, :'antes', :'hoje'),'42501')='OK');
RESET ROLE;

-- B. Servidor inicia; janela validada
SET ROLE service_role;
SELECT como_servidor();
SELECT ok('04 janela acima de 31 dias recusada', falha($q$SELECT financeiro_hml.integracao_iniciar_automatica('2026-01-01','2026-03-01')$q$,'INT_JANELA_INVALIDA')='OK');
SELECT ok('05 janela no futuro recusada', falha($q$SELECT financeiro_hml.integracao_iniciar_automatica(current_date+5,current_date+6)$q$,'INT_JANELA_INVALIDA')='OK');
SELECT financeiro_hml.integracao_iniciar_automatica(:'antes', :'hoje') AS a1 \gset
SELECT ok('06 servidor inicia execução automática sem responsável humano', (SELECT modo='automatica' AND responsavel_id IS NULL AND janela_inicio=:'antes' AND status='em_andamento' FROM public.ultima()));

-- C. Simultaneidade
SELECT ok('07 segunda automática simultânea é pulada', (financeiro_hml.integracao_iniciar_automatica(:'antes', :'hoje')->>'motivo')='em_andamento');
RESET ROLE;
SET ROLE authenticated;
SELECT como_usuario(1);
SELECT ok('08 manual simultânea é bloqueada', falha($q$SELECT financeiro_hml.integracao_iniciar()$q$,'INT_EM_ANDAMENTO')='OK');
SELECT ok('09 administrador não conclui execução automática', falha(format($q$SELECT financeiro_hml.integracao_concluir(jsonb_build_object('id',%L,'status','concluida','itens','[]'::jsonb))$q$, (:'a1'::jsonb)->>'id'),'42501')='OK');
RESET ROLE;

-- D. Conclusão automática, idempotência
SET ROLE service_role;
SELECT como_servidor();
SELECT financeiro_hml.integracao_concluir(jsonb_build_object('id',(:'a1'::jsonb)->>'id','status','concluida','itens',jsonb_build_array(
  jsonb_build_object('referencia','gestao_itv:caixa_pagamentos:auto1','tipo','pagamento','canonico','auto1|2026-10-20|80.00|pix',
    'resumo',jsonb_build_object('data','2026-10-20','valor_bruto','80.00','forma','pix','contexto','Auto 1')),
  jsonb_build_object('referencia','gestao_itv:caixa_pagamentos:p1','tipo','pagamento','canonico','repetido-da-m4',
    'resumo',jsonb_build_object('data','2026-09-01','valor_bruto','1.00','forma','pix'))
))) ->> 'status' AS c1;
SELECT ok('10 automática concluída e registrada com quantidades', (SELECT status='concluida' AND consultados=2 AND novos=1 AND enviados_conferencia=1 FROM public.ultima()));
SELECT ok('11 repetir conclusão da mesma execução não duplica', (financeiro_hml.integracao_concluir(jsonb_build_object('id',(:'a1'::jsonb)->>'id','status','concluida','itens','[]'::jsonb))->>'repetida')='true');
SELECT ok('12 após concluir no dia, nova automática é pulada', (financeiro_hml.integracao_iniciar_automatica(:'antes', :'hoje')->>'motivo')='ja_concluida_hoje');
RESET ROLE;
SELECT ok('13 alteração na origem detectada sem nova conferência', (SELECT situacao='alterado' FROM public.item('gestao_itv:caixa_pagamentos:p1')));

-- E. Falha e reprocessamento
UPDATE financeiro_hml.integracao_sincronizacoes SET status='falha' WHERE id=((:'a1'::jsonb)->>'id')::uuid; -- simula: a do dia falhou
SET ROLE service_role;
SELECT como_servidor();
SELECT financeiro_hml.integracao_iniciar_automatica(:'antes', :'hoje') AS a2 \gset
SELECT ok('14 após falha, nova tentativa automática é permitida', ((:'a2'::jsonb)->>'pular')='false');
SELECT public.nitens() AS itens_antes \gset
SELECT financeiro_hml.integracao_concluir(jsonb_build_object('id',(:'a2'::jsonb)->>'id','status','concluida','itens',jsonb_build_array(
  jsonb_build_object('referencia','gestao_itv:caixa_pagamentos:auto1','tipo','pagamento','canonico','auto1|2026-10-20|80.00|pix',
    'resumo',jsonb_build_object('data','2026-10-20','valor_bruto','80.00','forma','pix','contexto','Auto 1'))))) ->> 'status' AS c2;
SELECT ok('15 reprocessamento não cria itens nem conferências duplicadas', public.nitens() = :itens_antes AND (SELECT existentes=1 AND novos=0 FROM public.ultima()));
RESET ROLE;

-- F. Execução travada expira e libera
UPDATE financeiro_hml.integracao_sincronizacoes SET iniciado_em = iniciado_em - interval '2 days' WHERE modo='automatica';
SET ROLE service_role; SELECT como_servidor();
SELECT financeiro_hml.integracao_iniciar_automatica(:'antes', :'hoje') AS a3 \gset
RESET ROLE;
SELECT public.envelhecer();
SET ROLE service_role; SELECT como_servidor();
SELECT ok('16 execução travada há mais de 15 min é encerrada como falha e libera nova', (financeiro_hml.integracao_iniciar_automatica(:'antes', :'hoje')->>'pular')='false' AND public.em_andamento()=1);
RESET ROLE;
SELECT ok('17 travada registrada com etapa tempo_esgotado', (SELECT erros @> '[{"etapa":"tempo_esgotado"}]' FROM financeiro_hml.integracao_sincronizacoes WHERE id=((:'a3'::jsonb)->>'id')::uuid));

-- G. Limite de tentativas
UPDATE financeiro_hml.integracao_sincronizacoes SET status='falha' WHERE status='em_andamento';
INSERT INTO financeiro_hml.integracao_sincronizacoes(modo,status) SELECT 'automatica','falha' FROM generate_series(1,4);
SET ROLE service_role; SELECT como_servidor();
SELECT ok('18 mais de 6 tentativas no dia são recusadas', (financeiro_hml.integracao_iniciar_automatica(:'antes', :'hoje')->>'motivo')='limite_tentativas');
RESET ROLE;

-- H. Manual continua funcionando para administradores
SET ROLE authenticated; SELECT como_usuario(1);
SELECT ok('19 sincronização manual de administrador continua disponível', public.sync_admin() IS NOT NULL);
RESET ROLE;
SELECT ok('20 auditoria registra execuções automáticas', (SELECT count(*)>0 FROM financeiro_hml.auditoria WHERE tabela='integracao_sincronizacoes' AND depois->>'modo'='automatica'));
SELECT ok('21 nenhuma movimentação financeira gerada', public.movs()=0);

TABLE public.resultado;
