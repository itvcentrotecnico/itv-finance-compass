# ITV FINANCEIRO — requisitos de autenticação (Etapa 03)

**Estado:** especificação; sem credenciais, banco ou mudanças em produção.

## Política de acesso
- Bloquear rotas e endpoints financeiros para usuários não autenticados. Ocultar menus não é controle de acesso.
- Aplicar autorização por ação no servidor e RLS no banco.
- Papéis: administrador geral, administrador financeiro, analista financeiro, consulta gerencial.
- Negar por padrão; conceder somente o necessário. Separar acesso a folha/salários, conciliação, pagamento e cadastro de usuários.
- Contas individuais, sem credenciais compartilhadas; registrar operações financeiras e alterações de perfil.
- Nenhuma chave de serviço no navegador; segredos no backend.

## Antes de ativar
1. Confirmar o provedor de autenticação e o ambiente de homologação isolado.
2. Definir fluxo de criação, revogação e recuperação de usuários.
3. Auditar tabelas e RPCs do GESTÃO ITV antes de qualquer conexão.
4. Escrever testes de acesso anônimo, consulta, analista e administrador.
5. Validar logs de auditoria, estornos e backups.

## Restrições
Não conectar o banco operacional, não criar usuários reais nem habilitar operações de pagamento até aprovação da arquitetura e testes de segurança.
