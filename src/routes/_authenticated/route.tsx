import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { ShieldOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { fetchOwnRole, signOutClean } from "@/lib/auth/session";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth", replace: true });
    const role = await fetchOwnRole(data.user.id);
    return { user: { id: data.user.id, email: data.user.email ?? "" }, role };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { role } = Route.useRouteContext();
  if (!role) return <AccessDenied />;
  return <Outlet />;
}

function AccessDenied() {
  const { queryClient } = Route.useRouteContext();
  const navigate = useNavigate();
  return (
    <AuthLayout title="Acesso não liberado" subtitle="Seu usuário não possui perfil ativo no ITV Financeiro.">
      <div className="space-y-4">
        <p className="flex items-start gap-2 rounded-md border bg-muted px-3 py-3 text-sm">
          <ShieldOff className="mt-0.5 size-4 shrink-0 text-destructive" />
          Solicite a liberação ao Administrador Geral.
        </p>
        <Button
          className="w-full"
          onClick={async () => {
            await signOutClean(queryClient);
            navigate({ to: "/auth", replace: true });
          }}
        >
          Sair
        </Button>
      </div>
    </AuthLayout>
  );
}
