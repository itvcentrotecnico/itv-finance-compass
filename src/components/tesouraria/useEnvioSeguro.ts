import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useRouteContext } from "@tanstack/react-router";
import { consultarEnvioTesouraria, registrarTesouraria } from "@/lib/tesouraria.functions";
import { executarSeguro, lerPendente, chavePendente } from "@/lib/tesouraria-recuperacao";
import type { Pedido, ResultadoEnvio } from "@/lib/tesouraria";

export function useEnvioSeguro(onConfirmada: () => void) {
  const { user } = useRouteContext({ from: "/_authenticated" });
  const enviar = useServerFn(registrarTesouraria);
  const consultar = useServerFn(consultarEnvioTesouraria);
  const [pendente, setPendente] = useState<Pedido | null>(null);
  const [bloqueio, setBloqueio] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const busy = useRef(false);
  const atualizar = useCallback(() => {
    try { setPendente(lerPendente(localStorage, user.id)); setBloqueio(!navigator.locks); }
    catch { setBloqueio(true); setMensagem("Não foi possível preservar o envio neste navegador. Novas operações estão bloqueadas."); }
  }, [user.id]);
  useEffect(() => {
    atualizar();
    const listener = (e: StorageEvent) => { if (e.key === chavePendente(user.id) || e.key === null) atualizar(); };
    window.addEventListener("storage", listener);
    return () => window.removeEventListener("storage", listener);
  }, [atualizar, user.id]);
  async function executar(novo?: Pedido, reenviar = false): Promise<ResultadoEnvio> {
    if (busy.current || !navigator.locks) return { estado: "incerta", mensagem: "Envio bloqueado. Aguarde a consulta do resultado." };
    busy.current = true; setOcupado(true); setMensagem(null);
    try {
      const result = await executarSeguro(localStorage, user.id, { enviar: (p) => enviar({ data: p }), consultar: (chave) => consultar({ data: { chave } }) }, (acao) => navigator.locks.request(chavePendente(user.id), acao), novo, reenviar);
      setMensagem(result.estado === "confirmada" ? null : result.mensagem);
      atualizar();
      if (result.estado === "confirmada") onConfirmada();
      return result;
    } finally { busy.current = false; setOcupado(false); }
  }
  return { pendente, bloqueio, ocupado, mensagem, executar };
}