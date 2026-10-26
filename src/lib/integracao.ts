/**
 * Integração GESTÃO ITV → ITV FINANCEIRO HML.
 * Lógica pura de normalização: sem acesso a banco, rede ou ambiente.
 * A sincronização só registra itens e conferências; nunca gera movimentações
 * financeiras (exclusivo da tesouraria_lancar_conferencia, após conciliação).
 */

export type FormaConferencia = "dinheiro" | "pix" | "credito" | "debito" | "parcelado" | "boleto" | "misto" | "indefinida";
export type TipoItem = "pagamento" | "recebimento_titulo" | "titulo_aberto";

export interface ResumoItem {
  data: string;
  valor_bruto: string;
  valor_liquido?: string | null;
  forma: FormaConferencia;
  descricao: string;
  os?: string | null;
  cliente?: string | null;
  contexto?: string;
  boleto_vencimento?: string | null;
}

export interface ItemIntegracao {
  referencia: string;
  tipo: TipoItem;
  canonico: string;
  resumo: ResumoItem;
}

/** Referência única de origem: projeto + tabela + UUID do registro de origem. */
export function referenciaOrigem(tabela: string, id: string): string {
  return `gestao_itv:${tabela}:${id}`;
}

/** Mapeia o nome da forma de pagamento do GESTÃO ITV para a forma da conferência. */
export function mapearForma(nome: string | null | undefined, parcelas?: number | null): FormaConferencia {
  const n = (nome ?? "").trim().toLowerCase();
  if (!n) return "indefinida";
  if (n.includes("dinheiro")) return "dinheiro";
  if (n === "pix" || n.includes("pix")) return "pix";
  if (n.includes("boleto")) return "boleto";
  if (n.includes("débito") || n.includes("debito")) return "debito";
  if (n.includes("crédito") || n.includes("credito")) return (parcelas ?? 1) > 1 ? "parcelado" : "credito";
  return "indefinida";
}

/** Texto canônico estável: mesma entrada → mesma string; qualquer mudança → string diferente. */
export function textoCanonico(resumo: ResumoItem): string {
  return [
    resumo.data,
    resumo.valor_bruto,
    resumo.valor_liquido ?? "",
    resumo.forma,
    resumo.descricao,
    resumo.os ?? "",
    resumo.cliente ?? "",
    resumo.boleto_vencimento ?? "",
  ].join("|");
}

function valorValido(v: unknown): v is string {
  return typeof v === "string" && /^\d{1,16}\.\d{2}$/.test(v) && v !== "0.00";
}

function liquidoValido(liq: unknown, bruto: string): string | null {
  if (typeof liq !== "string" || !/^\d{1,16}\.\d{2}$/.test(liq)) return null;
  const l = Number(liq);
  const b = Number(bruto);
  return l > 0 && l <= b ? liq : null;
}

function descricaoDe(os: string | null, cliente: string | null, fallback: string | null): string {
  const partes = [os ? `OS ${os}` : null, cliente].filter(Boolean);
  const d = partes.length ? partes.join(" · ") : (fallback ?? "").trim();
  return d.length >= 2 ? d.slice(0, 500) : "Recebimento GESTÃO ITV";
}

/* Formas dos registros lidos do GESTÃO ITV (somente campos usados). */
export interface FonteGestao {
  formas: { id: string; nome: string }[];
  lancamentos: { id: string; data_lancamento: string; os: string | null; cliente: string | null; descricao: string | null; grupo_receita: string | null; status: string }[];
  pagamentos: { id: string; lancamento_id: string; forma_pagamento_id: string | null; valor: number | string; parcelas: number | null; valor_liquido: number | string | null }[];
  recebimentos: { id: string; conta_receber_id: string; data_recebimento: string; valor: number | string; forma_pagamento_id: string | null; referencia: string | null; estorno_de_id: string | null }[];
  titulosAbertos: { id: string; os: string | null; cliente: string | null; valor_original: number | string; saldo: number | string; vencimento: string | null }[];
}

function decimal(v: number | string): string {
  return typeof v === "number" ? v.toFixed(2) : v;
}

/**
 * Monta os itens de integração a partir dos registros da origem.
 * Regras:
 * - Cada pagamento de caixa é um recebimento efetivo (pagamento misto → um item por pagamento).
 * - Pagamentos de lançamentos cancelados/estornados são ignorados (a reversão não é receita).
 * - Cada recebimento de título é um recebimento efetivo; reversões (estorno_de_id) são ignoradas.
 * - Título em aberto é apenas informativo: nunca vira conferência nem receita.
 */
export function montarItens(fonte: FonteGestao): ItemIntegracao[] {
  const formas = new Map(fonte.formas.map((f) => [f.id, f.nome]));
  const lancamentos = new Map(fonte.lancamentos.map((l) => [l.id, l]));
  const itens: ItemIntegracao[] = [];

  for (const p of fonte.pagamentos) {
    const l = lancamentos.get(p.lancamento_id);
    if (!l || l.status === "cancelado" || l.status === "estornado") continue;
    const bruto = decimal(p.valor);
    if (!valorValido(bruto)) continue;
    const resumo: ResumoItem = {
      data: l.data_lancamento,
      valor_bruto: bruto,
      valor_liquido: p.valor_liquido == null ? null : liquidoValido(decimal(p.valor_liquido), bruto),
      forma: mapearForma(p.forma_pagamento_id ? formas.get(p.forma_pagamento_id) : null, p.parcelas),
      descricao: descricaoDe(l.os, l.cliente, l.descricao),
      os: l.os,
      cliente: l.cliente,
      contexto: `Lançamento ${l.id} · ${l.grupo_receita ?? "sem grupo"}`,
    };
    itens.push({ referencia: referenciaOrigem("caixa_pagamentos", p.id), tipo: "pagamento", canonico: textoCanonico(resumo), resumo });
  }

  for (const r of fonte.recebimentos) {
    if (r.estorno_de_id) continue; // reversão: tratada pelo fluxo de estorno, nunca como receita
    const bruto = decimal(r.valor);
    if (!valorValido(bruto)) continue;
    const resumo: ResumoItem = {
      data: r.data_recebimento,
      valor_bruto: bruto,
      forma: mapearForma(r.forma_pagamento_id ? formas.get(r.forma_pagamento_id) : null),
      descricao: descricaoDe(null, null, r.referencia ? `Recebimento ${r.referencia}` : null),
      contexto: `Título ${r.conta_receber_id}`,
    };
    itens.push({ referencia: referenciaOrigem("contas_receber_recebimentos", r.id), tipo: "recebimento_titulo", canonico: textoCanonico(resumo), resumo });
  }

  for (const t of fonte.titulosAbertos) {
    const saldo = decimal(t.saldo);
    if (!valorValido(saldo)) continue;
    const resumo: ResumoItem = {
      data: t.vencimento ?? "2026-01-01",
      valor_bruto: decimal(t.valor_original),
      forma: "indefinida",
      descricao: descricaoDe(t.os, t.cliente, "Título em aberto"),
      os: t.os,
      cliente: t.cliente,
      contexto: `Título em aberto · saldo ${saldo}`,
      boleto_vencimento: t.vencimento,
    };
    itens.push({ referencia: referenciaOrigem("contas_receber", t.id), tipo: "titulo_aberto", canonico: textoCanonico(resumo), resumo });
  }

  return itens;
}
