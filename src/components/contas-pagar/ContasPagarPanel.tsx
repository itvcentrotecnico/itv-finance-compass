import { useMemo, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import { AlertTriangle, CalendarClock, CheckCircle2, Eye, HandCoins, Loader2, LockKeyhole, Plus, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/finance";
import { listarContas } from "@/lib/cadastros";
import { dinheiro, hojeManaus, normalizarValor } from "@/lib/lancamentos";
import { centavos } from "@/lib/tesouraria";
import {
  baixar, cadastrar, cancelar, centavosParaDecimal, chaveEstavel, despesasLivres, exibirDocumento, limparPendente, listarBaixas,
  listarObrigacoes, operacoesVinculadas, podeCancelarCP, podeOperarCP, referenciaDocumento, SITUACOES, TIPOS_DOCUMENTO,
  type Obrigacao, type Situacao, type TipoDocumento,
} from "@/lib/contas-pagar";

const dataBR = (d: string) => d.split("-").reverse().join("/");
const brl = (c: number | string) => dinheiro(centavosParaDecimal(c));

export function ContasPagarPanel() {
  const { role } = useRouteContext({ from: "/_authenticated" });
  const [de, setDe] = useState(""); const [ate, setAte] = useState(""); const [sit, setSit] = useState<"todas" | Situacao>("todas");
  const [nova, setNova] = useState(false); const [pagar, setPagar] = useState<Obrigacao | null>(null); const [detalhe, setDetalhe] = useState<Obrigacao | null>(null);
  const q = useQuery({ queryKey: ["contas_pagar"], queryFn: listarObrigacoes, retry: false });
  const pc = useQuery({ queryKey: ["plano_contas"], queryFn: listarContas });
  const cats = (pc.data ?? []).filter((c) => c.natureza === "despesa" && c.aceita_lancamentos && c.ativo);
  const nomeCat = (id: string) => { const c = pc.data?.find((x) => x.id === id); return c ? `${c.codigo} — ${c.descricao}` : "—"; };
  const lista = useMemo(() => (q.data ?? []).filter((o) => (!de || o.vencimento >= de) && (!ate || o.vencimento <= ate) && (sit === "todas" || o.situacao === sit)), [q.data, de, ate, sit]);
  const soma = (f: (o: Obrigacao) => boolean, campo: "saldo_centavos" | "pago_centavos") => (q.data ?? []).filter(f).reduce((a, o) => a + BigInt(o[campo]), 0n);

  if (q.error?.message === "AGUARDANDO_INSTALACAO") return <div role="status" className="flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm"><LockKeyhole className="mt-0.5 size-4 shrink-0" /><div><p className="font-semibold">Contas a Pagar aguardando instalação</p><p className="mt-1 text-xs text-muted-foreground">A tela está pronta, mas o registro de obrigações só será liberado depois da instalação autorizada no banco.</p></div></div>;
  if (q.error) return <p className="text-sm text-destructive">{q.error.message}</p>;

  const cartoes = [
    { rotulo: "Em aberto", valor: soma((o) => ["aberta", "parcial", "vencida"].includes(o.situacao), "saldo_centavos"), icone: Wallet },
    { rotulo: "Vencidas (saldo)", valor: soma((o) => o.situacao === "vencida", "saldo_centavos"), icone: AlertTriangle },
    { rotulo: "Total pago", valor: soma(() => true, "pago_centavos"), icone: CheckCircle2 },
  ];
  return <div className="space-y-6">
    <section className="grid gap-4 sm:grid-cols-3">{cartoes.map((c) => <div key={c.rotulo} className="rounded-lg border bg-card p-4"><div className="flex justify-between text-xs font-medium text-muted-foreground">{c.rotulo}<c.icone className="size-4" /></div><p className="mt-3 font-mono text-xl">{q.isLoading ? "…" : brl(c.valor.toString())}</p></div>)}</section>
    <section className="flex flex-wrap items-end gap-3 border-y py-4">
      <div className="space-y-1"><Label htmlFor="cp-de">Vencimento de</Label><Input id="cp-de" type="date" value={de} onChange={(e) => setDe(e.target.value)} /></div>
      <div className="space-y-1"><Label htmlFor="cp-ate">até</Label><Input id="cp-ate" type="date" value={ate} onChange={(e) => setAte(e.target.value)} /></div>
      <div className="w-44 space-y-1"><Label>Situação</Label><Select value={sit} onValueChange={(v) => setSit(v as typeof sit)}><SelectTrigger aria-label="Situação"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todas">Todas</SelectItem>{Object.entries(SITUACOES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
      <div className="flex-1" />
      {podeOperarCP(role) && <Button onClick={() => setNova(true)}><Plus className="size-4" />Nova obrigação</Button>}
    </section>
    {q.isLoading ? <Loader2 className="size-5 animate-spin" /> : lista.length === 0 ? <EmptyState icon={Wallet} title="Nenhuma obrigação" description="Cadastre a primeira obrigação para acompanhar vencimentos e pagamentos." /> :
      <div className="overflow-x-auto rounded-lg border"><table className="w-full text-sm"><thead className="bg-muted/50 text-left text-xs text-muted-foreground"><tr><th className="p-3">Fornecedor</th><th className="p-3">Vencimento</th><th className="p-3">Documento</th><th className="p-3 text-right">Valor</th><th className="p-3 text-right">Pago</th><th className="p-3 text-right">Saldo</th><th className="p-3">Situação</th><th className="p-3" /></tr></thead>
        <tbody>{lista.map((o) => <tr key={o.id} className="border-t"><td className="p-3"><p className="font-medium">{o.fornecedor}</p><p className="text-xs text-muted-foreground">{o.descricao}</p></td><td className="p-3">{dataBR(o.vencimento)}</td><td className="p-3">{exibirDocumento(o.referencia)}</td><td className="p-3 text-right font-mono">{brl(o.valor_centavos)}</td><td className="p-3 text-right font-mono">{brl(o.pago_centavos)}</td><td className="p-3 text-right font-mono">{brl(o.saldo_centavos)}</td>
          <td className="p-3"><span className={`rounded px-2 py-0.5 text-xs ${o.situacao === "vencida" ? "bg-destructive/10 text-destructive" : o.situacao === "paga" ? "bg-primary/10 text-primary" : "bg-muted"}`}>{SITUACOES[o.situacao]}</span></td>
          <td className="whitespace-nowrap p-3 text-right"><Button size="sm" variant="ghost" aria-label="Detalhes" onClick={() => setDetalhe(o)}><Eye className="size-4" /></Button>{podeOperarCP(role) && BigInt(o.saldo_centavos) > 0n && !o.cancelada && <Button size="sm" variant="outline" onClick={() => setPagar(o)}><HandCoins className="size-4" />Pagar</Button>}</td></tr>)}</tbody></table></div>}
    {nova && <NovaObrigacao cats={cats} onClose={() => setNova(false)} />}
    {pagar && <RegistrarPagamento o={pagar} onClose={() => setPagar(null)} />}
    <Detalhes o={detalhe} cat={detalhe ? nomeCat(detalhe.plano_conta_id) : ""} podeCancelar={podeCancelarCP(role)} onClose={() => setDetalhe(null)} />
  </div>;
}

function NovaObrigacao({ cats, onClose }: { cats: { id: string; codigo: string; descricao: string }[]; onClose: () => void }) {
  const { user } = useRouteContext({ from: "/_authenticated" }); const qc = useQueryClient();
  const [f, setF] = useState({ fornecedor: "", descricao: "", plano: "", valor: "", vencimento: hojeManaus(), tipo: "os" as TipoDocumento, doc: "" });
  const [erro, setErro] = useState<string | null>(null); const [ocupado, setOcupado] = useState(false);
  async function enviar(e: FormEvent) {
    e.preventDefault(); setErro(null);
    const referencia = referenciaDocumento(f.tipo, f.doc);
    let valor = ""; try { valor = normalizarValor(f.valor); if (centavos(valor) <= 0n) throw 0; } catch { return setErro("Informe um valor válido."); }
    if (f.fornecedor.trim().length < 2 || f.descricao.trim().length < 2) return setErro("Informe fornecedor e descrição.");
    if (!f.plano) return setErro("Escolha a categoria de despesa.");
    if (!referencia) return setErro(f.tipo === "os" ? "Informe um número de OS válido." : "Informe um número de documento válido.");
    const dados = { fornecedor: f.fornecedor.trim(), descricao: f.descricao.trim(), plano: f.plano, valor, vencimento: f.vencimento, referencia };
    const escopo = `${user.id}:nova`; setOcupado(true);
    try { await cadastrar({ chave: chaveEstavel(localStorage, escopo, dados), ...dados }); limparPendente(localStorage, escopo); qc.invalidateQueries({ queryKey: ["contas_pagar"] }); toast.success("Obrigação cadastrada. Nenhuma despesa foi lançada ainda."); onClose(); }
    catch (x) { setErro((x as Error).message); } finally { setOcupado(false); }
  }
  const set = (k: keyof typeof f) => (v: string) => setF((s) => ({ ...s, [k]: v }));
  return <Dialog open onOpenChange={(o) => !o && onClose()}><DialogContent><DialogHeader><DialogTitle>Nova obrigação</DialogTitle><DialogDescription>O valor fica em aberto. A despesa entra no Livro Único quando o pagamento for registrado.</DialogDescription></DialogHeader>
    <form onSubmit={enviar} className="space-y-3">
      <div className="space-y-1"><Label htmlFor="cp-forn">Fornecedor ou favorecido</Label><Input id="cp-forn" value={f.fornecedor} onChange={(e) => set("fornecedor")(e.target.value)} /></div>
      <div className="space-y-1"><Label htmlFor="cp-desc">Descrição</Label><Input id="cp-desc" value={f.descricao} onChange={(e) => set("descricao")(e.target.value)} /></div>
      <div className="space-y-1"><Label>Categoria de despesa</Label><Select value={f.plano} onValueChange={set("plano")}><SelectTrigger aria-label="Categoria de despesa"><SelectValue placeholder="Escolha" /></SelectTrigger><SelectContent>{cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.codigo} — {c.descricao}</SelectItem>)}</SelectContent></Select></div>
      <div className="grid grid-cols-2 gap-3"><div className="space-y-1"><Label htmlFor="cp-valor">Valor</Label><Input id="cp-valor" inputMode="decimal" placeholder="1.000,00" value={f.valor} onChange={(e) => set("valor")(e.target.value)} /></div><div className="space-y-1"><Label htmlFor="cp-venc">Vencimento</Label><Input id="cp-venc" type="date" value={f.vencimento} onChange={(e) => set("vencimento")(e.target.value)} /></div></div>
      <div className="grid grid-cols-2 gap-3"><div className="space-y-1"><Label>Documento</Label><Select value={f.tipo} onValueChange={set("tipo")}><SelectTrigger aria-label="Tipo de documento"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(TIPOS_DOCUMENTO).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div><div className="space-y-1"><Label htmlFor="cp-doc">{f.tipo === "os" ? "Número da OS" : "Número"}</Label><Input id="cp-doc" placeholder={f.tipo === "os" ? "1323" : "55-A"} value={f.doc} onChange={(e) => set("doc")(e.target.value)} /></div></div>
      {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
      <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={ocupado}>{ocupado && <Loader2 className="size-4 animate-spin" />}Cadastrar</Button></div>
    </form></DialogContent></Dialog>;
}

function RegistrarPagamento({ o, onClose }: { o: Obrigacao; onClose: () => void }) {
  const { user } = useRouteContext({ from: "/_authenticated" }); const qc = useQueryClient();
  const [data, setData] = useState(hojeManaus()); const [valor, setValor] = useState(centavosParaDecimal(o.saldo_centavos).replace(".", ","));
  const [modo, setModo] = useState<"gerar" | "vincular">("gerar"); const [operacao, setOperacao] = useState("");
  const [erro, setErro] = useState<string | null>(null); const [ocupado, setOcupado] = useState(false);
  let normal = ""; try { normal = normalizarValor(valor); } catch { /* inválido */ }
  const livres = useQuery({ queryKey: ["cp-livres", o.plano_conta_id, normal], enabled: modo === "vincular" && !!normal, queryFn: async () => { const [ops, usadas] = await Promise.all([despesasLivres(o.plano_conta_id, normal), operacoesVinculadas()]); const u = new Set(usadas.map((x) => x.operacao_id)); return ops.filter((x) => !u.has(x.id)); } });
  async function enviar(e: FormEvent) {
    e.preventDefault(); setErro(null);
    if (!normal || centavos(normal) <= 0n) return setErro("Informe um valor válido.");
    if (centavos(normal) > BigInt(o.saldo_centavos)) return setErro("O valor informado é maior que o saldo em aberto.");
    if (modo === "vincular" && !operacao) return setErro("Escolha a despesa já lançada.");
    const dados: Record<string, string> = { conta: o.id, data, valor: normal, modo, ...(modo === "vincular" ? { operacao } : {}) };
    const escopo = `${user.id}:baixa:${o.id}`; setOcupado(true);
    try { const r = await baixar({ chave: chaveEstavel(localStorage, escopo, dados), ...dados }); limparPendente(localStorage, escopo); qc.invalidateQueries({ queryKey: ["contas_pagar"] }); qc.invalidateQueries({ queryKey: ["tesouraria"] }); toast.success(r.repetida ? "Pagamento já estava registrado." : "Pagamento registrado e vinculado ao Livro Único."); onClose(); }
    catch (x) { setErro((x as Error).message); } finally { setOcupado(false); }
  }
  return <Dialog open onOpenChange={(v) => !v && onClose()}><DialogContent><DialogHeader><DialogTitle>Registrar pagamento</DialogTitle><DialogDescription>{o.fornecedor} · saldo em aberto {brl(o.saldo_centavos)}</DialogDescription></DialogHeader>
    <form onSubmit={enviar} className="space-y-3">
      <div className="grid grid-cols-2 gap-3"><div className="space-y-1"><Label htmlFor="cp-pdata">Data do pagamento</Label><Input id="cp-pdata" type="date" value={data} onChange={(e) => setData(e.target.value)} /></div><div className="space-y-1"><Label htmlFor="cp-pvalor">Valor pago</Label><Input id="cp-pvalor" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} /></div></div>
      <div className="space-y-1"><Label>Livro Único</Label><Select value={modo} onValueChange={(v) => setModo(v as typeof modo)}><SelectTrigger aria-label="Livro Único"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="gerar">Lançar a despesa agora</SelectItem><SelectItem value="vincular">Vincular despesa já lançada</SelectItem></SelectContent></Select></div>
      {modo === "vincular" && <div className="space-y-1"><Label>Despesa já lançada (mesma categoria e valor)</Label>{livres.isLoading ? <Loader2 className="size-4 animate-spin" /> : (livres.data ?? []).length === 0 ? <p className="text-xs text-muted-foreground">Nenhuma despesa livre com este valor e categoria.</p> : <Select value={operacao} onValueChange={setOperacao}><SelectTrigger aria-label="Despesa já lançada"><SelectValue placeholder="Escolha" /></SelectTrigger><SelectContent>{livres.data!.map((x) => <SelectItem key={x.id} value={x.id}>{dataBR(x.data_movimento)} — {x.descricao}</SelectItem>)}</SelectContent></Select>}</div>}
      {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
      <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Cancelar</Button><Button type="submit" disabled={ocupado}>{ocupado && <Loader2 className="size-4 animate-spin" />}Registrar pagamento</Button></div>
    </form></DialogContent></Dialog>;
}

function Detalhes({ o, cat, podeCancelar, onClose }: { o: Obrigacao | null; cat: string; podeCancelar: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const b = useQuery({ queryKey: ["contas_pagar", "baixas", o?.id], enabled: !!o, queryFn: () => listarBaixas(o!.id) });
  return <Sheet open={!!o} onOpenChange={(v) => !v && onClose()}><SheetContent className="overflow-y-auto">{o && <>
    <SheetHeader><SheetTitle>{o.fornecedor}</SheetTitle><SheetDescription>{o.descricao}</SheetDescription></SheetHeader>
    <dl className="mt-4 grid grid-cols-2 gap-3 px-4 text-sm"><dt className="text-muted-foreground">Categoria</dt><dd>{cat}</dd><dt className="text-muted-foreground">Documento</dt><dd>{exibirDocumento(o.referencia)}</dd><dt className="text-muted-foreground">Vencimento</dt><dd>{dataBR(o.vencimento)}</dd><dt className="text-muted-foreground">Valor original</dt><dd className="font-mono">{brl(o.valor_centavos)}</dd><dt className="text-muted-foreground">Total pago</dt><dd className="font-mono">{brl(o.pago_centavos)}</dd><dt className="text-muted-foreground">Saldo</dt><dd className="font-mono">{brl(o.saldo_centavos)}</dd></dl>
    <h3 className="mt-6 flex items-center gap-2 px-4 text-sm font-semibold"><CalendarClock className="size-4" />Pagamentos</h3>
    <ul className="mt-2 space-y-2 px-4 text-sm">{(b.data ?? []).length === 0 ? <li className="text-muted-foreground">Nenhum pagamento.</li> : b.data!.map((x) => <li key={x.id} className="rounded border p-2"><p className="font-mono">{brl(x.valor_centavos)} · {dataBR(x.data_pagamento)}</p><p className="text-xs text-muted-foreground">{x.modo === "gerada" ? "Despesa lançada no pagamento" : "Despesa já lançada, vinculada"} · lançamento {x.operacao_id.slice(0, 8)}</p><p className="text-xs text-muted-foreground">Registrado por {x.criado_por.slice(0, 8)} em {new Date(x.criado_em).toLocaleString("pt-BR", { timeZone: "America/Manaus" })}</p></li>)}</ul>
    {podeCancelar && BigInt(o.pago_centavos) === 0n && !o.cancelada && <div className="px-4 pt-6"><Button variant="outline" onClick={async () => { try { await cancelar(o.id); qc.invalidateQueries({ queryKey: ["contas_pagar"] }); toast.success("Obrigação cancelada."); onClose(); } catch (e) { toast.error((e as Error).message); } }}>Cancelar obrigação</Button></div>}
  </>}</SheetContent></Sheet>;
}
