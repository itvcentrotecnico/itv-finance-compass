import "@tanstack/react-start/server-only";

export interface FalhaTransporteSegura { categoria: string; tipo_excecao: string }
export class FalhaTransporte extends Error {
  constructor(public readonly diagnostico: FalhaTransporteSegura) { super(diagnostico.categoria); }
}
function tipoSeguro(erro: unknown): string {
  const nome = erro && typeof erro === "object" ? (erro as { name?: unknown }).name : null;
  return typeof nome === "string" && ["TypeError", "Error", "AbortError", "TimeoutError", "DOMException"].includes(nome) ? nome : "nao_identificado";
}
function categoria(erro: unknown, abortado: boolean): string {
  const e = erro && typeof erro === "object" ? erro as { code?: unknown; cause?: unknown; name?: unknown } : {};
  const c = e.cause && typeof e.cause === "object" ? e.cause as { code?: unknown } : {};
  const codigo = e.code ?? c.code;
  if (abortado || e.name === "AbortError" || e.name === "TimeoutError" || ["ETIMEDOUT", "UND_ERR_CONNECT_TIMEOUT", "UND_ERR_HEADERS_TIMEOUT", "UND_ERR_BODY_TIMEOUT"].includes(String(codigo))) return "timeout_origem";
  if (["ECONNREFUSED", "ECONNRESET", "EPIPE", "UND_ERR_SOCKET"].includes(String(codigo))) return "conexao_origem";
  return "rede_origem";
}
/** Transporte comum: mantém contexto, GET, Bearer, redirect error e signal da M5. */
export async function buscarPaginaM5(url: string, token: string, signal: AbortSignal, buscar: typeof fetch = (input, init) => globalThis.fetch(input, init)): Promise<Response> {
  let pendente: Promise<Response>;
  try { pendente = buscar(url, { method: "GET", headers: { Authorization: `Bearer ${token}` }, redirect: "error", signal }); }
  catch (erro) { throw new FalhaTransporte({ categoria: "invocacao_origem", tipo_excecao: tipoSeguro(erro) }); }
  try { return await pendente; }
  catch (erro) { throw new FalhaTransporte({ categoria: categoria(erro, signal.aborted), tipo_excecao: tipoSeguro(erro) }); }
}

/** Campos adicionais exclusivos do diagnóstico; códigos arbitrários nunca retornam. */
export function categoriaDiagnostica(erro: unknown): string {
  return erro instanceof FalhaTransporte ? erro.diagnostico.categoria : "rede_origem";
}