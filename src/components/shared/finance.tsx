import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow && <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand">{eyebrow}</p>}
        <h1 className="text-2xl font-semibold md:text-3xl">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions}
    </div>
  );
}

export function Panel({ title, subtitle, children, className, action }: { title: string; subtitle?: string; children: ReactNode; className?: string; action?: ReactNode }) {
  return (
    <section className={cn("rounded-xl border bg-card shadow-card", className)}>
      <header className="flex items-start justify-between gap-3 border-b px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function KpiCard({ label, icon: Icon, hint, tone = "default" }: { label: string; icon: LucideIcon; hint: string; tone?: "default" | "positive" | "negative" | "warning" }) {
  const toneCls = {
    default: "bg-secondary text-foreground",
    positive: "bg-brand-soft text-brand",
    negative: "bg-destructive/10 text-destructive",
    warning: "bg-warning/20 text-warning-foreground",
  }[tone];
  return (
    <div className="group rounded-xl border bg-card p-5 shadow-card transition-colors hover:border-brand/40">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <span className={cn("grid size-8 place-items-center rounded-lg", toneCls)}>
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-4 font-mono text-2xl font-medium tracking-tight text-muted-foreground/50">R$ —</p>
      <p className="mt-1.5 text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, compact }: { icon: LucideIcon; title: string; description: string; compact?: boolean }) {
  return (
    <div className={cn("relative flex flex-col items-center justify-center overflow-hidden rounded-lg border border-dashed text-center", compact ? "px-4 py-8" : "px-6 py-14")}>
      <div className="pattern-grid absolute inset-0 opacity-40 [mask-image:radial-gradient(circle,black,transparent_70%)]" />
      <span className="relative grid size-10 place-items-center rounded-full border bg-card text-muted-foreground">
        <Icon className="size-4.5" />
      </span>
      <p className="relative mt-3 text-sm font-medium">{title}</p>
      <p className="relative mt-1 max-w-xs text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

/** Esqueleto visual de gráfico — sem dados, apenas estrutura. */
export function ChartPlaceholder({ variant = "bars" }: { variant?: "bars" | "line" | "donut" }) {
  return (
    <div className="relative h-44 rounded-lg border border-dashed">
      <div className="absolute inset-0 flex flex-col justify-between p-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-px w-full bg-border" />)}
      </div>
      <div className="absolute inset-0 grid place-items-center">
        {variant === "donut" ? (
          <div className="size-24 rounded-full border-[10px] border-muted" />
        ) : (
          <div className="flex h-24 items-end gap-2 opacity-60">
            {[30, 50, 40, 65, 45, 70, 55].map((h, i) => (
              <div key={i} className={cn("w-4 rounded-sm bg-muted", variant === "line" && "w-1.5")} style={{ height: `${h}%` }} />
            ))}
          </div>
        )}
      </div>
      <p className="absolute bottom-2 left-0 right-0 text-center text-[11px] text-muted-foreground">Sem dados no período</p>
    </div>
  );
}
