import { beforeEach, describe, it, expect, vi } from "vitest";
import { act, render, screen, fireEvent } from "@testing-library/react";
import { NovoLancamento } from "./LancamentosPanel";

vi.mock("@/lib/tesouraria.functions", () => ({ carregarTesouraria: vi.fn(), carregarHistoricoTesouraria: vi.fn(), verificarContratoLancamento: vi.fn() }));
vi.mock("@/components/tesouraria/TesourariaPanel", () => ({ tesourariaOptions: {} }));

const planos = [
  { id: "r", codigo: "1.01", descricao: "Conserto de televisores", natureza: "receita", ativo: true, aceita_lancamentos: true },
  { id: "s", codigo: "1", descricao: "RECEITAS OPERACIONAIS", natureza: "receita", ativo: true, aceita_lancamentos: false },
  { id: "d", codigo: "2.01", descricao: "Compra de peças", natureza: "despesa", ativo: true, aceita_lancamentos: true },
  { id: "nao-oficial", codigo: "1.99", descricao: "Categoria sintética fora do manifesto", natureza: "receita", ativo: true, aceita_lancamentos: true },
] as never;

function montar(contasPermitidas = ["11111111-1111-4111-8111-111111111111"]) {
  const executar = vi.fn().mockResolvedValue({ estado: "confirmada", id: "x" });
  const seguro = { pendente: null, bloqueio: false, ocupado: false, mensagem: null, executar } as never;
  render(<NovoLancamento oficiais={{ contas: contasPermitidas, categorias: ["r", "d"] }} planos={planos} seguro={seguro} hoje="2026-11-02" onCancel={() => {}} />);
  return executar;
}

beforeEach(() => { Element.prototype.scrollIntoView = vi.fn(); });

async function preencher(tipo: "entrada" | "saida") {
  if (tipo === "saida") fireEvent.click(screen.getByRole("radio", { name: "Despesa" }));
  fireEvent.change(screen.getByLabelText("Valor"), { target: { value: "1.234,56" } });
  fireEvent.change(screen.getByLabelText("Descrição"), { target: { value: "Documento somente local" } });
  fireEvent.change(screen.getByLabelText("Referência"), { target: { value: "externo:local-1450" } });
  fireEvent.click(screen.getByLabelText("Categoria do lançamento"));
  fireEvent.click(await screen.findByRole("option", { name: tipo === "entrada" ? "1.01 · Conserto de televisores" : "2.01 · Compra de peças" }));
}

describe("Novo lançamento", () => {
  it("categoria numérica fora do manifesto oficial não pode ser selecionada", async () => {
    montar();
    fireEvent.click(screen.getByLabelText("Categoria do lançamento"));
    expect(await screen.findByRole("option", { name: "1.01 · Conserto de televisores" })).toBeTruthy();
    expect(screen.queryByRole("option", { name: /Categoria sintética fora do manifesto/ })).toBeNull();
  });
  it("controle não habilitado impede envio", async () => {
    const executar = montar([]);
    await preencher("entrada");
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /Registrar lançamento/ })); });
    expect(executar).not.toHaveBeenCalled();
  });
  it("bloqueia valor inválido sem chamar o banco", () => {
    const executar = montar();
    fireEvent.change(screen.getByLabelText("Valor"), { target: { value: "-5" } });
    fireEvent.click(screen.getByRole("button", { name: /Registrar lançamento/ }));
    expect(screen.getByRole("alert").textContent).toMatch(/valor válido/);
    expect(executar).not.toHaveBeenCalled();
  });
  it("exige categoria da natureza antes de enviar", () => {
    const executar = montar();
    fireEvent.change(screen.getByLabelText("Valor"), { target: { value: "10,00" } });
    fireEvent.click(screen.getByRole("button", { name: /Registrar lançamento/ }));
    expect(screen.getByRole("alert").textContent).toMatch(/categoria de receita/);
    expect(executar).not.toHaveBeenCalled();
  });
  it.each(["entrada", "saida"] as const)("envia %s pelo envio seguro com valor exato, categoria compatível e chave original", async (tipo) => {
    const executar = montar();
    await preencher(tipo);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /Registrar lançamento/ })); });
    expect(executar).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      tipo, valor: "1234.56", plano: tipo === "entrada" ? "r" : "d", data: "2026-11-02",
      referencia: "externo:local-1450", chave: expect.stringMatching(/^[a-f0-9-]{36}$/),
    }));
    expect(executar.mock.calls[0]?.[0]).not.toHaveProperty("origem");
    expect(executar.mock.calls[0]?.[0]).not.toHaveProperty("destino");
  });
});
