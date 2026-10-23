import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { erroTesouraria, type ContaFinanceira, type Extrato } from "./tesouraria";

const pedidoSchema = z.object({ tipo: z.enum(["abertura", "entrada", "saida", "transferencia", "estorno"]), chave: z.string().uuid(), data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), descricao: z.string().trim().min(2).max(500), valor: z.string().optional(), nome: z.string().trim().max(160).optional(), conta_tipo: z.enum(["banco", "caixa"]).optional(), banco: z.string().trim().max(120).optional(), agencia: z.string().trim().max(32).optional(), numero_conta: z.string().trim().max(64).optional(), origem: z.string().uuid().optional(), destino: z.string().uuid().optional(), plano: z.string().uuid().optional(), centro: z.string().uuid().optional(), original: z.string().uuid().optional(), justificativa: z.string().trim().max(500).optional() });
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
  if (error) throw new Error(erroTesouraria(error));
  return result as { id: string; conta_id: string; repetida: boolean };
});