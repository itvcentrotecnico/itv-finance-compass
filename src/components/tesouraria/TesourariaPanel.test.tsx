import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { enviar, sonda } = vi.hoisted(() => ({ enviar: vi.fn(), sonda: vi.fn() }));

vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@tanstack/react-router", () => ({ useRouteContext: () => ({ role: "admin_geral" }) }));
vi.mock("@/lib/tesouraria.functions", () => ({
  carregarTesouraria: vi.fn(async () => [{ id: "c1", nome: "Caixa", tipo: "caixa", saldo: "0.00", ativo: true, banco: null }]),
  carregarExtrato: vi.fn(async () => ({ linhas: [], total: 0, saldo_anterior: "0.00", saldo_final: "0.00", subtotal: "0.00" })),
  carregarHistoricoTesouraria: vi.fn(async () => ({ total: 0, operacoes: [] })),
  verificarContratoLancamento: sonda,
}));
vi.mock("@/lib/cadastros", () => ({
  listarContas: vi.fn(async () => [
    { id: "pc-rec", codigo: "1.1", descricao: "Receita local", natureza: "receita", ativo: true, aceita_lancamentos: true },
    { id: "pc-des", codigo: "2.1", descricao: "Despesa local", natureza: "despesa", ativo: true, aceita_lancamentos: true },
  ]),
  listarCentros: vi.fn(async () => []),
  podeVerAuditoria: () => false,
}));

import { TesourariaPanel } from "./TesourariaPanel";

function montar(props: { somenteConsulta?: boolean } = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}><TesourariaPanel {...props} /></QueryClientProvider>);
}

async function abrirEntrada() {
  await screen.findByText("1 conta(s) financeira(s) · BRL");
  await userEvent.click(await screen.findByRole("button", { name: /^Entrada$/ }));
}

async function preencherEntrada() {
  await userEvent.click(screen.getByRole("combobox", { name: "Conta financeira" }));
  await userEvent.click(await screen.findByRole("option", { name: "Caixa" }));
  await userEvent.type(screen.getByLabelText("Descrição da operação"), "Receita local");
  await userEvent.type(screen.getByLabelText("Data da operação"), "2026-11-01");
  await userEvent.type(screen.getByLabelText("Valor da operação"), "100,10");
  await userEvent.type(screen.getByLabelText("Referência documental externa"), "externo:nota-1");
  await userEvent.click(screen.getByRole("combobox", { name: "Classificação contábil" }));
  await userEvent.click(await screen.findByRole("option", { name: "1.1 · Receita local" }));
}

beforeEach(() => { enviar.mockReset(); sonda.mockReset(); window.localStorage.clear(); });

describe("modo somente consulta", () => {
  it("não exibe operações de escrita", async () => {
    montar();
    await screen.findByText("1 conta(s) financeira(s) · BRL");
    expect(screen.queryByRole("button", { name: /^Entrada$/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Saída$/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Transferir/ })).toBeNull();
  });
});

describe("modo operacional com sonda do contrato corrigido", () => {
  it("mantém o formulário fechado enquanto o banco não confirma a correção", async () => {
    sonda.mockResolvedValue(false);
    montar({ somenteConsulta: false });
    await screen.findByText(/serão liberados após a aplicação dos controles/);
    expect(screen.queryByRole("button", { name: /^Entrada$/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Saída$/ })).toBeNull();
  });
  it("libera apenas entrada e saída quando a correção é confirmada", async () => {
    sonda.mockResolvedValue(true);
    montar({ somenteConsulta: false });
    expect(await screen.findByRole("button", { name: /^Entrada$/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Saída$/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Transferir/ })).toBeNull();
    expect(screen.queryByRole("tab", { name: /Conferência/ })).toBeNull();
    expect(screen.queryByRole("tab", { name: /Solicitações/ })).toBeNull();
  });
  it("registra receita com chave única e confirmação explícita", async () => {
    sonda.mockResolvedValue(true);
    enviar.mockResolvedValue({ estado: "confirmada", id: "op" });
    montar({ somenteConsulta: false });
    await abrirEntrada();
    await preencherEntrada();
    await userEvent.click(screen.getByRole("button", { name: "Confirmar lançamento" }));
    await screen.findByText("1 conta(s) financeira(s) · BRL");
    expect(enviar).toHaveBeenCalledWith(expect.objectContaining({ tipo: "entrada", destino: "c1", valor: "100.10", descricao: "Receita local", plano: "pc-rec", referencia: "externo:nota-1", chave: expect.any(String) }));
    expect(screen.queryByRole("button", { name: "Confirmar lançamento" })).toBeNull();
  });
  it("oferece somente categorias da natureza da operação", async () => {
    sonda.mockResolvedValue(true);
    montar({ somenteConsulta: false });
    await abrirEntrada();
    await userEvent.click(screen.getByRole("combobox", { name: "Classificação contábil" }));
    expect(await screen.findByRole("option", { name: "1.1 · Receita local" })).toBeTruthy();
    expect(screen.queryByRole("option", { name: "2.1 · Despesa local" })).toBeNull();
  });
  it("mantém a rejeição financeira aberta e explícita", async () => {
    sonda.mockResolvedValue(true);
    enviar.mockResolvedValue({ estado: "rejeitada", mensagem: "Classificação contábil inválida ou inativa." });
    montar({ somenteConsulta: false });
    await abrirEntrada();
    await preencherEntrada();
    await userEvent.click(screen.getByRole("button", { name: "Confirmar lançamento" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Classificação contábil inválida");
    expect(enviar).toHaveBeenCalledTimes(1);
  });
  it("perda de resposta mantém envio original para recuperação", async () => {
    sonda.mockResolvedValue(true);
    enviar.mockResolvedValue({ estado: "incerta", mensagem: "Resposta perdida." });
    montar({ somenteConsulta: false });
    await abrirEntrada();
    await preencherEntrada();
    await userEvent.click(screen.getByRole("button", { name: "Confirmar lançamento" }));
    expect(await screen.findByText(/Envio pendente/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Consultar resultado" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Recuperar mesmos dados" })).toBeTruthy();
  });
});

describe("categoria oficial ausente", () => {
  it("bloqueia o lançamento e explica a pendência", async () => {
    sonda.mockResolvedValue(true);
    const cadastros = await import("@/lib/cadastros");
    vi.mocked(cadastros.listarContas).mockResolvedValueOnce([
      { id: "pc-des", codigo: "2.1", descricao: "Despesa local", natureza: "despesa", ativo: true, aceita_lancamentos: true } as never,
    ]);
    montar({ somenteConsulta: false });
    await abrirEntrada();
    expect(await screen.findByRole("alert")).toHaveTextContent("Nenhuma categoria oficial de receita apta para lançamento");
    expect(screen.getByRole("button", { name: "Confirmar lançamento" })).toBeDisabled();
  });
});
