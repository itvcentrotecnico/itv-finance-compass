-- Reversão de implantação NÃO é restauração de privilégios vulneráveis.
-- Mesmo procedimento de retomada seletiva para ACLs temporárias somente.
-- NÃO DROP de controles, vínculos, auditoria, funções, contas ou históricos.
-- Definições antigas: exigem captura real e migração corretiva separada aprovada.
-- Sem captura atual, este pacote NÃO promete reversão funcional completa.
\ir RETOMADA_SELETIVA_PREPARADA.sql