import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ enviar: vi.fn(), consultar: vi.fn(), historico: vi.fn() }));
vi.mock("@tanstack/react-router", () => ({ useRouteContext: () => ({ role: "admin_geral", user: { id: "usuario-local" } }) }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/tesouraria.functions", () => ({ carregarTesouraria: async () => [], carregarExtrato: async () => ({ linhas: [], total: 0, saldo_anterior: "0", saldo_final: "0", subtotal: "0" }), carregarHistoricoTesouraria: mocks.historico, registrarTesouraria: mocks.enviar, consultarEnvioTesouraria: mocks.consultar }));
vi.mock("@/lib/cadastros", () => ({ listarContas: async () => [], listarCentros: async () => [], podeVerAuditoria: () => false }));
vi.mock("@/lib/auth/session", () => ({ fin: () => { throw new Error("HML proibido nos testes locais"); } }));
vi.mock("@/components/cadastros/Historico", () => ({ Historico: () => null }));
import { TesourariaPanel } from "./TesourariaPanel";
import { chavePendente } from "@/lib/tesouraria-recuperacao";
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear();
  Object.defineProperty(navigator, "locks", { configurable: true, value: { request: (_: string, fn: () => unknown) => fn() } });
  mocks.consultar.mockResolvedValue(null); mocks.historico.mockResolvedValue({ operacoes: [], total: 0 });
});
function abrir() { const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } }); return render(<QueryClientProvider client={qc}><TesourariaPanel /></QueryClientProvider>); }
async function preencherAbertura() {
  fireEvent.click(await screen.findByRole("button", { name: "Nova conta" }));
  fireEvent.change(screen.getByLabelText("Nome da conta"), { target: { value: "Conta somente local" } });
  fireEvent.change(screen.getByLabelText("Data da operação"), { target: { value: "2026-10-26" } });
  fireEvent.change(screen.getByLabelText("Valor da operação"), { target: { value: "0" } });
}
describe("formulários da Tesouraria sem comunicação financeira externa", () => {
  it("rejeição inicial libera campos para correção", async () => {
    mocks.enviar.mockResolvedValue({ estado: "rejeitada", mensagem: "Rejeição financeira local" }); abrir(); await preencherAbertura();
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    await screen.findByText("Rejeição financeira local");
    expect(screen.getByLabelText("Nome da conta")).toBeEnabled(); expect(screen.getByRole("button", { name: "Salvar" })).toBeEnabled(); expect(localStorage.getItem(chavePendente("usuario-local"))).toBeNull();
  });
  it("perda de resposta bloqueia nova operação após fechar/reabrir e recupera por consulta", async () => {
    mocks.enviar.mockRejectedValue(new Error("resposta perdida")); const tela = abrir(); await preencherAbertura();
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled());
    const raw = localStorage.getItem(chavePendente("usuario-local")); expect(raw).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" })); tela.unmount(); abrir();
    await waitFor(() => expect(screen.getByRole("button", { name: "Nova conta" })).toBeDisabled());
    mocks.consultar.mockResolvedValue({ id: "confirmada-local" }); fireEvent.click(screen.getByRole("button", { name: "Consultar resultado" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Nova conta" })).toBeEnabled()); expect(mocks.enviar).toHaveBeenCalledTimes(1);
  });
  it("histórico permite acessar e estornar abertura sem efeitos", async () => {
    mocks.historico.mockResolvedValue({ total: 1, operacoes: [{ id: "zero", tipo: "abertura", data_movimento: "2026-10-26", descricao: "Abertura local zero", valor: "0.00", conta_destino_id: "conta", conta_origem_id: null, efeitos: [], criado_em: "2026-10-26T19:00:00Z", criado_por: "usuario-local", estornada: false }] }); abrir();
    const tab = await screen.findByRole("tab", { name: "Movimentações" }); fireEvent.mouseDown(tab, { button: 0, ctrlKey: false }); fireEvent.click(tab);
    fireEvent.click(await screen.findByRole("button", { name: "Detalhes Abertura local zero" }));
    expect(await screen.findByRole("button", { name: "Confirmar estorno" })).toBeEnabled(); expect(mocks.enviar).not.toHaveBeenCalled();
  });
});