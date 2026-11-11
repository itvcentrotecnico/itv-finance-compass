import { describe, it, expect } from "vitest";
import { can, canTable } from "./permissions";

describe("permissões por módulo", () => {
  it("Conferência em preparação é visível somente ao par autorizado", () => {
    expect(can("admin_geral", "conferencia_caixa", "view")).toBe(true);
    expect(can("analista_financeiro", "conferencia_caixa", "view")).toBe(true);
    expect(can("admin_financeiro", "conferencia_caixa", "view")).toBe(false);
    expect(can("consulta_gerencial", "conferencia_caixa", "view")).toBe(false);
  });
  it("Conferência em preparação não concede ações de escrita a nenhum perfil", () => {
    for (const role of ["admin_geral", "admin_financeiro", "analista_financeiro", "consulta_gerencial"] as const) {
      for (const action of ["create", "update", "delete", "approve"] as const) expect(can(role, "conferencia_caixa", action)).toBe(false);
    }
  });
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
    expect(canTable("analista_financeiro", "centros_custo", "update")).toBe(false);
    expect(canTable("analista_financeiro", "centros_custo", "create")).toBe(false);
    expect(canTable("admin_financeiro", "centros_custo", "create")).toBe(false);
    expect(canTable("admin_geral", "centros_custo", "update")).toBe(true);
    expect(can("analista_financeiro", "centros_custo", "view")).toBe(true);
    expect(can("analista_financeiro", "centros_custo", "create")).toBe(false);
    expect(can("analista_financeiro", "lancamentos", "create")).toBe(true);
    expect(can("admin_financeiro", "lancamentos", "create")).toBe(false);
    expect(can("analista_financeiro", "plano_contas", "update")).toBe(false);
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
