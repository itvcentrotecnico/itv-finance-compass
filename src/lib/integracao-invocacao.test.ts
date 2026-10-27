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
      expect(init?.redirect).toBe("manual");
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

  it("distingue falha síncrona sem expor mensagem, causa ou credencial", async () => {
    const logs: DiagnosticoLeitura[] = [];
    vi.stubGlobal("fetch", () => { throw new TypeError(credencial); });
    await expect(lerFonteHttp(base, credencial, inicio, fim, { registrar: e => logs.push(e) })).rejects.toMatchObject({ etapa: "invocacao_origem" });
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ recurso: "formas_pagamento", etapa: "invocacao_origem", status_http: null });
    expect(JSON.stringify(logs)).not.toContain(credencial);
  });

  it.each(["ECONNRESET", "ECONNREFUSED", "UND_ERR_SOCKET"])("distingue conexão %s no caminho padrão", async code => {
    const logs: DiagnosticoLeitura[] = [];
    vi.stubGlobal("fetch", () => Promise.reject(new TypeError(credencial, { cause: { code, message: credencial } })));
    await expect(lerFonteHttp(base, credencial, inicio, fim, { registrar: e => logs.push(e) })).rejects.toMatchObject({ etapa: "conexao_origem" });
    expect(logs[0]).toMatchObject({ etapa: "conexao_origem", status_http: null });
    expect(JSON.stringify(logs)).not.toContain(credencial);
    expect(JSON.stringify(logs)).not.toContain(code);
  });

  it("mantém rede genérica quando a causa não é conhecida", async () => {
    const logs: DiagnosticoLeitura[] = [];
    vi.stubGlobal("fetch", () => Promise.reject(new TypeError(credencial, { cause: { code: credencial } })));
    await expect(lerFonteHttp(base, credencial, inicio, fim, { registrar: e => logs.push(e) })).rejects.toMatchObject({ etapa: "rede_origem" });
    expect(JSON.stringify(logs)).not.toContain(credencial);
  });

  it.each([401, 403, 429, 500, 404])("preserva categoria HTTP %s no caminho padrão", async status => {
    const etapa = status === 401 ? "autenticacao_origem" : status === 403 ? "autorizacao_origem" : status === 429 ? "limite_origem" : status === 500 ? "erro_interno_origem" : "http_origem";
    const logs: DiagnosticoLeitura[] = [];
    vi.stubGlobal("fetch", () => Promise.resolve(new Response(credencial, { status })));
    await expect(lerFonteHttp(base, credencial, inicio, fim, { registrar: e => logs.push(e) })).rejects.toMatchObject({ etapa });
    expect(logs[0]).toMatchObject({ etapa, status_http: status });
    expect(JSON.stringify(logs)).not.toContain(credencial);
  });

  it("recusa objeto que não é resposta HTTP", async () => {
    vi.stubGlobal("fetch", () => Promise.resolve({ status: 200, ok: true }));
    await expect(lerFonteHttp(base, credencial, inicio, fim, { registrar: () => {} })).rejects.toMatchObject({ etapa: "resposta_invalida_origem" });
  });

  it("recusa JSON inválido no caminho padrão sem expor corpo", async () => {
    const logs: DiagnosticoLeitura[] = [];
    vi.stubGlobal("fetch", () => Promise.resolve(new Response(credencial, { status: 200 })));
    await expect(lerFonteHttp(base, credencial, inicio, fim, { registrar: e => logs.push(e) })).rejects.toMatchObject({ etapa: "resposta_invalida_origem" });
    expect(logs[0]).toMatchObject({ etapa: "resposta_invalida_origem", status_http: 200 });
    expect(JSON.stringify(logs)).not.toContain(credencial);
  });

  it.each(["pagina", "total"])("classifica timeout %s sem fetch injetado", async modo => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", (_input: unknown, init?: RequestInit) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("abortado", "AbortError")), { once: true });
    }));
    const logs: DiagnosticoLeitura[] = [];
    const leitura = lerFonteHttp(base, credencial, inicio, fim, { registrar: e => logs.push(e), prazoPaginaMs: modo === "pagina" ? 10 : 100, prazoTotalMs: modo === "total" ? 10 : 100 });
    const assertion = expect(leitura).rejects.toMatchObject({ etapa: "timeout_origem" });
    await vi.advanceTimersByTimeAsync(20);
    await assertion;
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ etapa: "timeout_origem", status_http: null, duracao_ms: 10 });
  });

  it("reconhece timeout nativo pelo código fechado", async () => {
    vi.stubGlobal("fetch", () => Promise.reject(new TypeError(credencial, { cause: { code: "UND_ERR_CONNECT_TIMEOUT" } })));
    await expect(lerFonteHttp(base, credencial, inicio, fim, { registrar: () => {} })).rejects.toMatchObject({ etapa: "timeout_origem" });
  });
});