import { useQuery } from "@tanstack/react-query";
import { History, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { historico } from "@/lib/cadastros";

const ACAO: Record<string, string> = { criar: "Criado", alterar: "Alterado", inativar: "Inativado", reativar: "Reativado" };
const OCULTOS = new Set(["id", "criado_em", "criado_por", "atualizado_em", "atualizado_por"]);

export function Historico({ tabela, id, titulo }: { tabela: string; id: string; titulo: string }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Histórico de ${titulo}`}><History className="size-4" /></Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Histórico · {titulo}</DialogTitle></DialogHeader>
        <Lista tabela={tabela} id={id} />
      </DialogContent>
    </Dialog>
  );
}

function Lista({ tabela, id }: { tabela: string; id: string }) {
  const q = useQuery({ queryKey: ["auditoria", tabela, id], queryFn: () => historico(tabela, id) });
  if (q.isLoading) return <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Carregando…</p>;
  if (q.isError) return <p className="text-sm text-destructive">{(q.error as Error).message}</p>;
  if (!q.data?.length) return <p className="text-sm text-muted-foreground">Nenhum evento registrado.</p>;
  return (
    <ol className="max-h-96 space-y-3 overflow-y-auto">
      {q.data.map((ev) => {
        const mud = ev.antes && ev.depois
          ? Object.keys(ev.depois).filter((k) => !OCULTOS.has(k) && JSON.stringify(ev.antes![k]) !== JSON.stringify(ev.depois![k]))
          : [];
        return (
          <li key={ev.id} className="rounded-md border px-3 py-2 text-sm">
            <div className="flex justify-between gap-2">
              <span className="font-medium">{ACAO[ev.acao]}</span>
              <time className="text-xs text-muted-foreground">{new Date(ev.ocorrido_em).toLocaleString("pt-BR")}</time>
            </div>
            <p className="text-xs text-muted-foreground">Usuário: <span className="font-mono">{ev.usuario_id?.slice(0, 8) ?? "sistema"}</span></p>
            {mud.map((k) => (
              <p key={k} className="mt-1 text-xs"><span className="font-mono">{k}</span>: {String(ev.antes![k] ?? "—")} → {String(ev.depois![k] ?? "—")}</p>
            ))}
          </li>
        );
      })}
    </ol>
  );
}
