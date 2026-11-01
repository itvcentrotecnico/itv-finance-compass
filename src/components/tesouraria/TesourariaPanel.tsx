import { Suspense, useState, type FormEvent, type ReactNode } from "react";
import { queryOptions, useSuspenseQuery, useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Wallet, Loader2, History, ChevronLeft, ChevronRight, Landmark } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/finance";
import { Carregando, ErroCarga, StatusBadge } from "@/components/cadastros/comum";
import { Historico } from "@/components/cadastros/Historico";
import { listarContas, listarCentros, podeVerAuditoria, type Conta, type Centro } from "@/lib/cadastros";
import { carregarTesouraria, carregarExtrato, carregarHistoricoTesouraria, verificarContratoLancamento } from "@/lib/tesouraria.functions";
import { dinheiro, decimal, podeOperar, validarPedido, erroTesouraria, TIPOS, type ContaFinanceira, type Pedido, type TipoOperacao, type LinhaExtrato, type Filtros, type OperacaoHistorico } from "@/lib/tesouraria";

import { useEnvioSeguro } from "./useEnvioSeguro";
import { HistoricoOperacoes } from "./HistoricoOperacoes";

export const tesourariaOptions = queryOptions({ queryKey: ["tesouraria", "contas"], queryFn: () => carregarTesouraria() });
export function TesourariaPanel({ somenteConsulta = true, tipoInicial }: { somenteConsulta?: boolean; tipoInicial?: "saida" }) { return <Suspense fallback={<Carregando />}><Tesouraria somenteConsulta={somenteConsulta} tipoInicial={tipoInicial} /></Suspense>; }
function Escolha({ label, value, onChange, items, empty = "Selecione" }: { label: string; value: string; onChange: (v: string) => void; items: { id: string; nome: string }[]; empty?: string }) {
  return <Select value={value || "nenhum"} onValueChange={(v) => onChange(v === "nenhum" ? "" : v)}><SelectTrigger aria-label={label} className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="nenhum">{empty}</SelectItem>{items.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent></Select>;
}
function Campo({ label, children }: { label: string; children: ReactNode }) { return <div className="space-y-2"><Label>{label}</Label>{children}</div>; }
function Tesouraria({ somenteConsulta, tipoInicial }: { somenteConsulta: boolean; tipoInicial: "saida" | undefined }) {
  const { role } = useRouteContext({ from: "/_authenticated" });
  const { data: contas } = useSuspenseQuery(tesourariaOptions);
  const qc = useQueryClient();
  const [aba, setAba] = useState(tipoInicial ? "movimentos" : "contas");
  const [form, setForm] = useState<TipoOperacao | ContaFinanceira | null>(null);
  const [detalhe, setDetalhe] = useState<LinhaExtrato | null>(null);
  const seguro = useEnvioSeguro(() => { qc.invalidateQueries({ queryKey: ["tesouraria"] }); toast.success("Lançamento registrado com sucesso."); setForm(null); setDetalhe(null); });
  const contratoFn = useServerFn(verificarContratoLancamento);
  const contrato = useQuery({ queryKey: ["tesouraria", "contrato-lancamento"], queryFn: () => contratoFn(), enabled: !somenteConsulta && podeOperar(role), staleTime: 60000 });
  // Falha fechada: o formulário só existe quando o banco confirma o intermediário corrigido (mínima v2).
  const liberado = !somenteConsulta && podeOperar(role) && contrato.data === true;
  const nomeConta = (id: string | null) => contas.find((c) => c.id === id)?.nome ?? id ?? "—";
  const abrirOperacao = (o: OperacaoHistorico) => setDetalhe({ id: o.id, movimento_id: "", tipo: o.tipo, data: o.data_movimento, descricao: o.descricao, conta_nome: [o.conta_origem_id, o.conta_destino_id].filter(Boolean).map((id) => nomeConta(id)).join(" → "), conta_id: o.conta_destino_id ?? o.conta_origem_id ?? "", direcao: "credito", valor: o.valor, plano_id: o.plano_conta_id, centro_id: o.centro_custo_id, classificacao: o.classificacao_snapshot, original: o.operacao_original_id, tipo_original: null, estornada: o.estornada, justificativa: o.justificativa, criado_por: o.criado_por, criado_em: o.criado_em });
  const [filtros, setFiltros] = useState<Filtros>({ pagina: 0, ...(tipoInicial ? { tipo: tipoInicial } : {}) });
  const extratoFn = useServerFn(carregarExtrato);
  const q = useQuery({ queryKey: ["tesouraria", "extrato", filtros], queryFn: () => extratoFn({ data: filtros }) });
  const historicoFn = useServerFn(carregarHistoricoTesouraria);
  const h = useQuery({ queryKey: ["tesouraria", "historico", filtros], queryFn: () => historicoFn({ data: filtros }), enabled: aba === "movimentos" });
  const consulta = aba === "movimentos" ? h : q;
  const pc = useQuery({ queryKey: ["plano_contas"], queryFn: listarContas });
  const cc = useQuery({ queryKey: ["centros_custo"], queryFn: listarCentros });
  const filtro = (key: keyof Filtros, value: string) => setFiltros((f) => ({ ...f, [key]: value, pagina: 0 }));
  return <>
    {somenteConsulta && <p role="status" className="mb-5 border-y py-4 text-sm text-muted-foreground">Somente consulta. Receitas, despesas, transferências, estornos e revisão de conferências aguardam a implantação e validação dos controles de aprovação. Saldos registrados não comprovam os saldos reais de abertura.</p>}
    {!somenteConsulta && !liberado && <p role="status" className="mb-5 border-y py-4 text-sm text-muted-foreground">Somente consulta. Os lançamentos de receitas e despesas serão liberados após a aplicação dos controles de segurança no banco de dados. Saldos registrados não comprovam os saldos reais de abertura.</p>}
    {liberado && <p role="status" className="mb-5 border-y py-4 text-sm text-muted-foreground">Receitas e despesas liberadas para administradores. Transferências, estornos e alterações de saldo inicial permanecem bloqueados nesta fase.</p>}
    {!somenteConsulta && (seguro.pendente || seguro.bloqueio || seguro.mensagem) && <div className="mb-5 space-y-3 border-y py-4"><p role="alert" className="text-sm text-destructive">{seguro.mensagem ?? (seguro.pendente ? `Envio pendente · ${TIPOS[seguro.pendente.tipo]} · ${seguro.pendente.descricao}` : "Este navegador não permite proteger novos envios. Operações bloqueadas.")}</p>{seguro.pendente && <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={seguro.ocupado || seguro.bloqueio} onClick={() => seguro.executar()}>Consultar resultado</Button><Button variant="outline" disabled={seguro.ocupado || seguro.bloqueio} onClick={() => seguro.executar(undefined, true)}>Recuperar mesmos dados</Button></div>}</div>}
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><p className="flex items-center gap-2 text-sm text-muted-foreground"><Wallet className="size-4" />{contas.length} conta(s) financeira(s) · BRL</p><div className="flex flex-wrap gap-2">{liberado && <><Button size="sm" disabled={!!seguro.pendente || seguro.bloqueio || seguro.ocupado} onClick={() => setForm("entrada")}><ArrowDownLeft className="size-4" />Entrada</Button><Button variant="outline" size="sm" disabled={!!seguro.pendente || seguro.bloqueio || seguro.ocupado} onClick={() => setForm("saida")}><ArrowUpRight className="size-4" />Saída</Button></>}</div></div>
    <Tabs value={aba} onValueChange={setAba}><TabsList className="mb-5 flex h-auto flex-wrap justify-start"><TabsTrigger value="contas">Contas</TabsTrigger><TabsTrigger value="movimentos">Movimentações</TabsTrigger><TabsTrigger value="extrato">Extrato</TabsTrigger></TabsList>
      <TabsContent value="contas">{!contas.length ? <EmptyState icon={Landmark} title="Nenhuma conta financeira cadastrada" description="Bancos e caixa físico" /> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{contas.map((c) => <article key={c.id} className="rounded-lg border bg-card p-5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="break-words font-semibold">{c.nome}</p><p className="mt-1 text-xs text-muted-foreground">{c.tipo === "banco" ? "Conta bancária" : "Caixa físico"}{c.banco ? ` · ${c.banco}` : ""}</p></div><StatusBadge ativo={c.ativo} /></div><p className="mt-5 break-words font-mono text-xl">{dinheiro(c.saldo)}</p><p className="mt-1 text-xs text-muted-foreground">Saldo registrado</p><div className="mt-4 flex flex-wrap items-center gap-1 border-t pt-3"><Button variant="ghost" size="sm" onClick={() => { filtro("conta", c.id); setAba("extrato"); }}><History className="size-4" />Extrato</Button>{podeVerAuditoria(role) && <Historico tabela="contas_financeiras" id={c.id} titulo={c.nome} />}</div></article>)}</div>}</TabsContent>
      {["movimentos", "extrato"].map((tab) => <TabsContent key={tab} value={tab}>
        <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><Escolha label="Conta do extrato" value={filtros.conta ?? ""} onChange={(v) => filtro("conta", v)} items={contas} empty="Todas as contas" /><Input type="date" aria-label="Data inicial" value={filtros.inicio ?? ""} onChange={(e) => filtro("inicio", e.target.value)} /><Input type="date" aria-label="Data final" value={filtros.fim ?? ""} onChange={(e) => filtro("fim", e.target.value)} /><Escolha label="Tipo do extrato" value={filtros.tipo ?? ""} onChange={(v) => filtro("tipo", v)} items={Object.entries(TIPOS).map(([id, nome]) => ({ id, nome }))} empty="Todos os tipos" /><Escolha label="Categoria do extrato" value={filtros.plano ?? ""} onChange={(v) => filtro("plano", v)} items={(pc.data ?? []).map((c) => ({ id: c.id, nome: `${c.codigo} · ${c.descricao}` }))} empty="Todas as categorias" /></div>
        {consulta.isLoading ? <Carregando /> : consulta.isError ? <ErroCarga erro={consulta.error} onRetry={() => consulta.refetch()} /> : <>
          {tab === "extrato" && q.data && <div className="mb-6 grid gap-4 border-y py-4 sm:grid-cols-3">{[["Saldo anterior ao período", q.data.saldo_anterior], ["Saldo final", q.data.saldo_final], ["Subtotal filtrado", q.data.subtotal]].map(([label, valor]) => <div key={label}><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 break-words font-mono text-lg">{dinheiro(valor ?? "0")}</p></div>)}</div>}
          {tab === "movimentos" ? <HistoricoOperacoes dados={h.data} nomeConta={nomeConta} onDetalhe={abrirOperacao} /> : !q.data?.linhas.length ? <EmptyState icon={ArrowLeftRight} title="Nenhuma movimentação encontrada" description="Sem registros para os filtros selecionados" /> : <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-sm"><thead className="border-b text-left text-xs text-muted-foreground"><tr>{["Data", "Operação", "Conta", "Classificação", "Valor", ""].map((s, i) => <th key={i} className="px-2 py-3">{s}</th>)}</tr></thead><tbody>{q.data.linhas.map((l) => <tr key={l.movimento_id} className="border-b"><td className="whitespace-nowrap px-2 py-3">{l.data.split("-").reverse().join("/")}</td><td className="max-w-64 px-2 py-3"><p>{TIPOS[l.tipo]}{l.estornada ? " · Estornada" : ""}</p><p className="break-words text-xs text-muted-foreground">{l.descricao}</p></td><td className="px-2">{l.conta_nome}</td><td className="px-2 text-xs">{l.classificacao?.descricao ?? "—"}</td><td className={`whitespace-nowrap px-2 text-right font-mono ${l.direcao === "credito" ? "text-brand" : "text-destructive"}`}>{l.direcao === "debito" ? "− " : "+ "}{dinheiro(l.valor)}</td><td><Button variant="ghost" size="icon" aria-label={`Detalhes ${l.descricao}`} onClick={() => setDetalhe(l)}><History className="size-4" /></Button></td></tr>)}</tbody></table></div>}
          <div className="mt-4 flex items-center justify-between"><span className="text-xs text-muted-foreground">{consulta.data?.total ?? 0} registro(s) · Página {filtros.pagina + 1}</span><div className="flex gap-2"><Button variant="outline" size="icon" aria-label="Página anterior" disabled={!filtros.pagina || consulta.isFetching} onClick={() => setFiltros((f) => ({ ...f, pagina: f.pagina - 1 }))}><ChevronLeft className="size-4" /></Button><Button variant="outline" size="icon" aria-label="Próxima página" disabled={(filtros.pagina + 1) * 50 >= (consulta.data?.total ?? 0) || consulta.isFetching} onClick={() => setFiltros((f) => ({ ...f, pagina: f.pagina + 1 }))}><ChevronRight className="size-4" /></Button></div></div>
        </>}
      </TabsContent>)}
    </Tabs>
    <Sheet open={form !== null} onOpenChange={(o) => !o && setForm(null)}><SheetContent className="overflow-y-auto"><SheetHeader><SheetTitle>{typeof form === "string" ? TIPOS[form] : "Editar conta financeira"}</SheetTitle><SheetDescription>ITV FINANCEIRO · Tesouraria</SheetDescription></SheetHeader>{form && <Formulario key={typeof form === "string" ? form : form.id} form={form} contas={contas} planos={pc.data ?? []} centros={cc.data ?? []} seguro={seguro} onDone={() => setForm(null)} />}</SheetContent></Sheet>
    <Sheet open={detalhe !== null} onOpenChange={(o) => !o && setDetalhe(null)}><SheetContent className="overflow-y-auto"><SheetHeader><SheetTitle>Histórico da operação</SheetTitle><SheetDescription>{detalhe?.descricao}</SheetDescription></SheetHeader>{detalhe && <Detalhes linha={detalhe} />}</SheetContent></Sheet>
  </>;
}
function Formulario({ form, contas, planos, centros, seguro, onDone }: { form: TipoOperacao | ContaFinanceira; contas: ContaFinanceira[]; planos: Conta[]; centros: Centro[]; seguro: ReturnType<typeof useEnvioSeguro>; onDone: () => void }) {
  const edit = typeof form === "object" ? form : null;
  const tipo = typeof form === "string" ? form : "abertura";
  const [p, setP] = useState<Pedido>(() => ({ tipo, chave: crypto.randomUUID(), data: "", descricao: "", valor: "", nome: edit?.nome ?? "", conta_tipo: edit?.tipo ?? "banco", banco: edit?.banco ?? "", agencia: edit?.agencia ?? "", numero_conta: edit?.numero_conta ?? "" }));
  const [error, setError] = useState<string | null>(null);

  const qc = useQueryClient();
  const set = (k: keyof Pedido, v: string) => setP((p) => ({ ...p, [k]: v || undefined }));
  // Somente categorias oficiais aptas e da natureza da operação; nunca categorias de homologação.
  const natureza = tipo === "entrada" ? "receita" : tipo === "saida" ? "despesa" : null;
  const planosAptos = planos.filter((c) => c.ativo && c.aceita_lancamentos && (natureza === null || c.natureza === natureza));
  const semCategoria = !edit && natureza !== null && planosAptos.length === 0;
  const m = useMutation({ mutationFn: async () => {
    const r = await seguro.executar({ tipo: p.tipo, chave: p.chave, data: p.data, descricao: p.descricao.trim(), valor: decimal(p.valor ?? ""), ...(p.origem ? { origem: p.origem } : {}), ...(p.destino ? { destino: p.destino } : {}), ...(p.plano ? { plano: p.plano } : {}), ...(p.centro ? { centro: p.centro } : {}), ...(p.referencia ? { referencia: p.referencia.trim().toLowerCase() } : {}) }); if (r.estado !== "confirmada") throw new Error(r.mensagem);
  }, onSuccess: () => { qc.invalidateQueries({ queryKey: ["tesouraria"] }); }, onError: (e: Error) => setError(e.message) });
  function submit(e: FormEvent) { e.preventDefault(); if (semCategoria) return; const erro = validarPedido({ ...p, descricao: tipo === "abertura" ? `Abertura · ${p.nome}` : p.descricao }, contas); setError(erro); if (!erro && (tipo === "entrada" || tipo === "saida") && !/^externo:[a-z0-9][a-z0-9._:/-]+$/.test(p.referencia?.trim().toLowerCase() ?? "")) { setError("Informe uma referência documental externa: externo:documento."); return; } if (!erro) { if (seguro.pendente || seguro.bloqueio || seguro.ocupado) return; m.mutate(); } }
  return <form onSubmit={submit} className="mt-6 space-y-4" noValidate><fieldset disabled={m.isPending || !!seguro.pendente || seguro.bloqueio || seguro.ocupado} className="space-y-4">
    <Campo label={tipo === "entrada" ? "Conta de destino" : "Conta de origem"}><Escolha label="Conta financeira" value={(tipo === "entrada" ? p.destino : p.origem) ?? ""} onChange={(v) => set(tipo === "entrada" ? "destino" : "origem", v)} items={contas.filter((c) => c.ativo)} /></Campo><Campo label="Descrição"><Input aria-label="Descrição da operação" value={p.descricao} maxLength={500} onChange={(e) => set("descricao", e.target.value)} /></Campo>
    <Campo label="Data da movimentação"><Input type="date" aria-label="Data da operação" value={p.data ?? ""} onChange={(e) => set("data", e.target.value)} /></Campo><Campo label="Valor (R$)"><Input inputMode="decimal" aria-label="Valor da operação" value={p.valor ?? ""} placeholder="0,00" onChange={(e) => set("valor", e.target.value)} /></Campo><Campo label="Referência documental externa"><Input aria-label="Referência documental externa" value={p.referencia ?? ""} maxLength={200} placeholder="externo:documento" onChange={(e) => set("referencia", e.target.value)} /></Campo><Campo label="Plano de Contas"><Escolha label="Classificação contábil" value={p.plano ?? ""} onChange={(v) => set("plano", v)} items={planosAptos.map((c) => ({ id: c.id, nome: `${c.codigo} · ${c.descricao}` }))} /></Campo><Campo label="Centro de custo (opcional)"><Escolha label="Centro de custo" value={p.centro ?? ""} onChange={(v) => set("centro", v)} items={centros.filter((c) => c.ativo).map((c) => ({ id: c.id, nome: `${c.codigo} · ${c.descricao}` }))} empty="Sem centro de custo" /></Campo>
  </fieldset>{semCategoria && <p role="alert" className="text-sm text-destructive">Nenhuma categoria oficial de {natureza} apta para lançamento. Solicite o cadastramento ao responsável antes de continuar.</p>}{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<div className="flex gap-2"><Button type="submit" disabled={m.isPending || semCategoria || !!seguro.pendente || seguro.bloqueio || seguro.ocupado}>{m.isPending && <Loader2 className="size-4 animate-spin" />}Confirmar lançamento</Button><Button type="button" variant="outline" disabled={m.isPending} onClick={onDone}>Cancelar</Button></div></form>;
}
function Detalhes({ linha }: { linha: LinhaExtrato }) {
  return <div className="mt-6 space-y-5"><dl className="space-y-3 text-sm">{[["Operação", linha.id], ["Tipo", TIPOS[linha.tipo]], ["Valor", dinheiro(linha.valor)], ["Conta", linha.conta_nome], ["Data", linha.data], ["Estado", linha.estornada ? "Estornada" : "Confirmada"], ["Classificação", linha.classificacao ? `${linha.classificacao.codigo} · ${linha.classificacao.descricao}` : "—"], ["Centro de custo", linha.centro_id ?? "—"], ["Operação original", linha.original ?? "—"], ["Registrado por", linha.criado_por], ["Registrado em", new Date(linha.criado_em).toLocaleString("pt-BR")], ["Justificativa", linha.justificativa ?? "—"]].map(([k, v]) => <div key={k}><dt className="text-xs text-muted-foreground">{k}</dt><dd className="mt-1 break-words">{v}</dd></div>)}</dl></div>;
}
