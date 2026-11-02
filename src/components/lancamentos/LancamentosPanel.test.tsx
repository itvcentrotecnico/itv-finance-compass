import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { sonda, acesso } = vi.hoisted(() => ({ sonda: vi.fn(), acesso: { role: "admin_geral" } }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@tanstack/react-router", () => ({ useRouteContext: () => acesso }));
vi.mock("@/lib/tesouraria.functions", () => ({ verificarContratoLancamento: sonda, carregarHistoricoTesouraria: vi.fn(async () => ({ total: 0, operacoes: [] })) }));
vi.mock("@/lib/cadastros", () => ({ listarContas: vi.fn(async () => []) }));
vi.mock("@/components/tesouraria/TesourariaPanel", () => ({ tesourariaOptions: { queryKey: ["tesouraria", "contas"], queryFn: async () => [] } }));
vi.mock("@/components/tesouraria/useEnvioSeguro", () => ({ useEnvioSeguro: () => ({ pendente: null, bloqueio: false, ocupado: false, mensagem: null, executar: vi.fn() }) }));
import { LancamentosPanel } from "./LancamentosPanel";

function montar() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><LancamentosPanel /></QueryClientProvider>);
}
beforeEach(() => { sonda.mockReset(); acesso.role = "admin_geral"; });

describe("admissão de lançamentos — sessão e banco simulados", () => {
  it.each(["admin_geral", "admin_financeiro"])("permite %s somente com contrato V2 confirmado", async (role) => {
    acesso.role = role; sonda.mockResolvedValue(true); montar();
    expect(await screen.findByRole("button", { name: "Novo lançamento" })).toBeEnabled();
  });
  it.each(["analista_financeiro", "consulta_gerencial"])("mantém %s exclusivamente em consulta mesmo com contrato preparado", async (role) => {
    acesso.role = role; sonda.mockResolvedValue(true); montar();
    expect(await screen.findByRole("button", { name: "Novo lançamento" })).toBeDisabled();
    expect(sonda).not.toHaveBeenCalled();
  });
  it("não libera administrador quando contrato V2 não está confirmado", async () => {
    sonda.mockResolvedValue(false); montar();
    expect(await screen.findByRole("button", { name: "Novo lançamento" })).toBeDisabled();
  });
});