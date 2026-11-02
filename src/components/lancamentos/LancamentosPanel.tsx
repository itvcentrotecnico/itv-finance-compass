import { Suspense, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight, Eye, Hash, Loader2, Plus, Scale, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { EmptyState } from "@/components/shared/finance";
import { Carregando, ErroCarga } from "@/components/cadastros/comum";
import { listarContas, type Conta } from "@/lib/cadastros";
import { carregarHistoricoTesouraria, carregarOpcoesLancamento } from "@/lib/tesouraria.functions";
import type { OpcoesOficiais } from "@/lib/lancamentos-oficiais";
import { podeOperar, validarPedido, type ContaFinanceira, type OperacaoHistorico } from "@/lib/tesouraria";
import { dinheiro, FORMAS_PAGAMENTO, hojeManaus, intervalo, normalizarValor, PERIODOS, resumir, type Periodo } from "@/lib/lancamentos";
import { tesourariaOptions } from "@/components/tesouraria/TesourariaPanel";
import { useEnvioSeguro } from "@/components/tesouraria/useEnvioSeguro";

const POR_PAGINA = 20;
const LIMITE_PAGINAS = 20; // até 1.000 operações por tipo no período
type Tipo = "entrada" | "saida";
const dataBR = (d: string) => d.split("-").reverse().join("/");

export function LancamentosPanel() { return <Suspense fallback={<Carregando />}><Lancamentos /></Suspense>; }

function Escolha({ label, value, onChange, items, empty }: { label: string; value: string; onChange: (v: string) => void; items: { id: string; nome: string }[]; empty: string }) {
  return <Select value={value || "todos"} onValueChange={(v) => onChange(v === "todos" ? "" : v)}><SelectTrigger aria-label={label} className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">{empty}</SelectItem>{items.map((i) => <SelectItem key={i.id} value={i.id}>{i.nome}</SelectItem>)}</SelectContent></Select>;
}

function Lancamentos() {
  const { role } = useRouteContext({ from: "/_authenticated" });
  const { data: contas } = useSuspenseQuery(tesourariaOptions);
  const qc = useQueryClient();
  const hoje = hojeManaus();
  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const [custom, setCustom] = useState(() => intervalo("mes", hoje));
  const [tipo, setTipo] = useState<"" | Tipo>("");
  const [plano, setPlano] = useState("");
  const [conta, setConta] = useState("");
  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(0);
  const [novo, setNovo] = useState(false);
  const [detalhe, setDetalhe] = useState<OperacaoHistorico | null>(null);
  const { inicio, fim } = periodo === "personalizado" ? custom : intervalo(periodo, hoje);

  const contratoFn = useServerFn(carregarOpcoesLancamento);
  const contrato = useQuery({ queryKey: ["tesouraria", "opcoes-v2.1"], queryFn: () => contratoFn(), enabled: podeOperar(role), staleTime: 60000 });
  const liberado = podeOperar(role) && contrato.data != null;
  const seguro = useEnvioSeguro(() => { qc.invalidateQueries({ queryKey: ["tesouraria"] }); toast.success("Lançamento registrado com sucesso."); setNovo(false); });

  const pc = useQuery({ queryKey: ["plano_contas"], queryFn: listarContas });
  const historicoFn = useServerFn(carregarHistoricoTesouraria);
  const tipos: Tipo[] = tipo ? [tipo] : ["entrada", "saida"];
  const dados = useQuery({
    queryKey: ["tesouraria", "lancamentos", inicio, fim, tipos.join(","), plano, conta],
    queryFn: async () => {
      const ops: OperacaoHistorico[] = []; let incompleto = false;
      for (const t of tipos) {
        for (let p = 0; p < LIMITE_PAGINAS; p++) {
          const r = await historicoFn({ data: { inicio, fim, tipo: t, pagina: p, ...(plano ? { plano } : {}), ...(conta ? { conta } : {}) } });
          ops.push(...r.operacoes);
          if ((p + 1) * 50 >= r.total) break;
          if (p === LIMITE_PAGINAS - 1) incompleto = true;
        }
      }
      const unicos = [...new Map(ops.map((o) => [o.id, o])).values()];
      unicos.sort((a, b) => b.data_movimento.localeCompare(a.data_movimento) || b.criado_em.localeCompare(a.criado_em));
      return { ops: unicos, incompleto };
    },
    enabled: inicio <= fim,
  });
  const filtradas = useMemo(() => { const t = busca.trim().toLowerCase(); return (dados.data?.ops ?? []).filter((o) => !t || o.descricao.toLowerCase().includes(t)); }, [dados.data, busca]);
  const resumo = resumir(filtradas);
  const indicadoresIndisponiveis = dados.isError || inicio > fim || dados.data?.incompleto;
  const visiveis = filtradas.slice(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA);
  const nomeConta = (id: string | null) => contas.find((c) => c.id === id)?.nome ?? "—";
  const reset = () => setPagina(0);
  const categorias = (pc.data ?? []).filter((c) => c.aceita_lancamentos && (!tipo || c.natureza === (tipo === "entrada" ? "receita" : "despesa")));

  const motivoBloqueio = !podeOperar(role) ? "Seu perfil permite somente consulta." : contrato.isLoading ? "Verificando habilitação do registro..." : !liberado ? "O registro de lançamentos aguarda habilitação dos controles de segurança no banco de dados." : null;

  return <>
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <p className="max-w-xl text-sm text-muted-foreground">{motivoBloqueio ?? "Registro liberado para administradores. Cada lançamento é confirmado pelo banco antes de aparecer na lista."}</p>
      <Button disabled={!liberado || !!seguro.pendente || seguro.bloqueio || seguro.ocupado} onClick={() => setNovo(true)}><Plus className="size-4" />Novo lançamento</Button>
    </div>
    {(seguro.pendente || seguro.bloqueio || seguro.mensagem) && <div className="mb-5 space-y-3 border-y py-4"><p role="alert" className="text-sm text-destructive">{seguro.mensagem ?? (seguro.pendente ? `Envio pendente · ${seguro.pendente.descricao}` : "Este navegador não permite proteger novos envios. Registro bloqueado.")}</p>{seguro.pendente && <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={seguro.ocupado || seguro.bloqueio} onClick={() => seguro.executar()}>Consultar resultado</Button><Button variant="outline" disabled={seguro.ocupado || seguro.bloqueio} onClick={() => seguro.executar(undefined, true)}>Recuperar mesmos dados</Button></div>}</div>}

    <section aria-label="Indicadores do período" className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[["Receitas", resumo.receitas, ArrowDownLeft, "text-brand"], ["Despesas", resumo.despesas, ArrowUpRight, "text-destructive"], ["Resultado", resumo.resultado, Scale, resumo.resultado.startsWith("-") ? "text-destructive" : "text-brand"]].map(([l, v, I, cor]) => { const Icone = I as typeof Scale; return <article key={l as string} className="rounded-lg border bg-card p-5"><p className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground"><Icone className="size-4" />{l as string}</p><p className={`mt-3 break-words font-mono text-2xl ${cor}`}>{indicadoresIndisponiveis ? "Indisponível" : dados.isPending ? "…" : dinheiro(v as string)}</p></article>; })}
      <article className="rounded-lg border bg-card p-5"><p className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground"><Hash className="size-4" />Lançamentos</p><p className="mt-3 font-mono text-2xl">{indicadoresIndisponiveis ? "Indisponível" : dados.isPending ? "…" : resumo.quantidade}</p></article>
    </section>
    <p className="mb-5 text-xs text-muted-foreground">Indicadores do período {dataBR(inicio)} a {dataBR(fim)}. Consideram somente receitas e despesas efetivas; saldos iniciais, transferências e operações estornadas ficam fora.{dados.data?.incompleto && " Atenção: o período tem mais de 1.000 operações por tipo; reduza o período para totais completos."}</p>

    <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <Select value={periodo} onValueChange={(v) => { setPeriodo(v as Periodo); reset(); }}><SelectTrigger aria-label="Período"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(PERIODOS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select>
      <Escolha label="Tipo" value={tipo} onChange={(v) => { setTipo(v as "" | Tipo); setPlano(""); reset(); }} items={[{ id: "entrada", nome: "Receitas" }, { id: "saida", nome: "Despesas" }]} empty="Todos os tipos" />
      <Escolha label="Categoria" value={plano} onChange={(v) => { setPlano(v); reset(); }} items={categorias.map((c) => ({ id: c.id, nome: `${c.codigo} · ${c.descricao}` }))} empty="Todas as categorias" />
      <Escolha label="Conta financeira" value={conta} onChange={(v) => { setConta(v); reset(); }} items={contas} empty="Todas as contas" />
      <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="Pesquisar descrição" className="pl-9" placeholder="Pesquisar descrição" value={busca} onChange={(e) => { setBusca(e.target.value); reset(); }} /></div>
      {periodo === "personalizado" && <div className="grid grid-cols-2 gap-3 sm:col-span-2"><Input type="date" aria-label="Data inicial" value={custom.inicio} onChange={(e) => { setCustom((c) => ({ ...c, inicio: e.target.value })); reset(); }} /><Input type="date" aria-label="Data final" value={custom.fim} onChange={(e) => { setCustom((c) => ({ ...c, fim: e.target.value })); reset(); }} /></div>}
    </div>

    {inicio > fim ? <p role="alert" className="text-sm text-destructive">A data inicial deve ser anterior ou igual à data final.</p> : dados.isLoading ? <Carregando /> : dados.isError ? <ErroCarga erro={dados.error} onRetry={() => dados.refetch()} /> : !filtradas.length ? <EmptyState icon={Scale} title="Nenhum lançamento encontrado para o período selecionado." description="Ajuste os filtros ou o período." /> : <>
      <div className="overflow-x-auto rounded-lg border bg-card"><table className="w-full min-w-[820px] text-sm"><thead className="border-b text-left text-xs text-muted-foreground"><tr>{["Data", "Descrição", "Categoria", "Conta", "Tipo", "Valor", "Situação", "Ações"].map((s) => <th key={s} className={`px-3 py-3 ${s === "Valor" ? "text-right" : ""}`}>{s}</th>)}</tr></thead>
        <tbody>{visiveis.map((o) => { const rec = o.tipo === "entrada"; return <tr key={o.id} className={`border-b last:border-0 ${o.estornada ? "text-muted-foreground" : ""}`}>
          <td className="whitespace-nowrap px-3 py-3">{dataBR(o.data_movimento)}</td>
          <td className="max-w-72 break-words px-3 py-3">{o.descricao}</td>
          <td className="px-3 text-xs">{o.classificacao_snapshot ? `${o.classificacao_snapshot.codigo} · ${o.classificacao_snapshot.descricao}` : "—"}</td>
          <td className="px-3">{nomeConta(o.conta_destino_id ?? o.conta_origem_id)}</td>
          <td className="px-3"><span className={`inline-flex items-center gap-1 text-xs font-medium ${rec ? "text-brand" : "text-destructive"}`}>{rec ? <ArrowDownLeft className="size-3.5" /> : <ArrowUpRight className="size-3.5" />}{rec ? "Receita" : "Despesa"}</span></td>
          <td className={`whitespace-nowrap px-3 text-right font-mono ${o.estornada ? "line-through" : rec ? "text-brand" : "text-destructive"}`}>{rec ? "+ " : "− "}{dinheiro(o.valor)}</td>
          <td className="px-3 text-xs">{o.estornada ? <span className="rounded-full border border-destructive/40 px-2 py-0.5 text-destructive">Estornada</span> : <span className="rounded-full border px-2 py-0.5">Confirmada</span>}</td>
          <td className="px-3"><Button variant="ghost" size="icon" aria-label={`Detalhes ${o.descricao}`} onClick={() => setDetalhe(o)}><Eye className="size-4" /></Button></td>
        </tr>; })}</tbody></table></div>
      <div className="mt-4 flex items-center justify-between"><span className="text-xs text-muted-foreground">{filtradas.length} lançamento(s) · Página {pagina + 1} de {Math.max(1, Math.ceil(filtradas.length / POR_PAGINA))}</span><div className="flex gap-2"><Button variant="outline" size="icon" aria-label="Página anterior" disabled={!pagina} onClick={() => setPagina((p) => p - 1)}><ChevronLeft className="size-4" /></Button><Button variant="outline" size="icon" aria-label="Próxima página" disabled={(pagina + 1) * POR_PAGINA >= filtradas.length} onClick={() => setPagina((p) => p + 1)}><ChevronRight className="size-4" /></Button></div></div>
    </>}

    <Sheet open={novo} onOpenChange={(o) => !o && !seguro.ocupado && setNovo(false)}><SheetContent className="w-full overflow-y-auto sm:max-w-lg"><SheetHeader><SheetTitle>Novo lançamento</SheetTitle><SheetDescription>Receita ou despesa · confirmada pelo banco de dados</SheetDescription></SheetHeader>{novo && liberado && contrato.data && <NovoLancamento oficiais={contrato.data} contas={contas} planos={pc.data ?? []} seguro={seguro} hoje={hoje} onCancel={() => setNovo(false)} />}</SheetContent></Sheet>
    <Sheet open={detalhe !== null} onOpenChange={(o) => !o && setDetalhe(null)}><SheetContent className="overflow-y-auto"><SheetHeader><SheetTitle>Detalhes do lançamento</SheetTitle><SheetDescription>{detalhe?.descricao}</SheetDescription></SheetHeader>{detalhe && <dl className="mt-6 space-y-3 text-sm">{[["Tipo", detalhe.tipo === "entrada" ? "Receita" : "Despesa"], ["Valor", dinheiro(detalhe.valor)], ["Data", dataBR(detalhe.data_movimento)], ["Conta", nomeConta(detalhe.conta_destino_id ?? detalhe.conta_origem_id)], ["Categoria", detalhe.classificacao_snapshot ? `${detalhe.classificacao_snapshot.codigo} · ${detalhe.classificacao_snapshot.descricao}` : "—"], ["Situação", detalhe.estornada ? "Estornada" : "Confirmada"], ["Registrado em", new Date(detalhe.criado_em).toLocaleString("pt-BR", { timeZone: "America/Manaus" })], ["Identificador", detalhe.id]].map(([k, v]) => <div key={k}><dt className="text-xs text-muted-foreground">{k}</dt><dd className="break-words">{v}</dd></div>)}</dl>}</SheetContent></Sheet>
  </>;
}

function Campo({ label, obrigatorio, children, nota }: { label: string; obrigatorio?: boolean; children: ReactNode; nota?: string | undefined }) {
  return <div className="space-y-2"><Label>{label}{obrigatorio && <span className="text-destructive"> *</span>}</Label>{children}{nota && <p className="text-xs text-muted-foreground">{nota}</p>}</div>;
}

export function NovoLancamento({ contas, planos, oficiais, seguro, hoje, onCancel }: { contas: ContaFinanceira[]; planos: Conta[]; oficiais: OpcoesOficiais; seguro: ReturnType<typeof useEnvioSeguro>; hoje: string; onCancel: () => void }) {
  const [tipo, setTipo] = useState<Tipo>("entrada");
  const [chave] = useState(() => crypto.randomUUID());
  const [f, setF] = useState({ valor: "", descricao: "", plano: "", conta: "", data: hoje, referencia: "" });
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const natureza = tipo === "entrada" ? "receita" : "despesa";
  const aptas = planos.filter((c) => oficiais.categorias.includes(c.id) && c.ativo && c.aceita_lancamentos && c.natureza === natureza);
  const contasAptas = contas.filter((c) => oficiais.contas.includes(c.id) && c.ativo);
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));
  const travado = enviando || !!seguro.pendente || seguro.bloqueio || seguro.ocupado;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (travado) return;
    let valor: string;
    try { valor = normalizarValor(f.valor); } catch { setErro("Informe um valor válido, por exemplo 1.234,56."); return; }
    if (valor === "0.00") { setErro("O valor deve ser maior que zero."); return; }
    if (!f.plano || !aptas.some((c) => c.id === f.plano)) { setErro(`Selecione uma categoria de ${natureza}.`); return; }
    if (!contasAptas.some((c) => c.id === f.conta)) { setErro("Selecione uma conta oficial ativa."); return; }
    const ref = f.referencia.trim().toLowerCase();
    if (!/^externo:[a-z0-9][a-z0-9._:/-]+$/.test(ref)) { setErro("Informe a referência no formato externo:documento (ex.: externo:os-1450)."); return; }
    const pedido = { tipo, chave, data: f.data, descricao: f.descricao.trim(), valor, plano: f.plano, referencia: ref, ...(tipo === "entrada" ? { destino: f.conta } : { origem: f.conta }) };
    const v = validarPedido(pedido, contas);
    if (v) { setErro(v); return; }
    setErro(null); setEnviando(true);
    try { const r = await seguro.executar(pedido); if (r.estado !== "confirmada") setErro(r.mensagem); } finally { setEnviando(false); }
  }

  return <form onSubmit={submit} noValidate className="mt-6 space-y-5"><fieldset disabled={travado} className="space-y-5">
    <div role="radiogroup" aria-label="Tipo de lançamento" className="grid grid-cols-2 gap-2">
      {(["entrada", "saida"] as Tipo[]).map((t) => <Button key={t} variant="outline" type="button" role="radio" aria-checked={tipo === t} onClick={() => { setTipo(t); set("plano", ""); }} className={`h-auto py-3 ${tipo === t ? (t === "entrada" ? "border-brand bg-brand/10 text-brand" : "border-destructive bg-destructive/10 text-destructive") : "text-muted-foreground"}`}>{t === "entrada" ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}{t === "entrada" ? "Receita" : "Despesa"}</Button>)}
    </div>
    <Campo label="Valor (R$)" obrigatorio><Input aria-label="Valor" inputMode="decimal" placeholder="0,00" value={f.valor} onChange={(e) => set("valor", e.target.value)} /></Campo>
    <Campo label="Descrição" obrigatorio><Input aria-label="Descrição" maxLength={500} placeholder={tipo === "entrada" ? "Conserto de TV Samsung 55”" : "Compra de barras LED"} value={f.descricao} onChange={(e) => set("descricao", e.target.value)} /></Campo>
    <Campo label="Categoria" obrigatorio nota={!aptas.length ? `Nenhuma categoria de ${natureza} disponível.` : undefined}><Select value={f.plano} onValueChange={(v) => set("plano", v)}><SelectTrigger aria-label="Categoria do lançamento"><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{aptas.map((c) => <SelectItem key={c.id} value={c.id}>{c.codigo} · {c.descricao}</SelectItem>)}</SelectContent></Select></Campo>
    <Campo label="Conta financeira" obrigatorio><Select value={f.conta} onValueChange={(v) => set("conta", v)}><SelectTrigger aria-label="Conta financeira do lançamento"><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{contasAptas.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent></Select></Campo>
    <Campo label="Data do lançamento" obrigatorio nota="Não pode ser anterior à abertura da conta."><Input type="date" aria-label="Data do lançamento" value={f.data} onChange={(e) => set("data", e.target.value)} /></Campo>
    <Campo label="Referência documental" obrigatorio nota="Exigida pelo banco no formato externo:documento — ex.: externo:os-1450, externo:nf-325."><Input aria-label="Referência" maxLength={200} placeholder="externo:os-1450" value={f.referencia} onChange={(e) => set("referencia", e.target.value)} /></Campo>
    <Campo label="Forma de pagamento" nota="Ainda não há campo próprio no banco; será habilitada após aprovação dessa evolução."><Select disabled><SelectTrigger aria-label="Forma de pagamento"><SelectValue placeholder={FORMAS_PAGAMENTO.join(" · ")} /></SelectTrigger><SelectContent /></Select></Campo>
    <p className="text-xs text-muted-foreground">Observações: campo ainda não suportado pelo registro atual.</p>
  </fieldset>
    {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
    <div className="flex gap-2"><Button type="submit" disabled={travado || !aptas.length}>{travado && <Loader2 className="size-4 animate-spin" />}Registrar lançamento</Button><Button type="button" variant="outline" disabled={enviando} onClick={onCancel}>Cancelar</Button></div>
  </form>;
}
