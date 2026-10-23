import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-sidebar p-12 text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-brand font-display text-sm font-bold text-brand-foreground">ITV</div>
          <div>
            <p className="font-display text-lg font-semibold leading-tight">ITV FINANCEIRO</p>
            <p className="text-xs text-sidebar-foreground/60">ITV Centro Técnico · Manaus</p>
          </div>
        </div>
        <div className="max-w-md">
          <p className="font-display text-3xl font-semibold leading-tight">Gestão financeira com acesso individual e rastreável.</p>
          <p className="mt-4 text-sm text-sidebar-foreground/70">Cada acesso é vinculado a um perfil autorizado. As permissões são verificadas no servidor em todas as operações.</p>
        </div>
        <p className="flex items-center gap-2 text-xs text-sidebar-foreground/60">
          <ShieldCheck className="size-4 text-brand" /> Ambiente de homologação (HML)
        </p>
      </aside>
      <main className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex size-9 items-center justify-center rounded-lg bg-brand font-display text-xs font-bold text-brand-foreground">ITV</div>
            <p className="font-display font-semibold">ITV FINANCEIRO</p>
          </div>
          <h1 className="font-display text-2xl font-semibold">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>}
          <div className="mt-8">{children}</div>
        </div>
      </main>
    </div>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {message}
    </p>
  );
}
