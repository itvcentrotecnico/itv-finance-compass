import { z } from "zod";
import type { Pedido, ResultadoEnvio } from "./tesouraria";

const pedido = z.object({ tipo: z.enum(["abertura", "entrada", "saida", "transferencia", "estorno"]), chave: z.string().uuid(), data: z.string(), descricao: z.string(), valor: z.string().optional(), nome: z.string().optional(), conta_tipo: z.string().optional(), banco: z.string().optional(), agencia: z.string().optional(), numero_conta: z.string().optional(), origem: z.string().optional(), destino: z.string().optional(), plano: z.string().optional(), centro: z.string().optional(), original: z.string().optional(), justificativa: z.string().optional() }).strict();
export const chavePendente = (usuario: string) => `itv:ayjppexbzpgdkzbehvzw:tesouraria:v1:${usuario}`;
export function lerPendente(storage: Pick<Storage, "getItem">, usuario: string): Pedido | null {
  const raw = storage.getItem(chavePendente(usuario));
  return raw === null ? null : pedido.parse(JSON.parse(raw));
}
export interface RecuperacaoAPI { consultar: (chave: string) => Promise<{ id: string } | null>; enviar: (p: Pedido) => Promise<ResultadoEnvio> }
export type TravaEnvio = (acao: () => Promise<ResultadoEnvio>) => Promise<ResultadoEnvio>;
const incerta = (): ResultadoEnvio => ({ estado: "incerta", mensagem: "Resultado ainda não determinado. Consulte o envio pendente antes de continuar." });
/** Caller holds an origin-wide Web Lock. Persist BEFORE any RPC; never auto-retry. */
export async function executarSeguro(storage: Storage, usuario: string, api: RecuperacaoAPI, trava: TravaEnvio, novo?: Pedido, reenviar = false): Promise<ResultadoEnvio> {
  return trava(async () => {
    try {
      const anterior = lerPendente(storage, usuario);
      if (anterior) {
        const encontrado = await api.consultar(anterior.chave);
        if (encontrado) { storage.removeItem(chavePendente(usuario)); return { estado: "confirmada", id: encontrado.id }; }
        // Missing row may be uncommitted or hidden by RLS, not a rejection.
        if (novo || !reenviar) return incerta();
        const resultado = await api.enviar(anterior);
        if (resultado.estado === "confirmada") { storage.removeItem(chavePendente(usuario)); return resultado; }
        // A rejection during recovery does not prove an earlier request rolled back.
        const confirmado = await api.consultar(anterior.chave);
        if (confirmado) { storage.removeItem(chavePendente(usuario)); return { estado: "confirmada", id: confirmado.id }; }
        return { estado: "incerta", mensagem: resultado.mensagem };
      }
      if (!novo) return incerta();
      storage.setItem(chavePendente(usuario), JSON.stringify(pedido.parse(novo)));
      const resultado = await api.enviar(novo);
      if (resultado.estado !== "incerta") storage.removeItem(chavePendente(usuario));
      return resultado;
    } catch { return incerta(); }
  });
}