import { createFileRoute } from "@tanstack/react-router";
import {
  Wallet, TrendingUp, TrendingDown, Scale, CalendarClock, CalendarCheck, AlertOctagon, LineChart,
  BellRing, Clock, PiggyBank, Layers, Target, GitCompareArrows,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState, KpiCard, PageHeader, Panel } from "@/components/shared/finance";

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

const KPIS = [
  { label: "Saldo consolidado", icon: Wallet, hint: "Todas as contas e caixas" },
  { label: "Entradas no mês", icon: TrendingUp, hint: "Realizadas", tone: "positive" as const },
  { label: "Saídas no mês", icon: TrendingDown, hint: "Realizadas", tone: "negative" as const },
  { label: "Resultado do período", icon: Scale, hint: "Entradas − saídas" },
  { label: "A pagar · 30 dias", icon: CalendarClock, hint: "Vencimentos previstos", tone: "warning" as const },
  { label: "A receber · 30 dias", icon: CalendarCheck, hint: "Recebimentos previstos", tone: "positive" as const },
  { label: "Obrigações vencidas", icon: AlertOctagon, hint: "Em atraso", tone: "negative" as const },
  { label: "Projeção de saldo · 30 dias", icon: LineChart, hint: "Saldo atual + previstos" },
];

const CHARTS = [
  { title: "Evolução de entradas e saídas", subtitle: "Últimos 12 meses", variant: "bars" as const, span: "lg:col-span-2" },
  { title: "Distribuição de despesas", subtitle: "Por categoria", variant: "donut" as const },
  { title: "Fluxo de caixa", subtitle: "Realizado e projetado", variant: "line" as const, span: "lg:col-span-2" },
  { title: "Resultado mensal", subtitle: "Exercício corrente", variant: "bars" as const },
  { title: "Contas a pagar por vencimento", subtitle: "Faixas de prazo", variant: "bars" as const },
  { title: "Contas a receber por vencimento", subtitle: "Faixas de prazo", variant: "bars" as const },
];

const ALERTS = [
  { icon: Clock, title: "Contas vencidas" },
  { icon: PiggyBank, title: "Insuficiência de caixa" },
  { icon: Layers, title: "Concentração de vencimentos" },
  { icon: Target, title: "Despesas acima do orçamento" },
  { icon: GitCompareArrows, title: "Divergências de conciliação" },
];

function Dashboard() {
  return (
    <AppShell>
      <PageHeader
        eyebrow="Visão executiva"
        title="Dashboard"
        description="Indicadores ainda não consolidados. Os valores de abertura registrados não comprovam os saldos reais da empresa."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {KPIS.map((k) => <KpiCard key={k.label} {...k} />)}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {CHARTS.map((c) => (
          <Panel key={c.title} title={c.title} subtitle={c.subtitle} className={c.span}>
            <EmptyState icon={LineChart} compact title="Indicador não consolidado" description="Nenhum resultado financeiro apresentado neste painel." />
          </Panel>
        ))}
      </div>

      <Panel title="Central de alertas" subtitle="Monitoramento ainda não validado" className="mt-6"
        action={<BellRing className="size-4 text-muted-foreground" />}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {ALERTS.map((a) => (
            <EmptyState key={a.title} compact icon={a.icon} title={a.title} description="Situação ainda não verificada" />
          ))}
        </div>
      </Panel>
    </AppShell>
  );
}
