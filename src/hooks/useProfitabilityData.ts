import { useQuery } from "@tanstack/react-query";
import { useRevenueSources, useExpenseCategories, useFinancialMetrics } from "./useFinancialData";
import { usePeriodComparison } from "./usePeriodComparison";
import { fetchTable } from "./infra/tableCache";
import type { Invoice } from "@/lib/data/invoices.repo";
import type { Transaction } from "@/lib/data/transactions.repo";
import { format, endOfMonth } from "date-fns";
import { isRealizedInvoice } from "@/lib/finance/invoiceStatus";
import { isCogsCategory } from "@/lib/finance/expenseCategories";

export interface ProfitabilityMetrics {
  totalRevenue: number;
  totalExpenses: number;
  grossProfit: number;
  netProfit: number;
  operatingProfit: number;
  ebitda: number;
  grossMargin: number;
  netMargin: number;
  operatingMargin: number;
  ebitdaMargin: number;
  revenueGrowth: number;
  profitGrowth: number;
}

export interface ProfitBreakdown {
  revenue: number;
  cogs: number;
  grossProfit: number;
  operatingExpenses: number;
  netProfit: number;
  ebitda: number;
}

export interface MarginTrend {
  name: string;
  current: number;
  change: number;
  changeType: 'positive' | 'negative' | 'neutral';
  icon: 'up' | 'down' | 'neutral';
}

export interface MarginTrendTimeSeries {
  period: string;
  dateKey: string;
  grossMargin: number;
  operatingMargin: number;
}

export interface ProfitabilityFilters {
  dateRange?: { from?: Date; to?: Date };
}

export function useProfitabilityData(filters?: ProfitabilityFilters) {
  const { data: revenueSources } = useRevenueSources(filters?.dateRange);
  const { data: expenseCategories } = useExpenseCategories(filters?.dateRange);
  const { data: financialMetrics } = useFinancialMetrics(filters?.dateRange);
  // Crescimento real (mês atual vs. mês anterior) via comparativo mês-a-mês
  // já usado no resto do app (revenueSources/expenseCategories não carregam
  // taxa de crescimento própria).
  const { data: monthComparison } = usePeriodComparison('month');

  return useQuery({
    queryKey: [
      "profitability-data",
      revenueSources,
      expenseCategories,
      financialMetrics,
      monthComparison,
      filters,
    ],
    queryFn: (): ProfitabilityMetrics => {
      // Calculate totals strictly from database (no dummy fallbacks)
      const totalRevenue = Array.isArray(revenueSources)
        ? revenueSources.reduce((sum, source) => sum + (Number(source.amount) || 0), 0)
        : 0;

      const totalExpenses = Array.isArray(expenseCategories)
        ? expenseCategories.reduce((sum, category) => sum + (Number(category.amount) || 0), 0)
        : 0;
      
      // COGS (Custo de Produtos/Serviços) — mesma classificação por categoria
      // usada no DRE (Reports.tsx), via isCogsCategory/EXPENSE_CATEGORIES.
      const cogs = Array.isArray(expenseCategories)
        ? expenseCategories
            .filter(cat => isCogsCategory(cat.category))
            .reduce((sum, cat) => sum + (Number(cat.amount) || 0), 0)
        : 0;
      
      // Calculate operating expenses (excluding COGS)
      const operatingExpenses = Math.max(totalExpenses - cogs, 0);
      
      // Calculate profit metrics (no fabricated adjustments)
      const grossProfit = totalRevenue - cogs;
      const operatingProfit = grossProfit - operatingExpenses;
      const netProfit = operatingProfit; // Simplified; no taxes/interest modeled here
      const ebitda = operatingProfit; // Remove artificial amortization/depreciation add-back
      
      // Calculate margins
      const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
      const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
      const operatingMargin = totalRevenue > 0 ? (operatingProfit / totalRevenue) * 100 : 0;
      const ebitdaMargin = totalRevenue > 0 ? (ebitda / totalRevenue) * 100 : 0;
      
      // Crescimento real: mês atual vs. mês anterior (receita e lucro),
      // vindo do mesmo cálculo usado em /revenue e / (Overview).
      const revenueGrowth = monthComparison?.growth.revenue ?? 0;
      const profitGrowth = monthComparison?.growth.profit ?? 0;
      
      return {
        totalRevenue,
        totalExpenses,
        grossProfit,
        netProfit,
        operatingProfit,
        ebitda,
        grossMargin,
        netMargin,
        operatingMargin,
        ebitdaMargin,
        revenueGrowth,
        profitGrowth
      };
    },
    enabled: true, // Always run the calculation
    placeholderData: (previousData) => previousData, // Keep previous data while loading to prevent flickering
  });
}

