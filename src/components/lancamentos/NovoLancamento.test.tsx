import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NovoLancamento } from "./LancamentosPanel";

vi.mock("@/lib/tesouraria.functions", () => ({ carregarTesouraria: vi.fn(), carregarHistoricoTesouraria: vi.fn(), verificarContratoLancamento: vi.fn() }));
vi.mock("@/components/tesouraria/TesourariaPanel", () => ({ tesourariaOptions: {} }));

const contas = [{ id: "11111111-1111-4111-8111-111111111111", nome: "Sicredi", tipo: "banco", moeda: "BRL", ativo: true, banco: null, agencia: null, numero_conta: null, data_saldo_inicial: "2026-11-01", saldo_inicial_centavos: "0", saldo: "0.00" }] as never;
const planos = [
  { id: "r", codigo: "1.01", descricao: "Conserto de televisores", natureza: "receita", ativo: true, aceita_lancamentos: true },
  { id: "s", codigo: "1", descricao: "RECEITAS OPERACIONAIS", natureza: "receita", ativo: true, aceita_lancamentos: false },
  { id: "d", codigo: "2.01", descricao: "Compra de peças", natureza: "despesa", ativo: true, aceita_lancamentos: true },
] as never;

function montar() {
  const executar = vi.fn().mockResolvedValue({ estado: "confirmada", id: "x" });
  const seguro = { pendente: null, bloqueio: false, ocupado: false, mensagem: null, executar } as never;
  render(<NovoLancamento contas={contas} planos={planos} seguro={seguro} hoje="2026-11-02" onCancel={() => {}} />);
  return executar;
}

describe("Novo lançamento", () => {
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
});
