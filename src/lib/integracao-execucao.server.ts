import "@tanstack/react-start/server-only";
/** Execução da sincronização (manual e automática); somente servidor. */
import { montarItens, type FonteGestao } from "./integracao";
import type { ResultadoSincronizacao } from "./integracao.functions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any;

/** Manual e automática delegam ao mesmo leitor, carregado apenas no servidor. */
export async function lerFonteGestao(inicio: string, fim: string): Promise<FonteGestao> {
  const { lerFonteGestaoServidor } = await import("./integracao-leitura.server");
  return lerFonteGestaoServidor(inicio, fim);
}

/** Lê a origem e conclui a sincronização já iniciada (manual ou automática) pela RPC idempotente. */
export async function executarSincronizacao(db: Db, syncId: string, inicio: string, fim: string): Promise<ResultadoSincronizacao> {
  let fonte: FonteGestao;
  try {
    fonte = await lerFonteGestao(inicio, fim);
  } catch (e) {
    const etapa = e instanceof Error ? e.message : "leitura_origem";
    await db.rpc("integracao_concluir", { p: { id: syncId, status: "falha", erros: [{ etapa }] } });
    return { estado: "falha", etapa };
  }
  const itens = montarItens(fonte);
  const { data: resultado, error } = await db.rpc("integracao_concluir", { p: { id: syncId, status: "concluida", itens } });
  if (error) {
    await db.rpc("integracao_concluir", { p: { id: syncId, status: "falha", erros: [{ etapa: "registro" }] } });
    return { estado: "falha", etapa: "registro" };
  }
  return { estado: "concluida", ...(resultado as object) } as ResultadoSincronizacao;
}

