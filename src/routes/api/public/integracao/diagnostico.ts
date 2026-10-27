import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/integracao/diagnostico")({
  server: { handlers: { GET: async ({ request }) => {
    const headers = { "Cache-Control": "no-store" };
    const responder = (status: number, corpo: unknown) => Response.json(corpo, { status, headers });
    const cab = request.headers.get("authorization") ?? "";
    if (!cab.startsWith("Bearer ") || cab.slice(7).split(".").length !== 3) return responder(401, { estado: "nao_autorizado" });
    const url = process.env["SUPABASE_URL"];
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
    if (!url || !key) return responder(503, { estado: "indisponivel" });
    const { createClient } = await import("@supabase/supabase-js");
    const db = createClient(url, key, { global: { headers: { Authorization: cab }, fetch: (input, init) => globalThis.fetch(input, init) }, auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await db.auth.getClaims(cab.slice(7));
    if (error || !data?.claims.sub) return responder(401, { estado: "nao_autorizado" });
    const { autorizarDiagnostico, diagnosticarRecurso, recursoDiagnostico, VERSAO_DIAGNOSTICO } = await import("@/lib/integracao-diagnostico.server");
    if (!await autorizarDiagnostico(db.schema("financeiro_hml"))) return responder(403, { estado: "acesso_negado" });
    const q = new URL(request.url).searchParams;
    if (q.size === 0) return responder(200, { versao: VERSAO_DIAGNOSTICO, leitura_preparada: false, limite_gets: 5 });
    const r = recursoDiagnostico.safeParse(q.get("recurso"));
    if (q.size !== 1 || !r.success) return responder(400, { estado: "parametros_invalidos" });
    // Não liberar apenas por flag: falta reserva durável para garantir cinco GETs
    // únicos entre abas, usuários e instâncias do servidor.
    return responder(200, { categoria: "leitura_nao_autorizada", status_http: null, limite_gets: 5 });
  } } },
});