import { supabase } from "@/integrations/supabase/client";
import { normalizarNumeroOS, referenciaDaOS } from "./lancamentos";
import type { Role } from "./auth/permissions";

export type Situacao = "aberta" | "parcial" | "vencida" | "paga" | "cancelada";
export const SITUACOES: Record<Situacao, string> = { aberta: "Em aberto", parcial: "Parcial", vencida: "Vencida", paga: "Paga", cancelada: "Cancelada" };
export interface Obrigacao { id: string; fornecedor: string; descricao: string; plano_conta_id: string; vencimento: string; referencia: string; cancelada: boolean; criado_por: string; criado_em: string; valor_centavos: number | string; pago_centavos: number | string; saldo_centavos: number | string; situacao: Situacao }
export interface Baixa { id: string; data_pagamento: string; valor_centavos: number | string; operacao_id: string; modo: "gerada" | "vinculada"; criado_por: string; criado_em: string }

export type TipoDocumento = "os" | "fatura" | "boleto" | "doc";
export const TIPOS_DOCUMENTO: Record<TipoDocumento, string> = { os: "Número da OS", fatura: "Fatura", boleto: "Boleto", doc: "Outro documento" };

/** Converte o preenchimento simples na referência aceita pelo Livro Único. null = inválido. */
export function referenciaDocumento(tipo: TipoDocumento, entrada: string): string | null {
  if (tipo === "os") { const n = normalizarNumeroOS(entrada); return n ? referenciaDaOS(n) : null; }
  const t = entrada.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9._/-]/g, "");
  if (!/^[a-z0-9]/.test(t) || t.length > 180) return null;
  return `externo:${tipo}-${t}`;
}
/** Exibição amigável: OS 1323, Fatura 55-A, Boleto 9, Documento X; outras ficam como estão. */
export function exibirDocumento(ref: string): string {
  const m = /^externo:(os|fatura|boleto|doc)-(.+)$/i.exec(ref);
  const t = (m?.[1] ?? "").toLowerCase() as TipoDocumento, n = m?.[2] ?? "";
  if (!m) return ref;
  const rot = { os: "OS", fatura: "Fatura", boleto: "Boleto", doc: "Documento" }[t];
  return `${rot} ${t === "os" ? n : n.toUpperCase()}`;
}
/** Centavos (inteiro exato) → "1000.00", sem Number em valores grandes. */
export function centavosParaDecimal(c: number | string | bigint): string {
  const v = BigInt(c); const neg = v < 0n; const a = neg ? -v : v;
  return `${neg ? "-" : ""}${a / 100n}.${(a % 100n).toString().padStart(2, "0")}`;
}
export const podeOperarCP = (r: Role | null) => r === "admin_geral" || r === "analista_financeiro" || r === "admin_financeiro";
export const podeCancelarCP = (r: Role | null) => r === "admin_geral";

const ERROS: Record<string, string> = {
  CP_SALDO: "O valor informado é maior que o saldo em aberto.",
  CP_VINCULO_USADO: "Este lançamento já está vinculado a outro pagamento.",
  CP_VINCULO_INCOMPATIVEL: "O lançamento escolhido não é uma despesa com o mesmo valor e categoria.",
  CP_PERMISSAO: "Seu perfil não tem permissão para esta ação.",
  TES_PERMISSAO: "Seu perfil não pode registrar despesas no Livro Único. Peça ao Administrador Geral ou à Analista Financeira.",
  CP_IDEMPOTENCIA: "Este envio já foi feito com outros dados. Feche e abra o formulário novamente.",
  CP_CATEGORIA: "Escolha uma categoria de despesa ativa.",
  CP_REFERENCIA: "Informe um número de documento válido.",
  CP_VALOR: "Informe um valor válido.", CP_DATA: "Informe uma data válida.",
  CP_COM_BAIXAS: "Obrigações com pagamentos não podem ser canceladas.", CP_CANCELADA: "Esta obrigação está cancelada.",
  TES_DATA_ANTERIOR_ABERTURA: "A data do pagamento não pode ser anterior a 01/11/2026.",
};
export function traduzirErroCP(e: unknown): string {
  const msg = String((e as { message?: string })?.message ?? e);
  for (const [k, v] of Object.entries(ERROS)) if (msg.includes(k)) return v;
  if (/does not exist|42P01|PGRST205|could not find/i.test(msg)) return "AGUARDANDO_INSTALACAO";
  return "Não foi possível concluir. Tente novamente.";
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fin = () => (supabase as any).schema("financeiro_hml");
async function run<T>(p: PromiseLike<{ data: T; error: unknown }>): Promise<T> {
  const { data, error } = await p; if (error) throw new Error(traduzirErroCP(error)); return data;
}
export const listarObrigacoes = () => run<Obrigacao[]>(fin().from("contas_pagar_resumo").select("*").order("vencimento"));
export const listarBaixas = (id: string) => run<Baixa[]>(fin().from("contas_pagar_baixas").select("id,data_pagamento,valor_centavos,operacao_id,modo,criado_por,criado_em").eq("conta_pagar_id", id).order("criado_em"));
export const despesasLivres = (plano: string, valor: string) => run<{ id: string; data_movimento: string; descricao: string }[]>(fin().from("tesouraria_operacoes").select("id,data_movimento,descricao").eq("tipo", "saida").eq("plano_conta_id", plano).eq("valor", valor).order("data_movimento", { ascending: false }).limit(50));
export const operacoesVinculadas = () => run<{ operacao_id: string }[]>(fin().from("contas_pagar_baixas").select("operacao_id"));
export const cadastrar = (p: Record<string, string>) => run<{ id: string; repetida: boolean }>(fin().rpc("cp_cadastrar", { p }));
export const baixar = (p: Record<string, string>) => run<{ id: string; operacao_id: string; repetida: boolean }>(fin().rpc("cp_baixar", { p }));
export const cancelar = (conta: string) => run<unknown>(fin().rpc("cp_cancelar", { p: { conta } }));

/** Envio pendente guardado no navegador: reenvio usa a mesma chave enquanto os dados forem iguais. */
export function chaveEstavel(storage: Pick<Storage, "getItem" | "setItem">, escopo: string, dados: Record<string, string>): string {
  const k = `itv-cp-pendente:${escopo}`; const corpo = JSON.stringify(dados);
  try { const p = JSON.parse(storage.getItem(k) ?? "null"); if (p && p.corpo === corpo) return p.chave; } catch { /* ignora */ }
  const chave = crypto.randomUUID(); storage.setItem(k, JSON.stringify({ chave, corpo })); return chave;
}
export const limparPendente = (storage: Pick<Storage, "removeItem">, escopo: string) => storage.removeItem(`itv-cp-pendente:${escopo}`);
