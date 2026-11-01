import { describe, expect, it, vi, beforeEach } from "vitest";
const { context } = vi.hoisted(() => ({ context: { userId: "usuario", supabase: { schema: vi.fn() } } }));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => {
  const builder = { middleware: () => builder, inputValidator: () => builder, handler: (fn: (args: unknown) => unknown) => (args: { data?: unknown } = {}) => fn({ data: args.data, context }) }; return builder;
} }));
import { carregarHistoricoTesouraria, consultarEnvioTesouraria, registrarTesouraria, verificarContratoLancamento } from "./tesouraria.functions";
beforeEach(() => vi.clearAllMocks());
describe("adaptação das funções financeiras — somente mocks locais", () => {
  it("histórico preserva abertura e estorno zero e transferência única", async () => {
    const operacoes = [{ id: "zero", tipo: "abertura", valor: "0.00", efeitos: [] }, { id: "rev", tipo: "estorno", valor: "0.00", efeitos: [] }, { id: "trans", tipo: "transferencia", valor: "0.30", efeitos: [{ id: "d", conta_id: "a", direcao: "debito", valor: "0.30" }, { id: "c", conta_id: "b", direcao: "credito", valor: "0.30" }] }];
    const rpc = vi.fn().mockResolvedValue({ data: { total: 3, operacoes }, error: null });
    const select = vi.fn().mockReturnValue({ in: vi.fn().mockResolvedValue({ data: [{ operacao_original_id: "zero" }], error: null }) });
    context.supabase.schema.mockReturnValue({ rpc, from: vi.fn().mockReturnValue({ select }) });
    const r = await carregarHistoricoTesouraria({ data: { pagina: 0 } });
    expect(r.total).toBe(3); expect(r.operacoes).toHaveLength(3); expect(r.operacoes[0]).toMatchObject({ valor: "0.00", efeitos: [], estornada: true }); expect(r.operacoes[2]?.efeitos).toHaveLength(2);
    expect(rpc).toHaveBeenCalledWith("tesouraria_historico_operacoes", { p: { pagina: 0 } }); expect(context.supabase.schema).toHaveBeenCalledWith("financeiro_hml");
  });
  it("consulta chave com identidade autenticada e sem gravar", async () => {
    const eq = vi.fn(); const maybeSingle = vi.fn().mockResolvedValue({ data: { id: "op" }, error: null }); const chain = { eq, maybeSingle }; eq.mockReturnValue(chain);
    const select = vi.fn().mockReturnValue(chain); context.supabase.schema.mockReturnValue({ from: vi.fn().mockReturnValue({ select }) });
    expect(await consultarEnvioTesouraria({ data: { chave: "chave" } })).toEqual({ id: "op" }); expect(eq).toHaveBeenCalledWith("criado_por", "usuario"); expect(eq).toHaveBeenCalledWith("chave_idempotencia", "chave"); expect(select).toHaveBeenCalledWith("id");
  });
  it.each(["42P01", "PGRST205"])("consulta sem operação não depende de tabela ausente no legado (%s)", async (code) => {
    const maybeSingle = vi.fn()
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: null, error: { code, message: "Tabela ausente" } });
    const eq = vi.fn(); const chain = { eq, maybeSingle }; eq.mockReturnValue(chain);
    const from = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue(chain) });
    context.supabase.schema.mockReturnValue({ from });
    expect(await consultarEnvioTesouraria({ data: { chave: "chave-original" } })).toBeNull();
    expect(eq).toHaveBeenCalledWith("criado_por", "usuario");
    expect(eq).toHaveBeenCalledWith("chave_idempotencia", "chave-original");
    expect(from).toHaveBeenCalledWith("tesouraria_solicitacoes");
  });
  it.each(["42501", "PGRST301", ""])("consulta mantém bloqueio para erro de permissão, sessão ou conexão (%s)", async (code) => {
    const maybeSingle = vi.fn()
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: null, error: { code, message: "Falha de acesso" } });
    const eq = vi.fn(); const chain = { eq, maybeSingle }; eq.mockReturnValue(chain);
    context.supabase.schema.mockReturnValue({ from: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue(chain) }) });
    await expect(consultarEnvioTesouraria({ data: { chave: "chave-original" } })).rejects.toThrow();
  });
  it("retorna rejeição financeira explícita", async () => {
    context.supabase.schema.mockReturnValue({ rpc: vi.fn().mockResolvedValue({ error: { code: "P0001", message: "TES_CLASSIFICACAO" } }) });
    expect((await registrarTesouraria({ data: { tipo: "entrada" } as never })).estado).toBe("rejeitada");
  });
  it("não transforma erro de conexão em rejeição", async () => {
    context.supabase.schema.mockReturnValue({ rpc: vi.fn().mockResolvedValue({ error: { message: "Failed to fetch", code: "" } }) });
    expect((await registrarTesouraria({ data: { tipo: "entrada" } as never })).estado).toBe("incerta");
  });
  it("sonda confirma somente o contrato corrigido", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { contrato: "tesouraria_lancar_minima_v2" }, error: null });
    context.supabase.schema.mockReturnValue({ rpc });
    expect(await verificarContratoLancamento({})).toBe(true);
    expect(rpc).toHaveBeenCalledWith("tesouraria_lancar", { p: { tipo: "sonda" } });
  });
  it("sonda falha fechada no legado, em erro e em resposta diversa", async () => {
    context.supabase.schema.mockReturnValue({ rpc: vi.fn().mockResolvedValue({ data: null, error: { code: "P0001", message: "TES_DADOS" } }) });
    expect(await verificarContratoLancamento({})).toBe(false);
    context.supabase.schema.mockReturnValue({ rpc: vi.fn().mockResolvedValue({ data: { contrato: "outro" }, error: null }) });
    expect(await verificarContratoLancamento({})).toBe(false);
  });
});