# Análise — Administrador Geral + Operador Financeiro (03/11/2026)

Status: ANÁLISE. Nada executado, aplicado ou publicado.

## 1. Perfil compatível já existente
`analista_financeiro` (Analista Financeiro) já existe e atende o operador:
- Não administra usuários nem perfis (somente `admin_geral` escreve em `perfis`).
- Não altera Plano de Contas nem contas internas.
- Não acessa Usuários, Integrações nem Configurações.
- Lê lançamentos e históricos.
- Divergência: hoje pode criar/editar Centros de Custo (RLS). Decisão pendente: manter ou restringir.

## 2. Incompatibilidades da V2.2 (proposta, não aplicada)
1. Manifesto exige 2 responsáveis com papel `admin_geral`/`admin_financeiro` (linha 45).
2. Motor e intermediário aceitam apenas esses papéis (linhas 62 e 106).
3. Interface: `can()` só libera "novo lançamento" para administradores.
4. Lista positiva de permissões congela edição de perfis, categorias e centros de custo.

## 3. Menor adaptação (nova versão V2.2.1, V2.2 preservada)
- Manifesto: `administrador` (1 UUID `admin_geral` ativo) + `operador` (1 UUID `analista_financeiro` ativo), distintos.
- Motor/intermediário: aceitar somente esses dois UUIDs do manifesto, cada um com seu papel ativo atual.
- Instalação: executada pelo administrador.
- Lista positiva: manter UPDATE/INSERT em `perfis`, `plano_contas` e `centros_custo` com RLS atual (RLS limita a admin_geral). Sem congelamento.
- Interface: liberar "novo lançamento" ao analista apenas quando a sonda V2.2.1 confirmar o contrato.
- Sem novas tabelas, abas ou funções; mesmos testes isolados mais casos do operador
  (registra; não altera perfis/categorias; terceiro analista recusado; papel trocado recusado).

## 4. Cadastro seguro do segundo usuário
1. Administrador Geral entra no ITV FINANCEIRO → Usuários → Convidar, com o e-mail do funcionário e o perfil Analista Financeiro.
2. Funcionário define a senha pelo link oficial (domínio publicado).
3. Nenhum acesso a Supabase, Lovable ou código: só login no aplicativo.
4. Rodar novamente a consulta 01 para obter os 2 UUIDs do manifesto.
5. Desativação futura: Administrador Geral desativa o perfil; motor recusa na hora.

## 5. Decisões necessárias
- A. Aprovar a V2.2.1 (preparação e testes locais).
- B. Centros de Custo: o operador pode editar ou fica só leitura?
