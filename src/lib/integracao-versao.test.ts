// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({ createFileRoute: () => (options: unknown) => ({ options }) }));
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), executar: vi.fn() }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { schema: () => ({ rpc: mocks.rpc }) } }));
vi.mock("@/lib/integracao.functions", () => ({ executarSincronizacao: mocks.executar }));
import { Route } from "@/routes/api/public/integracao/sincronizacao-diaria";

const handlers = (Route.options as unknown as { server: { handlers: Record<"GET" | "POST", (ctx: { request: Request }) => Promise<Response>> } }).server.handlers;
const segredo = "credencial-exclusivamente-simulada-123456789";
const url = "https://financeiro.example/api/public/integracao/sincronizacao-diaria";
const request = (authorization?: string, method = "GET") => new Request(url, { method, headers: authorization ? { Authorization: authorization } : {} });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

describe("consulta de versão protegida sem efeitos", () => {
  it.each([undefined, "Basic simulado", "Bearer incorreto"])("recusa autorização %s sem revelar revisão ou acessar serviços", async authorization => {
    vi.stubEnv("INTEGRACAO_CRON_SECRET", segredo);
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    const r = await handlers.GET({ request: request(authorization) });
    expect(r.status).toBe(401);
    expect(await r.json()).toEqual({ estado: "nao_autorizado" });
    expect(r.headers.get("Cache-Control")).toBe("no-store");
    expect(fetch).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.executar).not.toHaveBeenCalled();
  });
  it("fica indisponível sem segredo configurado", async () => {
    vi.stubEnv("INTEGRACAO_CRON_SECRET", "");
    expect((await handlers.GET({ request: request() })).status).toBe(503);
  });
  it("retorna somente a revisão corrigida aprovada, sem origem ou banco", async () => {
    vi.stubEnv("INTEGRACAO_CRON_SECRET", segredo);
    vi.stubEnv("GESTAO_ITV_READ_TOKEN", "");
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    const r = await handlers.GET({ request: request(`Bearer ${segredo}`) });
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ versao: "m5-http-redirect-manual-v2", revisao_leitor: "95cf17c3f13734bf55260c2f5802d615d679c907ebda792be400072d7cd76389" });
    expect(r.headers.get("Cache-Control")).toBe("no-store");
    expect(fetch).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.executar).not.toHaveBeenCalled();
  });
  it("preserva a recusa do POST sem autenticação", async () => {
    vi.stubEnv("INTEGRACAO_CRON_SECRET", segredo);
    const r = await handlers.POST({ request: request(undefined, "POST") });
    expect(r.status).toBe(401);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("preserva POST autenticado e sua orquestração apenas simulada", async () => {
    vi.stubEnv("INTEGRACAO_CRON_SECRET", segredo);
    vi.stubEnv("GESTAO_ITV_READ_TOKEN", "simulado");
    mocks.rpc.mockResolvedValueOnce({ data: { id: "execucao-simulada" }, error: null });
    mocks.executar.mockResolvedValueOnce({ estado: "concluida" });
    const r = await handlers.POST({ request: request(`Bearer ${segredo}`, "POST") });
    expect(r.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.rpc).toHaveBeenCalledWith("integracao_iniciar_automatica", { p_inicio: expect.any(String), p_fim: expect.any(String) });
    expect(mocks.executar).toHaveBeenCalledTimes(1);
    expect(mocks.executar).toHaveBeenCalledWith(expect.objectContaining({ rpc: mocks.rpc }), "execucao-simulada", expect.any(String), expect.any(String));
  });
});