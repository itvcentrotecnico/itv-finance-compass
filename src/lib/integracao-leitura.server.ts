import "@tanstack/react-start/server-only";
import { z } from "zod";
import type { FonteGestao } from "./integracao";
import { buscarPaginaM5, FalhaTransporte } from "./integracao-transporte.server";

/** Identifica a revisão aprovada nos 63 testes, antes da adição deste marcador. */
export const REVISAO_LEITOR_HTTP = Object.freeze({
  versao: "m5-http-contexto-v1",
  revisao_leitor: "95cf17c3f13734bf55260c2f5802d615d679c907ebda792be400072d7cd76389",
});

const RECURSOS = ["formas_pagamento", "recebimentos", "pagamentos", "recebimentos_titulos", "titulos"] as const;
type Recurso = (typeof RECURSOS)[number];
type Categoria = "autenticacao_origem" | "autorizacao_origem" | "limite_origem" | "timeout_origem" | "rede_origem" | "invocacao_origem" | "conexao_origem" | "resposta_invalida_origem" | "erro_interno_origem" | "http_origem" | "paginacao_origem" | "configuracao_origem";
type Linha = Record<string, unknown> & { id: string };
export interface DiagnosticoLeitura {
  evento: "integracao_leitura_falhou";
  recurso: Recurso;
  etapa: Categoria;
  status_http: number | null;
  duracao_ms: number;
}
export class ErroLeitura extends Error {
  constructor(public readonly etapa: Categoria) { super(etapa); this.name = "ErroLeitura"; }
}

/** Classifica apenas códigos conhecidos; nunca copia mensagens ou causas para o log. */
function classificarTransporte(erro: unknown, abortado: boolean): ErroLeitura {
  if (erro instanceof ErroLeitura) return erro;
  if (erro instanceof FalhaTransporte) return new ErroLeitura(erro.diagnostico.categoria as Categoria);
  if (abortado || (erro instanceof Error && (erro.name === "AbortError" || erro.name === "TimeoutError"))) return new ErroLeitura("timeout_origem");
  const e = erro && typeof erro === "object" ? erro as { code?: unknown; cause?: unknown } : {};
  const causa = e.cause && typeof e.cause === "object" ? e.cause as { code?: unknown } : {};
  const codigo = e.code ?? causa.code;
  if (codigo === "ETIMEDOUT" || codigo === "UND_ERR_CONNECT_TIMEOUT" || codigo === "UND_ERR_HEADERS_TIMEOUT" || codigo === "UND_ERR_BODY_TIMEOUT") return new ErroLeitura("timeout_origem");
  if (codigo === "ECONNREFUSED" || codigo === "ECONNRESET" || codigo === "EPIPE" || codigo === "UND_ERR_SOCKET") return new ErroLeitura("conexao_origem");
  return new ErroLeitura("rede_origem");
}

const envelope = z.object({
  dados: z.array(z.object({ id: z.string().min(1) }).passthrough()),
  recurso: z.enum(RECURSOS), inicio: z.string(), fim: z.string(),
  offset: z.coerce.number().int().nonnegative(), limite: z.coerce.number().int().positive(),
});

export interface OpcoesLeitura {
  fetch?: typeof fetch;
  registrar?: (evento: DiagnosticoLeitura) => void;
  prazoPaginaMs?: number;
  prazoTotalMs?: number;
}

