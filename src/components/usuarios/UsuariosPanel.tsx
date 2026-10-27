import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRouteContext } from "@tanstack/react-router";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Panel, EmptyState } from "@/components/shared/finance";
import { urlRetorno } from "@/lib/auth/recuperacao";
import { ROLES, ROLE_LABELS, type Role } from "@/lib/auth/permissions";
import { inviteUser, listUsers, updateUserRole } from "@/lib/usuarios.functions";

export function UsuariosPanel() {
  const { user } = useRouteContext({ from: "/_authenticated" });
  const qc = useQueryClient();
  const list = useServerFn(listUsers);
  const invite = useServerFn(inviteUser);
  const update = useServerFn(updateUserRole);
  const users = useQuery({ queryKey: ["usuarios"], queryFn: () => list() });

  const [email, setEmail] = useState("");
  const [papel, setPapel] = useState<Role>("consulta_gerencial");

  const inviteMut = useMutation({
    mutationFn: () => invite({ data: { email: email.trim(), papel, redirectTo: urlRetorno("/definir-senha", window.location.origin) } }),
    onSuccess: () => {
      toast.success("Convite enviado.");
      setEmail("");
      qc.invalidateQueries({ queryKey: ["usuarios"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const updateMut = useMutation({
    mutationFn: (v: { usuario_id: string; papel: Role; ativo: boolean }) => update({ data: v }),
    onSuccess: () => {
      toast.success("Perfil atualizado.");
      qc.invalidateQueries({ queryKey: ["usuarios"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function onInvite(e: FormEvent) {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      toast.error("Informe um e-mail válido.");
      return;
    }
    inviteMut.mutate();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Panel title="Usuários" subtitle="Perfis vinculados ao ITV Financeiro" className="lg:col-span-2">
        {users.isLoading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Carregando…</p>
        ) : users.isError ? (
          <p className="text-sm text-destructive">{(users.error as Error).message}</p>
        ) : !users.data?.length ? (
          <EmptyState icon={UserPlus} title="Nenhum usuário" description="Convide o primeiro usuário ao lado." />
        ) : (
          <ul className="divide-y">
            {users.data.map((u) => {
              const self = u.usuario_id === user.id;
              return (
                <li key={u.usuario_id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{u.email || u.usuario_id}</p>
                    {self && <p className="text-xs text-muted-foreground">Você (não é possível alterar o próprio perfil)</p>}
                  </div>
                  <Select
                    value={u.papel}
                    disabled={self || updateMut.isPending}
                    onValueChange={(v) => updateMut.mutate({ usuario_id: u.usuario_id, papel: v as Role, ativo: u.ativo })}
                  >
                    <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                    <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}</SelectContent>
                  </Select>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Switch
                      checked={u.ativo}
                      disabled={self || updateMut.isPending}
                      onCheckedChange={(c) => updateMut.mutate({ usuario_id: u.usuario_id, papel: u.papel as Role, ativo: c })}
                    />
                    {u.ativo ? "Ativo" : "Inativo"}
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
      <Panel title="Convidar usuário" subtitle="O convidado define a própria senha pelo link">
        <form onSubmit={onInvite} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="inv-email">E-mail</Label>
            <Input id="inv-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Perfil</Label>
            <Select value={papel} onValueChange={(v) => setPapel(v as Role)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full" disabled={inviteMut.isPending}>
            {inviteMut.isPending ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />} Enviar convite
          </Button>
        </form>
      </Panel>
    </div>
  );
}
