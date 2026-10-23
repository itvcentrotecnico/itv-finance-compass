import { describe, expect, it } from "vitest";
import { FinanceSandbox } from "./sandbox";

const a = "11111111-1111-4111-8111-111111111111";
const b = "22222222-2222-4222-8222-222222222222";
const account = (id: string, codigo: string, parent: string | null = null, aceita = true) =>
  ({ id, codigo, descricao: "Conta de teste", natureza: "receita", conta_pai_id: parent, aceita_lancamentos: aceita, ativo: true });

describe("homologação isolada em memória", () => {
  it("cadastra e lista sem acessar serviços externos", () => {
    const db = new FinanceSandbox();
    db.addChartAccount(account(a, "1", null, false));
    db.addChartAccount(account(b, "1.1", a));
    expect(db.listChartAccounts()).toHaveLength(2);
  });
  it("rejeita código duplicado e hierarquia inválida", () => {
    const db = new FinanceSandbox();
    db.addChartAccount(account(a, "1"));
    expect(() => db.addChartAccount(account(b, "1"))).toThrow();
    expect(() => db.addChartAccount(account(b, "2", a))).toThrow();
  });
  it("não expõe referências mutáveis do armazenamento", () => {
    const db = new FinanceSandbox();
    db.addChartAccount(account(a, "1"));
    const item = db.listChartAccounts()[0]!;
    item.descricao = "Alterada externamente";
    expect(db.listChartAccounts()[0]!.descricao).toBe("Conta de teste");
  });
  it("reinicializa os registros e não os persiste", () => {
    const db = new FinanceSandbox();
    db.addCostCenter({ id: a, codigo: "LAB", descricao: "Laboratório", responsavel: null, ativo: true });
    db.addFinancialAccount({ id: b, nome: "Caixa de teste", tipo: "caixa", moeda: "BRL",
      saldo_inicial_centavos: 0, data_saldo_inicial: "2026-10-23", ativo: true });
    expect(db.listCostCenters()).toHaveLength(1);
    db.reset();
    expect(db.listCostCenters()).toHaveLength(0);
    expect(db.listFinancialAccounts()).toHaveLength(0);
  });
});
