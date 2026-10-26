import { useMemo, useState, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ClipboardCheck, Loader2, Upload, Send, Landmark } from "lucide-react";
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
import { dinheiro, decimal, erroTesouraria, podeOperar, type ContaFinanceira } from "@/lib/tesouraria";
import { lancarConferencia, habilitarConta } from "@/lib/tesouraria.functions";
import lote from "@/lib/lote-set-out-2026.json";

export interface Conferencia { id: string; referencia_origem: string; natureza: "entrada" | "saida"; forma: string; data_ocorrencia: string; descricao: string; valor_bruto: string; valor_liquido: string | null; taxa: string | null; data_liquidacao: string | null; boleto_vencimento: string | null; boleto_pagamento: string | null; boleto_status: string | null; grupo_id: string; conta_financeira_id: string | null; plano_conta_id: string | null; centro_custo_id: string | null; status: string; observacao: string | null; operacao_id: string | null }
export interface ContaPreparada { id: string; nome: string; tipo: string; finalidade: string | null; situacao: string; conta_financeira_id: string | null; data_abertura: string | null; saldo_validado: string | null; responsavel_conferencia: string | null }
export const STATUS: Record<string, string> = { pendente: "Pendente", em_conferencia: "Em conferência", conciliado: "Conciliado", divergente: "Divergente" };
export const FORMAS: Record<string, string> = { dinheiro: "Dinheiro", pix: "Pix", credito: "Crédito", debito: "Débito", parcelado: "Parcelado", boleto: "Boleto", misto: "Misto (rateio)", indefinida: "Não definida" };
const CARTAO = ["credito", "debito", "parcelado"];
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
  const q = useQuery({ queryKey: ["tesouraria", "conferencias"], queryFn: async () => { const { data, error } = await fin().from("tesouraria_conferencias").select("*").order("data_ocorrencia").order("referencia_origem").limit(5000); if (error) throw new Error(erroTesouraria(error)); return data as Conferencia[]; } });
  const pode = podeOperar(role);
  const faltantes = useMemo(() => { const tem = new Set((q.data ?? []).map((c) => c.referencia_origem)); return (lote as string[][]).filter((l) => !tem.has(l[0] ?? "")); }, [q.data]);
  const carga = useMutation({ mutationFn: async () => {
    for (let i = 0; i < faltantes.length; i += 100) {
      const rows = faltantes.slice(i, i + 100).map(([referencia_origem, natureza, forma, data_ocorrencia, descricao, valor_bruto, observacao]) => ({ referencia_origem, natureza, forma, data_ocorrencia, descricao, valor_bruto, observacao, boleto_status: forma === "boleto" ? "pendente" : null, status: "pendente" }));
      const { error } = await fin().from("tesouraria_conferencias").upsert(rows, { onConflict: "referencia_origem", ignoreDuplicates: true });
      if (error) throw new Error(erroTesouraria(error));
    }
  }, onSettled: () => qc.invalidateQueries({ queryKey: ["tesouraria", "conferencias"] }), onSuccess: () => toast.success("Lote carregado para conferência. Nenhum saldo foi alterado."), onError: (e: Error) => toast.error(e.message) });
  const lista = (q.data ?? []).filter((c) => (!status || (status === "lancado" ? !!c.operacao_id : c.status === status && !c.operacao_id)) && (!busca || `${c.descricao} ${c.referencia_origem}`.toLowerCase().includes(busca.toLowerCase())));
  const nome = (id: string | null) => contas.find((c) => c.id === id)?.nome ?? "Conta pendente";
  if (q.isLoading) return <Carregando />;
  if (q.isError) return <ErroCarga erro={q.error} onRetry={() => q.refetch()} />;
  return <>
    <div className="mb-5 flex flex-wrap items-center gap-3"><div className="w-48"><Opcao label="Situação" value={status} onChange={setStatus} empty="Todas as situações" items={[...Object.entries(STATUS).map(([id, nome]) => ({ id, nome })), { id: "lancado", nome: "Lançado" }]} /></div><Input className="max-w-64" aria-label="Buscar conferência" placeholder="Buscar descrição ou origem" value={busca} onChange={(e) => setBusca(e.target.value)} /><span className="text-xs text-muted-foreground">{lista.length} registro(s)</span>
      {pode && faltantes.length > 0 && <Button size="sm" variant="outline" className="ml-auto" disabled={carga.isPending} onClick={() => carga.mutate()}>{carga.isPending ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}Carregar lote set/out 2026 ({faltantes.length})</Button>}</div>
    {!lista.length ? <EmptyState icon={ClipboardCheck} title="Nenhum registro em conferência" description="Registros da planilha aguardando conferência aparecem aqui" /> :
    <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead className="border-b text-left text-xs text-muted-foreground"><tr>{["Data", "Descrição", "Forma", "Conta", "Bruto", "Líquido", "Situação"].map((s) => <th key={s} className="px-2 py-3">{s}</th>)}</tr></thead>
      <tbody>{lista.slice(0, 300).map((c) => <tr key={c.id} className="cursor-pointer border-b hover:bg-muted/40" onClick={() => setEdit(c)}><td className="whitespace-nowrap px-2 py-3">{c.data_ocorrencia.split("-").reverse().join("/")}</td><td className="max-w-64 px-2"><p className="break-words">{c.descricao}</p><p className="text-xs text-muted-foreground">{c.natureza === "entrada" ? "Entrada" : "Saída"} · {c.referencia_origem.split("|").slice(1).join(" · ")}</p></td><td className="px-2">{FORMAS[c.forma]}</td><td className="px-2 text-xs">{c.conta_financeira_id ? nome(c.conta_financeira_id) : "Pendente"}</td><td className="whitespace-nowrap px-2 text-right font-mono">{dinheiro(c.valor_bruto)}</td><td className="whitespace-nowrap px-2 text-right font-mono">{c.valor_liquido ? dinheiro(c.valor_liquido) : "—"}</td><td className="px-2 text-xs">{c.operacao_id ? "Lançado" : STATUS[c.status]}</td></tr>)}</tbody></table>{lista.length > 300 && <p className="mt-3 text-xs text-muted-foreground">Mostrando 300 de {lista.length}. Use os filtros.</p>}</div>}
    <Sheet open={!!edit} onOpenChange={(o) => !o && setEdit(null)}><SheetContent className="overflow-y-auto"><SheetHeader><SheetTitle>Conferência</SheetTitle><SheetDescription>{edit?.referencia_origem}</SheetDescription></SheetHeader>{edit && <Editar key={edit.id} c={edit} pode={pode} contas={contas} planos={planos} centros={centros} onDone={() => { setEdit(null); qc.invalidateQueries({ queryKey: ["tesouraria"] }); }} />}</SheetContent></Sheet>
  </>;
}

