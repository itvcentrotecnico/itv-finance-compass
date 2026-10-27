-- Correção M5 exclusivamente no Supabase HML ayjppexbzpgdkzbehvzw.
-- Permite resolver as RPCs já autorizadas no esquema; não concede CREATE,
-- privilégios de tabelas, acesso anônimo ou permissões a perfis de usuário.
-- Não executa nenhuma RPC de sincronização e não altera dados financeiros.
GRANT USAGE ON SCHEMA financeiro_hml TO service_role;