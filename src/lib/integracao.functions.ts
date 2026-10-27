/**
 * Integração GESTÃO ITV → ITV FINANCEIRO HML (somente leitura na origem).
 * Lê o endpoint protegido GET /api/public/integracao-financeiro do GESTÃO ITV com o
 * token de servidor GESTAO_ITV_READ_TOKEN; sem ele a conexão permanece desabilitada.
 * Nenhuma credencial vai ao navegador.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { montarItens, type FonteGestao } from "./integracao";

// Endereço publicado do GESTÃO ITV; GESTAO_ITV_URL (opcional) substitui.
const ORIGEM_URL_PADRAO = "https://itvcentrotecnico.lovable.app";

export interface Sincronizacao {
  id: string;
  iniciado_em: string;
  concluido_em: string | null;
  status: "em_andamento" | "concluida" | "falha";
  consultados: number;
  novos: number;
  existentes: number;
  divergentes: number;
  enviados_conferencia: number;
  erros: { etapa: string }[] | null;
}

export interface ItemIntegracaoLinha {
  id: string;
  referencia_origem: string;
  tipo: "pagamento" | "recebimento_titulo" | "titulo_aberto";
  situacao: "novo" | "existente" | "alterado" | "enviado_conferencia" | "possivel_duplicidade";
  resumo: { data?: string; valor_bruto?: string; forma?: string; descricao?: string; contexto?: string };
  criado_em: string;
}

export interface EstadoIntegracao {
  configurada: boolean;
  ultima: Sincronizacao | null;
  totais: Record<string, number>;
}

export type ResultadoSincronizacao =
  | { estado: "desabilitada"; motivo: string }
  | { estado: "falha"; etapa: string }
  | { estado: "concluida"; consultados: number; novos: number; existentes: number; divergentes: number; enviados_conferencia: number };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any;

export const carregarEstadoIntegracao = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }): Promise<EstadoIntegracao> => {
  const db = (context.supabase as Db).schema("financeiro_hml");
  const { data: ultima, error } = await db.from("integracao_sincronizacoes").select("id,iniciado_em,concluido_em,status,consultados,novos,existentes,divergentes,enviados_conferencia,erros").order("iniciado_em", { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error("Falha ao consultar o estado da integração.");
  const { data: itens, error: erroItens } = await db.from("integracao_itens").select("situacao");
  if (erroItens) throw new Error("Falha ao consultar os itens da integração.");
  const totais: Record<string, number> = {};
  for (const i of itens ?? []) totais[i.situacao] = (totais[i.situacao] ?? 0) + 1;
  return { configurada: Boolean(process.env["GESTAO_ITV_USUARIO"] && process.env["GESTAO_ITV_SENHA"]), ultima: (ultima as Sincronizacao | null) ?? null, totais };
});

export const carregarItensIntegracao = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ pagina: z.number().int().min(0).max(10000).default(0) }).parse(v))
  .handler(async ({ data, context }): Promise<{ itens: ItemIntegracaoLinha[]; pagina: number }> => {
    const db = (context.supabase as Db).schema("financeiro_hml");
    const desde = data.pagina * 50;
    const { data: itens, error } = await db.from("integracao_itens").select("id,referencia_origem,tipo,situacao,resumo,criado_em").order("criado_em", { ascending: false }).range(desde, desde + 49);
    if (error) throw new Error("Falha ao consultar os itens da integração.");
    return { itens: (itens ?? []) as ItemIntegracaoLinha[], pagina: data.pagina };
  });

type Linha = Record<string, unknown>;

/** Lê um recurso do endpoint protegido do GESTÃO ITV (somente GET, paginado). */
async function lerRecurso(base: string, token: string, recurso: string, inicio: string, fim: string): Promise<Linha[]> {
  const linhas: Linha[] = [];
  for (let offset = 0; ; offset += 500) {
    const q = new URLSearchParams({ recurso, inicio, fim, offset: String(offset), limite: "500" });
    const r = await fetch(`${base}/api/public/integracao-financeiro?${q}`, { method: "GET", headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) throw new Error(`${recurso}:${r.status}`);
    const corpo = (await r.json()) as { dados?: Linha[] };
    const dados = corpo.dados ?? [];
    linhas.push(...dados);
    if (dados.length < 500) return linhas;
  }
}

/** Janela de leitura: do início do exercício até hoje (limite da origem: 366 dias). */
function janela(): { inicio: string; fim: string } {
  const hoje = new Date().toISOString().slice(0, 10);
  return { inicio: `${hoje.slice(0, 4)}-01-01`, fim: hoje };
}

export const sincronizarGestaoItv = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }): Promise<ResultadoSincronizacao> => {
  const db = (context.supabase as Db).schema("financeiro_hml");
  const token = process.env["GESTAO_ITV_READ_TOKEN"];
  const base = (process.env["GESTAO_ITV_URL"] || ORIGEM_URL_PADRAO).replace(/\/$/, "");
  if (!token) return { estado: "desabilitada", motivo: "Token de leitura ainda não configurado. A integração permanece desabilitada." };

  // Permissão decidida pelo banco (admin_geral/admin_financeiro).
  const { data: syncId, error: erroInicio } = await db.rpc("integracao_iniciar");
  if (erroInicio) throw new Error(String(erroInicio.message).includes("INT_PERMISSAO") ? "Seu perfil não pode sincronizar a integração." : "Falha ao iniciar a sincronização.");

  const falhar = async (etapa: string): Promise<ResultadoSincronizacao> => {
    await db.rpc("integracao_concluir", { p: { id: syncId, status: "falha", erros: [{ etapa }] } });
    return { estado: "falha", etapa };
  };

  const { inicio, fim } = janela();
  let fonte: FonteGestao;
  try {
    const [formas, lancamentos, pagamentos, recebimentos, titulos] = await Promise.all([
      lerRecurso(base, token, "formas_pagamento", inicio, fim),
      lerRecurso(base, token, "recebimentos", inicio, fim),
      lerRecurso(base, token, "pagamentos", inicio, fim),
      lerRecurso(base, token, "recebimentos_titulos", inicio, fim),
      lerRecurso(base, token, "titulos", inicio, fim),
    ]);
    fonte = {
      formas: formas as FonteGestao["formas"],
      // A origem não expõe OS/cliente/descrição (dados pessoais excluídos).
      lancamentos: lancamentos.map((l) => ({ ...l, os: null, cliente: null, descricao: null })) as FonteGestao["lancamentos"],
      pagamentos: pagamentos as FonteGestao["pagamentos"],
      recebimentos: recebimentos.map((r) => ({ ...r, referencia: null })) as FonteGestao["recebimentos"],
      // Títulos em aberto: informativos; exigem identificador e saldo positivo.
      titulosAbertos: titulos.filter((t) => t.id && Number(t.saldo) > 0).map((t) => ({ ...t, os: null, cliente: null })) as FonteGestao["titulosAbertos"],
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    return falhar(msg.endsWith(":401") ? "autenticacao_origem" : "leitura_origem");
  }

  const itens = montarItens(fonte);
  const { data: resultado, error: erroConcluir } = await db.rpc("integracao_concluir", { p: { id: syncId, status: "concluida", itens } });
  if (erroConcluir) throw new Error("Falha ao registrar a sincronização.");
  return { estado: "concluida", ...(resultado as object) } as ResultadoSincronizacao;
});
