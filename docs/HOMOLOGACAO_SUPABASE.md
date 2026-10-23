# Homologação Supabase — isolamento obrigatório

## Estado desta entrega
Esta PR contém **SQL versionado, não executado**. Nenhum projeto Supabase foi criado, nenhuma credencial foi configurada e nenhuma aplicação foi conectada.

## Procedimento seguro
1. Criar um projeto Supabase **novo** para ITV FINANCEIRO HML, sem reutilizar o projeto do GESTÃO ITV.
2. Utilizar exclusivamente dados fictícios e usuários de teste.
3. Revisar o SQL em `supabase/homologacao/001_schema_fechado.sql` e aplicar somente no projeto HML.
4. Confirmar que o schema `financeiro_hml` **não** está na lista de schemas expostos pela Data API.
5. Testar que `anon` e `authenticated` não conseguem ler, inserir, alterar ou apagar nenhuma tabela.
6. Somente depois implementar políticas específicas por papel e operações mediadas por backend.
7. Nunca colocar `service_role`, URL de produção ou segredos em código frontend.

## Restrições atuais
- RLS está habilitada e forçada, sem policies, e permissões públicas foram revogadas.
- Não existem rotas, RPCs ou endpoints de escrita financeira.
- O gatilho de auditoria está definido, mas **não ativado**, até a revisão dos privilégios necessários.
- A hierarquia do plano de contas ainda exige validação de ciclos no backend/banco antes da operação real.
- Não executar este script no banco operacional, nem habilitar conexão entre projetos.
