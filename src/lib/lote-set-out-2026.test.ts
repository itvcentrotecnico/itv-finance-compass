import { describe, expect, it } from "vitest";
import lote from "./lote-set-out-2026.json";
import { centavos } from "./tesouraria";
const L = lote as string[][];
const soma = (n: string, mes: string) => L.filter((l) => l[1] === n && l[3]!.startsWith(mes)).reduce((a, l) => a + centavos(l[5]!), 0n);
describe("lote setembro/outubro 2026", () => {
  it("tem 275 registros em setembro e 199 em outubro", () => { expect(L.filter((l) => l[3]!.startsWith("2026-09")).length).toBe(275); expect(L.filter((l) => l[3]!.startsWith("2026-10")).length).toBe(199); });
  it("preserva os totais aprovados por mês", () => { expect(soma("entrada", "2026-09")).toBe(8963130n); expect(soma("saida", "2026-09")).toBe(9058530n); expect(soma("entrada", "2026-10")).toBe(5429280n); expect(soma("saida", "2026-10")).toBe(9617950n); });
  it("não repete referência de origem", () => { expect(new Set(L.map((l) => l[0])).size).toBe(474); });
  it("não contém datas fora de 01/09 a 31/10/2026", () => { expect(L.every((l) => l[3]! >= "2026-09-01" && l[3]! <= "2026-10-31")).toBe(true); });
});
