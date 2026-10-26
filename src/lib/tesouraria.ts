import type { Role } from "./auth/permissions";

export type TipoOperacao = "abertura" | "entrada" | "saida" | "transferencia" | "estorno";
export const TIPOS: Record<TipoOperacao, string> = { abertura: "Saldo inicial", entrada: "Entrada", saida: "Saída", transferencia: "Transferência", estorno: "Estorno" };
export interface ContaFinanceira { id: string; nome: string; tipo: "banco" | "caixa"; moeda: string; ativo: boolean; banco: string | null; agencia: string | null; numero_conta: string | null; data_saldo_inicial: string; saldo_inicial_centavos: string; saldo: string }
export interface LinhaExtrato { id: string; movimento_id: string; tipo: TipoOperacao; data: string; descricao: string; conta_nome: string; conta_id: string; direcao: "credito" | "debito"; valor: string; plano_id: string | null; centro_id: string | null; classificacao: { codigo: string; descricao: string; natureza: string } | null; original: string | null; tipo_original: TipoOperacao | null; estornada: boolean; justificativa: string | null; criado_por: string; criado_em: string }
export interface Extrato { linhas: LinhaExtrato[]; total: number; saldo_anterior: string; saldo_final: string; subtotal: string }
export interface EfeitoOperacao { id: string; conta_id: string; direcao: "credito" | "debito"; valor: string }
export interface OperacaoHistorico { id: string; tipo: TipoOperacao; data_movimento: string; descricao: string; valor: string; conta_origem_id: string | null; conta_destino_id: string | null; plano_conta_id: string | null; centro_custo_id: string | null; classificacao_snapshot: LinhaExtrato["classificacao"]; operacao_original_id: string | null; justificativa: string | null; criado_por: string; criado_em: string; efeitos: EfeitoOperacao[]; estornada: boolean }
export interface HistoricoOperacoes { total: number; operacoes: OperacaoHistorico[] }
export type ResultadoEnvio = { estado: "confirmada"; id: string } | { estado: "rejeitada" | "incerta"; mensagem: string };
/** Only an explicit PostgreSQL response proves rollback; network/provider errors do not. */
export function resultadoErro(err: { code?: string; message?: string }): ResultadoEnvio {
  const definitivo = err.code === "P0001" || /^22\w{3}$|^23\w{3}$|^42501$|^40P01$|^40001$/.test(err.code ?? "");
  return { estado: definitivo && !err.message?.includes("TES_IDEMPOTENCIA") ? "rejeitada" : "incerta", mensagem: erroTesouraria(err) };
}
export interface Filtros { conta?: string; inicio?: string; fim?: string; tipo?: string; plano?: string; pagina: number }
export interface Pedido { tipo: TipoOperacao; chave: string; data: string; descricao: string; valor?: string; nome?: string; conta_tipo?: string; banco?: string; agencia?: string; numero_conta?: string; origem?: string; destino?: string; plano?: string; centro?: string; original?: string; justificativa?: string }
export const podeOperar = (role: Role | null) => role === "admin_geral" || role === "admin_financeiro" || role === "analista_financeiro";
export const podeEstornar = (role: Role | null) => role === "admin_geral" || role === "admin_financeiro";

/** Decimal string ↔ integer cents: never convert financial values to Number. */
export function decimal(valor: string, negativo = false): string {
  const v = valor.trim().replace(",", ".");
  if (!(negativo ? /^-?\d{1,16}(\.\d{1,2})?$/ : /^\d{1,16}(\.\d{1,2})?$/).test(v)) throw new Error("Informe um valor sem separador de milhar e com até duas casas decimais.");
  const [inteiro = "0", fracao = ""] = v.split(".");
  return `${inteiro.replace(/^(-?)0+(?=\d)/, "$1")}.${fracao.padEnd(2, "0")}`;
}
export function centavos(valor: string): bigint {
  const v = decimal(valor, true);
  const negativo = v.startsWith("-");
  const inteiro = BigInt(v.replace("-", "").replace(".", ""));
  return negativo ? -inteiro : inteiro;
}
export function dinheiro(valor: string): string {
  const cents = centavos(valor);
  const abs = cents < 0n ? -cents : cents;
  const parte = (abs / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${cents < 0n ? "−" : ""}R$ ${parte},${(abs % 100n).toString().padStart(2, "0")}`;
}
export function validarPedido(p: Pedido, contas: ContaFinanceira[] = []): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.data)) return "Informe a data da operação.";
  if (p.descricao.trim().length < 2 || p.descricao.trim().length > 500) return "Descrição: de 2 a 500 caracteres.";
  if (p.tipo === "estorno") return (p.justificativa?.trim().length ?? 0) < 5 ? "Informe uma justificativa com ao menos 5 caracteres." : null;
  try { if (p.tipo !== "abertura" && centavos(decimal(p.valor ?? "")) <= 0n) return "O valor deve ser maior que zero."; else decimal(p.valor ?? "", p.tipo === "abertura"); } catch (e) { return e instanceof Error ? e.message : "Valor inválido."; }
  if (p.tipo === "abertura") return (p.nome?.trim().length ?? 0) < 2 ? "Informe o nome da conta." : null;
  if (p.tipo === "transferencia" && (!p.origem || !p.destino || p.origem === p.destino)) return "Escolha duas contas diferentes.";
  if (p.tipo === "entrada" && !p.destino || p.tipo === "saida" && !p.origem) return "Selecione uma conta financeira.";
  if ((p.tipo === "entrada" || p.tipo === "saida") && !p.plano) return "Selecione uma classificação contábil.";
  for (const id of [p.origem, p.destino].filter(Boolean)) {
    const c = contas.find((c) => c.id === id);
    if (c && !c.ativo) return "A conta financeira está inativa.";
    if (c && p.data < c.data_saldo_inicial) return "A data não pode ser anterior à abertura da conta.";
  }
  return null;
}
export function erroTesouraria(err: unknown): string {
  const msg = (err as { message?: string })?.message ?? "";
  const regras: Record<string, string> = { TES_PERMISSAO: "Seu perfil não permite esta operação.", TES_CONTA_INATIVA: "A conta financeira está inativa. Reative-a antes de operar.", TES_CLASSIFICACAO: "A classificação está inativa, inexistente ou não aceita lançamentos.", TES_CENTRO: "O centro de custo está inativo ou não foi encontrado.", TES_MESMA_CONTA: "A transferência exige duas contas diferentes e não aceita classificação.", TES_IDEMPOTENCIA: "A identificação deste envio já está vinculada a outros dados. Mantenha o envio pendente e confira o histórico.", TES_JA_ESTORNADA: "Esta operação já foi estornada.", TES_JUSTIFICATIVA: "Informe uma justificativa com ao menos 5 caracteres.", TES_DATA: "Confira a data: ela não pode anteceder a abertura ou a operação estornada.", TES_VALOR: "Informe um valor válido com até duas casas decimais.", TES_NATUREZA: "Uma classificação utilizada não pode mudar de natureza.", TES_ABERTURA_IMUTAVEL: "O saldo inicial não pode ser alterado diretamente.", TES_IMUTAVEL: "Use um estorno para corrigir esta operação." };
  for (const [k, v] of Object.entries(regras)) if (msg.includes(k)) return v;
  if (/42501|permission|row-level|unauthorized/i.test(msg)) return "Acesso não autorizado. Confira sua sessão e seu perfil.";
  return "Não foi possível concluir. Confira o extrato e tente novamente com os mesmos dados.";
}