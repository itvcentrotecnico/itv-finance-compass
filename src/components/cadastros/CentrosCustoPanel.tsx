import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import { Building2, Loader2, Pencil, Plus, Power, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Panel, EmptyState } from "@/components/shared/finance";
import { canTable } from "@/lib/auth/permissions";
import { listarCentros, podeVerAuditoria, salvar, validarCadastro, type Centro, type Erros } from "@/lib/cadastros";
import { Historico } from "./Historico";
import { ConfirmarStatus, StatusBadge, Carregando, ErroCarga } from "./comum";
import { Campo } from "./PlanoContasPanel";

type Status = "ativos" | "inativos" | "todos";

export function CentrosCustoPanel() {
  const { role } = useRouteContext({ from: "/_authenticated" });
  const pode = canTable(role, "centros_custo", "update");
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["centros_custo"], queryFn: listarCentros });
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState<Status>("ativos");
  const [edit, setEdit] = useState<Centro | "novo" | null>(null);

  const st = useMutation({
    mutationFn: (c: Centro) => salvar("centros_custo", c.id, { ativo: !c.ativo }),
    onSuccess: (_d, c) => { toast.success(c.ativo ? "Centro inativado." : "Centro reativado."); qc.invalidateQueries({ queryKey: ["centros_custo"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const linhas = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return (q.data ?? []).filter((c) =>
      (status === "todos" || (status === "ativos") === c.ativo) &&
      (!t || [c.codigo, c.descricao, c.responsavel ?? ""].some((s) => s.toLowerCase().includes(t))));
  }, [q.data, busca, status]);

  return (
    <>
      <Panel
        title="Centros de custo"
        subtitle={q.data ? `${q.data.length} centro(s) cadastrado(s)` : undefined}
        action={pode ? <Button size="sm" onClick={() => setEdit("novo")}><Plus className="size-4" /> Novo centro</Button> : undefined}
      >
        <div className="mb-4 flex flex-col gap-2 sm:flex-row">
          <Input placeholder="Buscar por código, descrição ou responsável" value={busca} onChange={(e) => setBusca(e.target.value)} className="sm:max-w-xs" aria-label="Buscar" />
          <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
            <SelectTrigger className="sm:w-36" aria-label="Status"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="ativos">Ativos</SelectItem><SelectItem value="inativos">Inativos</SelectItem><SelectItem value="todos">Todos</SelectItem></SelectContent>
          </Select>
        </div>
        {q.isLoading ? <Carregando /> : q.isError ? <ErroCarga erro={q.error} onRetry={() => q.refetch()} /> : !linhas.length ? (
          <EmptyState icon={Building2} title={q.data?.length ? "Nenhum centro encontrado" : "Nenhum registro cadastrado"}
            description={q.data?.length ? "Ajuste a busca ou o filtro." : pode ? "Cadastre o primeiro centro de custo." : "Nenhum centro de custo foi cadastrado."} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr className="border-b"><th className="py-2 pr-3">Código</th><th className="pr-3">Descrição</th><th className="pr-3">Responsável</th><th className="pr-3">Status</th><th className="w-1" /></tr>
              </thead>
              <tbody>
                {linhas.map((c) => (
                  <tr key={c.id} className="border-b last:border-0">
                    <td className="py-2 pr-3 font-mono text-xs">{c.codigo}</td>
                    <td className="pr-3">{c.descricao}</td>
                    <td className="pr-3 text-muted-foreground">{c.responsavel || "—"}</td>
                    <td className="pr-3"><StatusBadge ativo={c.ativo} /></td>
                    <td className="whitespace-nowrap text-right">
                      {podeVerAuditoria(role) && <Historico tabela="centros_custo" id={c.id} titulo={c.codigo} />}
                      {pode && <>
                        <Button variant="ghost" size="icon" aria-label={`Editar ${c.codigo}`} onClick={() => setEdit(c)}><Pencil className="size-4" /></Button>
                        <ConfirmarStatus ativo={c.ativo} nome={`o centro ${c.codigo}`} pendente={st.isPending} onConfirm={() => st.mutate(c)}>
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
          <SheetHeader><SheetTitle>{edit === "novo" ? "Novo centro de custo" : "Editar centro de custo"}</SheetTitle></SheetHeader>
          {edit !== null && <FormCentro centro={edit === "novo" ? null : edit} onDone={() => setEdit(null)} />}
        </SheetContent>
      </Sheet>
    </>
  );
}

function FormCentro({ centro, onDone }: { centro: Centro | null; onDone: () => void }) {
  const qc = useQueryClient();
  const [codigo, setCodigo] = useState(centro?.codigo ?? "");
  const [descricao, setDescricao] = useState(centro?.descricao ?? "");
  const [responsavel, setResponsavel] = useState(centro?.responsavel ?? "");
  const [erros, setErros] = useState<Erros>({});
  const m = useMutation({
    mutationFn: () => salvar("centros_custo", centro?.id ?? null, { codigo: codigo.trim(), descricao: descricao.trim(), responsavel: responsavel.trim() || null }),
    onSuccess: () => { toast.success(centro ? "Centro atualizado." : "Centro cadastrado."); qc.invalidateQueries({ queryKey: ["centros_custo"] }); onDone(); },
    onError: (e: Error) => toast.error(e.message),
  });
  function submit(e: FormEvent) {
    e.preventDefault();
    const v = validarCadastro({ codigo, descricao, responsavel });
    setErros(v);
    if (!Object.keys(v).length) m.mutate();
  }
  return (
    <form onSubmit={submit} className="mt-6 space-y-4 px-1" noValidate>
      <Campo id="cc-codigo" label="Código" erro={erros.codigo}><Input id="cc-codigo" value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Ex.: ADM-01" maxLength={32} /></Campo>
      <Campo id="cc-desc" label="Descrição" erro={erros.descricao}><Input id="cc-desc" value={descricao} onChange={(e) => setDescricao(e.target.value)} maxLength={160} /></Campo>
      <Campo id="cc-resp" label="Responsável (opcional)" erro={erros.responsavel}><Input id="cc-resp" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} maxLength={120} /></Campo>
      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={m.isPending}>{m.isPending && <Loader2 className="size-4 animate-spin" />} Salvar</Button>
        <Button type="button" variant="outline" onClick={onDone}>Cancelar</Button>
      </div>
    </form>
  );
}
