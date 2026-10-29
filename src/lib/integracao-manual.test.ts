// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), ler: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => {
  const b = { middleware: () => b, inputValidator: () => b, handler: (fn: unknown) => fn }; return b;
} }));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("./integracao-leitura.server", () => ({ lerFonteGestaoServidor: mocks.ler }));
import { sincronizarGestaoItv } from "./integracao.functions";
import { mensagemControleManual, type ControleManual } from "./integracao-manual";
const handler = sincronizarGestaoItv as unknown as (ctx: { data: { dia?: string }; context: { supabase: { schema: () => { rpc: typeof mocks.rpc } } } }) => Promise<unknown>;
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });
describe("controle manual decidido pela RPC autoritativa", () => {
  it.each(["INT_HORARIO_MANUAL", "INT_SUCESSO_DIARIO", "INT_PERMISSAO", "INT_EM_ANDAMENTO"])("%s bloqueia endpoint antes da origem ou conclusão", async message => {
    vi.stubEnv("GESTAO_ITV_READ_TOKEN", "simulado");
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { message } });
    await expect(handler({ data: {}, context: { supabase: { schema: () => ({ rpc: mocks.rpc }) } } })).rejects.toThrow();
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.rpc).toHaveBeenCalledWith("integracao_iniciar");
    expect(mocks.ler).not.toHaveBeenCalled();
  });
  it("data de leitura do cliente não muda data de autorização", async () => {
    vi.stubEnv("GESTAO_ITV_READ_TOKEN", "simulado");
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { message: "INT_SUCESSO_DIARIO" } });
    await expect(handler({ data: { dia: "2020-01-01" }, context: { supabase: { schema: () => ({ rpc: mocks.rpc }) } } })).rejects.toThrow();
    expect(mocks.rpc).toHaveBeenCalledWith("integracao_iniciar");
    expect(mocks.ler).not.toHaveBeenCalled();
  });
  it("mensagem usa horários do servidor e não relógio do navegador", () => {
    const c: ControleManual = { permitida: false, motivo: "sucesso_diario", agora_servidor: "2026-10-29T23:00:00Z", ultima_sucesso: "2026-10-29T22:34:28Z", proxima_liberacao: "2026-10-30T22:30:00Z" };
    vi.useFakeTimers(); vi.setSystemTime(new Date("2030-01-01T12:00:00Z"));
    const a = mensagemControleManual(c);
    vi.setSystemTime(new Date("2020-01-01T12:00:00Z"));
    expect(mensagemControleManual(c)).toBe(a);
    vi.useRealTimers();
  });
});