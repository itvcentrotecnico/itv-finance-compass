import { describe, it, expect, vi } from "vitest";
vi.mock("@/lib/auth/session", () => ({ fin: () => ({}) }));
import { validarCadastro, traduzirErro, descendentes, montarArvore, podeVerAuditoria, type Conta } from "./cadastros";
import { canTable } from "./auth/permissions";

const c = (id: string, codigo: string, pai: string | null = null): Conta => ({
  id, codigo, descricao: "x", natureza: "despesa", conta_pai_id: pai, aceita_lancamentos: true, ativo: true, criado_em: "", atualizado_em: null,
});

describe("validação de cadastro", () => {
  it("recusa código com espaço e acima de 32 caracteres", () => {
    expect(validarCadastro({ codigo: "3 1", descricao: "Ok" }).codigo).toBeDefined();
    expect(validarCadastro({ codigo: "a".repeat(33), descricao: "Ok" }).codigo).toBeDefined();
  });
  it("exige descrição entre 2 e 160 caracteres", () => {
    expect(validarCadastro({ codigo: "A1", descricao: "x" }).descricao).toBeDefined();
    expect(validarCadastro({ codigo: "A1", descricao: "x".repeat(161) }).descricao).toBeDefined();
    expect(validarCadastro({ codigo: "3.1.01", descricao: "Despesas" })).toEqual({});
  });
});

describe("mensagens de erro do banco", () => {
  it("traduz duplicidade, permissão e hierarquia", () => {
    expect(traduzirErro({ code: "23505" })).toBe("Já existe um registro com este código.");
    expect(traduzirErro({ code: "42501" })).toBe("Seu perfil não tem permissão para esta operação.");
    expect(traduzirErro({ message: "PC_FILHAS_ATIVAS: x" })).toBe("Inative primeiro as contas-filhas ativas.");
  });
});

describe("hierarquia", () => {
  it("uma conta e suas descendentes não podem ser escolhidas como pai", () => {
    const l = [c("1", "1"), c("2", "1.1", "1"), c("3", "1.1.1", "2"), c("4", "2")];
    expect([...descendentes(l, "1")].sort()).toEqual(["1", "2", "3"]);
    expect(montarArvore(l).map((x) => [x.codigo, x.nivel])).toEqual([["1", 0], ["1.1", 1], ["1.1.1", 2], ["2", 0]]);
  });
});

describe("permissões dos cadastros", () => {
  it("Analista gerencia centros de custo mas só lê o plano de contas", () => {
    expect(canTable("analista_financeiro", "centros_custo", "update")).toBe(true);
    expect(canTable("analista_financeiro", "plano_contas", "create")).toBe(false);
  });
  it("Consulta Gerencial não grava em nenhum dos dois", () => {
    expect(canTable("consulta_gerencial", "centros_custo", "create")).toBe(false);
    expect(canTable("consulta_gerencial", "plano_contas", "update")).toBe(false);
  });
  it("auditoria visível só para administradores", () => {
    expect(podeVerAuditoria("admin_financeiro")).toBe(true);
    expect(podeVerAuditoria("analista_financeiro")).toBe(false);
    expect(podeVerAuditoria("consulta_gerencial")).toBe(false);
  });
});
