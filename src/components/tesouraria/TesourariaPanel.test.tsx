import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ enviar: vi.fn(), consultar: vi.fn(), historico: vi.fn() }));
vi.mock("@tanstack/react-router", () => ({ useRouteContext: () => ({ role: "admin_geral", user: { id: "usuario-local" } }) }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/tesouraria.functions", () => ({ carregarTesouraria: async () => [{id:"conta-a",nome:"Conta local A",ativo:true,tipo:"caixa",saldo:"0.00",data_saldo_inicial:"2026-10-26"},{id:"conta-b",nome:"Conta local B",ativo:true,tipo:"banco",saldo:"0.00",data_saldo_inicial:"2026-10-26"}], carregarExtrato: async () => ({ linhas: [], total: 0, saldo_anterior: "0", saldo_final: "0", subtotal: "0" }), carregarHistoricoTesouraria: mocks.historico, registrarTesouraria: mocks.enviar, consultarEnvioTesouraria: mocks.consultar }));
vi.mock("@/lib/cadastros", () => ({ listarContas: async () => [], listarCentros: async () => [], podeVerAuditoria: () => false }));
vi.mock("@/lib/auth/session", () => ({ fin: () => { throw new Error("HML proibido nos testes locais"); } }));
vi.mock("@/components/cadastros/Historico", () => ({ Historico: () => null }));
vi.mock("@/lib/conferencia-operacional.functions", () => ({ consultarConferencia: vi.fn(), comandarConferencia: vi.fn(), historicoConferencia: vi.fn(), opcoesConferencia: vi.fn() }));
vi.mock("./SolicitacoesPanel",()=>({SolicitacoesPanel:()=>null}));
import { TesourariaPanel } from "./TesourariaPanel";
import { chavePendente } from "@/lib/tesouraria-recuperacao";
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear();
  Object.defineProperty(navigator, "locks", { configurable: true, value: { request: (_: string, fn: () => unknown) => fn() } });
  mocks.consultar.mockResolvedValue(null); mocks.historico.mockResolvedValue({ operacoes: [], total: 0 });
});
function abrir() { const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } }); return render(<QueryClientProvider client={qc}><TesourariaPanel /></QueryClientProvider>); }
async function preencherTransferencia() {
  fireEvent.click(await screen.findByRole("button", { name: "Transferir" }));
  fireEvent.change(screen.getByLabelText("Descrição da operação"), { target: { value: "Transferência somente local" } });
  fireEvent.click(screen.getByLabelText("Conta financeira"));
  fireEvent.click(await screen.findByRole("option",{name:"Conta local A"}));
  fireEvent.click(screen.getByLabelText("Conta de destino"));
  fireEvent.click(await screen.findByRole("option",{name:"Conta local B"}));
  fireEvent.change(screen.getByLabelText("Data da operação"), { target: { value: "2026-10-26" } });
  fireEvent.change(screen.getByLabelText("Valor da operação"), { target: { value: "10.00" } });
}
describe("formulários da Tesouraria sem comunicação financeira externa", () => {
  it("rejeição inicial libera campos para correção", async () => {
    mocks.enviar.mockResolvedValue({ estado: "rejeitada", mensagem: "Rejeição financeira local" }); abrir(); await preencherTransferencia();
    fireEvent.click(screen.getByRole("button", { name: "Enviar para revisão" }));
    await screen.findAllByText("Rejeição financeira local");
    expect(screen.getByLabelText("Descrição da operação")).toBeEnabled(); expect(screen.getByRole("button", { name: "Enviar para revisão" })).toBeEnabled(); expect(localStorage.getItem(chavePendente("usuario-local"))).toBeNull();
  });
  it("perda de resposta bloqueia nova operação após fechar/reabrir e recupera por consulta", async () => {
    mocks.enviar.mockRejectedValue(new Error("resposta perdida")); const tela = abrir(); await preencherTransferencia();
    fireEvent.click(screen.getByRole("button", { name: "Enviar para revisão" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Enviar para revisão" })).toBeDisabled());
    const raw = localStorage.getItem(chavePendente("usuario-local")); expect(raw).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" })); tela.unmount(); abrir();
    await waitFor(() => expect(screen.getByRole("button", { name: "Transferir" })).toBeDisabled());
    mocks.consultar.mockResolvedValue({ id: "confirmada-local" }); fireEvent.click(screen.getByRole("button", { name: "Consultar resultado" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Transferir" })).toBeEnabled()); expect(mocks.enviar).toHaveBeenCalledTimes(1);
  });
  it("histórico preserva abertura sem oferecer mudança de saldo", async () => {
    mocks.historico.mockResolvedValue({ total: 1, operacoes: [{ id: "zero", tipo: "abertura", data_movimento: "2026-10-26", descricao: "Abertura local zero", valor: "0.00", conta_destino_id: "conta", conta_origem_id: null, efeitos: [], criado_em: "2026-10-26T19:00:00Z", criado_por: "usuario-local", estornada: false }] }); abrir();
    const tab = await screen.findByRole("tab", { name: "Movimentações" }); fireEvent.mouseDown(tab, { button: 0, ctrlKey: false }); fireEvent.click(tab);
    fireEvent.click(await screen.findByRole("button", { name: "Detalhes Abertura local zero" }));
    expect(await screen.findByText("zero")).toBeInTheDocument(); expect(mocks.enviar).not.toHaveBeenCalled();
  });
});