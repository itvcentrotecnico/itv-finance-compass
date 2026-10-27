// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ sessao: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { getSession: mocks.sessao } } }));
import { validarAcessoDiagnostico } from "./integracao-diagnostico-cliente";
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });
it("não chama diagnóstico sem sessão existente", async () => {
  mocks.sessao.mockResolvedValue({ data: { session: null }, error: null });
  const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
  expect(await validarAcessoDiagnostico()).toMatchObject({ estado: "sessao_necessaria", status_http: null });
  expect(fetch).not.toHaveBeenCalled();
});
it("usa sessão existente somente em GET sem recurso e não repete", async () => {
  mocks.sessao.mockResolvedValue({ data: { session: { access_token: "apenas-simulado" } }, error: null });
  const fetch = vi.fn().mockResolvedValue(Response.json({ versao: "m5-diagnostico-controle-v3", leitura_preparada: false, limite_gets: 5 }));
  vi.stubGlobal("fetch", fetch);
  expect(await validarAcessoDiagnostico()).toEqual({ estado: "administrador_confirmado", status_http: 200, versao: "m5-diagnostico-controle-v3", leitura_preparada: false });
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch).toHaveBeenCalledWith("/api/public/integracao/diagnostico", expect.objectContaining({ method: "GET", headers: { Authorization: "Bearer apenas-simulado" } }));
});
it.each([[401, "sessao_necessaria"], [403, "acesso_negado"]] as const)("preserva recusa HTTP %s sem retentar", async (status, estado) => {
  mocks.sessao.mockResolvedValue({ data: { session: { access_token: "simulado" } }, error: null });
  const fetch = vi.fn().mockResolvedValue(new Response(null, { status })); vi.stubGlobal("fetch", fetch);
  expect(await validarAcessoDiagnostico()).toMatchObject({ estado, status_http: status, leitura_preparada: false });
  expect(fetch).toHaveBeenCalledTimes(1);
});
it("falha de comunicação não expõe exceção nem repete", async () => {
  mocks.sessao.mockResolvedValue({ data: { session: { access_token: "simulado" } }, error: null });
  const fetch = vi.fn().mockRejectedValue(new Error("mensagem-privada")); vi.stubGlobal("fetch", fetch);
  expect(await validarAcessoDiagnostico()).toEqual({ estado: "indisponivel", status_http: null, versao: null, leitura_preparada: false });
  expect(fetch).toHaveBeenCalledTimes(1);
});