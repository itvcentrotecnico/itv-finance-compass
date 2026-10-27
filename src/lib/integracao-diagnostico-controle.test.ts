// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
import { executarDiagnosticoLimitado } from "./integracao-diagnostico-controle.server";
const id="00000000-0000-4000-8000-000000000001";
const resposta = { identificador:id,status_http:200,duracao_ms:12,categoria:"leitura_valida",tipo_excecao:null };
afterEach(()=>{vi.unstubAllEnvs();});
function preparar() {
  vi.stubEnv("M5_DIAGNOSTICO_LEITURA_AUTORIZADA","true");
  const rpc=vi.fn().mockResolvedValueOnce({data:true,error:null}).mockResolvedValueOnce({data:{permitida:true,tentativa_id:id,ordinal:1},error:null});
  const finalizar=vi.fn().mockResolvedValue({data:{registrada:true},error:null});
  const ler=vi.fn().mockResolvedValue(resposta);
  return {rpc,finalizar,ler};
}
it("reserva antes do único GET e finaliza somente auditoria técnica",async()=>{
  const m=preparar(); const r=await executarDiagnosticoLimitado({rpc:m.rpc},id,id,"pagamentos",m.finalizar,m.ler);
  expect(r.status).toBe(200); expect(m.ler).toHaveBeenCalledTimes(1); expect(m.finalizar).toHaveBeenCalledTimes(1);
  expect(m.rpc.mock.calls.map(([n])=>n)).toEqual(["tem_papel","diagnostico_reservar"]);
  const reservaOrdem=m.rpc.mock.invocationCallOrder[1]; const leituraOrdem=m.ler.mock.invocationCallOrder[0];
  if (reservaOrdem === undefined || leituraOrdem === undefined) throw new Error("reserva ou leitura não chamada");
  expect(reservaOrdem).toBeLessThan(leituraOrdem);
});
it.each(["concorrencia","repeticao","limite","autorizacao_inativa"])("bloqueio %s impede GET e escrita financeira",async categoria=>{
  const m=preparar();m.rpc.mockReset().mockResolvedValueOnce({data:true,error:null}).mockResolvedValueOnce({data:{permitida:false,categoria},error:null});
  expect((await executarDiagnosticoLimitado({rpc:m.rpc},id,id,"pagamentos",m.finalizar,m.ler)).status).toBe(409);
  expect(m.ler).not.toHaveBeenCalled();expect(m.finalizar).not.toHaveBeenCalled();
});
it("recusa não administrador antes da reserva e leitura",async()=>{
  const m=preparar();m.rpc.mockReset().mockResolvedValue({data:false,error:null});
  expect((await executarDiagnosticoLimitado({rpc:m.rpc},id,id,"pagamentos",m.finalizar,m.ler)).status).toBe(403);
  expect(m.ler).not.toHaveBeenCalled();expect(m.rpc).toHaveBeenCalledTimes(1);
});
it("resposta perdida da reserva não provoca GET ou retentativa",async()=>{
  const m=preparar();m.rpc.mockReset().mockResolvedValueOnce({data:true,error:null}).mockRejectedValueOnce(new Error("privado"));
  expect((await executarDiagnosticoLimitado({rpc:m.rpc},id,id,"pagamentos",m.finalizar,m.ler)).status).toBe(503);
  expect(m.ler).not.toHaveBeenCalled();expect(m.rpc).toHaveBeenCalledTimes(2);
});
it("falha de leitura finaliza tentativa consumida sem repetir",async()=>{
  const m=preparar();m.ler.mockRejectedValue(new Error("mensagem-privada"));
  const r=await executarDiagnosticoLimitado({rpc:m.rpc},id,id,"pagamentos",m.finalizar,m.ler);
  expect(m.finalizar).toHaveBeenCalledWith(expect.objectContaining({p_categoria:"falha_interna",p_tentativa:id}));
  expect(m.ler).toHaveBeenCalledTimes(1);expect(JSON.stringify(r)).not.toContain("mensagem-privada");
});
it("perda da conclusão preserva confirmação pendente sem repetição",async()=>{
  const m=preparar();m.finalizar.mockRejectedValue(new Error("privado"));
  expect((await executarDiagnosticoLimitado({rpc:m.rpc},id,id,"pagamentos",m.finalizar,m.ler)).corpo).toMatchObject({auditoria:"confirmacao_pendente"});
  expect(m.finalizar).toHaveBeenCalledTimes(1);expect(m.ler).toHaveBeenCalledTimes(1);
});
it("flag desabilitada não reserva nem lê",async()=>{
  const m=preparar();vi.stubEnv("M5_DIAGNOSTICO_LEITURA_AUTORIZADA","");
  expect((await executarDiagnosticoLimitado({rpc:m.rpc},id,id,"pagamentos",m.finalizar,m.ler)).status).toBe(423);
  expect(m.rpc).toHaveBeenCalledTimes(1);expect(m.ler).not.toHaveBeenCalled();
});