export function useProfitBreakdown(filters?: ProfitabilityFilters): ProfitBreakdown {
  const { data: profitabilityData } = useProfitabilityData(filters);
  
  if (!profitabilityData) {
    return {
      revenue: 0,
      cogs: 0,
      grossProfit: 0,
      operatingExpenses: 0,
      netProfit: 0,
      ebitda: 0
    };
  }
  
  const cogs = profitabilityData.totalRevenue - profitabilityData.grossProfit;
  const operatingExpenses = profitabilityData.grossProfit - profitabilityData.operatingProfit;
  
  return {
    revenue: profitabilityData.totalRevenue,
    cogs,
    grossProfit: profitabilityData.grossProfit,
    operatingExpenses,
    netProfit: profitabilityData.netProfit,
    ebitda: profitabilityData.ebitda
  };
}

export function useMarginTrends(filters?: ProfitabilityFilters): MarginTrend[] {
  const { data: profitabilityData } = useProfitabilityData(filters);
  // Mesma série usada no gráfico "Tendências de Margem" — reaproveitada aqui
  // pra comparar os dois meses mais recentes com dado real e dar um sinal
  // de alta/queda de verdade, em vez de sempre "neutro".
  const { data: timeSeries } = useMarginTrendsTimeSeries(filters);

  if (!profitabilityData) {
    return [];
  }

  const sorted = (timeSeries ?? []).slice().sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  const latest = sorted[sorted.length - 1];
  const previous = sorted[sorted.length - 2];

  const deltaFor = (key: 'grossMargin' | 'operatingMargin') =>
    latest && previous ? latest[key] - previous[key] : 0;

  const trendFor = (delta: number): { changeType: MarginTrend['changeType']; icon: MarginTrend['icon'] } => {
    if (delta > 0.5) return { changeType: 'positive', icon: 'up' };
    if (delta < -0.5) return { changeType: 'negative', icon: 'down' };
    return { changeType: 'neutral', icon: 'neutral' };
  };

  const grossDelta = deltaFor('grossMargin');
  const operatingDelta = deltaFor('operatingMargin');
  // netProfit é sempre igual a operatingProfit (sem impostos/juros modelados,
  // ver useProfitabilityData acima) — a variação de margem líquida acompanha
  // exatamente a operacional, não é uma série independente.
  const netDelta = operatingDelta;

  return [
    {
      name: 'Gross Margin',
      current: profitabilityData.grossMargin,
      change: grossDelta,
      ...trendFor(grossDelta),
    },
    {
      name: 'Operating Margin',
      current: profitabilityData.operatingMargin,
      change: operatingDelta,
      ...trendFor(operatingDelta),
    },
    {
      name: 'Net Margin',
      current: profitabilityData.netMargin,
      change: netDelta,
      ...trendFor(netDelta),
    },
  ];
}

// Helper function to format percentage with proper styling
export function formatMarginPercentage(percentage: number): string {
  return `${percentage.toFixed(1)}%`;
}