function Editar({ c, pode, contas, planos, centros, onDone }: { c: Conferencia; pode: boolean; contas: ContaFinanceira[]; planos: Conta[]; centros: Centro[]; onDone: () => void }) {
  const [f, setF] = useState({ ...c, valor_bruto: c.valor_bruto ?? "", valor_liquido: c.valor_liquido ?? "" });
  const [erro, setErro] = useState<string | null>(null);
  const lancar = useServerFn(lancarConferencia);
  const set = (k: keyof Conferencia, v: string) => setF((x) => ({ ...x, [k]: v || null }));
  const bloqueado = !pode || !!c.operacao_id;
  const salvar = useMutation({ mutationFn: async () => {
    const valor_bruto = decimal(String(f.valor_bruto ?? "")); const valor_liquido = f.valor_liquido ? decimal(String(f.valor_liquido)) : null;
    const { error } = await fin().from("tesouraria_conferencias").update({ forma: f.forma, data_ocorrencia: f.data_ocorrencia, descricao: f.descricao.trim(), valor_bruto, valor_liquido, data_liquidacao: f.data_liquidacao, boleto_vencimento: f.boleto_vencimento, boleto_pagamento: f.boleto_pagamento, boleto_status: f.forma === "boleto" ? f.boleto_status ?? "pendente" : f.boleto_status, conta_financeira_id: f.conta_financeira_id, plano_conta_id: f.plano_conta_id, centro_custo_id: f.centro_custo_id, status: f.status, observacao: f.observacao }).eq("id", c.id);
    if (error) throw new Error(/check constraint/i.test(error.message) ? "Para conciliar: conta definida; cartão com líquido e data de liquidação; boleto pago com data de pagamento." : erroTesouraria(error));
  }, onSuccess: () => { toast.success("Conferência salva."); onDone(); }, onError: (e: Error) => setErro(e.message) });
  const lanca = useMutation({ mutationFn: async () => { const r = await lancar({ data: { id: c.id } }); if (r.estado !== "confirmada") throw new Error(r.mensagem); }, onSuccess: () => { toast.success("Lançado na Tesouraria."); onDone(); }, onError: (e: Error) => setErro(e.message) });
  const parte = useMutation({ mutationFn: async () => {
    const { count } = await fin().from("tesouraria_conferencias").select("id", { count: "exact", head: true }).eq("grupo_id", c.grupo_id);
    const { error } = await fin().from("tesouraria_conferencias").insert({ referencia_origem: `${c.referencia_origem}|parte ${count ?? 1}`, grupo_id: c.grupo_id, natureza: c.natureza, forma: "indefinida", data_ocorrencia: c.data_ocorrencia, descricao: `${c.descricao} · parte ${count ?? 1}`.slice(0, 500), valor_bruto: "0.01", status: "pendente", observacao: "Componente de pagamento misto: informe forma, valor e conta" });
    if (error) throw new Error(erroTesouraria(error));
  }, onSuccess: () => { toast.success("Parte criada. Ajuste forma, valor e conta."); onDone(); }, onError: (e: Error) => setErro(e.message) });
  const campo = (label: string, k: keyof Conferencia, type = "text") => <div className="space-y-2"><Label>{label}</Label><Input type={type} aria-label={label} inputMode={type === "text" && k.startsWith("valor") ? "decimal" : undefined} value={(f[k] as string) ?? ""} onChange={(e) => set(k, e.target.value)} /></div>;
  const cartao = CARTAO.includes(f.forma ?? "");
  return <div className="mt-6 space-y-4">
    {c.observacao && <p className="rounded-md border bg-muted/40 p-3 text-xs">{c.observacao}</p>}
    <fieldset disabled={bloqueado || salvar.isPending} className="space-y-4">
      <div className="space-y-2"><Label>Forma de pagamento</Label><Opcao label="Forma de pagamento" value={f.forma} onChange={(v) => set("forma", v)} items={Object.entries(FORMAS).map(([id, nome]) => ({ id, nome }))} /></div>
      {campo("Descrição", "descricao")}{campo("Data da venda/pagamento", "data_ocorrencia", "date")}{campo(cartao ? "Valor bruto (R$)" : "Valor (R$)", "valor_bruto")}
      {cartao && <>{campo("Valor líquido recebido (R$)", "valor_liquido")}{campo("Data da liquidação", "data_liquidacao", "date")}{c.taxa && <p className="text-xs text-muted-foreground">Taxa da operadora: {dinheiro(c.taxa)}</p>}</>}
      {f.forma === "boleto" && <>{campo("Vencimento", "boleto_vencimento", "date")}{campo("Data de pagamento", "boleto_pagamento", "date")}<div className="space-y-2"><Label>Situação do boleto</Label><Opcao label="Situação do boleto" value={f.boleto_status ?? "pendente"} onChange={(v) => set("boleto_status", v)} items={[{ id: "pendente", nome: "Pendente" }, { id: "pago", nome: "Pago" }, { id: "vencido", nome: "Vencido" }]} /></div></>}
      <div className="space-y-2"><Label>Conta financeira</Label><Opcao label="Conta financeira" value={f.conta_financeira_id ?? ""} onChange={(v) => set("conta_financeira_id", v)} empty="Pendente de vínculo" items={contas.filter((x) => x.ativo)} /></div>
      <div className="space-y-2"><Label>Categoria</Label><Opcao label="Categoria" value={f.plano_conta_id ?? ""} onChange={(v) => set("plano_conta_id", v)} empty="Pendente de classificação" items={planos.filter((p) => p.ativo && p.aceita_lancamentos).map((p) => ({ id: p.id, nome: `${p.codigo} · ${p.descricao}` }))} /></div>
      <div className="space-y-2"><Label>Centro de custo</Label><Opcao label="Centro de custo" value={f.centro_custo_id ?? ""} onChange={(v) => set("centro_custo_id", v)} empty="Sem centro de custo" items={centros.filter((x) => x.ativo).map((x) => ({ id: x.id, nome: `${x.codigo} · ${x.descricao}` }))} /></div>
      <div className="space-y-2"><Label>Situação da conferência</Label><Opcao label="Situação da conferência" value={f.status} onChange={(v) => set("status", v)} items={Object.entries(STATUS).map(([id, nome]) => ({ id, nome }))} /></div>
      {campo("Observação", "observacao")}
    </fieldset>
    {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
    {c.operacao_id ? <p className="text-sm text-muted-foreground">Lançado na Tesouraria (operação {c.operacao_id}). Correções somente por estorno.</p> : pode && <div className="flex flex-wrap gap-2">
      <Button disabled={salvar.isPending} onClick={() => { setErro(null); try { salvar.mutate(); } catch (e) { setErro((e as Error).message); } }}>{salvar.isPending && <Loader2 className="size-4 animate-spin" />}Salvar conferência</Button>
      {c.status === "conciliado" && c.forma !== "misto" && <Button variant="outline" disabled={lanca.isPending} onClick={() => lanca.mutate()}>{lanca.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}Lançar na Tesouraria</Button>}
      {c.forma === "misto" && <Button variant="outline" disabled={parte.isPending} onClick={() => parte.mutate()}>Adicionar forma de pagamento</Button>}
    </div>}
  </div>;
}
