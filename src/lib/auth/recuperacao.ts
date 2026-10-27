/** Regras puras do fluxo de recuperação/convite de senha (testáveis sem navegador). */

/** Domínio oficial do ITV Financeiro: todo link de e-mail aponta para cá. */
export const DOMINIO_OFICIAL = "https://itv-financeiro.lovable.app";

/** Endereço de retorno do link; em ambiente local (localhost) mantém a própria origem para testes. */
export function urlRetorno(caminho: "/redefinir-senha" | "/definir-senha", origemAtual?: string): string {
  const local = origemAtual && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origemAtual);
  return `${local ? origemAtual : DOMINIO_OFICIAL}${caminho}`;
}

export type LeituraLink =
  | { tipo: "erro"; motivo: "expirado" | "invalido" }
  | { tipo: "token_hash"; tokenHash: string; otpTipo: "recovery" | "invite" }
  | { tipo: "sessao_no_link" }
  | { tipo: "nenhum" };

/** Interpreta os parâmetros que o Supabase coloca no link (hash ou query). */
export function lerLink(search: string, hash: string): LeituraLink {
  const q = new URLSearchParams(search.replace(/^\?/, ""));
  const h = new URLSearchParams(hash.replace(/^#/, ""));
  const get = (k: string) => h.get(k) ?? q.get(k);
  const erro = get("error") || get("error_code");
  if (erro) {
    const texto = `${get("error_code") ?? ""} ${get("error_description") ?? ""}`.toLowerCase();
    return { tipo: "erro", motivo: texto.includes("expired") || texto.includes("otp_expired") ? "expirado" : "invalido" };
  }
  const tokenHash = q.get("token_hash");
  const t = q.get("type");
  if (tokenHash && (t === "recovery" || t === "invite")) return { tipo: "token_hash", tokenHash, otpTipo: t };
  if (h.get("access_token") || q.get("code")) return { tipo: "sessao_no_link" };
  return { tipo: "nenhum" };
}

export function mensagemLinkInvalido(motivo: "expirado" | "invalido" | "sem_link"): string {
  if (motivo === "expirado") return "Este link expirou ou já foi usado. Cada link vale uma única vez. Solicite um novo link.";
  if (motivo === "sem_link") return "Abra esta página pelo link mais recente recebido por e-mail.";
  return "Link inválido. Solicite um novo link de recuperação.";
}

/** Mensagem do pedido de recuperação: só limites e falhas de conexão são revelados (não expõe se o e-mail existe). */
export function mensagemEnvio(erro?: { status?: number; code?: string; message?: string } | null): string | null {
  if (!erro) return null;
  const m = `${erro.code ?? ""} ${erro.message ?? ""}`.toLowerCase();
  if (erro.status === 429 || m.includes("rate limit") || m.includes("over_email_send_rate_limit"))
    return "Limite de envio de e-mails atingido. Aguarde cerca de 1 hora antes de pedir um novo link e use o e-mail mais recente.";
  if (m.includes("network") || m.includes("fetch")) return "Falha de conexão. Verifique a internet e tente novamente.";
  return null;
}
