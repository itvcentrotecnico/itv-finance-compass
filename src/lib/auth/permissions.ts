/**
 * Modelo de perfis e permissões do ITV FINANCEIRO.
 * A autoridade é o banco (RLS em financeiro_hml). Esta matriz apenas espelha
 * as regras para ocultar menus e botões na interface.
 */
export type Role = "admin_geral" | "admin_financeiro" | "analista_financeiro" | "consulta_gerencial";

export const ROLES: Role[] = ["admin_geral", "admin_financeiro", "analista_financeiro", "consulta_gerencial"];

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

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as string[]).includes(value);
}

/** Tabelas do esquema financeiro_hml — espelho exato das políticas RLS (migração M1). */
export type TableKey = "perfis" | "plano_contas" | "centros_custo" | "contas_financeiras";
export type TableAction = "read" | "create" | "update" | "delete";

const TABLE_WRITERS: Record<TableKey, Role[]> = {
  perfis: ["admin_geral"],
  plano_contas: ["admin_geral", "admin_financeiro"],
  centros_custo: ["admin_geral", "admin_financeiro", "analista_financeiro"],
  contas_financeiras: ["admin_geral", "admin_financeiro"],
};

export function canTable(role: Role | null, table: TableKey, action: TableAction): boolean {
  if (!role) return false;
  if (action === "delete") return false; // nenhuma exclusão física pelo aplicativo
  if (action === "read") return table === "perfis" ? role === "admin_geral" : true; // perfis: demais só o próprio
  return TABLE_WRITERS[table].includes(role);
}

const READ_ONLY_MODULES: ModuleKey[] = ["dashboard", "indicadores", "relatorios", "dre", "fluxo_caixa"];
const ADMIN_ONLY: ModuleKey[] = ["usuarios", "integracoes", "configuracoes"];
const STRUCTURE: ModuleKey[] = ["plano_contas"];

export function can(role: Role, module: ModuleKey, action: Action): boolean {
  if (module === "tesouraria") {
    if (action === "view") return true;
    if (action === "delete" || action === "update" || action === "approve") return false;
    return role !== "consulta_gerencial";
  }
  switch (role) {
    case "admin_geral":
      return true;
    case "admin_financeiro":
      if (ADMIN_ONLY.includes(module)) return action === "view" && module !== "usuarios";
      return true;
    case "analista_financeiro":
      if (ADMIN_ONLY.includes(module)) return false;
      if (action === "approve" || action === "delete") return false;
      if (STRUCTURE.includes(module)) return action === "view";
      return true;
    case "consulta_gerencial":
      if (module === "plano_contas" || module === "centros_custo") return action === "view";
      return action === "view" && READ_ONLY_MODULES.includes(module);
  }
}
