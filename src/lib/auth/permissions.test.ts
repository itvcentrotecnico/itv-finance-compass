import { describe, it, expect } from "vitest";
import { can, canTable } from "./permissions";

describe("permissões por módulo", () => {
  it("Administrador Geral tem acesso integral", () => {
    expect(can("admin_geral", "usuarios", "delete")).toBe(true);
  });
  it("Consulta Gerencial só lê", () => {
    expect(can("consulta_gerencial", "relatorios", "view")).toBe(true);
    expect(can("consulta_gerencial", "relatorios", "create")).toBe(false);
    expect(can("consulta_gerencial", "contas_pagar", "view")).toBe(false);
  });
  it("Analista não aprova nem gerencia usuários", () => {
    expect(can("analista_financeiro", "contas_pagar", "approve")).toBe(false);
    expect(can("analista_financeiro", "usuarios", "view")).toBe(false);
  });
  it("Administrador Financeiro não gerencia usuários", () => {
    expect(can("admin_financeiro", "usuarios", "view")).toBe(false);
  });
});

describe("permissões por tabela (espelho do RLS)", () => {
  it("somente Administrador Geral gerencia perfis", () => {
    expect(canTable("admin_geral", "perfis", "update")).toBe(true);
    expect(canTable("admin_financeiro", "perfis", "create")).toBe(false);
    expect(canTable("analista_financeiro", "perfis", "read")).toBe(false);
  });
  it("Analista altera centros de custo mas não o plano de contas nem contas financeiras", () => {
    expect(canTable("analista_financeiro", "centros_custo", "update")).toBe(true);
    expect(canTable("analista_financeiro", "plano_contas", "update")).toBe(false);
    expect(canTable("analista_financeiro", "contas_financeiras", "create")).toBe(false);
  });
  it("Consulta Gerencial lê cadastros e não grava", () => {
    expect(canTable("consulta_gerencial", "plano_contas", "read")).toBe(true);
    expect(canTable("consulta_gerencial", "centros_custo", "create")).toBe(false);
  });
  it("ninguém exclui e sem perfil não há acesso", () => {
    expect(canTable("admin_geral", "plano_contas", "delete")).toBe(false);
    expect(canTable(null, "plano_contas", "read")).toBe(false);
  });
});
