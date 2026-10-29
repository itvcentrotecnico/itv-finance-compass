// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { lerFonteHttp, type DiagnosticoLeitura } from "./integracao-leitura.server";

const base = "https://origem.example";
const inicio = "2026-10-20", fim = "2026-10-26";
// Valor exclusivamente simulado; nenhuma variável ou credencial real é lida.
const tokenSimulado = "credencial-simulada-nao-real";
function resposta(input: string | URL | Request, dados: Record<string, unknown>[] = []) {
  const q = new URL(String(input)).searchParams;
  return { dados, recurso: q.get("recurso"), inicio: q.get("inicio"), fim: q.get("fim"), offset: Number(q.get("offset")), limite: 500 };
}
function buscar(handler: (input: string | URL | Request, init?: RequestInit) => Promise<Response>): typeof fetch {
  return vi.fn(handler) as typeof fetch;
}
afterEach(() => vi.useRealTimers());

describe("leitura HTTP compartilhada — somente respostas simuladas", () => {
  it("consulta os cinco recursos com GET, janela correta e páginas vazias válidas", async () => {
    const fake = buscar(async (input, init) => {
      expect(init?.method).toBe("GET");
      expect(init?.redirect).toBe("manual");
      expect(new Headers(init?.headers).get("Authorization")).toBe(`Bearer ${tokenSimulado}`);
      expect(new URL(String(input)).searchParams.get("inicio")).toBe(inicio);
      expect(new URL(String(input)).searchParams.get("fim")).toBe(fim);
      return Response.json(resposta(input));
    });
    const r = await lerFonteHttp(base, tokenSimulado, inicio, fim, { fetch: fake });
    expect(fake).toHaveBeenCalledTimes(5);
    expect(r).toEqual({ formas: [], lancamentos: [], pagamentos: [], recebimentos: [], titulosAbertos: [] });
  });

  it.each([[401,"autenticacao_origem"],[403,"autorizacao_origem"],[429,"limite_origem"],[500,"erro_interno_origem"],[503,"erro_interno_origem"],[404,"http_origem"]])("classifica HTTP %s sem revelar a resposta", async (status, etapa) => {
    const logs: DiagnosticoLeitura[] = [];
    const fake = buscar(async () => new Response("conteudo-financeiro-simulado", { status: Number(status) }));
    await expect(lerFonteHttp(base, tokenSimulado, inicio, fim, { fetch: fake, registrar: e => logs.push(e) })).rejects.toMatchObject({ etapa });
    expect(logs).toHaveLength(1);
    const evento = logs[0];
    if (!evento) throw new Error("Diagnóstico ausente");
    expect(evento).toMatchObject({ etapa, status_http: status });
    expect(Object.keys(evento).sort()).toEqual(["duracao_ms","etapa","evento","recurso","status_http"]);
    expect(JSON.stringify(logs)).not.toContain(tokenSimulado);
    expect(JSON.stringify(logs)).not.toContain("conteudo-financeiro-simulado");
  });

  it("classifica rede sem registrar mensagem bruta", async () => {
    const registrar = vi.fn();
    await expect(lerFonteHttp(base, tokenSimulado, inicio, fim, { fetch: buscar(async () => { throw new TypeError(tokenSimulado); }), registrar })).rejects.toMatchObject({ etapa: "rede_origem" });
    expect(JSON.stringify(registrar.mock.calls)).not.toContain(tokenSimulado);
  });

  it.each(["json", "sem_dados", "tipo_dados", "sem_id"])("recusa resposta inválida %s", async caso => {
    const fake = buscar(async input => {
      if (caso === "json") return new Response("não JSON", { status: 200 });
      const e: Record<string, unknown> = resposta(input);
      if (caso === "sem_dados") delete e["dados"];
      if (caso === "tipo_dados") e["dados"] = {};
      if (caso === "sem_id") e["dados"] = [{}];
      return Response.json(e);
    });
    await expect(lerFonteHttp(base, tokenSimulado, inicio, fim, { fetch: fake, registrar: () => {} })).rejects.toMatchObject({ etapa: "resposta_invalida_origem" });
  });

  it("lê página cheia e próxima curta sem truncar", async () => {
    const fake = buscar(async input => {
      const q = new URL(String(input)).searchParams;
      const dados = q.get("recurso") !== "formas_pagamento" ? [] : q.get("offset") === "0" ? Array.from({ length: 500 }, (_, i) => ({ id: `id-${i}`, nome: "forma simulada" })) : [{ id: "final", nome: "forma simulada" }];
      return Response.json(resposta(input, dados));
    });
    const r = await lerFonteHttp(base, tokenSimulado, inicio, fim, { fetch: fake });
    expect(r.formas).toHaveLength(501);
    expect(fake).toHaveBeenCalledTimes(6);
  });

  it("recusa página repetida mesmo com offset retornado correto", async () => {
    const fake = buscar(async input => Response.json(resposta(input, Array.from({ length: 500 }, (_, i) => ({ id: `id-${i}` })))));
    await expect(lerFonteHttp(base, tokenSimulado, inicio, fim, { fetch: fake, registrar: () => {} })).rejects.toMatchObject({ etapa: "paginacao_origem" });
  });

  it("recusa envelope com período diferente", async () => {
    const fake = buscar(async input => Response.json({ ...resposta(input), fim: "2026-10-27" }));
    await expect(lerFonteHttp(base, tokenSimulado, inicio, fim, { fetch: fake, registrar: () => {} })).rejects.toMatchObject({ etapa: "paginacao_origem" });
  });

  it.each(["pagina", "total"])("interrompe prazo %s e classifica timeout", async modo => {
    vi.useFakeTimers();
    const fake = buscar(async (_input, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true });
    }));
    const logs: DiagnosticoLeitura[] = [];
    const r = lerFonteHttp(base, tokenSimulado, inicio, fim, { fetch: fake, registrar: e => logs.push(e), prazoPaginaMs: modo === "pagina" ? 10 : 100, prazoTotalMs: modo === "total" ? 10 : 100 });
    const assertion = expect(r).rejects.toMatchObject({ etapa: "timeout_origem" });
    await vi.advanceTimersByTimeAsync(20);
    await assertion;
    expect(logs).toHaveLength(1);
  });

  it("recusa URL com credencial antes de enviar a chave", async () => {
    const fake = buscar(async input => Response.json(resposta(input)));
    await expect(lerFonteHttp("https://usuario:senha@origem.example", tokenSimulado, inicio, fim, { fetch: fake })).rejects.toMatchObject({ etapa: "configuracao_origem" });
    expect(fake).not.toHaveBeenCalled();
});

