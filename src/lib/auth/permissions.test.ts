import { describe, it, expect } from "vitest";
import { can } from "./permissions";

describe("permissões", () => {
  it("Administrador Geral tem acesso integral", () => {
    expect(can("admin_geral", "usuarios", "delete")).toBe(true);
  });
  it("Consulta Gerencial só lê indicadores/relatórios", () => {
    expect(can("consulta_gerencial", "relatorios", "view")).toBe(true);
    expect(can("consulta_gerencial", "relatorios", "create")).toBe(false);
    expect(can("consulta_gerencial", "contas_pagar", "view")).toBe(false);
  });
  it("Analista não aprova nem gerencia usuários", () => {
    expect(can("analista_financeiro", "contas_pagar", "approve")).toBe(false);
    expect(can("analista_financeiro", "usuarios", "view")).toBe(false);
  });
});
