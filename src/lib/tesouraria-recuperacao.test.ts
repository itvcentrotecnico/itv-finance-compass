import { beforeEach, describe, expect, it, vi } from "vitest";
import { executarSeguro, chavePendente, lerPendente, type RecuperacaoAPI, type TravaEnvio } from "./tesouraria-recuperacao";
import { resultadoErro, type Pedido, type HistoricoOperacoes } from "./tesouraria";

const usuario = "usuario-local";
const p: Pedido = { tipo: "entrada", chave: "00000000-0000-4000-8000-000000000001", data: "2026-10-26", descricao: "Teste somente local", valor: "0.30", destino: "conta", plano: "plano" };
const trava: TravaEnvio = (acao) => acao();
const api = (): RecuperacaoAPI => ({ consultar: vi.fn().mockResolvedValue(null), enviar: vi.fn().mockResolvedValue({ estado: "confirmada", id: "op" }) });
beforeEach(() => localStorage.clear());
describe("recuperação de operações sem acesso ao HML", () => {
  it("persiste identificação original antes de enviar", async () => {
    const a = api(); a.enviar = vi.fn(async (pedido) => { expect(lerPendente(localStorage, usuario)).toEqual(p); expect(pedido.chave).toBe(p.chave); return { estado: "confirmada", id: "op" }; });
    expect((await executarSeguro(localStorage, usuario, a, trava, p)).estado).toBe("confirmada");
    expect(lerPendente(localStorage, usuario)).toBeNull();
  });
  it("preserva pedido após perda de resposta e recarregamento", async () => {
    const a = api(); a.enviar = vi.fn().mockRejectedValue(new Error("resposta perdida"));
    expect((await executarSeguro(localStorage, usuario, a, trava, p)).estado).toBe("incerta");
    expect(lerPendente(localStorage, usuario)).toEqual(p);
  });
  it("consulta operação já processada sem reenviar", async () => {
    localStorage.setItem(chavePendente(usuario), JSON.stringify(p));
    const a = api(); a.consultar = vi.fn().mockResolvedValue({ id: "anterior" });
    expect(await executarSeguro(localStorage, usuario, a, trava, undefined, true)).toEqual({ estado: "confirmada", id: "anterior" });
    expect(a.enviar).not.toHaveBeenCalled();
  });
  it("ausência na consulta não rejeita nem reenvia automaticamente", async () => {
    localStorage.setItem(chavePendente(usuario), JSON.stringify(p)); const a = api();
    expect((await executarSeguro(localStorage, usuario, a, trava)).estado).toBe("incerta");
    expect(a.enviar).not.toHaveBeenCalled(); expect(lerPendente(localStorage, usuario)).toEqual(p);
  });
  it.each(["entrada", "transferencia", "estorno"] as const)("recupera %s somente após consulta e com mesma chave e conteúdo", async (tipo) => {
    const pedido = { ...p, tipo }; localStorage.setItem(chavePendente(usuario), JSON.stringify(pedido)); const a = api();
    await executarSeguro(localStorage, usuario, a, trava, undefined, true);
    expect(a.consultar).toHaveBeenCalledWith(p.chave); expect(a.enviar).toHaveBeenCalledExactlyOnceWith(pedido);
    expect(vi.mocked(a.consultar).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(a.enviar).mock.invocationCallOrder[0]);
  });
  it("impede outra chave enquanto existe resultado incerto", async () => {
    localStorage.setItem(chavePendente(usuario), JSON.stringify(p)); const a = api();
    const r = await executarSeguro(localStorage, usuario, a, trava, { ...p, chave: "00000000-0000-4000-8000-000000000002" });
    expect(r.estado).toBe("incerta"); expect(a.enviar).not.toHaveBeenCalled();
  });
  it("falha de consulta nunca permite reenvio", async () => {
    localStorage.setItem(chavePendente(usuario), JSON.stringify(p)); const a = api(); a.consultar = vi.fn().mockRejectedValue(new Error("rede"));
    await executarSeguro(localStorage, usuario, a, trava, undefined, true); expect(a.enviar).not.toHaveBeenCalled();
  });
  it("rejeição explícita inicial libera correção segura", async () => {
    const a = api(); a.enviar = vi.fn().mockResolvedValue({ estado: "rejeitada", mensagem: "classe inativa" });
    expect((await executarSeguro(localStorage, usuario, a, trava, p)).estado).toBe("rejeitada"); expect(lerPendente(localStorage, usuario)).toBeNull();
    a.enviar = vi.fn().mockResolvedValue({ estado: "confirmada", id: "corrigida" });
    expect((await executarSeguro(localStorage, usuario, a, trava, { ...p, plano: "outra" })).estado).toBe("confirmada");
  });
  it("rejeição de recuperação não prova resultado da tentativa anterior", async () => {
    localStorage.setItem(chavePendente(usuario), JSON.stringify(p)); const a = api(); a.enviar = vi.fn().mockResolvedValue({ estado: "rejeitada", mensagem: "sem permissão" });
    expect((await executarSeguro(localStorage, usuario, a, trava, undefined, true)).estado).toBe("incerta"); expect(lerPendente(localStorage, usuario)).toEqual(p);
  });
  it("não envia se armazenamento falhar ou estiver corrompido", async () => {
    localStorage.setItem(chavePendente(usuario), "invalid"); const a = api();
    await executarSeguro(localStorage, usuario, a, trava, p); expect(a.enviar).not.toHaveBeenCalled();
    localStorage.clear(); const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });
    await executarSeguro(localStorage, usuario, a, trava, p); expect(a.enviar).not.toHaveBeenCalled(); spy.mockRestore();
  });
  it("isola pendências por usuário", () => {
    localStorage.setItem(chavePendente(usuario), JSON.stringify(p)); expect(lerPendente(localStorage, "outro")).toBeNull();
  });
  it("serializa tentativas simultâneas na mesma origem", async () => {
    let fila = Promise.resolve();
    const serial: TravaEnvio = (acao) => { const r = fila.then(acao); fila = r.then(() => undefined); return r; };
    const a = api(); a.enviar = vi.fn().mockResolvedValue({ estado: "incerta", mensagem: "rede" });
    await Promise.all([executarSeguro(localStorage, usuario, a, serial, p), executarSeguro(localStorage, usuario, a, serial, p)]);
    expect(a.enviar).toHaveBeenCalledTimes(1);
  });
  it("reconhece rollback explícito sem confundir conexão com rejeição", () => {
    expect(resultadoErro({ code: "P0001", message: "TES_CLASSIFICACAO" }).estado).toBe("rejeitada");
    expect(resultadoErro({ code: "40P01", message: "deadlock" }).estado).toBe("rejeitada");
    expect(resultadoErro({ code: "", message: "Failed to fetch" }).estado).toBe("incerta");
    expect(resultadoErro({ code: "P0001", message: "TES_IDEMPOTENCIA" }).estado).toBe("incerta");
  });
});