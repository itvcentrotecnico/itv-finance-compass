import { describe, expect, it } from "vitest";
import {
  chartAccountSchema, costCenterSchema, financialAccountSchema, transferSchema, validIsoDate,
} from "./domain";

const origem = "11111111-1111-4111-8111-111111111111";
const destino = "22222222-2222-4222-8222-222222222222";
const id = "33333333-3333-4333-8333-333333333333";

describe("contratos financeiros", () => {
  it("valida datas reais e rejeita datas impossíveis", () => {
    expect(validIsoDate.safeParse("2026-10-23").success).toBe(true);
    expect(validIsoDate.safeParse("2026-02-30").success).toBe(false);
    expect(validIsoDate.safeParse("2026-13-01").success).toBe(false);
  });
  it("aceita conta contábil bem formada", () => {
    expect(chartAccountSchema.safeParse({
      id, codigo: "3.1", descricao: "Receita de serviços", natureza: "receita",
      conta_pai_id: null, aceita_lancamentos: true, ativo: true,
    }).success).toBe(true);
  });
  it("rejeita código inválido e descrição vazia", () => {
    expect(chartAccountSchema.safeParse({
      id, codigo: "3 1", descricao: "", natureza: "receita",
      conta_pai_id: null, aceita_lancamentos: true, ativo: true,
    }).success).toBe(false);
  });
  it("valida centro de custo", () => {
    expect(costCenterSchema.safeParse({
      id, codigo: "LAB", descricao: "Laboratório", responsavel: null, ativo: true,
    }).success).toBe(true);
  });
  it("impede moeda diferente de BRL e saldo fracionário", () => {
    const base = { id, nome: "Conta corrente", tipo: "banco", moeda: "BRL",
      saldo_inicial_centavos: 12500, data_saldo_inicial: "2026-10-23", ativo: true };
    expect(financialAccountSchema.safeParse(base).success).toBe(true);
    expect(financialAccountSchema.safeParse({ ...base, moeda: "USD" }).success).toBe(false);
    expect(financialAccountSchema.safeParse({ ...base, saldo_inicial_centavos: 1.5 }).success).toBe(false);
  });
  it("aceita transferência entre contas distintas com valor positivo", () => {
    const base = { idempotency_key: id, conta_origem_id: origem,
      conta_destino_id: destino, valor_centavos: 10000, data_operacao: "2026-10-23" };
    expect(transferSchema.safeParse(base).success).toBe(true);
    expect(transferSchema.safeParse({ ...base, conta_destino_id: origem }).success).toBe(false);
    expect(transferSchema.safeParse({ ...base, valor_centavos: 0 }).success).toBe(false);
    expect(transferSchema.safeParse({ ...base, valor_centavos: 1.1 }).success).toBe(false);
    expect(transferSchema.safeParse({ ...base, idempotency_key: "qualquer" }).success).toBe(false);
  });
});
