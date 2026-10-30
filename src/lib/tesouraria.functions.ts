import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { erroTesouraria, resultadoErro, type ContaFinanceira, type Extrato, type HistoricoOperacoes, type ResultadoEnvio } from "./tesouraria";
import { erroConferencia } from "./conferencia-operacional";
import { erroSolicitacao } from "./tesouraria-solicitacoes";

const pedidoSchema = z.object({ tipo: z.enum(["abertura", "entrada", "saida", "transferencia", "estorno"]), chave: z.string().uuid(), data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), descricao: z.string().trim().min(2).max(500), valor: z.string().optional(), nome: z.string().trim().max(160).optional(), conta_tipo: z.enum(["banco", "caixa"]).optional(), banco: z.string().trim().max(120).optional(), agencia: z.string().trim().max(32).optional(), numero_conta: z.string().trim().max(64).optional(), origem: z.string().uuid().optional(), destino: z.string().uuid().optional(), plano: z.string().uuid().optional(), centro: z.string().uuid().optional(), original: z.string().uuid().optional(), justificativa: z.string().trim().max(500).optional(), referencia: z.string().trim().max(200).optional() });
const filtroSchema = z.object({ conta: z.string().optional(), inicio: z.string().optional(), fim: z.string().optional(), tipo: z.string().optional(), plano: z.string().optional(), pagina: z.number().int().min(0).max(100000) });

export const carregarTesouraria = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  // The existing custom schema is not generated into Database.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = (context.supabase as any).schema("financeiro_hml");
  const { data, error } = await db.rpc("tesouraria_saldos");
  if (error) throw new Error(erroTesouraria(error));
  return data as ContaFinanceira[];
});
export const carregarExtrato = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((v: unknown) => filtroSchema.parse(v)).handler(async ({ data, context }) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = (context.supabase as any).schema("financeiro_hml");
  const { data: result, error } = await db.rpc("tesouraria_extrato", { p: data });
  if (error) throw new Error(erroTesouraria(error));
  return result as Extrato;
});
export const registrarTesouraria = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((v: unknown) => pedidoSchema.parse(v)).handler(async ({ data, context }) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = (context.supabase as any).schema("financeiro_hml");
  const rpc = data.tipo === "abertura" ? "tesouraria_criar_conta" : data.tipo === "transferencia" ? "tesouraria_transferir" : data.tipo === "estorno" ? "tesouraria_estornar" : "tesouraria_lancar";
  const { data: result, error } = await db.rpc(rpc, { p: data });
  if (error) return { ...resultadoErro(error), mensagem: erroSolicitacao(error) ?? erroTesouraria(error) } as ResultadoEnvio;
  return { estado: "confirmada", id: result.id } as ResultadoEnvio;
});
export const consultarEnvioTesouraria = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((v: unknown) => z.object({ chave: z.string().uuid() }).parse(v)).handler(async ({ data, context }) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = (context.supabase as any).schema("financeiro_hml");
  const { data: result, error } = await db.from("tesouraria_operacoes").select("id").eq("criado_por", context.userId).eq("chave_idempotencia", data.chave).maybeSingle();
  if (error) throw new Error(erroTesouraria(error));
  if (result) return result as { id: string };
  const { data: solicitacao, error: falha } = await db.from("tesouraria_solicitacoes").select("id").eq("criado_por", context.userId).eq("chave", data.chave).maybeSingle();
  if (falha) throw new Error(erroTesouraria(falha));
  return solicitacao as { id: string } | null;
});
export const carregarHistoricoTesouraria = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((v: unknown) => filtroSchema.parse(v)).handler(async ({ data, context }) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = (context.supabase as any).schema("financeiro_hml");
  const { data: result, error } = await db.rpc("tesouraria_historico_operacoes", { p: data });
  if (error) throw new Error(erroTesouraria(error));
  const historico = result as HistoricoOperacoes;
  const ids = historico.operacoes.map((o) => o.id);
  const estornadas = new Set<string>();
  if (ids.length) {
    const { data: reversoes, error: falha } = await db.from("tesouraria_operacoes").select("operacao_original_id").in("operacao_original_id", ids);
    if (falha) throw new Error(erroTesouraria(falha));
    for (const r of reversoes ?? []) estornadas.add(r.operacao_original_id);
  }
  return { ...historico, operacoes: historico.operacoes.map((o) => ({ ...o, estornada: estornadas.has(o.id) })) };
});const idSchema = z.object({ id: z.string().uuid() });
/** Conciliated review record → one treasury operation; retry-safe (DB row lock + link). */
export const lancarConferencia = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((v: unknown) => idSchema.extend({ versao: z.string().regex(/^\d+$/) }).parse(v)).handler(async ({ data, context }) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = (context.supabase as any).schema("financeiro_hml");
  const { data: result, error } = await db.rpc("tesouraria_lancar_conferencia", { p: data });
  if (error) return { ...resultadoErro(error), mensagem: erroConferencia(error) } as ResultadoEnvio;
  return { estado: "confirmada", id: result.id } as ResultadoEnvio;
});
export const habilitarConta = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((v: unknown) => idSchema.extend({ chave: z.string().uuid(), data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), valor: z.string().regex(/^-?\d{1,16}\.\d{2}$/), responsavel: z.string().trim().min(2).max(160) }).parse(v)).handler(async ({ data, context }) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = (context.supabase as any).schema("financeiro_hml");
  const { data: result, error } = await db.rpc("tesouraria_habilitar_conta", { p: data });
  if (error) return resultadoErro(error);
  return { estado: "confirmada", id: result.id } as ResultadoEnvio;
});