// Hook for margin trends time series with dynamic granularity
export function useMarginTrendsTimeSeries(filters?: ProfitabilityFilters) {
  const dateRange = filters?.dateRange;

  return useQuery({
    queryKey: ["margin-trends-timeseries", filters],
    queryFn: async () => {
      const today = new Date();
      // Sem `from` explícito = mesma semântica de "desde sempre" usada pelo
      // resto da tela (useProfitabilityData/useRevenueSources/etc. tratam
      // dateRange:{} como "sem filtro") — antes isso caía silenciosamente
      // para "últimos 6 meses" aqui, o que fazia esse gráfico mostrar
      // números diferentes dos KPIs/Waterfall/Detalhamento de Lucro da
      // mesma página, que são todos calculados com o histórico completo.
      const startDate = dateRange?.from || new Date(0);
      const endDate = dateRange?.to || endOfMonth(today);
      const startStr = startDate.toISOString().split('T')[0];
      const endStr = endDate.toISOString().split('T')[0];

      const [allInvoices, allTransactions] = await Promise.all([
        fetchTable<Invoice>('invoices'),
        fetchTable<Transaction>('transactions'),
      ]);
      const allExpenses = allTransactions.filter((t) => t.type === 'expense');

      const revenueData = allInvoices.filter(inv => {
        if (!isRealizedInvoice(inv)) return false;
        if (inv.issue_date < startStr || inv.issue_date > endStr) return false;
        return true;
      });

      if (revenueData.length === 0) return [];

      const expenseData = allExpenses.filter(exp => exp.date >= startStr && exp.date <= endStr);

      const dateRangeDays = dateRange?.from && dateRange?.to
        ? Math.abs((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24))
        : revenueData.length > 0
          ? Math.abs((new Date(revenueData[revenueData.length - 1].issue_date).getTime() - new Date(revenueData[0].issue_date).getTime()) / (1000 * 60 * 60 * 24))
          : 0;
      const useDailyGranularity = dateRangeDays <= 30;

      const revenueByPeriod: Record<string, { period: string; dateKey: string; revenue: number }> = {};
      revenueData.forEach((row) => {
        const dateObj = new Date(row.issue_date + 'T00:00:00');
        const key = useDailyGranularity ? format(dateObj, "MMM dd") : format(dateObj, "MMM yyyy");
        const dateKey = useDailyGranularity ? format(dateObj, "yyyy-MM-dd") : format(dateObj, "yyyy-MM");
        if (!revenueByPeriod[key]) revenueByPeriod[key] = { period: key, dateKey, revenue: 0 };
        revenueByPeriod[key].revenue += Number(row.amount_total || 0);
      });

      const expensesByPeriod: Record<string, { cogs: number; opex: number }> = {};
      expenseData.forEach((row) => {
        const dateObj = new Date(row.date + 'T00:00:00');
        const key = useDailyGranularity ? format(dateObj, "MMM dd") : format(dateObj, "MMM yyyy");
        if (!expensesByPeriod[key]) expensesByPeriod[key] = { cogs: 0, opex: 0 };
        const converted = Number(row.amount || 0);
        if (isCogsCategory(row.category || '')) {
          expensesByPeriod[key].cogs += converted;
        } else {
          expensesByPeriod[key].opex += converted;
        }
      });

      const marginData: MarginTrendTimeSeries[] = Object.keys(revenueByPeriod).map(key => {
        const revenue = revenueByPeriod[key].revenue;
        const { cogs, opex } = expensesByPeriod[key] || { cogs: 0, opex: 0 };
        const grossProfit = revenue - cogs;
        const operatingProfit = grossProfit - opex;
        return {
          period: key,
          dateKey: revenueByPeriod[key].dateKey,
          grossMargin: revenue > 0 ? (grossProfit / revenue) * 100 : 0,
          operatingMargin: revenue > 0 ? (operatingProfit / revenue) * 100 : 0,
        };
      });

      return marginData.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
    },
  });
}
