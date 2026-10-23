import {
  LayoutDashboard, Gauge, FileBarChart, Landmark, ArrowUpFromLine, ArrowDownToLine,
  Receipt, GitCompareArrows, Users, BadgePercent, Scale, HandCoins, FileSpreadsheet,
  Waves, Target, Rocket, ListTree, Building2, Truck, ShieldCheck, Plug, Settings,
  type LucideIcon,
} from "lucide-react";
import type { ModuleKey } from "./auth/permissions";

export interface ModuleDef {
  key: ModuleKey;
  slug: string; // "" = dashboard (/)
  title: string;
  description: string;
  icon: LucideIcon;
  /** Tabelas de referência no GESTÃO ITV (apenas planejamento de integração). */
  gestaoRefs?: string[];
  features: string[];
}

export interface ModuleGroup {
  label: string;
  modules: ModuleDef[];
}

export const MODULE_GROUPS: ModuleGroup[] = [
  {
    label: "Visão executiva",
    modules: [
      { key: "dashboard", slug: "", title: "Dashboard", icon: LayoutDashboard, description: "Visão consolidada da saúde financeira.", features: [] },
      { key: "indicadores", slug: "indicadores", title: "Indicadores financeiros", icon: Gauge, description: "Liquidez, margem, endividamento e ciclo financeiro.", features: ["Índices de liquidez", "Margens operacionais", "Prazo médio de pagamento e recebimento", "Metas por indicador"] },
      { key: "relatorios", slug: "relatorios", title: "Relatórios gerenciais", icon: FileBarChart, description: "Relatórios consolidados para a diretoria.", features: ["Relatórios por período", "Exportação em PDF e planilha", "Comparativos mensais", "Relatórios agendados"] },
    ],
  },
  {
    label: "Movimentação financeira",
    modules: [
      { key: "tesouraria", slug: "tesouraria", title: "Tesouraria", icon: Landmark, description: "Contas, caixas e saldos bancários.", gestaoRefs: ["caixa_lancamentos", "caixa_pagamentos"], features: ["Contas bancárias e caixas", "Transferências entre contas", "Saldo consolidado", "Fechamento de caixa"] },
      { key: "contas_pagar", slug: "contas-a-pagar", title: "Contas a pagar", icon: ArrowUpFromLine, description: "Obrigações com fornecedores e terceiros.", gestaoRefs: ["contas_pagar", "contas_pagar_pagamentos"], features: ["Lançamento e parcelamento", "Baixas parciais e totais", "Agenda de vencimentos", "Aprovação de pagamentos"] },
      { key: "contas_receber", slug: "contas-a-receber", title: "Contas a receber", icon: ArrowDownToLine, description: "Recebíveis de clientes e ordens de serviço.", gestaoRefs: ["contas_receber", "contas_receber_recebimentos"], features: ["Títulos a receber", "Recebimentos parciais", "Inadimplência", "Cartões e antecipações"] },
      { key: "despesas", slug: "despesas", title: "Despesas", icon: Receipt, description: "Despesas operacionais e administrativas.", gestaoRefs: ["despesas", "custos_os"], features: ["Classificação por categoria", "Rateio por centro de custo", "Comprovantes", "Orçado x realizado"] },
      { key: "conciliacao", slug: "conciliacao", title: "Conciliação bancária", icon: GitCompareArrows, description: "Confronto entre extratos e lançamentos.", features: ["Importação de extratos (OFX)", "Conciliação automática", "Tratamento de divergências", "Histórico de conciliações"] },
    ],
  },
  {
    label: "Obrigações",
    modules: [
      { key: "folha", slug: "folha", title: "Folha de pagamento", icon: Users, description: "Salários, encargos e benefícios.", features: ["Provisões mensais", "Encargos trabalhistas", "Férias e 13º", "Benefícios"] },
      { key: "comissoes", slug: "comissoes", title: "Comissões", icon: BadgePercent, description: "Comissões de técnicos e vendedores.", gestaoRefs: ["comissoes", "comissoes_entrega"], features: ["Regras de comissionamento", "Apuração por período", "Pagamento de comissões", "Extrato por colaborador"] },
      { key: "tributos", slug: "tributos", title: "Tributos", icon: Scale, description: "Impostos, guias e calendário fiscal.", gestaoRefs: ["tributos"], features: ["Calendário fiscal", "Guias e vencimentos", "Provisão de impostos", "Histórico de recolhimentos"] },
      { key: "financiamentos", slug: "financiamentos", title: "Financiamentos", icon: HandCoins, description: "Empréstimos, parcelas e juros.", features: ["Contratos", "Cronograma de amortização", "Juros e encargos", "Saldo devedor"] },
    ],
  },
  {
    label: "Gestão e planejamento",
    modules: [
      { key: "dre", slug: "dre", title: "DRE gerencial", icon: FileSpreadsheet, description: "Demonstração do resultado do exercício.", features: ["DRE mensal e acumulada", "Análise vertical e horizontal", "Comparativo com orçamento", "Drill-down por conta"] },
      { key: "fluxo_caixa", slug: "fluxo-de-caixa", title: "Fluxo de caixa", icon: Waves, description: "Realizado e projetado.", features: ["Fluxo diário, semanal e mensal", "Projeção de saldo", "Cenários", "Alertas de insuficiência"] },
      { key: "planejamento", slug: "planejamento", title: "Planejamento financeiro", icon: Target, description: "Orçamento anual e metas.", features: ["Orçamento por conta", "Metas por centro de custo", "Revisões orçamentárias", "Acompanhamento"] },
      { key: "projetos", slug: "projetos", title: "Projetos e investimentos", icon: Rocket, description: "Investimentos e retorno esperado.", features: ["Cadastro de projetos", "Orçamento x realizado", "Payback e ROI", "Aprovações"] },
    ],
  },
  {
    label: "Administração",
    modules: [
      { key: "plano_contas", slug: "plano-de-contas", title: "Plano de contas", icon: ListTree, description: "Estrutura hierárquica de contas.", gestaoRefs: ["categorias_financeiras"], features: ["Contas sintéticas e analíticas", "Vínculo com a DRE", "Ativação e inativação"] },
      { key: "centros_custo", slug: "centros-de-custo", title: "Centros de custo", icon: Building2, description: "Unidades de apropriação de custos.", gestaoRefs: ["centros_custo"], features: ["Cadastro hierárquico", "Responsáveis", "Orçamento por centro"] },
      { key: "fornecedores", slug: "fornecedores", title: "Fornecedores", icon: Truck, description: "Cadastro de fornecedores e credores.", features: ["Dados cadastrais e bancários", "Histórico de pagamentos", "Condições comerciais"] },
      { key: "usuarios", slug: "usuarios", title: "Usuários e permissões", icon: ShieldCheck, description: "Acesso individual e perfis.", features: ["Cadastro de usuários", "Perfis de acesso", "Permissões por módulo", "Registro de auditoria"] },
      { key: "integracoes", slug: "integracoes", title: "Integrações", icon: Plug, description: "Conexão com o GESTÃO ITV e bancos.", features: ["Sincronização com GESTÃO ITV", "Identificação de origem", "Prevenção de duplicidade", "Tratamento de estornos"] },
      { key: "configuracoes", slug: "configuracoes", title: "Configurações", icon: Settings, description: "Parâmetros gerais da plataforma.", features: ["Dados da empresa", "Exercício financeiro", "Preferências"] },
    ],
  },
];

export const ALL_MODULES = MODULE_GROUPS.flatMap((g) => g.modules);

export function findModuleBySlug(slug: string) {
  return ALL_MODULES.find((m) => m.slug === slug);
}

export function findGroupOf(key: ModuleKey) {
  return MODULE_GROUPS.find((g) => g.modules.some((m) => m.key === key));
}
