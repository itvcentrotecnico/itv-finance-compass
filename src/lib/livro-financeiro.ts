import { validarPedido, type Pedido } from "./tesouraria";
import type { OpcoesOficiais } from "./lancamentos-oficiais";

/** Validate without accepting account selection; only the DB resolves the ledger link. */
export function validarPedidoLivro(p: Pedido, oficiais: OpcoesOficiais): string | null {
  if (p.tipo !== "entrada" && p.tipo !== "saida") return "Somente receitas e despesas são permitidas.";
  if (p.origem !== undefined || p.destino !== undefined) return "Não é permitido escolher outra conta para o livro financeiro.";
  const id = oficiais.contas[0];
  if (oficiais.contas.length !== 1 || !id) return "Controle interno não habilitado.";
  if (!p.plano || !oficiais.categorias.includes(p.plano)) return "Selecione uma categoria oficial.";
  if (p.data < "2026-11-01") return "A data não pode ser anterior a 01/11/2026.";
  return validarPedido({ ...p, ...(p.tipo === "entrada" ? { destino: id } : { origem: id }) });
}