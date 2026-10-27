import "@tanstack/react-start/server-only";
import { z } from "zod";
import { buscarPaginaM5, FalhaTransporte } from "./integracao-transporte.server";
import { janelaAutomatica } from "./agendamento";

export const VERSAO_DIAGNOSTICO = "m5-diagnostico-isolado-v1";
export const recursoDiagnostico = z.enum(["formas_pagamento", "recebimentos", "pagamentos", "recebimentos_titulos", "titulos"]);
export type RecursoDiagnostico = z.infer<typeof recursoDiagnostico>;
type Permissao = { rpc: (nome: string, args: { p: string[] }) => PromiseLike<{ data: unknown; error: unknown }> };

/** Verifica a permissão como o usuário; única leitura de banco é autorização existente. */
export async function autorizarDiagnostico(db: Permissao): Promise<boolean> {
  const { data, error } = await db.rpc("tem_papel", { p: ["admin_geral", "admin_financeiro"] });
  return !error && data === true;
}
export async function diagnosticarRecurso(recurso: RecursoDiagnostico) {
  const identificador = crypto.randomUUID();
  const iniciado = Date.now();
  const resultado = (status_http: number | null, categoria: string, tipo_excecao: string | null) => ({ identificador, status_http, duracao_ms: Math.max(0, Date.now() - iniciado), categoria, tipo_excecao });
  // Bloqueio por padrão: preparação/publicação nunca autoriza consulta real.
  if (process.env["M5_DIAGNOSTICO_LEITURA_AUTORIZADA"] !== "true") return resultado(null, "leitura_nao_autorizada", null);
  const base = process.env["GESTAO_ITV_URL"] || "https://itvcentrotecnico.lovable.app";
  const token = process.env["GESTAO_ITV_READ_TOKEN"];
  try {
    const u = new URL(base);
    if (u.protocol !== "https:" || u.username || u.password || u.search || u.hash || !token) return resultado(null, "configuracao_origem", null);
  } catch { return resultado(null, "configuracao_origem", null); }
  if (!token) return resultado(null, "configuracao_origem", null);
  const { inicio, fim } = janelaAutomatica(new Date());
  const q = new URLSearchParams({ recurso, inicio, fim, offset: "0", limite: "500" });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const r = await buscarPaginaM5(`${base.replace(/\/$/, "")}/api/public/integracao-financeiro?${q}`, token, controller.signal);
    if (!(r instanceof Response)) return resultado(null, "resposta_invalida_origem", null);
    if (!r.ok) return resultado(r.status, r.status === 401 ? "autenticacao_origem" : r.status === 403 ? "autorizacao_origem" : r.status === 429 ? "limite_origem" : r.status >= 500 ? "erro_interno_origem" : "http_origem", null);
    // Consome sem retornar corpo; não pagina, normaliza ou registra dados financeiros.
    try {
      const b = z.object({ dados: z.array(z.object({ id: z.string().min(1) }).passthrough()), recurso: recursoDiagnostico, inicio: z.string(), fim: z.string(), offset: z.coerce.number(), limite: z.coerce.number() }).safeParse(await r.json());
      if (!b.success || b.data.recurso !== recurso || b.data.inicio !== inicio || b.data.fim !== fim || b.data.offset !== 0 || b.data.limite !== 500 || b.data.dados.length > 500) return resultado(r.status, "resposta_invalida_origem", null);
      return resultado(r.status, "leitura_valida", null);
    } catch { return resultado(r.status, controller.signal.aborted ? "timeout_origem" : "resposta_invalida_origem", null); }
  } catch (erro) {
    return resultado(null, erro instanceof FalhaTransporte ? erro.diagnostico.categoria : "rede_origem", erro instanceof FalhaTransporte ? erro.diagnostico.tipo_excecao : "nao_identificado");
  } finally { clearTimeout(timer); }
}