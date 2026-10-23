import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import { ListTree, Loader2, Pencil, Plus, Power, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Panel, EmptyState } from "@/components/shared/finance";
import { canTable } from "@/lib/auth/permissions";
import {
  NATUREZAS, NATUREZA_LABELS, descendentes, listarContas, type Erros, montarArvore, podeVerAuditoria, salvar, validarCadastro,
  type Conta, type Natureza,
} from "@/lib/cadastros";
import { Historico } from "./Historico";
import { ConfirmarStatus, StatusBadge, Carregando, ErroCarga } from "./comum";

type Status = "ativas" | "inativas" | "todas";

export function PlanoContasPanel() {
  const { role } = useRouteContext({ from: "/_authenticated" });
  const pode = canTable(role, "plano_contas", "update");
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["plano_contas"], queryFn: listarContas });
  const [busca, setBusca] = useState("");
  const [nat, setNat] = useState<Natureza | "todas">("todas");
  const [status, setStatus] = useState<Status>("ativas");
  const [edit, setEdit] = useState<Conta | "nova" | null>(null);

  const status_ = useMutation({
    mutationFn: (c: Conta) => salvar("plano_contas", c.id, { ativo: !c.ativo }),
    onSuccess: (_d, c) => { toast.success(c.ativo ? "Conta inativada." : "Conta reativada."); qc.invalidateQueries({ queryKey: ["plano_contas"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const linhas = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return montarArvore(q.data ?? []).filter((c) =>
      (nat === "todas" || c.natureza === nat) &&
      (status === "todas" || (status === "ativas") === c.ativo) &&
      (!t || c.codigo.toLowerCase().includes(t) || c.descricao.toLowerCase().includes(t)));
  }, [q.data, busca, nat, status]);

  return (
    <>
      <Panel
        title="Contas"
        subtitle={q.data ? `${q.data.length} conta(s) cadastrada(s)` : undefined}
        action={pode ? <Button size="sm" onClick={() => setEdit("nova")}><Plus className="size-4" /> Nova conta</Button> : undefined}
      >
        <div className="mb-4 flex flex-col gap-2 sm:flex-row">
          <Input placeholder="Buscar por código ou descrição" value={busca} onChange={(e) => setBusca(e.target.value)} className="sm:max-w-xs" aria-label="Buscar" />
          <Select value={nat} onValueChange={(v) => setNat(v as Natureza | "todas")}>
            <SelectTrigger className="sm:w-48" aria-label="Natureza"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as naturezas</SelectItem>
              {NATUREZAS.map((n) => <SelectItem key={n} value={n}>{NATUREZA_LABELS[n]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
            <SelectTrigger className="sm:w-36" aria-label="Status"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ativas">Ativas</SelectItem><SelectItem value="inativas">Inativas</SelectItem><SelectItem value="todas">Todas</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {q.isLoading ? <Carregando /> : q.isError ? <ErroCarga erro={q.error} onRetry={() => q.refetch()} /> : !linhas.length ? (
          <EmptyState icon={ListTree} title={q.data?.length ? "Nenhuma conta encontrada" : "Nenhum registro cadastrado"}
            description={q.data?.length ? "Ajuste a busca ou os filtros." : pode ? "Cadastre a primeira conta do plano." : "O plano de contas ainda não foi estruturado."} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr className="border-b"><th className="py-2 pr-3">Código</th><th className="pr-3">Descrição</th><th className="pr-3">Natureza</th><th className="pr-3">Tipo</th><th className="pr-3">Status</th><th className="w-1" /></tr>
              </thead>
              <tbody>
                {linhas.map((c) => (
                  <tr key={c.id} className="border-b last:border-0">
                    <td className="py-2 pr-3 font-mono text-xs" style={{ paddingLeft: c.nivel * 16 }}>{c.codigo}</td>
                    <td className="pr-3">{c.descricao}</td>
                    <td className="pr-3">{NATUREZA_LABELS[c.natureza]}</td>
                    <td className="pr-3 text-muted-foreground">{c.aceita_lancamentos ? "Analítica" : "Sintética"}</td>
                    <td className="pr-3"><StatusBadge ativo={c.ativo} /></td>
                    <td className="whitespace-nowrap text-right">
                      {podeVerAuditoria(role) && <Historico tabela="plano_contas" id={c.id} titulo={c.codigo} />}
                      {pode && <>
                        <Button variant="ghost" size="icon" aria-label={`Editar ${c.codigo}`} onClick={() => setEdit(c)}><Pencil className="size-4" /></Button>
                        <ConfirmarStatus ativo={c.ativo} nome={`a conta ${c.codigo}`} pendente={status_.isPending} onConfirm={() => status_.mutate(c)}>
                          <Button variant="ghost" size="icon" aria-label={c.ativo ? `Inativar ${c.codigo}` : `Reativar ${c.codigo}`}>{c.ativo ? <Power className="size-4" /> : <RotateCcw className="size-4" />}</Button>
                        </ConfirmarStatus>
                      </>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      <Sheet open={edit !== null} onOpenChange={(o) => !o && setEdit(null)}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader><SheetTitle>{edit === "nova" ? "Nova conta" : "Editar conta"}</SheetTitle></SheetHeader>
          {edit !== null && <FormConta conta={edit === "nova" ? null : edit} contas={q.data ?? []} onDone={() => setEdit(null)} />}
        </SheetContent>
      </Sheet>
    </>
  );
}

function FormConta({ conta, contas, onDone }: { conta: Conta | null; contas: Conta[]; onDone: () => void }) {
  const qc = useQueryClient();
  const [codigo, setCodigo] = useState(conta?.codigo ?? "");
  const [descricao, setDescricao] = useState(conta?.descricao ?? "");
  const [natureza, setNatureza] = useState<Natureza>(conta?.natureza ?? "despesa");
  const [pai, setPai] = useState<string>(conta?.conta_pai_id ?? "nenhuma");
  const [aceita, setAceita] = useState(conta?.aceita_lancamentos ?? true);
  const [erros, setErros] = useState<Erros>({});

  const bloqueados = conta ? descendentes(contas, conta.id) : new Set<string>();
  const pais = contas.filter((c) => c.ativo && c.natureza === natureza && !bloqueados.has(c.id));

  const m = useMutation({
    mutationFn: () => salvar("plano_contas", conta?.id ?? null, {
      codigo: codigo.trim(), descricao: descricao.trim(), natureza, aceita_lancamentos: aceita,
      conta_pai_id: pai === "nenhuma" ? null : pai,
    }),
    onSuccess: () => { toast.success(conta ? "Conta atualizada." : "Conta cadastrada."); qc.invalidateQueries({ queryKey: ["plano_contas"] }); onDone(); },
    onError: (e: Error) => toast.error(e.message),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    const v = validarCadastro({ codigo, descricao });
    setErros(v);
    if (!Object.keys(v).length) m.mutate();
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4 px-1" noValidate>
      <Campo id="pc-codigo" label="Código" erro={erros.codigo}><Input id="pc-codigo" value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Ex.: 3.1.01" maxLength={32} /></Campo>
      <Campo id="pc-desc" label="Descrição" erro={erros.descricao}><Input id="pc-desc" value={descricao} onChange={(e) => setDescricao(e.target.value)} maxLength={160} /></Campo>
      <Campo id="pc-nat" label="Natureza">
        <Select value={natureza} onValueChange={(v) => { setNatureza(v as Natureza); setPai("nenhuma"); }}>
          <SelectTrigger id="pc-nat"><SelectValue /></SelectTrigger>
          <SelectContent>{NATUREZAS.map((n) => <SelectItem key={n} value={n}>{NATUREZA_LABELS[n]}</SelectItem>)}</SelectContent>
        </Select>
      </Campo>
      <Campo id="pc-pai" label="Conta-pai">
        <Select value={pai} onValueChange={setPai}>
          <SelectTrigger id="pc-pai"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="nenhuma">Nenhuma (conta raiz)</SelectItem>
            {pais.map((c) => <SelectItem key={c.id} value={c.id}>{c.codigo} · {c.descricao}</SelectItem>)}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">Somente contas ativas da mesma natureza.</p>
      </Campo>
      <div className="flex items-center justify-between rounded-md border px-3 py-2">
        <Label htmlFor="pc-aceita">Aceita lançamentos (analítica)</Label>
        <Switch id="pc-aceita" checked={aceita} onCheckedChange={setAceita} />
      </div>
      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={m.isPending}>{m.isPending && <Loader2 className="size-4 animate-spin" />} Salvar</Button>
        <Button type="button" variant="outline" onClick={onDone}>Cancelar</Button>
      </div>
    </form>
  );
}

export function Campo({ id, label, erro, children }: { id: string; label: string; erro?: string | undefined; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {erro && <p className="text-xs text-destructive" role="alert">{erro}</p>}
    </div>
  );
}
