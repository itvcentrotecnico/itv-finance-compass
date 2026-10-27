import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/shared/finance";
import { validarAcessoDiagnostico, type ValidacaoDiagnostico } from "@/lib/integracao-diagnostico-cliente";

const ROTULOS = {
  administrador_confirmado: "Administrador confirmado pelo servidor",
  sessao_necessaria: "Sessão válida necessária",
  acesso_negado: "Perfil sem permissão administrativa",
  indisponivel: "Validação indisponível",
};

export function DiagnosticoAcesso() {
  const [resultado, setResultado] = useState<ValidacaoDiagnostico | null>(null);
  const [pendente, setPendente] = useState(false);
  async function validar() {
    if (pendente) return;
    setPendente(true);
    try { setResultado(await validarAcessoDiagnostico()); }
    finally { setPendente(false); }
  }
  return (
    <Panel title="Validação administrativa M5">
      <Button variant="outline" size="sm" onClick={validar} disabled={pendente}>
        <ShieldCheck className="size-4" />
        {pendente ? "Validando…" : "Validar acesso administrativo"}
      </Button>
      {resultado && <dl aria-live="polite" className="mt-3 grid gap-2 text-sm">
        <div><dt className="text-xs text-muted-foreground">Acesso</dt><dd>{ROTULOS[resultado.estado]}</dd></div>
        <div><dt className="text-xs text-muted-foreground">HTTP</dt><dd>{resultado.status_http ?? "—"}</dd></div>
        {resultado.versao && <div><dt className="text-xs text-muted-foreground">Versão</dt><dd className="break-words font-mono text-xs">{resultado.versao}</dd></div>}
        <div><dt className="text-xs text-muted-foreground">Leitura diagnóstica</dt><dd>{resultado.leitura_preparada ? "Preparada" : "Bloqueada"}</dd></div>
      </dl>}
    </Panel>
  );
}