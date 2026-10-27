// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { lerFonteHttp, type DiagnosticoLeitura } from "./integracao-leitura.server";

const base = "https://origem.example";
const inicio = "2026-10-20", fim = "2026-10-26";
const credencial = "valor-apenas-simulado";
function envelope(input: string | URL | Request) {
  const q = new URL(String(input)).searchParams;
  return { dados: [], recurso: q.get("recurso"), inicio, fim, offset: 0, limite: 500 };
}
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("invocação padrão do HTTP sem rede real", () => {
  it("preserva o receptor global e envia cinco GET corretos sem fetch injetado", async () => {
    const chamadas: string[] = [];
    vi.stubGlobal("fetch", function(this: unknown, input: string | URL | Request, init?: RequestInit) {
      if (this !== globalThis) throw new TypeError("Illegal invocation");
      expect(init?.method).toBe("GET");
      expect(init?.redirect).toBe("error");
      expect(new Headers(init?.headers).get("Authorization")).toBe(`Bearer ${credencial}`);
      const url = new URL(String(input));
      expect(url.origin).toBe(base);
      expect(url.pathname).toBe("/api/public/integracao-financeiro");
      expect(url.searchParams.get("inicio")).toBe(inicio);
      expect(url.searchParams.get("fim")).toBe(fim);
      chamadas.push(url.searchParams.get("recurso") ?? "");
      return Promise.resolve(Response.json(envelope(input)));
    });
    const resultado = await lerFonteHttp(base, credencial, inicio, fim, { registrar: () => {} });
    expect(chamadas.sort()).toEqual(["formas_pagamento", "pagamentos", "recebimentos", "recebimentos_titulos", "titulos"]);
    expect(resultado).toEqual({ formas: [], lancamentos: [], pagamentos: [], recebimentos: [], titulosAbertos: [] });
  });
});