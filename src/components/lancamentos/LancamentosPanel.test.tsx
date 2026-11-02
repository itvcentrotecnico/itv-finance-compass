import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { sonda, historico, acesso } = vi.hoisted(() => ({ sonda: vi.fn(), historico: vi.fn(), acesso: { role: "admin_geral" } }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@tanstack/react-router", () => ({ useRouteContext: () => acesso }));
vi.mock("@/lib/tesouraria.functions", () => ({ carregarOpcoesLancamento: sonda, carregarHistoricoTesouraria: historico }));
vi.mock("@/lib/cadastros", () => ({ listarContas: vi.fn(async () => []) }));
vi.mock("@/components/tesouraria/TesourariaPanel", () => ({ tesourariaOptions: { queryKey: ["tesouraria", "contas"], queryFn: async () => [] } }));
vi.mock("@/components/tesouraria/useEnvioSeguro", () => ({ useEnvioSeguro: () => ({ pendente: null, bloqueio: false, ocupado: false, mensagem: null, executar: vi.fn() }) }));
import { LancamentosPanel } from "./LancamentosPanel";

function montar() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><LancamentosPanel /></QueryClientProvider>);
}
beforeEach(() => { sonda.mockReset(); historico.mockReset().mockResolvedValue({ total: 0, operacoes: [] }); acesso.role = "admin_geral"; });

describe("admissão de lançamentos — sessão e banco simulados", () => {
  it.each(["admin_geral", "admin_financeiro"])("permite %s somente com contrato V2 confirmado", async (role) => {
    acesso.role = role; sonda.mockResolvedValue({ contas: [], categorias: [] }); montar();
    await waitFor(() => expect(screen.getByRole("button", { name: "Novo lançamento" })).toBeEnabled());
  });
  it.each(["analista_financeiro", "consulta_gerencial"])("mantém %s exclusivamente em consulta mesmo com contrato preparado", async (role) => {
    acesso.role = role; sonda.mockResolvedValue(true); montar();
    expect(await screen.findByRole("button", { name: "Novo lançamento" })).toBeDisabled();
    expect(sonda).not.toHaveBeenCalled();
  });
  it("não libera administrador quando contrato V2 não está confirmado", async () => {
    sonda.mockResolvedValue(null); montar();
    expect(await screen.findByRole("button", { name: "Novo lançamento" })).toBeDisabled();
  });
  it("erro da consulta não representa nenhum indicador como zero", async () => {
    sonda.mockResolvedValue(null); historico.mockRejectedValue(new Error("Falha de consulta")); montar();
    await waitFor(() => expect(screen.getAllByText("Indisponível")).toHaveLength(4));
    expect(screen.queryByText("R$ 0,00")).not.toBeInTheDocument();
  });
});