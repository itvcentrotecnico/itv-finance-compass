import { createFileRoute, notFound } from "@tanstack/react-router";
import { Construction, ShieldOff } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState, PageHeader } from "@/components/shared/finance";
import { UsuariosPanel } from "@/components/usuarios/UsuariosPanel";
import { PlanoContasPanel } from "@/components/cadastros/PlanoContasPanel";
import { CentrosCustoPanel } from "@/components/cadastros/CentrosCustoPanel";
import { TesourariaPanel, tesourariaOptions } from "@/components/tesouraria/TesourariaPanel";
import { LancamentosPanel } from "@/components/lancamentos/LancamentosPanel";
import { IntegracaoPanel } from "@/components/integracao/IntegracaoPanel";
import { findGroupOf, findModuleBySlug } from "@/lib/modules";
import { can } from "@/lib/auth/permissions";

export const Route = createFileRoute("/_authenticated/$modulo")({
  loader: async ({ params, context }) => {
    const mod = findModuleBySlug(params.modulo);
    if (!mod || !mod.slug) throw notFound();
    if (mod.key === "tesouraria" || mod.key === "despesas") await context.queryClient.ensureQueryData(tesourariaOptions);
    return { slug: mod.slug, title: mod.title, description: mod.description };
  },
  head: ({ loaderData }) => {
    const title = loaderData ? `${loaderData.title} · ITV Financeiro` : "Módulo · ITV Financeiro";
    const description = loaderData?.description ?? "Módulo do ITV Financeiro.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: ModulePage,
});

function ModulePage() {
  const { slug } = Route.useLoaderData();
  const { role } = Route.useRouteContext();
  const mod = findModuleBySlug(slug);
  if (!mod) throw notFound();
  const group = findGroupOf(mod.key);
  const Icon = mod.icon;

  if (!role || !can(role, mod.key, "view")) {
    return (
      <AppShell>
        <PageHeader eyebrow={group?.label} title={mod.title} description={mod.description} />
        <EmptyState icon={ShieldOff} title="Sem permissão" description="Seu perfil não tem acesso a este módulo." />
      </AppShell>
    );
  }

  const Operacional = mod.key === "usuarios" ? UsuariosPanel : mod.key === "plano_contas" ? PlanoContasPanel : mod.key === "centros_custo" ? CentrosCustoPanel : mod.key === "tesouraria" || mod.key === "despesas" ? TesourariaPanel : mod.key === "integracoes" ? IntegracaoPanel : mod.key === "lancamentos" ? LancamentosPanel : null;

  return (
    <AppShell>
      <PageHeader
        eyebrow={group?.label}
        title={mod.title}
        description={mod.key === "despesas" ? "Consulta das saídas registradas. Novas despesas são registradas em Lançamentos Financeiros por administradores autorizados." : mod.description}
        actions={
          Operacional ? undefined : (
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground">
            <Construction className="size-3.5" /> Indisponível
          </span>
          )
        }
      />
      {mod.key === "lancamentos" ? <LancamentosPanel /> : mod.key === "despesas" ? <TesourariaPanel tipoInicial="saida" /> : mod.key === "tesouraria" ? <TesourariaPanel somenteConsulta /> : Operacional ? <Operacional /> : <EmptyState icon={Icon} title="Recurso indisponível nesta versão" description="Este módulo ainda não possui uma operação validada. Nenhum registro financeiro pode ser criado por esta página." />}
    </AppShell>
  );
}
