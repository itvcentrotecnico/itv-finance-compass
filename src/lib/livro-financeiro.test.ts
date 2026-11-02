import { describe, expect, it } from "vitest";
import { validarPedidoLivro } from "./livro-financeiro";
import { lerOpcoesOficiais } from "./lancamentos-oficiais";
import { resumir, dinheiro } from "./lancamentos";
import type { OperacaoHistorico } from "./tesouraria";
const id = "00000000-0000-4000-8000-000000000001";
const oficiais = { contas: [id], categorias: ["r"] };
const pedido = { tipo: "entrada" as const, chave: id, data: "2026-11-01", descricao: "Teste local", valor: "10.00", plano: "r" };
describe("livro financeiro único", () => {
  it.each(["entrada", "saida"] as const)("aceita %s sem conta escolhida", (tipo) => expect(validarPedidoLivro({ ...pedido, tipo }, oficiais)).toBeNull());
  it.each(["origem", "destino"] as const)("rejeita atribuição de %s inclusive com UUID interno", (campo) => expect(validarPedidoLivro({ ...pedido, [campo]: id }, oficiais)).not.toBeNull());
  it("rejeita data anterior ao início contábil 01/11/2026", () => expect(validarPedidoLivro({ ...pedido, data: "2026-10-31" }, oficiais)).not.toBeNull());
  it("rejeita categoria fora da lista oficial", () => expect(validarPedidoLivro({ ...pedido, plano: "outra" }, oficiais)).not.toBeNull());
  it("rejeita mais de um controle interno", () => expect(validarPedidoLivro(pedido, { ...oficiais, contas: [id, "outro"] })).not.toBeNull());
  it("sonda V2.1 não habilita novo formulário", () => expect(lerOpcoesOficiais({ contrato: "tesouraria_lancar_minima_v2_1", contas: [id], categorias: [] })).toBeNull());
  it("receitas 100,10 e despesas 220,05 produzem resultado negativo formatado sem saldo bancário", () => {
    const resultado = resumir([{ id: "r", tipo: "entrada", valor: "100.10" }, { id: "d", tipo: "saida", valor: "220.05" }] as OperacaoHistorico[]);
    expect(resultado).toEqual({ receitas: "100.10", despesas: "220.05", resultado: "-119.95", quantidade: 2 });
    expect(dinheiro(resultado.resultado)).toBe("−R$ 119,95");
  });
});