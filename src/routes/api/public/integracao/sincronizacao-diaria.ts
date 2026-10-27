/**
 * Acionamento externo (cron-job.org) da sincronização diária GESTÃO ITV → HML.
 * Protegido por INTEGRACAO_CRON_SECRET (independente do token de leitura da origem).
 * Resposta sem dados financeiros: apenas a situação da execução.
 * O banco decide: identidade de servidor, uma execução por vez, uma conclusão por dia, limite de tentativas.
 */
import { createFileRoute } from "@tanstack/react-router";
import { janelaAutomatica, segredoConfere } from "@/lib/agendamento";

const resposta = (status: number, corpo: Record<string, unknown>) =>
  Response.json(corpo, { status, headers: { "Cache-Control": "no-store" } });

export const Route = createFileRoute("/api/public/integracao/sincronizacao-diaria")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const segredo = process.env["INTEGRACAO_CRON_SECRET"];
        if (!segredo) return resposta(503, { estado: "desabilitada" });
        const cab = request.headers.get("authorization") ?? "";
        const recebido = cab.startsWith("Bearer ") ? cab.slice(7) : null;
        if (!segredoConfere(recebido, segredo)) return resposta(401, { estado: "nao_autorizado" });
        if (!process.env["GESTAO_ITV_READ_TOKEN"]) return resposta(503, { estado: "desabilitada" });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { executarSincronizacao } = await import("@/lib/integracao.functions");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const db = (supabaseAdmin as any).schema("financeiro_hml");
        const { inicio, fim } = janelaAutomatica(new Date());

        const { data: inicioR, error } = await db.rpc("integracao_iniciar_automatica", { p_inicio: inicio, p_fim: fim });
        if (error) return resposta(500, { estado: "falha", etapa: "inicio" });
        if (inicioR?.pular) return resposta(200, { estado: "pulada", motivo: inicioR.motivo });

        const r = await executarSincronizacao(db, inicioR.id as string, inicio, fim);
        // Falha → 500 para o cron-job.org registrar; nova tentativa no próximo horário de reserva.
        if (r.estado === "falha") return resposta(500, { estado: "falha", etapa: r.etapa });
        return resposta(200, { estado: r.estado });
      },
    },
  },
});
