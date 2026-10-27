import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/shared/finance";
import { executarDiagnosticoSequencial, validarAcessoDiagnostico, type ResultadoRecurso, type ValidacaoDiagnostico } from "@/lib/integracao-diagnostico-cliente";

const ROTULOS = {
  administrador_confirmado: "Administrador confirmado pelo servidor",
  sessao_necessaria: "Sessão válida necessária",
  acesso_negado: "Perfil sem permissão administrativa",
  indisponivel: "Validação indisponível",
};

export function DiagnosticoAcesso() {
  const [resultado, setResultado] = useState<ValidacaoDiagnostico | null>(null);
  const [pendente, setPendente] = useState(false);
  const [executando, setExecutando] = useState(false);
  const [executado, setExecutado] = useState(false);
  const [itens, setItens] = useState<ResultadoRecurso[]>([]);
  const [fim, setFim] = useState<string | null>(null);
  async function executar() {
    if (executando || executado) return;
    if (!window.confirm("Executar as cinco consultas diagnósticas ao GESTÃO ITV, uma única vez, sem repetição?")) return;
    setExecutado(true); setExecutando(true); setItens([]);
    try { const r = await executarDiagnosticoSequencial(i => setItens(a => [...a, i])); setFim(r.estado); }
    catch { setFim("interrompido"); }
    finally { setExecutando(false); }
  }
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
      {resultado?.leitura_preparada && <div className="mt-4 space-y-3">
        <Button size="sm" onClick={executar} disabled={executando || executado}>
          {executando ? "Executando…" : "Executar diagnóstico (5 consultas)"}
        </Button>
        {itens.length > 0 && <table className="w-full text-xs"><thead><tr className="text-left text-muted-foreground">
          <th>Recurso</th><th>Resposta</th><th>HTTP origem</th><th>Duração</th><th>Categoria</th><th>Exceção</th><th>Auditoria</th></tr></thead>
          <tbody>{itens.map(i => <tr key={i.recurso}><td className="font-mono">{i.recurso}</td><td>{i.status_resposta ?? "—"}</td>
            <td>{i.status_http ?? "—"}</td><td>{i.duracao_ms != null ? `${i.duracao_ms} ms` : "—"}</td><td>{i.categoria ?? "—"}</td>
            <td>{i.tipo_excecao ?? "—"}</td><td className="font-mono">{i.identificador?.slice(0, 8) ?? "—"} {i.auditoria ?? ""}</td></tr>)}</tbody></table>}
        {fim && <p className="text-sm">Situação: {fim === "concluido" ? "Cinco consultas concluídas" : fim === "sem_autorizacao" ? "Sem autorização ativa" : fim === "sessao_necessaria" ? "Sessão necessária" : "Interrompido pelo controle"}</p>}
      </div>}
    </Panel>
  );
}