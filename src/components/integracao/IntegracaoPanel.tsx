import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeftRight, CircleCheck, CircleOff, Plug, RefreshCw, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { EmptyState, Panel } from "@/components/shared/finance";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { can } from "@/lib/auth/permissions";
import { carregarEstadoIntegracao, carregarItensIntegracao, sincronizarGestaoItv } from "@/lib/integracao.functions";

const SITUACOES: Record<string, { rotulo: string; variante: "default" | "secondary" | "destructive" | "outline" }> = {
  novo: { rotulo: "Novo", variante: "secondary" },
  existente: { rotulo: "Já existente", variante: "outline" },
  alterado: { rotulo: "Divergente", variante: "destructive" },
  enviado_conferencia: { rotulo: "Enviado à conferência", variante: "default" },
  possivel_duplicidade: { rotulo: "Possível duplicidade", variante: "destructive" },
};

const TIPOS: Record<string, string> = {
  pagamento: "Pagamento",
  recebimento_titulo: "Recebimento de título",
  titulo_aberto: "Título em aberto",
};

function dataHora(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Manaus" });
}

export function IntegracaoPanel() {
  const { role } = useRouteContext({ from: "/_authenticated" });
  const qc = useQueryClient();
  const [pagina, setPagina] = useState(0);
  const sincronizar = useServerFn(sincronizarGestaoItv);

  const estado = useQuery({ queryKey: ["integracao", "estado"], queryFn: () => carregarEstadoIntegracao() });
  const itens = useQuery({ queryKey: ["integracao", "itens", pagina], queryFn: () => carregarItensIntegracao({ data: { pagina } }) });

  const sync = useMutation({
    mutationFn: () => sincronizar(),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["integracao"] });
      if (r.estado === "concluida") toast.success(`Sincronização concluída: ${r.novos} novo(s), ${r.enviados_conferencia} enviado(s) à conferência.`);
      else if (r.estado === "desabilitada") toast.info(r.motivo);
      else toast.error("Sincronização falhou na etapa: " + r.etapa);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const e = estado.data;
  const u = e?.ultima ?? null;
  const podeSincronizar = role ? can(role, "integracoes", "create") : false;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="flex flex-col gap-4 lg:col-span-1">
        <Panel title="Conexão com o GESTÃO ITV" subtitle="Leitura somente consulta — a origem nunca é alterada">
          <div className="flex items-center gap-3">
            {e?.configurada ? (
              <Badge className="gap-1.5"><CircleCheck className="size-3.5" /> Configurada</Badge>
            ) : (
              <Badge variant="secondary" className="gap-1.5"><CircleOff className="size-3.5" /> Desabilitada</Badge>
            )}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {e?.configurada
              ? "A identidade de leitura está configurada. A sincronização é manual e não gera movimentações financeiras."
              : "A identidade de leitura ainda não foi configurada no GESTÃO ITV. A integração permanece desabilitada até a configuração."}
          </p>
          {podeSincronizar && (
            <Button className="mt-4" size="sm" disabled={!e?.configurada || sync.isPending} onClick={() => sync.mutate()}>
              <RefreshCw className={sync.isPending ? "size-4 animate-spin" : "size-4"} />
              {sync.isPending ? "Sincronizando…" : "Sincronizar agora"}
            </Button>
          )}
        </Panel>

        <Panel title="Última sincronização" subtitle={u ? dataHora(u.iniciado_em) : "Nenhuma sincronização realizada"}>
          {u ? (
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-xs text-muted-foreground">Situação</dt><dd className="font-medium">{u.status === "concluida" ? "Concluída" : u.status === "falha" ? "Falha" : "Em andamento"}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Consultados</dt><dd className="font-mono font-medium">{u.consultados}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Novos</dt><dd className="font-mono font-medium">{u.novos}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Já existentes</dt><dd className="font-mono font-medium">{u.existentes}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Divergentes</dt><dd className="font-mono font-medium">{u.divergentes}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Enviados à conferência</dt><dd className="font-mono font-medium">{u.enviados_conferencia}</dd></div>
              {u.erros?.length ? (
                <div className="col-span-2"><dt className="text-xs text-muted-foreground">Erros</dt><dd className="text-xs text-destructive">{u.erros.map((x) => x.etapa).join(" · ")}</dd></div>
              ) : null}
            </dl>
          ) : (
            <EmptyState compact icon={ArrowLeftRight} title="Sem histórico" description="A primeira sincronização ainda não foi executada." />
          )}
        </Panel>
      </div>

      <Panel title="Itens sincronizados" subtitle="Registros recebidos do GESTÃO ITV" className="lg:col-span-2">
        {e && (e.totais.alterado || e.totais.possivel_duplicidade) ? (
          <p role="alert" className="mb-4 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            <TriangleAlert className="size-4 shrink-0" />
            Há itens divergentes ou com possível duplicidade aguardando revisão antes de qualquer lançamento.
          </p>
        ) : null}
        {!itens.data?.itens.length ? (
          <EmptyState compact icon={Plug} title="Nenhum item" description="Os registros aparecerão aqui após a primeira sincronização." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="pb-2 pr-3 font-medium">Referência</th>
                    <th className="pb-2 pr-3 font-medium">Tipo</th>
                    <th className="pb-2 pr-3 font-medium">Data</th>
                    <th className="pb-2 pr-3 font-medium">Valor</th>
                    <th className="pb-2 pr-3 font-medium">Forma</th>
                    <th className="pb-2 font-medium">Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {itens.data.itens.map((i) => (
                    <tr key={i.id} className="border-b last:border-0">
                      <td className="max-w-40 truncate py-2.5 pr-3 font-mono text-xs" title={i.referencia_origem}>{i.referencia_origem}</td>
                      <td className="py-2.5 pr-3 text-xs">{TIPOS[i.tipo] ?? i.tipo}</td>
                      <td className="py-2.5 pr-3 font-mono text-xs">{i.resumo.data ?? "—"}</td>
                      <td className="py-2.5 pr-3 font-mono text-xs">{i.resumo.valor_bruto ?? "—"}</td>
                      <td className="py-2.5 pr-3 text-xs capitalize">{i.resumo.forma ?? "—"}</td>
                      <td className="py-2.5"><Badge variant={SITUACOES[i.situacao]?.variante ?? "outline"} className="text-[11px]">{SITUACOES[i.situacao]?.rotulo ?? i.situacao}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
              <span>Página {pagina + 1}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={pagina === 0} onClick={() => setPagina(pagina - 1)}>Anterior</Button>
                <Button variant="outline" size="sm" disabled={itens.data.itens.length < 50} onClick={() => setPagina(pagina + 1)}>Próxima</Button>
              </div>
            </div>
          </>
        )}
      </Panel>
    </div>
  );
}
