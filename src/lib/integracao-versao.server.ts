import "@tanstack/react-start/server-only";
import { segredoConfere } from "./agendamento";

/** Consulta restrita à identidade técnica existente; não lê origem nem banco. */
export async function consultarVersaoIntegracao(request: Request): Promise<Response> {
  const headers = { "Cache-Control": "no-store" };
  const segredo = process.env["INTEGRACAO_CRON_SECRET"];
  if (!segredo) return Response.json({ estado: "desabilitada" }, { status: 503, headers });
  const cab = request.headers.get("authorization") ?? "";
  const recebido = cab.startsWith("Bearer ") ? cab.slice(7) : null;
  if (!segredoConfere(recebido, segredo)) return Response.json({ estado: "nao_autorizado" }, { status: 401, headers });
  const { REVISAO_LEITOR_HTTP } = await import("./integracao-leitura.server");
  if (new URL(request.url).searchParams.get("diagnostico") === "versao") {
    const { VERSAO_DIAGNOSTICO } = await import("./integracao-diagnostico.server");
    return Response.json({ versao_diagnostico: VERSAO_DIAGNOSTICO }, { headers });
  }
  return Response.json(REVISAO_LEITOR_HTTP, { headers });
}