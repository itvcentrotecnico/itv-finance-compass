// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { autorizarDiagnostico, diagnosticarRecurso } from "./integracao-diagnostico.server";
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe("diagnóstico sem efeitos financeiros", () => {
  it.each([false, null])("recusa não administrador %s", async data => {
    const rpc = vi.fn().mockResolvedValue({ data, error: null });
    expect(await autorizarDiagnostico({ rpc })).toBe(false);
    expect(rpc).toHaveBeenCalledWith("tem_papel", { p: ["admin_geral", "admin_financeiro"] });
  });
  it("autoriza somente confirmação administrativa válida", async () => {
    expect(await autorizarDiagnostico({ rpc: vi.fn().mockResolvedValue({ data: true, error: null }) })).toBe(true);
    expect(await autorizarDiagnostico({ rpc: vi.fn().mockResolvedValue({ data: true, error: {} }) })).toBe(false);
  });
  it.each(["formas_pagamento", "recebimentos", "pagamentos", "recebimentos_titulos", "titulos"] as const)("não consulta %s sem autorização real", async recurso => {
    vi.stubEnv("M5_DIAGNOSTICO_LEITURA_AUTORIZADA", "");
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    expect(await diagnosticarRecurso(recurso)).toMatchObject({ categoria: "leitura_nao_autorizada", status_http: null });
    expect(fetch).not.toHaveBeenCalled();
  });
  it("executa apenas um GET simulado e não retorna dados ou credenciais", async () => {
    vi.stubEnv("M5_DIAGNOSTICO_LEITURA_AUTORIZADA", "true");
    vi.stubEnv("GESTAO_ITV_READ_TOKEN", "apenas-simulado");
    const fetch = vi.fn((input, init) => {
      const q = new URL(String(input)).searchParams;
      expect(init.method).toBe("GET"); expect(init.redirect).toBe("error");
      return Promise.resolve(Response.json({ dados: [{ id: "simulado", privado: "nao-retornar" }], recurso: q.get("recurso"), inicio: q.get("inicio"), fim: q.get("fim"), offset: 0, limite: 500 }));
    }); vi.stubGlobal("fetch", fetch);
    const r = await diagnosticarRecurso("formas_pagamento");
    expect(r).toMatchObject({ categoria: "leitura_valida", status_http: 200 });
    expect(Object.keys(r).sort()).toEqual(["categoria", "duracao_ms", "identificador", "status_http", "tipo_excecao"]);
    expect(JSON.stringify(r)).not.toContain("nao-retornar"); expect(JSON.stringify(r)).not.toContain("apenas-simulado");
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("preserva tipo seguro sem mensagem bruta e sem repetir", async () => {
    vi.stubEnv("M5_DIAGNOSTICO_LEITURA_AUTORIZADA", "true"); vi.stubEnv("GESTAO_ITV_READ_TOKEN", "simulado");
    const fetch = vi.fn(() => Promise.reject(new TypeError("segredo-nao-retornar"))); vi.stubGlobal("fetch", fetch);
    const r = await diagnosticarRecurso("pagamentos");
    expect(r).toMatchObject({ categoria: "rede_origem", tipo_excecao: "TypeError", status_http: null });
    expect(JSON.stringify(r)).not.toContain("segredo-nao-retornar"); expect(fetch).toHaveBeenCalledTimes(1);
  });
});