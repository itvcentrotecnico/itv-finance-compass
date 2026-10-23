import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function StatusBadge({ ativo }: { ativo: boolean }) {
  return ativo
    ? <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs text-brand">Ativo</span>
    : <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">Inativo</span>;
}

export function Carregando() {
  return <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Carregando…</p>;
}

export function ErroCarga({ erro, onRetry }: { erro: unknown; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm">
      <p className="text-destructive">{erro instanceof Error ? erro.message : "Não foi possível carregar os dados."}</p>
      <Button size="sm" variant="outline" onClick={onRetry}>Tentar novamente</Button>
    </div>
  );
}

export function ConfirmarStatus({ ativo, nome, pendente, onConfirm, children }: { ativo: boolean; nome: string; pendente: boolean; onConfirm: () => void; children: ReactNode }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{ativo ? "Inativar" : "Reativar"} {nome}?</AlertDialogTitle>
          <AlertDialogDescription>
            {ativo ? "O registro deixa de ser usado em novos lançamentos, mas permanece no histórico. Pode ser reativado depois." : "O registro volta a ficar disponível para uso."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction disabled={pendente} onClick={onConfirm}>{ativo ? "Inativar" : "Reativar"}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
