// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-start", () => ({ createServerFn: () => {
  const builder = { middleware: () => builder, inputValidator: () => builder, handler: (fn: unknown) => fn };
  return builder;
} }));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("./integracao-leitura.server", () => ({ lerFonteGestaoServidor: vi.fn() }));
import { executarSincronizacao } from "./integracao.functions";
import { lerFonteGestaoServidor } from "./integracao-leitura.server";

describe("falhas do leitor compartilhado sem escrita financeira", () => {
  it.each(["manual", "automatica"])("%s registra somente falha, sem itens ou conferências", async modo => {
    vi.mocked(lerFonteGestaoServidor).mockRejectedValueOnce(new Error("autorizacao_origem"));
    const rpc = vi.fn().mockResolvedValue({ data: {}, error: null });
    const from = vi.fn();
    const r = await executarSincronizacao({ rpc, from }, `simulado-${modo}`, "2026-10-20", "2026-10-26");
    expect(r).toEqual({ estado: "falha", etapa: "autorizacao_origem" });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("integracao_concluir", { p: { id: `simulado-${modo}`, status: "falha", erros: [{ etapa: "autorizacao_origem" }] } });
    expect(from).not.toHaveBeenCalled();
  });
});