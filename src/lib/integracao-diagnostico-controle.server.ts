import "@tanstack/react-start/server-only";
import { z } from "zod";
import { autorizarDiagnostico, diagnosticarRecurso, type RecursoDiagnostico } from "./integracao-diagnostico.server";

type Banco = { rpc: (nome: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }> };
const reservaSchema = z.discriminatedUnion("permitida", [
  z.object({ permitida: z.literal(true), tentativa_id: z.string().uuid(), ordinal: z.number().int().min(1).max(5) }),
  z.object({ permitida: z.literal(false), categoria: z.enum(["concorrencia", "repeticao", "limite", "autorizacao_inativa"]) }),
]);

/** Reserva confirmada antes da única leitura; perda de confirmação nunca libera outra. */
export async function executarDiagnosticoLimitado(
  db: Banco, usuario: string, autorizacao: string, recurso: RecursoDiagnostico,
  finalizar: (args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }>,
  ler: typeof diagnosticarRecurso = diagnosticarRecurso,
) {
  const bloqueio = (status: number, categoria: string) => ({ status, corpo: { categoria, status_http: null } });
  if (!await autorizarDiagnostico(db)) return bloqueio(403, "acesso_negado");
  if (process.env["M5_DIAGNOSTICO_LEITURA_AUTORIZADA"] !== "true") return bloqueio(423, "leitura_nao_autorizada");
  let reserva;
  try {
    const resposta = await db.rpc("diagnostico_reservar", { p_autorizacao: autorizacao, p_recurso: recurso });
    if (resposta.error) return bloqueio(503, "controle_indisponivel");
    const parsed = reservaSchema.safeParse(resposta.data);
    if (!parsed.success) return bloqueio(503, "controle_indisponivel");
    reserva = parsed.data;
  } catch { return bloqueio(503, "controle_indisponivel"); }
  if (!reserva.permitida) return bloqueio(409, reserva.categoria);
  const inicio = Date.now();
  let resultado: Awaited<ReturnType<typeof diagnosticarRecurso>>;
  try { resultado = await ler(recurso); }
  catch { resultado = { identificador: reserva.tentativa_id, status_http: null, duracao_ms: Math.max(0, Date.now()-inicio), categoria: "falha_interna", tipo_excecao: null }; }
  const corpo = { ...resultado, identificador: reserva.tentativa_id, ordinal: reserva.ordinal };
  try {
    const conclusao = await finalizar({ p_tentativa: reserva.tentativa_id, p_usuario: usuario, p_http: corpo.status_http,
      p_duracao: corpo.duracao_ms, p_categoria: corpo.categoria, p_tipo: corpo.tipo_excecao });
    const ok = z.object({ registrada: z.literal(true) }).safeParse(conclusao.data);
    if (conclusao.error || !ok.success) return { status: 503, corpo: { ...corpo, auditoria: "confirmacao_pendente" } };
  } catch { return { status: 503, corpo: { ...corpo, auditoria: "confirmacao_pendente" } }; }
  return { status: 200, corpo: { ...corpo, auditoria: "registrada" } };
}