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
  it.each(["admin_geral", "analista_financeiro"])("permite %s somente com contrato livro confirmado", async (role) => {
    const ids = (n: number) => Array.from({ length: n }, (_, i) => `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`);
    acesso.role = role; sonda.mockResolvedValue({ contas: ids(1), categorias: ids(14) }); montar();
    await waitFor(() => expect(screen.getByRole("button", { name: "Novo lançamento" })).toBeEnabled());
  });
  it.each(["admin_financeiro", "consulta_gerencial"])("mantém %s exclusivamente em consulta mesmo com contrato preparado", async (role) => {
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
  it("histórico exibe OS 1323 e preserva referências de outros tipos", async () => {
    const op = (id: string, ref: string) => ({ id, tipo: "entrada", valor: "10.00", descricao: `Op ${id}`, data_movimento: "2026-11-16", criado_em: "2026-11-16T20:00:00Z", estornada: false, referencia_documental: ref, classificacao_snapshot: null, conta_destino_id: null, conta_origem_id: null, criado_por: null, responsavel_nome: null });
    sonda.mockResolvedValue(null);
    historico.mockResolvedValue({ total: 2, operacoes: [op("a", "externo:os-1323"), op("b", "externo:nf-325")] });
    montar();
    expect(await screen.findByText("OS 1323")).toBeTruthy();
    expect(screen.getByText("externo:nf-325")).toBeTruthy();
    expect(screen.queryByText("externo:os-1323")).toBeNull();
  });
});