/** Só GET, sem banco; nenhuma mensagem bruta, resposta ou cabeçalho chega ao log. */
export async function lerFonteHttp(base: string, token: string, inicio: string, fim: string, opcoes: OpcoesLeitura = {}): Promise<FonteGestao> {
  const url = new URL(base);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || !token) throw new ErroLeitura("configuracao_origem");
  // APIs nativas podem exigir o receptor global; não destacar a referência de fetch.
  const buscar: typeof fetch = opcoes.fetch ?? ((input, init) => globalThis.fetch(input, init));
  const registrar = opcoes.registrar ?? ((evento) => console.error(JSON.stringify(evento)));
  const controller = new AbortController();
  const total = setTimeout(() => controller.abort(), opcoes.prazoTotalMs ?? 120_000);
  let falhou = false;

  async function lerRecurso(recurso: Recurso): Promise<Linha[]> {
    const linhas: Linha[] = [];
    const vistos = new Set<string>();
    const iniciado = Date.now();
    let status: number | null = null;
    try {
      for (let offset = 0; ; offset += 500) {
        const pagina = new AbortController();
        const cancelar = () => pagina.abort();
        controller.signal.addEventListener("abort", cancelar, { once: true });
        if (controller.signal.aborted) pagina.abort();
        const timer = setTimeout(cancelar, opcoes.prazoPaginaMs ?? 20_000);
        try {
          status = null;
          const q = new URLSearchParams({ recurso, inicio, fim, offset: String(offset), limite: "500" });
          let r: Response;
          try { r = await buscarPaginaM5(`${base.replace(/\/$/, "")}/api/public/integracao-financeiro?${q}`, token, pagina.signal, buscar); } catch (erro) { throw classificarTransporte(erro, pagina.signal.aborted); }
          if (!(r instanceof Response)) throw new ErroLeitura("resposta_invalida_origem");
          status = r.status;
          if (!r.ok) {
            const categoria = r.status === 401 ? "autenticacao_origem" : r.status === 403 ? "autorizacao_origem" : r.status === 429 ? "limite_origem" : r.status >= 500 ? "erro_interno_origem" : "http_origem";
            throw new ErroLeitura(categoria);
          }
          let corpo: unknown;
          try { corpo = await r.json(); } catch {
            if (pagina.signal.aborted) throw new ErroLeitura("timeout_origem");
            throw new ErroLeitura("resposta_invalida_origem");
          }
          if (pagina.signal.aborted) throw new ErroLeitura("timeout_origem");
          const validado = envelope.safeParse(corpo);
          if (!validado.success) throw new ErroLeitura("resposta_invalida_origem");
          const e = validado.data;
          if (e.recurso !== recurso || e.inicio !== inicio || e.fim !== fim || e.offset !== offset || e.limite !== 500 || e.dados.length > 500) throw new ErroLeitura("paginacao_origem");
          for (const linha of e.dados) {
            if (vistos.has(linha.id)) throw new ErroLeitura("paginacao_origem");
            vistos.add(linha.id);
            linhas.push(linha);
          }
          if (e.dados.length < 500) return linhas;
        } finally {
          clearTimeout(timer);
          controller.signal.removeEventListener("abort", cancelar);
        }
      }
    } catch (erro) {
      const seguro = classificarTransporte(erro, controller.signal.aborted);
      if (!falhou) {
        falhou = true;
        controller.abort();
        registrar({ evento: "integracao_leitura_falhou", recurso, etapa: seguro.etapa, status_http: status, duracao_ms: Math.max(0, Date.now() - iniciado) });
      }
      throw seguro;
    }
  }

  try {
    const [formas, lancamentos, pagamentos, recebimentos, titulos] = await Promise.all([
      lerRecurso("formas_pagamento"), lerRecurso("recebimentos"), lerRecurso("pagamentos"),
      lerRecurso("recebimentos_titulos"), lerRecurso("titulos"),
    ]);
    return {
      formas: formas as FonteGestao["formas"],
      lancamentos: lancamentos.map(l => ({ ...l, os: null, cliente: null, descricao: null })) as FonteGestao["lancamentos"],
      pagamentos: pagamentos as FonteGestao["pagamentos"],
      recebimentos: recebimentos.map(r => ({ ...r, referencia: null })) as FonteGestao["recebimentos"],
      titulosAbertos: titulos.filter(t => Number(t["saldo"]) > 0).map(t => ({ ...t, os: null, cliente: null })) as FonteGestao["titulosAbertos"],
    };
  } finally { clearTimeout(total); }
}

/** Variáveis lidas somente durante a chamada no servidor. */
export async function lerFonteGestaoServidor(inicio: string, fim: string): Promise<FonteGestao> {
  const token = process.env["GESTAO_ITV_READ_TOKEN"];
  if (!token) throw new Error("desabilitada");
  const base = process.env["GESTAO_ITV_URL"] || "https://itvcentrotecnico.lovable.app";
  return lerFonteHttp(base, token, inicio, fim);
}