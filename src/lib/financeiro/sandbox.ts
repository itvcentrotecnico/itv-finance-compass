import { chartAccountSchema, costCenterSchema, financialAccountSchema, type ChartAccount, type CostCenter, type FinancialAccount } from "./domain";

/**
 * Ambiente de homologação em memória. Nenhuma chamada de rede, persistência
 * local ou conexão com Supabase/produção. Dados desaparecem ao reiniciar.
 */
export class FinanceSandbox {
  private chartAccounts = new Map<string, ChartAccount>();
  private costCenters = new Map<string, CostCenter>();
  private financialAccounts = new Map<string, FinancialAccount>();

  listChartAccounts(): ChartAccount[] { return [...this.chartAccounts.values()].map((x) => ({ ...x })); }
  listCostCenters(): CostCenter[] { return [...this.costCenters.values()].map((x) => ({ ...x })); }
  listFinancialAccounts(): FinancialAccount[] { return [...this.financialAccounts.values()].map((x) => ({ ...x })); }

  addChartAccount(input: unknown): ChartAccount {
    const value = chartAccountSchema.parse(input);
    if (this.chartAccounts.has(value.id) || [...this.chartAccounts.values()].some((x) => x.codigo === value.codigo))
      throw new Error("Conta contábil já cadastrada.");
    if (value.conta_pai_id) {
      const parent = this.chartAccounts.get(value.conta_pai_id);
      if (!parent || parent.aceita_lancamentos) throw new Error("Conta pai inválida ou analítica.");
    }
    this.chartAccounts.set(value.id, { ...value });
    return { ...value };
  }

  addCostCenter(input: unknown): CostCenter {
    const value = costCenterSchema.parse(input);
    if (this.costCenters.has(value.id) || [...this.costCenters.values()].some((x) => x.codigo === value.codigo))
      throw new Error("Centro de custo já cadastrado.");
    this.costCenters.set(value.id, { ...value });
    return { ...value };
  }

  addFinancialAccount(input: unknown): FinancialAccount {
    const value = financialAccountSchema.parse(input);
    if (this.financialAccounts.has(value.id)) throw new Error("Conta financeira já cadastrada.");
    this.financialAccounts.set(value.id, { ...value });
    return { ...value };
  }

  reset(): void {
    this.chartAccounts.clear();
    this.costCenters.clear();
    this.financialAccounts.clear();
  }
}
