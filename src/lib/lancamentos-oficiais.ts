/** IDs come only from the installed V2.1 contract, pinned to an approved manifest. */
export interface OpcoesOficiais { contas: string[]; categorias: string[] }
export const CONTRATO_LANCAMENTO = "tesouraria_lancar_minima_v2_1";
export function lerOpcoesOficiais(v: unknown): OpcoesOficiais | null {
  if (!v || typeof v !== "object") return null;
  const x = v as Record<string, unknown>;
  const ids = (a: unknown, total: number): a is string[] => Array.isArray(a) && a.length === total && new Set(a).size === total && a.every((id) => typeof id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));
  if (x['contrato'] !== CONTRATO_LANCAMENTO || !ids(x['contas'], 3) || !ids(x['categorias'], 14)) return null;
  return { contas: x['contas'], categorias: x['categorias'] };
}