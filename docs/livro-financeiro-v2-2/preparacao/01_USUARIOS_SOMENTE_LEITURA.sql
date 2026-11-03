-- PREPARADO; NAO EXECUTADO. SOMENTE LEITURA, projeto ayjppexbzpgdkzbehvzw.
-- Conferir projeto no painel/conexao: current_database()=postgres NAO identifica projeto.
-- Executar arquivo completo apenas em etapa posteriormente autorizada; guardar resultado protegido.
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
-- Apenas dados de identificacao necessarios; sem senhas, tokens ou metadados Auth.
SELECT jsonb_build_object('capturado_em',clock_timestamp(),'executor',current_user,
 'usuarios',coalesce(jsonb_agg(jsonb_build_object('uuid',coalesce(u.id,p.usuario_id),'email',u.email,'perfil',p.papel,'ativo',p.ativo,'tem_usuario_auth',u.id IS NOT NULL,'tem_perfil',p.usuario_id IS NOT NULL,'email_confirmado',u.email_confirmed_at IS NOT NULL) ORDER BY coalesce(u.id,p.usuario_id)),'[]'::jsonb)) AS inventario_usuarios
FROM auth.users u FULL JOIN financeiro_hml.perfis p ON p.usuario_id=u.id;
-- V2.2.1: selecionar um admin_geral e um analista_financeiro, ambos ativos e confirmados.
-- Usuario Auth sem perfil nao esta apto. perfis.nome não existe no banco inspecionado.

ROLLBACK;
