import { centavos, decimal, type OperacaoHistorico } from "./tesouraria";

export type Periodo = "hoje" | "7dias" | "mes" | "mes_anterior" | "personalizado";
export const PERIODOS: Record<Periodo, string> = { hoje: "Hoje", "7dias": "Últimos 7 dias", mes: "Mês atual", mes_anterior: "Mês anterior", personalizado: "Personalizado" };

/** Data de hoje (AAAA-MM-DD) no fuso de Manaus. */
export function hojeManaus(agora = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Manaus", year: "numeric", month: "2-digit", day: "2-digit" }).format(agora);
}
const iso = (d: Date) => d.toISOString().slice(0, 10);
export function intervalo(p: Exclude<Periodo, "personalizado">, hoje: string): { inicio: string; fim: string } {
  const [a = 0, m = 1, d = 1] = hoje.split("-").map(Number);
  if (p === "hoje") return { inicio: hoje, fim: hoje };
  if (p === "7dias") return { inicio: iso(new Date(Date.UTC(a, m - 1, d - 6))), fim: hoje };
  if (p === "mes") return { inicio: iso(new Date(Date.UTC(a, m - 1, 1))), fim: iso(new Date(Date.UTC(a, m, 0))) };
  return { inicio: iso(new Date(Date.UTC(a, m - 2, 1))), fim: iso(new Date(Date.UTC(a, m - 1, 0))) };
}

/** Aceita "1.234,56", "R$ 10,00" ou "10.5" e devolve decimal exato com 2 casas (sem Number). */
export function normalizarValor(entrada: string): string {
  let v = entrada.replace(/R\$|\s/g, "");
  if (v.includes(",")) v = v.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(v)) v = v.replace(/\./g, "");
  return decimal(v);
}

export interface Resumo { receitas: string; despesas: string; resultado: string; quantidade: number }
const paraDecimal = (c: bigint) => { const neg = c < 0n; const a = neg ? -c : c; return `${neg ? "-" : ""}${a / 100n}.${(a % 100n).toString().padStart(2, "0")}`; };
/** Somente entradas e saídas efetivas: aberturas, transferências, estornos e operações estornadas ficam fora. Cada operação conta uma vez. */
export function resumir(ops: OperacaoHistorico[]): Resumo {
  const vistos = new Set<string>();
  let r = 0n, d = 0n, q = 0;
  for (const o of ops) {
    if (vistos.has(o.id) || o.estornada || (o.tipo !== "entrada" && o.tipo !== "saida")) continue;
    vistos.add(o.id);
    const c = centavos(o.valor); const abs = c < 0n ? -c : c;
    if (o.tipo === "entrada") r += abs; else d += abs;
    q++;
  }
  return { receitas: paraDecimal(r), despesas: paraDecimal(d), resultado: paraDecimal(r - d), quantidade: q };
}
/** Aggregates have no individual numeric(18,2) ceiling. Never use Number. */
export function dinheiro(valor: string): string {
  if (!/^-?\d+(\.\d{1,2})?$/.test(valor)) throw new Error("Total monetário inválido.");
  const [inteiro = "0", fracao = ""] = valor.replace("-", "").split(".");
  const cents = BigInt(inteiro) * 100n + BigInt(fracao.padEnd(2, "0"));
  return `${valor.startsWith("-") && cents !== 0n ? "−" : ""}R$ ${(cents / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${(cents % 100n).toString().padStart(2, "0")}`;
}
export const FORMAS_PAGAMENTO = ["PIX", "Dinheiro", "Cartão de débito", "Cartão de crédito", "Transferência bancária", "Boleto", "Outros"];
