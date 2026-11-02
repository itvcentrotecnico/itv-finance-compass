-- PREPARADO; NAO EXECUTADO. SOMENTE LEITURA, projeto ayjppexbzpgdkzbehvzw.
-- Conferir projeto no painel/conexao: current_database()=postgres NAO identifica projeto.
-- Executar arquivo completo apenas em etapa posteriormente autorizada; guardar resultado protegido.
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
-- Correspondencia por codigo E descricao/natureza/pai/aceite; NAO define allowlist no motor.
WITH esperadas(codigo,descricao,natureza,pai) AS (VALUES
 ('1.01','Conserto de televisores','receita','1'),
 ('1.02','Venda de televisores','receita','1'),
 ('1.03','Serviços técnicos especializados','receita','1'),
 ('1.04','Venda de acessórios','receita','1'),
 ('1.05','Reparo de telas COF','receita','1'),
 ('1.06','Outras receitas operacionais','receita','1'),
 ('2.01','Compra de peças','despesa','2'),
 ('2.02','Folha de pagamento','despesa','2'),
 ('2.03','Comissões','despesa','2'),
 ('2.04','Aluguel e estrutura','despesa','2'),
 ('2.05','Transporte e logística','despesa','2'),
 ('2.06','Marketing','despesa','2'),
 ('2.07','Despesas administrativas','despesa','2'),
 ('2.08','Outras despesas operacionais','despesa','2')),
 conferidas AS (SELECT e.codigo,e.descricao esperada,c.id uuid,c.descricao,c.natureza,c.ativo,c.aceita_lancamentos,p.codigo codigo_pai,
 coalesce(c.id IS NOT NULL AND c.descricao=e.descricao AND c.natureza=e.natureza AND c.ativo AND c.aceita_lancamentos AND p.codigo=e.pai AND p.ativo AND NOT p.aceita_lancamentos AND p.natureza=e.natureza AND p.conta_pai_id IS NULL AND p.descricao=CASE e.pai WHEN '1' THEN 'RECEITAS OPERACIONAIS' ELSE 'DESPESAS OPERACIONAIS' END,false) conforme
 FROM esperadas e LEFT JOIN financeiro_hml.plano_contas c ON c.codigo=e.codigo LEFT JOIN financeiro_hml.plano_contas p ON p.id=c.conta_pai_id)
SELECT jsonb_build_object('esperadas',14,'localizadas',count(uuid),'conformes',count(*) FILTER(WHERE conforme),'categorias',jsonb_agg(to_jsonb(c) ORDER BY codigo)) AS categorias_oficiais FROM conferidas c;
-- So transcrever os 14 UUIDs ao manifesto APOS todas correspondencias aprovadas.

ROLLBACK;
