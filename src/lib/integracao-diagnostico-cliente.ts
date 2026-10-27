import { supabase } from "@/integrations/supabase/client";

export type ValidacaoDiagnostico = {
  status_http: number | null;
  estado: "administrador_confirmado" | "sessao_necessaria" | "acesso_negado" | "indisponivel";
  versao: string | null;
  leitura_preparada: boolean;
};

/** Somente GET sem parâmetros: nunca aciona leitura da origem. */
export async function validarAcessoDiagnostico(): Promise<ValidacaoDiagnostico> {
  const resultado = (estado: ValidacaoDiagnostico["estado"], status_http: number | null = null): ValidacaoDiagnostico => ({ estado, status_http, versao: null, leitura_preparada: false });
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session?.access_token) return resultado("sessao_necessaria");
    const resposta = await fetch("/api/public/integracao/diagnostico", {
      method: "GET", headers: { Authorization: `Bearer ${data.session.access_token}` },
      cache: "no-store", redirect: "error", signal: AbortSignal.timeout(15_000),
    });
    if (resposta.status === 401) return resultado("sessao_necessaria", 401);
    if (resposta.status === 403) return resultado("acesso_negado", 403);
    if (!resposta.ok) return resultado("indisponivel", resposta.status);
    const corpo: unknown = await resposta.json();
    if (!corpo || typeof corpo !== "object" || !("versao" in corpo) || corpo.versao !== "m5-diagnostico-controle-v4") return resultado("indisponivel", resposta.status);
    return { estado: "administrador_confirmado", status_http: resposta.status, versao: corpo.versao, leitura_preparada: "leitura_preparada" in corpo && corpo.leitura_preparada === true };
  } catch { return resultado("indisponivel"); }
}
export const RECURSOS_DIAGNOSTICO = ["formas_pagamento", "recebimentos", "pagamentos", "recebimentos_titulos", "titulos"] as const;
export type ResultadoRecurso = {
  recurso: string; status_resposta: number | null; status_http: number | null; duracao_ms: number | null;
  categoria: string | null; tipo_excecao: string | null; identificador: string | null; auditoria: string | null;
};

/** Uma única passagem sequencial: nunca repete recurso; interrompe se o controle bloquear. */
export async function executarDiagnosticoSequencial(
  onResultado: (r: ResultadoRecurso) => void,
): Promise<{ estado: "concluido" | "sem_autorizacao" | "sessao_necessaria" | "interrompido" }> {
  const { data: s } = await supabase.auth.getSession();
  const token = s.session?.access_token;
  if (!token) return { estado: "sessao_necessaria" };
  const { data: aut } = await supabase.schema("financeiro_hml" as never).from("diagnostico_autorizacoes" as never)
    .select("id").eq("ativo", true).gt("encerra_em", new Date().toISOString()).limit(1).maybeSingle();
  const id = (aut as { id?: string } | null)?.id;
  if (!id) return { estado: "sem_autorizacao" };
  for (const recurso of RECURSOS_DIAGNOSTICO) {
    let r: ResultadoRecurso = { recurso, status_resposta: null, status_http: null, duracao_ms: null, categoria: "sem_resposta_financeiro", tipo_excecao: null, identificador: null, auditoria: null };
    try {
      const resp = await fetch(`/api/public/integracao/diagnostico?recurso=${recurso}&autorizacao=${id}`, {
        method: "GET", headers: { Authorization: `Bearer ${token}` }, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(60_000),
      });
      const c = (await resp.json().catch(() => ({}))) as Partial<ResultadoRecurso>;
      r = { recurso, status_resposta: resp.status, status_http: c.status_http ?? null, duracao_ms: c.duracao_ms ?? null,
        categoria: c.categoria ?? null, tipo_excecao: c.tipo_excecao ?? null, identificador: c.identificador ?? null, auditoria: c.auditoria ?? null };
    } catch { /* sem resposta: não repetir */ }
    onResultado(r);
    if (r.status_resposta !== 200) return { estado: "interrompido" };
  }
  return { estado: "concluido" };
}
