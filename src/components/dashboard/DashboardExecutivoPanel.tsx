import { useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Scale, ClipboardCheck, LockKeyhole, CalendarDays, ChartNoAxesCombined, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

export function DashboardExecutivoPanel() {
  const [period, setPeriod] = useState("mes");
  const [comparison, setComparison] = useState("anterior");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const invalid = Boolean(period === "personalizado" && from && to && from > to);
  const reset = () => { setPeriod("mes"); setComparison("anterior"); setFrom(""); setTo(""); };
  return <div className="space-y-7">
    <div role="status" className="flex items-start gap-3 border-y border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning-foreground"><LockKeyhole className="mt-0.5 size-4 shrink-0" /><div><p className="font-semibold">Preparação · indicadores não apurados</p><p className="mt-1 text-xs">Dados financeiros não carregados. Lançamentos e conferências aguardam validação operacional.</p></div></div>
    <section aria-label="Período do Dashboard" className="flex flex-wrap items-end gap-4 border-b pb-5">
      <div className="w-full space-y-2 sm:w-52"><Label>Período</Label><Select value={period} onValueChange={setPeriod}><SelectTrigger aria-label="Período"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="dia">Hoje · Manaus</SelectItem><SelectItem value="mes">Mês atual · Manaus</SelectItem><SelectItem value="ano">Ano atual · Manaus</SelectItem><SelectItem value="personalizado">Personalizado</SelectItem></SelectContent></Select></div>
      <div className="w-full space-y-2 sm:w-60"><Label>Comparação</Label><Select value={comparison} onValueChange={setComparison}><SelectTrigger aria-label="Comparação"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="anterior">Período anterior equivalente</SelectItem><SelectItem value="sem">Sem comparação</SelectItem></SelectContent></Select></div>
      {period === "personalizado" && <div className="grid w-full grid-cols-1 gap-4 sm:w-auto sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="dashboard-from">Data inicial</Label><Input id="dashboard-from" type="date" value={from} onChange={e => setFrom(e.target.value)} /></div><div className="space-y-2"><Label htmlFor="dashboard-to">Data final</Label><Input id="dashboard-to" type="date" value={to} onChange={e => setTo(e.target.value)} /></div></div>}
      <Button variant="outline" size="icon" aria-label="Restaurar período" title="Restaurar período" onClick={reset}><RotateCcw className="size-4" /></Button>
      {invalid && <p role="alert" className="w-full text-sm text-destructive">A data final não pode ser anterior à data inicial.</p>}
    </section>
    <section aria-label="Indicadores executivos" className="grid grid-cols-2 gap-4 xl:grid-cols-4">
      {[{label:"Receitas do livro",icon:ArrowDownLeft},{label:"Despesas do livro",icon:ArrowUpRight},{label:"Resultado do período",icon:Scale},{label:"Pendências de conferência",icon:ClipboardCheck}].map(({label,icon:Icon},i) => <article key={label} className="min-w-0 rounded-lg border bg-card p-4"><div className="flex items-start justify-between gap-2"><h2 className="text-xs font-medium text-muted-foreground">{label}</h2><Icon className="size-4 shrink-0 text-muted-foreground" /></div><p className="mt-4 font-mono text-xl text-muted-foreground">{i===3 ? "—" : "R$ —"}</p><p className="mt-2 text-xs text-muted-foreground">Não apurado</p>{comparison === "anterior" && <p className="mt-4 border-t pt-3 text-xs text-muted-foreground">Anterior: — · Variação: —</p>}</article>)}
    </section>
    <section aria-labelledby="movement-heading" className="border-y py-5"><div className="flex flex-wrap items-center justify-between gap-3"><h2 id="movement-heading" className="text-base font-semibold">Receitas, despesas e resultado</h2><span className="flex items-center gap-2 text-xs text-muted-foreground"><CalendarDays className="size-4" />Data contábil · Manaus</span></div><div className="flex min-h-48 flex-col items-center justify-center gap-3 text-center"><ChartNoAxesCombined className="size-7 text-muted-foreground" /><p className="text-sm font-medium">Evolução não apurada</p><p className="text-xs text-muted-foreground">Receitas — · Despesas — · Resultado —</p></div></section>
    <div className="grid gap-7 lg:grid-cols-2">
      <section aria-labelledby="categories-heading"><h2 id="categories-heading" className="mb-4 text-base font-semibold">Despesas por categoria</h2><div className="overflow-x-auto border-y"><table className="w-full text-left text-xs"><thead className="bg-muted text-muted-foreground"><tr><th scope="col" className="px-3 py-3 font-medium">Categoria</th><th scope="col" className="px-3 py-3 font-medium">Valor</th><th scope="col" className="px-3 py-3 font-medium">Participação</th></tr></thead><tbody><tr><td colSpan={3} className="h-32 text-center text-muted-foreground">Classificação não apurada</td></tr></tbody></table></div></section>
      <section aria-labelledby="receipts-heading"><h2 id="receipts-heading" className="mb-4 text-base font-semibold">Recebimentos e conferência</h2><dl className="divide-y border-y">{["Faturamento comercial", "Líquido previsto", "Recebimento comprovado", "Divergências"].map(label => <div key={label} className="flex items-center justify-between gap-4 py-3 text-xs"><dt className="text-muted-foreground">{label}</dt><dd className="font-mono">—</dd></div>)}</dl></section>
    </div>
  </div>;
}