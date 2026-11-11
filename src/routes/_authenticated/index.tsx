import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/shared/finance";
import { DashboardExecutivoPanel } from "@/components/dashboard/DashboardExecutivoPanel";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Dashboard executivo · ITV Financeiro" },
      { name: "description", content: "Visão executiva da administração financeira da ITV Centro Técnico." },
      { property: "og:title", content: "Dashboard executivo · ITV Financeiro" },
      { property: "og:description", content: "Visão executiva da administração financeira da ITV Centro Técnico." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  return (
    <AppShell>
      <PageHeader eyebrow="Visão executiva" title="Dashboard executivo" description="ITV Centro Técnico · Receitas, despesas, resultado e conferência por período." />
      <DashboardExecutivoPanel />
    </AppShell>
  );
}
