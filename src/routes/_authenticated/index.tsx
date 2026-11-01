import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/shared/finance";
import { TesourariaPanel, tesourariaOptions } from "@/components/tesouraria/TesourariaPanel";

export const Route = createFileRoute("/_authenticated/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(tesourariaOptions),
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
      <PageHeader eyebrow="Visão executiva" title="Painel financeiro" description="Contas, saldos registrados e histórico. Novos lançamentos aguardam a validação dos controles de aprovação." />
      <TesourariaPanel />
    </AppShell>
  );
}