describe("primeira execução — leitura um recurso por vez (simulado)", () => {
  const ordem = ["formas_pagamento", "recebimentos", "pagamentos", "recebimentos_titulos", "titulos"];

  it("nunca mantém mais de uma requisição aberta e segue a ordem fixa", async () => {
    let abertas = 0, maximo = 0;
    const chamadas: string[] = [];
    const fake = buscar(async input => {
      abertas++; maximo = Math.max(maximo, abertas);
      chamadas.push(new URL(String(input)).searchParams.get("recurso") ?? "");
      await new Promise(r => setTimeout(r, 5));
      abertas--;
      return Response.json(resposta(input));
    });
    await lerFonteHttp(base, tokenSimulado, inicio, fim, { fetch: fake });
    expect(maximo).toBe(1);
    expect(chamadas).toEqual(ordem);
  });

  it("origem lenta na primeira requisição (inatividade) conclui sem segunda execução", async () => {
    let primeira = true;
    const fake = buscar(async input => {
      if (primeira) { primeira = false; await new Promise(r => setTimeout(r, 50)); }
      return Response.json(resposta(input));
    });
    const r = await lerFonteHttp(base, tokenSimulado, inicio, fim, { fetch: fake });
    expect(fake).toHaveBeenCalledTimes(5);
    expect(r.formas).toEqual([]);
  });

  it("HTTP 503 em recebimentos: falha registrada uma vez, sem retentativa e sem consultar os recursos seguintes", async () => {
    const logs: DiagnosticoLeitura[] = [];
    const fake = buscar(async input => {
      const recurso = new URL(String(input)).searchParams.get("recurso");
      return recurso === "recebimentos" ? new Response("indisponivel", { status: 503 }) : Response.json(resposta(input));
    });
    await expect(lerFonteHttp(base, tokenSimulado, inicio, fim, { fetch: fake, registrar: e => logs.push(e) })).rejects.toMatchObject({ etapa: "erro_interno_origem" });
    expect(fake).toHaveBeenCalledTimes(2);
    expect(logs).toEqual([expect.objectContaining({ recurso: "recebimentos", status_http: 503, etapa: "erro_interno_origem" })]);
  });

  it.each(ordem)("falha parcial em %s rejeita a leitura inteira (nada parcial é devolvido)", async alvo => {
    const fake = buscar(async input => new URL(String(input)).searchParams.get("recurso") === alvo ? new Response("", { status: 500 }) : Response.json(resposta(input)));
    await expect(lerFonteHttp(base, tokenSimulado, inicio, fim, { fetch: fake, registrar: () => {} })).rejects.toMatchObject({ etapa: "erro_interno_origem" });
    expect(fake).toHaveBeenCalledTimes(ordem.indexOf(alvo) + 1);
  });

  it("recuperação: após uma falha, a próxima execução independente lê os cinco recursos", async () => {
    let falhar = true;
    const fake = buscar(async input => {
      if (falhar) { falhar = false; return new Response("", { status: 503 }); }
      return Response.json(resposta(input));
    });
    await expect(lerFonteHttp(base, tokenSimulado, inicio, fim, { fetch: fake, registrar: () => {} })).rejects.toMatchObject({ etapa: "erro_interno_origem" });
    expect(fake).toHaveBeenCalledTimes(1);
    await expect(lerFonteHttp(base, tokenSimulado, inicio, fim, { fetch: fake })).resolves.toBeDefined();
    expect(fake).toHaveBeenCalledTimes(6);
  });

  it("prazo total continua valendo para a soma sequencial", async () => {
    vi.useFakeTimers();
    const fake = buscar(async (input, init) => new Promise((resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true });
      setTimeout(() => resolve(Response.json(resposta(input))), 40);
    }));
    const r = lerFonteHttp(base, tokenSimulado, inicio, fim, { fetch: fake, registrar: () => {}, prazoPaginaMs: 1000, prazoTotalMs: 100 });
    const assertion = expect(r).rejects.toMatchObject({ etapa: "timeout_origem" });
    await vi.advanceTimersByTimeAsync(200);
    await assertion;
    expect(fake).toHaveBeenCalledTimes(3);
  });
});
});