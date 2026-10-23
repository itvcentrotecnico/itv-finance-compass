import { createFileRoute, notFound } from "@tanstack/react-router";
import { Database, Inbox, Construction, ShieldOff } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState, PageHeader, Panel } from "@/components/shared/finance";
import { UsuariosPanel } from "@/components/usuarios/UsuariosPanel";
import { PlanoContasPanel } from "@/components/cadastros/PlanoContasPanel";
import { CentrosCustoPanel } from "@/components/cadastros/CentrosCustoPanel";
import { findGroupOf, findModuleBySlug } from "@/lib/modules";
import { can } from "@/lib/auth/permissions";

export const Route = createFileRoute("/_authenticated/$modulo")({
  loader: ({ params }) => {
    const mod = findModuleBySlug(params.modulo);
    if (!mod || !mod.slug) throw notFound();
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
  const mod = findModuleBySlug(slug)!;
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

  const Operacional = mod.key === "usuarios" ? UsuariosPanel : mod.key === "plano_contas" ? PlanoContasPanel : mod.key === "centros_custo" ? CentrosCustoPanel : null;

  return (
    <AppShell>
      <PageHeader
        eyebrow={group?.label}
        title={mod.title}
        description={mod.description}
        actions={
          Operacional ? undefined : (
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground">
            <Construction className="size-3.5" /> Em estruturação
          </span>
          )
        }
      />
      {Operacional ? <Operacional /> : (
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Registros" subtitle="Nenhum dado cadastrado" className="lg:col-span-2">
          <EmptyState icon={Icon} title="Módulo ainda não ativado" description="A implementação deste módulo aguarda autorização da próxima etapa." />
        </Panel>
        <div className="flex flex-col gap-4">
          <Panel title="Recursos previstos">
            <ul className="space-y-2.5">
              {mod.features.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand" />
                  {f}
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title="Integração GESTÃO ITV" subtitle="Referência para planejamento — sem conexão ativa">
            {mod.gestaoRefs?.length ? (
              <div className="flex flex-wrap gap-2">
                {mod.gestaoRefs.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1.5 rounded-md border bg-muted px-2 py-1 font-mono text-xs">
                    <Database className="size-3 text-muted-foreground" /> {t}
                  </span>
                ))}
              </div>
            ) : (
              <EmptyState compact icon={Inbox} title="Sem tabelas mapeadas" description="Módulo nativo do ITV Financeiro." />
            )}
          </Panel>
        </div>
      </div>
      )}
    </AppShell>
  );
}
