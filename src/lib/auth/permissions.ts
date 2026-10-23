/**
 * Modelo de perfis e permissões do ITV FINANCEIRO.
 * Este arquivo define a matriz de referência. A aplicação efetiva deve ocorrer
 * no backend/banco (RLS) quando a autenticação for ativada — a interface
 * apenas espelha estas regras.
 */
export type Role = "admin_geral" | "admin_financeiro" | "analista_financeiro" | "consulta_gerencial";

export type Action = "view" | "create" | "update" | "delete" | "approve";

export type ModuleKey =
  | "dashboard" | "indicadores" | "relatorios"
  | "tesouraria" | "contas_pagar" | "contas_receber" | "despesas" | "conciliacao"
  | "folha" | "comissoes" | "tributos" | "financiamentos"
  | "dre" | "fluxo_caixa" | "planejamento" | "projetos"
  | "plano_contas" | "centros_custo" | "fornecedores" | "usuarios" | "integracoes" | "configuracoes";

export const ROLE_LABELS: Record<Role, string> = {
  admin_geral: "Administrador Geral",
  admin_financeiro: "Administrador Financeiro",
  analista_financeiro: "Analista Financeiro",
  consulta_gerencial: "Consulta Gerencial",
};

const READ_ONLY_MODULES: ModuleKey[] = ["dashboard", "indicadores", "relatorios", "dre", "fluxo_caixa"];
const ADMIN_ONLY: ModuleKey[] = ["usuarios", "integracoes", "configuracoes"];

export function can(role: Role, module: ModuleKey, action: Action): boolean {
  switch (role) {
    case "admin_geral":
      return true;
    case "admin_financeiro":
      if (ADMIN_ONLY.includes(module)) return action === "view" && module !== "usuarios";
      return true;
    case "analista_financeiro":
      if (ADMIN_ONLY.includes(module)) return false;
      if (action === "approve" || action === "delete") return false;
      return true;
    case "consulta_gerencial":
      return action === "view" && READ_ONLY_MODULES.includes(module);
  }
}
