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
import type { ControleManual } from "./integracao-manual";

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
  manual: ControleManual;
  ultima: Sincronizacao | null;
  totais: Record<string, number>;
  automatica: { preparada: boolean; ultima: Sincronizacao | null };
}

export type ResultadoSincronizacao =
  | { estado: "desabilitada"; motivo: string }
  | { estado: "falha"; etapa: string }
  | { estado: "concluida"; consultados: number; novos: number; existentes: number; divergentes: number; enviados_conferencia: number };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any;

export const carregarEstadoIntegracao = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }): Promise<EstadoIntegracao> => {
  const db = (context.supabase as Db).schema("financeiro_hml");
  const { data: manual, error: erroManual } = await db.rpc("integracao_estado_manual");
  if (erroManual || !manual) throw new Error("Não foi possível confirmar os limites da sincronização manual. A execução permanece bloqueada.");
  const { data: ultima, error } = await db.from("integracao_sincronizacoes").select("id,iniciado_em,concluido_em,status,consultados,novos,existentes,divergentes,enviados_conferencia,erros").order("iniciado_em", { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error("Falha ao consultar o estado da integração.");
  const { data: itens, error: erroItens } = await db.from("integracao_itens").select("situacao");
  if (erroItens) throw new Error("Falha ao consultar os itens da integração.");
  const totais: Record<string, number> = {};
  for (const i of itens ?? []) totais[i.situacao] = (totais[i.situacao] ?? 0) + 1;
  // Coluna "modo" existe a partir da M5; antes dela a automática aparece como não preparada.
  const auto = await db.from("integracao_sincronizacoes").select("id,iniciado_em,concluido_em,status,consultados,novos,existentes,divergentes,enviados_conferencia,erros").eq("modo", "automatica").order("iniciado_em", { ascending: false }).limit(1).maybeSingle();
  return {
    manual: manual as ControleManual,
    configurada: Boolean(process.env["GESTAO_ITV_READ_TOKEN"]),
    ultima: (ultima as Sincronizacao | null) ?? null,
    totais,
    automatica: {
      preparada: !auto.error && Boolean(process.env["INTEGRACAO_CRON_SECRET"]),
      ultima: auto.error ? null : ((auto.data as Sincronizacao | null) ?? null),
    },
  };
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

/** Janela de leitura: do início do exercício até hoje (limite da origem: 366 dias). */
function janela(): { inicio: string; fim: string } {
  const hoje = new Date().toISOString().slice(0, 10);
  return { inicio: `${hoje.slice(0, 4)}-01-01`, fim: hoje };
}

/** Manual e automática delegam ao mesmo leitor, carregado apenas no servidor. */
export async function lerFonteGestao(inicio: string, fim: string): Promise<FonteGestao> {
  const { lerFonteGestaoServidor } = await import("./integracao-leitura.server");
  return lerFonteGestaoServidor(inicio, fim);
}

/** Lê a origem e conclui a sincronização já iniciada (manual ou automática) pela RPC idempotente. */
export async function executarSincronizacao(db: Db, syncId: string, inicio: string, fim: string): Promise<ResultadoSincronizacao> {
  let fonte: FonteGestao;
  try {
    fonte = await lerFonteGestao(inicio, fim);
  } catch (e) {
    const etapa = e instanceof Error ? e.message : "leitura_origem";
    await db.rpc("integracao_concluir", { p: { id: syncId, status: "falha", erros: [{ etapa }] } });
    return { estado: "falha", etapa };
  }
  const itens = montarItens(fonte);
  const { data: resultado, error } = await db.rpc("integracao_concluir", { p: { id: syncId, status: "concluida", itens } });
  if (error) {
    await db.rpc("integracao_concluir", { p: { id: syncId, status: "falha", erros: [{ etapa: "registro" }] } });
    return { estado: "falha", etapa: "registro" };
  }
  return { estado: "concluida", ...(resultado as object) } as ResultadoSincronizacao;
}

const dia = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const sincronizarGestaoItv = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ dia: dia.optional() }).parse(v ?? {}))
  .handler(async ({ data, context }): Promise<ResultadoSincronizacao> => {
  const db = (context.supabase as Db).schema("financeiro_hml");
  if (!process.env["GESTAO_ITV_READ_TOKEN"]) return { estado: "desabilitada", motivo: "Token de leitura ainda não configurado. A integração permanece desabilitada." };

  // Permissão e bloqueio de simultaneidade decididos pelo banco.
  const { data: syncId, error: erroInicio } = await db.rpc("integracao_iniciar");
  if (erroInicio) {
    const m = String(erroInicio.message);
    if (m.includes("INT_PERMISSAO")) throw new Error("Seu perfil não pode sincronizar a integração.");
    if (m.includes("INT_HORARIO_MANUAL")) throw new Error("Sincronização manual disponível somente das 18h30 às 23h59, horário de Manaus.");
    if (m.includes("INT_SUCESSO_DIARIO")) throw new Error("Já houve uma sincronização manual bem-sucedida hoje. Consulte a última execução. Nova sincronização disponível às 18h30 de amanhã, horário de Manaus.");
    if (m.includes("INT_EM_ANDAMENTO")) throw new Error("Já existe uma sincronização em andamento. Aguarde alguns minutos.");
    throw new Error("Falha ao iniciar a sincronização.");
  }
  const { inicio, fim } = data.dia ? { inicio: data.dia, fim: data.dia } : janela();
  return executarSincronizacao(db, syncId as string, inicio, fim);
});
