import { z } from "zod";

/**
 * Contratos de domínio da Etapa 02. Não persiste dados nem acessa produção.
 * Valores monetários são armazenados em centavos inteiros para evitar
 * erros de ponto flutuante.
 */
export const moneyCents = z.number().int().safe().nonnegative();
export const entityCode = z.string().trim().min(1).max(32).regex(/^[A-Za-z0-9._-]+$/);
export const entityName = z.string().trim().min(2).max(160);

export const accountNature = z.enum(["receita", "despesa", "ativo", "passivo", "patrimonio"]);
export const chartAccountSchema = z.object({
  id: z.string().uuid(),
  codigo: entityCode,
  descricao: entityName,
  natureza: accountNature,
  conta_pai_id: z.string().uuid().nullable(),
  aceita_lancamentos: z.boolean(),
  ativo: z.boolean(),
}).strict();
export type ChartAccount = z.infer<typeof chartAccountSchema>;

export const costCenterSchema = z.object({
  id: z.string().uuid(),
  codigo: entityCode,
  descricao: entityName,
  responsavel: z.string().trim().max(160).nullable(),
  ativo: z.boolean(),
}).strict();
export type CostCenter = z.infer<typeof costCenterSchema>;

export const financialAccountSchema = z.object({
  id: z.string().uuid(),
  nome: entityName,
  tipo: z.enum(["banco", "caixa"]),
  moeda: z.literal("BRL"),
  saldo_inicial_centavos: z.number().int().safe(),
  data_saldo_inicial: z.iso.date(),
  ativo: z.boolean(),
}).strict();
export type FinancialAccount = z.infer<typeof financialAccountSchema>;

export const transferSchema = z.object({
  idempotency_key: z.string().uuid(),
  conta_origem_id: z.string().uuid(),
  conta_destino_id: z.string().uuid(),
  valor_centavos: moneyCents.positive(),
  data_operacao: z.iso.date(),
  observacao: z.string().trim().max(500).optional(),
}).strict().refine(
  (value) => value.conta_origem_id !== value.conta_destino_id,
  { path: ["conta_destino_id"], message: "A conta de destino deve ser diferente da origem." },
);
export type FinancialTransfer = z.infer<typeof transferSchema>;

/** Validadores não substituem autenticação, RLS ou transações atômicas. */
export function validateTransfer(input: unknown): FinancialTransfer {
  return transferSchema.parse(input);
}
