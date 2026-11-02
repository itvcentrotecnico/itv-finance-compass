import { describe, it, expect } from "vitest";
import { intervalo, normalizarValor, resumir, hojeManaus, dinheiro } from "./lancamentos";
import type { OperacaoHistorico } from "./tesouraria";

const op = (id: string, tipo: OperacaoHistorico["tipo"], valor: string, estornada = false) => ({ id, tipo, valor, estornada } as OperacaoHistorico);

describe("lançamentos", () => {
  it("indicadores ignoram aberturas, transferências, estornos, estornadas e duplicidades", () => {
    const r = resumir([op("a", "abertura", "1000.00"), op("t", "transferencia", "50.00"), op("e", "estorno", "5.00"), op("1", "entrada", "100.10"), op("1", "entrada", "100.10"), op("2", "saida", "30.05"), op("3", "entrada", "999.99", true)]);
    expect(r).toEqual({ receitas: "100.10", despesas: "30.05", resultado: "70.05", quantidade: 2 });
  });
  it("resultado negativo é exato", () => { expect(resumir([op("1", "saida", "0.10"), op("2", "entrada", "0.03")]).resultado).toBe("-0.07"); });
  it("soma e formata agregados acima do limite individual sem perder centavos", () => {
    const r = resumir([op("1", "entrada", "9999999999999999.99"), op("2", "entrada", "9999999999999999.99")]);
    expect(r.receitas).toBe("19999999999999999.98");
    expect(dinheiro(r.receitas)).toBe("R$ 19.999.999.999.999.999,98");
    expect(dinheiro("-19999999999999999.98")).toBe("−R$ 19.999.999.999.999.999,98");
  });
  it("valor em formato brasileiro", () => {
    expect(normalizarValor("R$ 1.234,56")).toBe("1234.56");
    expect(normalizarValor("10,5")).toBe("10.50");
    expect(normalizarValor("1.000")).toBe("1000.00");
    expect(() => normalizarValor("-5,00")).toThrow();
  });
  it("períodos no calendário", () => {
    expect(intervalo("mes_anterior", "2026-01-15")).toEqual({ inicio: "2025-12-01", fim: "2025-12-31" });
    expect(intervalo("7dias", "2026-11-02")).toEqual({ inicio: "2026-10-27", fim: "2026-11-02" });
    expect(intervalo("mes", "2026-02-10")).toEqual({ inicio: "2026-02-01", fim: "2026-02-28" });
    expect(hojeManaus(new Date("2026-11-02T02:00:00Z"))).toBe("2026-11-01");
  });
});
