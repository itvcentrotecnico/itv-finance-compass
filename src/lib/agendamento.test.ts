import { describe, expect, it } from "vitest";
import { janelaAutomatica, proximaExecucao, segredoConfere } from "./agendamento";

describe("agendamento diário 18h30 Manaus", () => {
  it("antes das 18h30 de Manaus, a próxima é hoje às 22:30 UTC", () => {
    expect(proximaExecucao(new Date("2026-10-26T20:00:00Z")).toISOString()).toBe("2026-10-26T22:30:00.000Z");
  });
  it("depois das 18h30 de Manaus, a próxima é amanhã", () => {
    // 22:48 em Brasília = 21:48 em Manaus
    expect(proximaExecucao(new Date("2026-10-27T01:48:00Z")).toISOString()).toBe("2026-10-27T22:30:00.000Z");
  });
  it("lê os últimos 7 dias incluindo o dia de Manaus", () => {
    expect(janelaAutomatica(new Date("2026-10-26T22:30:00Z"))).toEqual({ inicio: "2026-10-20", fim: "2026-10-26" });
    // 01:00 UTC ainda é dia anterior em Manaus
    expect(janelaAutomatica(new Date("2026-10-27T01:00:00Z")).fim).toBe("2026-10-26");
  });
  it("segredo errado, ausente ou curto é recusado", () => {
    const s = "a".repeat(40);
    expect(segredoConfere(s, s)).toBe(true);
    expect(segredoConfere("a".repeat(39), s)).toBe(false);
    expect(segredoConfere(null, s)).toBe(false);
    expect(segredoConfere("curto", "curto")).toBe(false);
    expect(segredoConfere(s, undefined)).toBe(false);
  });
});
