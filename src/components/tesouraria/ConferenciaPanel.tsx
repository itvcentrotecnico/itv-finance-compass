import { useState, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ClipboardCheck, Loader2, Landmark } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { EmptyState } from "@/components/shared/finance";
import { Carregando, ErroCarga } from "@/components/cadastros/comum";
import { fin } from "@/lib/auth/session";
import type { Role } from "@/lib/auth/permissions";
import type { Conta, Centro } from "@/lib/cadastros";
import { dinheiro, decimal, erroTesouraria, type ContaFinanceira } from "@/lib/tesouraria";
import { habilitarConta } from "@/lib/tesouraria.functions";
import { ConferenciaOperacionalEditor } from "./ConferenciaOperacionalEditor";
import { ESTADOS_CONFERENCIA } from "@/lib/conferencia-operacional";

export interface Conferencia { id: string; referencia_origem: string; natureza: "entrada" | "saida"; forma: string; data_ocorrencia: string; descricao: string; valor_bruto: string; valor_liquido: string | null; taxa: string | null; data_liquidacao: string | null; boleto_vencimento: string | null; boleto_pagamento: string | null; boleto_status: string | null; grupo_id: string; conta_financeira_id: string | null; plano_conta_id: string | null; centro_custo_id: string | null; status: string; observacao: string | null; operacao_id: string | null }
export interface ContaPreparada { id: string; nome: string; tipo: string; finalidade: string | null; situacao: string; conta_financeira_id: string | null; data_abertura: string | null; saldo_validado: string | null; responsavel_conferencia: string | null }
export const STATUS: Record<string, string> = { pendente: "Pendente", em_conferencia: "Em conferência", conciliado: "Conciliado", divergente: "Divergente" };
export const FORMAS: Record<string, string> = { dinheiro: "Dinheiro", pix: "Pix", credito: "Crédito", debito: "Débito", parcelado: "Parcelado", boleto: "Boleto", misto: "Misto (rateio)", indefinida: "Não definida" };
const NULL = "nenhum";

function Opcao({ label, value, onChange, items, empty }: { label: string; value: string; onChange: (v: string) => void; items: { id: string; nome: string }[]; empty?: string }) {
  return <Select value={value || NULL} onValueChange={(v) => onChange(v === NULL ? "" : v)}><SelectTrigger aria-label={label} className="w-full"><SelectValue /></SelectTrigger><SelectContent>{empty && <SelectItem value={NULL}>{empty}</SelectItem>}{items.map((i) => <SelectItem key={i.id} value={i.id}>{i.nome}</SelectItem>)}</SelectContent></Select>;
}

export function ContasPreparadas({ role }: { role: Role | null }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["tesouraria", "preparadas"], queryFn: async () => { const { data, error } = await fin().from("contas_preparadas").select("*").order("nome"); if (error) throw new Error(erroTesouraria(error)); return data as ContaPreparada[]; } });
  const [alvo, setAlvo] = useState<ContaPreparada | null>(null);
  const pendentes = (q.data ?? []).filter((c) => c.situacao !== "habilitada");
  if (q.isLoading || !pendentes.length) return null;
  const pode = role === "admin_geral" || role === "admin_financeiro";
  return <section className="mb-6 rounded-lg border bg-card p-5"><h3 className="flex items-center gap-2 font-semibold"><Landmark className="size-4" />Contas pendentes de abertura</h3><p className="mt-1 text-xs text-muted-foreground">Sem saldo e sem movimentações até o financeiro informar data, saldo validado e responsável.</p>
    <ul className="mt-4 divide-y">{pendentes.map((c) => <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="font-medium">{c.nome}</p><p className="text-xs text-muted-foreground">{c.finalidade}</p></div>{pode && <Button size="sm" variant="outline" onClick={() => setAlvo(c)}>Informar abertura</Button>}</li>)}</ul>
    <Sheet open={!!alvo} onOpenChange={(o) => !o && setAlvo(null)}><SheetContent><SheetHeader><SheetTitle>Abertura validada</SheetTitle><SheetDescription>{alvo?.nome}</SheetDescription></SheetHeader>{alvo && <Habilitar conta={alvo} onDone={() => { setAlvo(null); qc.invalidateQueries({ queryKey: ["tesouraria"] }); }} />}</SheetContent></Sheet>
  </section>;
}
function Habilitar({ conta, onDone }: { conta: ContaPreparada; onDone: () => void }) {
  const fn = useServerFn(habilitarConta);
  const [chave] = useState(() => crypto.randomUUID());
  const [f, setF] = useState({ data: "", valor: "", responsavel: "" });
  const [erro, setErro] = useState<string | null>(null);
  const m = useMutation({ mutationFn: async () => { const r = await fn({ data: { id: conta.id, chave, data: f.data, valor: decimal(f.valor, true), responsavel: f.responsavel } }); if (r.estado !== "confirmada") throw new Error(r.mensagem); }, onSuccess: () => { toast.success("Conta habilitada."); onDone(); }, onError: (e: Error) => setErro(e.message) });
  const submit = (e: FormEvent) => { e.preventDefault(); if (!f.data || !f.valor.trim() || f.responsavel.trim().length < 2) { setErro("Informe data, saldo validado e responsável."); return; } try { decimal(f.valor, true); } catch (x) { setErro((x as Error).message); return; } setErro(null); m.mutate(); };
  return <form onSubmit={submit} className="mt-6 space-y-4" noValidate><fieldset disabled={m.isPending} className="space-y-4">
    <div className="space-y-2"><Label>Data de abertura</Label><Input type="date" aria-label="Data de abertura" value={f.data} onChange={(e) => setF({ ...f, data: e.target.value })} /></div>
    <div className="space-y-2"><Label>Saldo inicial validado (R$)</Label><Input inputMode="decimal" aria-label="Saldo inicial validado" placeholder="0,00" value={f.valor} onChange={(e) => setF({ ...f, valor: e.target.value })} /></div>
    <div className="space-y-2"><Label>Responsável pela conferência</Label><Input aria-label="Responsável pela conferência" maxLength={160} value={f.responsavel} onChange={(e) => setF({ ...f, responsavel: e.target.value })} /></div>
  </fieldset>{erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}<Button type="submit" disabled={m.isPending}>{m.isPending && <Loader2 className="size-4 animate-spin" />}Habilitar conta</Button></form>;
}

