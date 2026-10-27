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
    if (!corpo || typeof corpo !== "object" || !("versao" in corpo) || corpo.versao !== "m5-diagnostico-controle-v3") return resultado("indisponivel", resposta.status);
    return { estado: "administrador_confirmado", status_http: resposta.status, versao: corpo.versao, leitura_preparada: "leitura_preparada" in corpo && corpo.leitura_preparada === true };
  } catch { return resultado("indisponivel"); }
}