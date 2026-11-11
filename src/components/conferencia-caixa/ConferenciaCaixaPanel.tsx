import { useState } from "react";
import { ClipboardCheck, Search, SlidersHorizontal, RotateCcw, Eye, LockKeyhole, History, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";

const situations = ["Pendente", "Em conferência", "Divergente", "Aguardando revisão", "Devolvido", "Conferência aprovada"];
const modalities = ["Dinheiro", "Pix", "Crédito", "Débito", "Parcelado", "Boleto", "Misto", "Não definida"];

function Filter({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return <div className="min-w-0 space-y-2"><Label>{label}</Label><Select value={value} onValueChange={onChange}><SelectTrigger aria-label={label} className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Todas</SelectItem>{options.map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select></div>;
}

export function ConferenciaCaixaPanel() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [nature, setNature] = useState("todos");
  const [modality, setModality] = useState("todos");
  const [status, setStatus] = useState("todos");
  const [search, setSearch] = useState("");
  const [details, setDetails] = useState(false);
  const invalidPeriod = Boolean(from && to && from > to);
  const reset = () => { setFrom(""); setTo(""); setNature("todos"); setModality("todos"); setStatus("todos"); setSearch(""); };

  return <div className="space-y-7">
    <div role="status" className="flex items-start gap-3 border-y border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning-foreground"><LockKeyhole className="mt-0.5 size-4 shrink-0" /><div><p className="font-semibold">Preparação · operação não liberada</p><p className="mt-1 text-xs">Dados não carregados. Nenhum recebimento, aprovação ou lançamento será registrado.</p></div></div>

    <section aria-label="Resumo da conferência" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {["Valor bruto", "Líquido previsto", "Recebimento comprovado", "Divergências"].map((label, index) => <div key={label} className="min-w-0 rounded-lg border bg-card p-4"><div className="flex items-start justify-between gap-2"><p className="text-xs font-medium text-muted-foreground">{label}</p>{index === 3 ? <ClipboardCheck className="size-4 shrink-0 text-muted-foreground" /> : <ReceiptText className="size-4 shrink-0 text-muted-foreground" />}</div><p className="mt-4 font-mono text-xl text-muted-foreground">{index === 3 ? "—" : "R$ —"}</p><p className="mt-2 text-xs text-muted-foreground">Não apurado</p></div>)}
    </section>

    <section aria-labelledby="filters-title" className="space-y-4 border-y py-5">
      <h2 id="filters-title" className="flex items-center gap-2 text-sm font-semibold"><SlidersHorizontal className="size-4" />Período e filtros</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-2"><Label htmlFor="conference-from">Ocorrência de</Label><Input id="conference-from" type="date" value={from} onChange={event => setFrom(event.target.value)} /></div>
        <div className="space-y-2"><Label htmlFor="conference-to">Ocorrência até</Label><Input id="conference-to" type="date" value={to} onChange={event => setTo(event.target.value)} /></div>
        <Filter label="Natureza" value={nature} onChange={setNature} options={["Receita", "Despesa"]} />
        <Filter label="Modalidade" value={modality} onChange={setModality} options={modalities} />
        <Filter label="Situação" value={status} onChange={setStatus} options={situations} />
      </div>
      {invalidPeriod && <p role="alert" className="text-sm text-destructive">A data final não pode ser anterior à data inicial.</p>}
      <div className="flex flex-col gap-3 sm:flex-row"><div className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" /><Input aria-label="Buscar referência ou descrição" placeholder="Referência, OS ou descrição" className="pl-9" value={search} onChange={event => setSearch(event.target.value)} /></div><Button variant="outline" onClick={reset}><RotateCcw className="size-4" />Limpar filtros</Button></div>
    </section>

    <section aria-labelledby="conference-list-title">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 id="conference-list-title" className="text-base font-semibold">Conferência diária</h2><p className="mt-1 text-xs text-muted-foreground">Registros e totais indisponíveis</p></div><Button variant="outline" onClick={() => setDetails(true)}><Eye className="size-4" />Detalhes · preparação</Button></div>
      <div className="overflow-x-auto border-y"><table className="w-full min-w-[880px] text-left text-xs"><thead className="bg-muted text-muted-foreground"><tr>{["Ocorrência", "Referência / descrição", "Modalidade", "Bruto", "Previsto", "Comprovado", "Situação"].map(label => <th key={label} scope="col" className="px-3 py-3 font-medium">{label}</th>)}</tr></thead><tbody><tr><td colSpan={7} className="h-48 text-center"><ClipboardCheck className="mx-auto mb-3 size-7 text-muted-foreground" /><p className="text-sm font-medium">Nenhum registro carregado</p><p className="mt-2 text-xs text-muted-foreground">Conferência aguardando liberação.</p></td></tr></tbody></table></div>
    </section>

    <Sheet open={details} onOpenChange={setDetails}><SheetContent className="w-full overflow-y-auto sm:max-w-lg"><SheetHeader><SheetTitle>Detalhes da conferência</SheetTitle><SheetDescription>Preparação · nenhum registro selecionado</SheetDescription></SheetHeader><div className="mt-6 space-y-6">
      {[
        { title: "Origem e classificação", labels: ["Referência / OS", "Descrição", "Natureza", "Data da ocorrência", "Categoria", "Centro de custo"] },
        { title: "Valores e recebimento", labels: ["Modalidade", "Canal informado", "Valor bruto", "Taxa informada", "Líquido previsto", "Recebimento comprovado", "Data de recebimento", "Referência da comprovação", "Divergência"] },
        { title: "Revisão e vínculo", labels: ["Situação", "Preparador", "Revisor", "Justificativa", "Operação vinculada no livro"] },
      ].map(section => <section key={section.title} className="border-b pb-5"><h3 className="mb-3 text-sm font-semibold">{section.title}</h3><dl className="space-y-3">{section.labels.map(label => <div key={label} className="flex items-start justify-between gap-4 text-xs"><dt className="text-muted-foreground">{label}</dt><dd className="shrink-0">—</dd></div>)}</dl></section>)}
      <section><h3 className="flex items-center gap-2 text-sm font-semibold"><History className="size-4" />Histórico individual</h3><p className="mt-3 text-xs text-muted-foreground">Nenhum evento carregado.</p></section>
    </div></SheetContent></Sheet>
  </div>;
}