export function ConferenciaPanel({ role, contas, planos, centros }: { role: Role | null; contas: ContaFinanceira[]; planos: Conta[]; centros: Centro[] }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState("");
  const [busca, setBusca] = useState("");
  const [edit, setEdit] = useState<Conferencia | null>(null);
  const q = useQuery({ queryKey: ["tesouraria", "conferencias"], queryFn: async () => {
    const { data, error } = await fin().from("tesouraria_conferencias").select("*").order("data_ocorrencia").order("referencia_origem").limit(5000);
    if (error) throw new Error(erroTesouraria(error));
    const { data: controles, error: falha } = await fin().from("conferencia_controles").select("id,estado,dados");
    // SQL pending: source consultation remains possible, but editor fails closed.
    if (falha && !["42P01", "PGRST205"].includes(falha.code)) throw new Error(erroTesouraria(falha));
    const porId = new Map((controles ?? []).map((c: { id: string; estado: string; dados: Partial<Conferencia> }) => [c.id, c]));
    return (data ?? []).map((c: Conferencia) => { const r = porId.get(c.id); return r ? { ...c, ...r.dados, status: r.estado, operacao_id: r.estado === "lancado" ? "vinculo-auxiliar" : c.operacao_id } : c; }) as Conferencia[];
  } });
  const lista = (q.data ?? []).filter((c) => (!status || (status === "lancado" ? !!c.operacao_id : c.status === status && !c.operacao_id)) && (!busca || `${c.descricao} ${c.referencia_origem}`.toLowerCase().includes(busca.toLowerCase())));
  const nome = (id: string | null) => contas.find((c) => c.id === id)?.nome ?? "Conta pendente";
  if (q.isLoading) return <Carregando />;
  if (q.isError) return <ErroCarga erro={q.error} onRetry={() => q.refetch()} />;
  return <>
    <div className="mb-5 flex flex-wrap items-center gap-3"><div className="w-48"><Opcao label="Situação" value={status} onChange={setStatus} empty="Todas as situações" items={Object.entries(ESTADOS_CONFERENCIA).map(([id, nome]) => ({ id, nome }))} /></div><Input className="max-w-64" aria-label="Buscar conferência" placeholder="Buscar descrição ou origem" value={busca} onChange={(e) => setBusca(e.target.value)} /><span className="text-xs text-muted-foreground">{lista.length} registro(s)</span>
</div>
    {!lista.length ? <EmptyState icon={ClipboardCheck} title="Nenhum registro em conferência" description="Registros da planilha aguardando conferência aparecem aqui" /> :
    <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead className="border-b text-left text-xs text-muted-foreground"><tr>{["Data", "Descrição", "Forma", "Conta", "Bruto", "Líquido", "Situação"].map((s) => <th key={s} className="px-2 py-3">{s}</th>)}</tr></thead>
      <tbody>{lista.slice(0, 300).map((c) => <tr key={c.id} className="cursor-pointer border-b hover:bg-muted/40" onClick={() => setEdit(c)}><td className="whitespace-nowrap px-2 py-3">{c.data_ocorrencia.split("-").reverse().join("/")}</td><td className="max-w-64 px-2"><p className="break-words">{c.descricao}</p><p className="text-xs text-muted-foreground">{c.natureza === "entrada" ? "Entrada" : "Saída"} · {c.referencia_origem}</p></td><td className="px-2">{FORMAS[c.forma]}</td><td className="px-2 text-xs">{c.conta_financeira_id ? nome(c.conta_financeira_id) : "Pendente"}</td><td className="whitespace-nowrap px-2 text-right font-mono">{dinheiro(c.valor_bruto)}</td><td className="whitespace-nowrap px-2 text-right font-mono">{c.valor_liquido ? dinheiro(c.valor_liquido) : "—"}</td><td className="px-2 text-xs">{c.operacao_id ? "Lançado" : ESTADOS_CONFERENCIA[c.status]}</td></tr>)}</tbody></table>{lista.length > 300 && <p className="mt-3 text-xs text-muted-foreground">Mostrando 300 de {lista.length}. Use os filtros.</p>}</div>}
    <Sheet open={!!edit} onOpenChange={(o) => !o && setEdit(null)}><SheetContent className="overflow-y-auto"><SheetHeader><SheetTitle>Conferência</SheetTitle><SheetDescription>{edit?.referencia_origem}</SheetDescription></SheetHeader>{edit && <ConferenciaOperacionalEditor key={edit.id} id={edit.id} role={role} contas={contas} planos={planos} centros={centros} onDone={() => { setEdit(null); qc.invalidateQueries({ queryKey: ["tesouraria"] }); }} />}</SheetContent></Sheet>
  </>;
}

