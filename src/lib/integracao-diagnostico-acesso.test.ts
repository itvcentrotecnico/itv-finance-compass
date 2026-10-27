// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
vi.mock("@tanstack/react-router", () => ({ createFileRoute: () => (options: unknown) => ({ options }) }));
const mocks = vi.hoisted(() => ({ claims: vi.fn(), rpc: vi.fn(), fetch: vi.fn() }));
vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({ auth: { getClaims: mocks.claims }, schema: () => ({ rpc: mocks.rpc }) }) }));
import { Route } from "@/routes/api/public/integracao/diagnostico";
const get = (Route.options as unknown as { server: { handlers: { GET: (c: { request: Request }) => Promise<Response> } } }).server.handlers.GET;
const req = (query = "", bearer = true) => new Request(`https://financeiro.example/api/public/integracao/diagnostico${query}`, { headers: bearer ? { Authorization: "Bearer simulado.simulado.simulado" } : {} });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.clearAllMocks(); });
function configurar(admin = true) {
  vi.stubEnv("SUPABASE_URL", "https://db.example"); vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "simulado"); vi.stubEnv("M5_DIAGNOSTICO_LEITURA_AUTORIZADA", "");
  mocks.claims.mockResolvedValue({ data: { claims: { sub: "usuario-simulado" } }, error: null });
  mocks.rpc.mockResolvedValue({ data: admin, error: null }); vi.stubGlobal("fetch", mocks.fetch);
}
it("recusa sem sessão antes de qualquer serviço", async () => {
  expect((await get({ request: req("", false) })).status).toBe(401); expect(mocks.rpc).not.toHaveBeenCalled();
});
it("recusa sessão inválida", async () => {
  configurar(); mocks.claims.mockResolvedValue({ data: null, error: {} });
  expect((await get({ request: req() })).status).toBe(401); expect(mocks.rpc).not.toHaveBeenCalled();
});
it("recusa perfil não administrativo", async () => {
  configurar(false); expect((await get({ request: req() })).status).toBe(403); expect(mocks.fetch).not.toHaveBeenCalled();
});
it("retorna versão para administrador sem leitura financeira", async () => {
  configurar(); const r = await get({ request: req() });
  expect(r.status).toBe(200); expect(await r.json()).toEqual({ versao: "m5-diagnostico-isolado-v1" });
  expect(r.headers.get("Cache-Control")).toBe("no-store"); expect(mocks.fetch).not.toHaveBeenCalled();
  expect(mocks.rpc).toHaveBeenCalledTimes(1); expect(mocks.rpc).toHaveBeenCalledWith("tem_papel", { p: ["admin_geral", "admin_financeiro"] });
});
it("bloqueia consulta real mesmo para administrador na publicação preparada", async () => {
  configurar(); const r = await get({ request: req("?recurso=formas_pagamento") });
  expect(await r.json()).toMatchObject({ categoria: "leitura_nao_autorizada" }); expect(mocks.fetch).not.toHaveBeenCalled();
});
it("recusa recurso ou parâmetros extras", async () => {
  configurar(); expect((await get({ request: req("?recurso=outro") })).status).toBe(400);
  expect((await get({ request: req("?recurso=pagamentos&url=https://outro.example") })).status).toBe(400); expect(mocks.fetch).not.toHaveBeenCalled();
});