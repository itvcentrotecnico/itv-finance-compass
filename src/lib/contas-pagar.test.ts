import { describe, expect, it } from "vitest";
import { centavosParaDecimal, chaveEstavel, exibirDocumento, referenciaDocumento } from "./contas-pagar";

describe("Contas a Pagar — referência", () => {
  it("1323 e OS 1323 viram a mesma OS", () => {
    expect(referenciaDocumento("os", "1323")).toBe("externo:os-1323");
    expect(referenciaDocumento("os", " OS 1323 ")).toBe("externo:os-1323");
  });
  it("fatura sem OS não exige prefixo técnico", () => {
    expect(referenciaDocumento("fatura", "55 A")).toBe("externo:fatura-55-a");
    expect(exibirDocumento("externo:fatura-55-a")).toBe("Fatura 55-A");
    expect(exibirDocumento("externo:os-01323")).toBe("OS 01323");
  });
  it("recusa preenchimento inválido", () => {
    expect(referenciaDocumento("os", "abc")).toBeNull();
    expect(referenciaDocumento("boleto", "  ")).toBeNull();
  });
  it("centavos exatos", () => { expect(centavosParaDecimal(100000)).toBe("1000.00"); expect(centavosParaDecimal("60000")).toBe("600.00"); });
  it("reenvio com mesmos dados usa a mesma chave; dados diferentes geram outra", () => {
    const m = new Map<string, string>(); const s = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
    const a = chaveEstavel(s, "u:c", { valor: "400.00" });
    expect(chaveEstavel(s, "u:c", { valor: "400.00" })).toBe(a);
    expect(chaveEstavel(s, "u:c", { valor: "600.00" })).not.toBe(a);
  });
});
