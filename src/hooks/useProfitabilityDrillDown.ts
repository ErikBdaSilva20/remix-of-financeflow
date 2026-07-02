import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { fetchTable } from "./infra/tableCache";
import type { Invoice } from "@/lib/data/invoices.repo";
import type { Transaction } from "@/lib/data/transactions.repo";
import { DrillDownData } from "@/components/ProfitabilityDataTable";

export function useProfitabilityDrillDown() {
  const [drillDownRequest, setDrillDownRequest] = useState<{
    type: 'waterfall' | 'margin-trend';
    metric: string;
    period?: string;
    dateKey?: string;
  } | null>(null);

  const { data: drillDownData, isLoading } = useQuery({
    queryKey: ['profitability-drill-down', drillDownRequest],
    queryFn: async (): Promise<DrillDownData | null> => {
      if (!drillDownRequest) return null;

      const [invoices, transactions] = await Promise.all([
        fetchTable<Invoice>('invoices'),
        fetchTable<Transaction>('transactions'),
      ]);
      const expenses = transactions.filter((t) => t.type === 'expense');
      // Mesmo critério de COGS usado em useProfitabilityData.ts (useFinancialMetrics),
      // pra bater com o valor mostrado na barra "CPV" da cascata.
      const isCogs = (category: string | null | undefined) => {
        const c = (category ?? '').toLowerCase();
        return c.includes('cogs') || c.includes('cost of goods');
      };
      const cogsExpenses = expenses.filter((e) => isCogs(e.category));
      const opexExpenses = expenses.filter((e) => !isCogs(e.category));

      let transactionData: { date: string; dateKey: string; description: string; amount: number; category: string | undefined }[] = [];

      // Descrição e categoria nunca podem repetir o mesmo texto — a categoria
      // é o badge; a descrição é sempre um rótulo genérico do tipo de lançamento.
      const toRevenueRow = (i: Invoice) => ({
        date: format(new Date(i.issue_date), 'MMM dd, yyyy'),
        dateKey: i.issue_date,
        description: 'Receita',
        amount: Number(i.amount_total) || 0,
        category: i.channel ?? undefined,
      });
      const toExpenseRow = (e: Transaction, fallbackDescription: string) => ({
        date: format(new Date(e.date), 'MMM dd, yyyy'),
        dateKey: e.date,
        description: e.vendor || fallbackDescription,
        amount: Number(e.amount) || 0,
        category: e.category ?? undefined,
      });
      const byDateDesc = <T extends { dateKey: string }>(a: T, b: T) => b.dateKey.localeCompare(a.dateKey);

      if (drillDownRequest.type === 'waterfall') {
        const revenueRows = invoices.map(toRevenueRow);
        const cogsRows = cogsExpenses.map((e) => toExpenseRow(e, 'Custo de Mercadoria'));
        const opexRows = opexExpenses.map((e) => toExpenseRow(e, 'Despesa Operacional'));

        switch (drillDownRequest.metric) {
          case 'Receita':
            transactionData = revenueRows.sort(byDateDesc).slice(0, 50);
            break;
          case 'CPV':
            transactionData = cogsRows.sort(byDateDesc).slice(0, 50);
            break;
          case 'Desp. Oper.':
            transactionData = opexRows.sort(byDateDesc).slice(0, 50);
            break;
          case 'Lucro Bruto':
            // Tudo que compõe o lucro bruto: receita menos CPV.
            transactionData = [...revenueRows, ...cogsRows].sort(byDateDesc).slice(0, 50);
            break;
          case 'Lucro Líquido':
            // Tudo que compõe o lucro líquido: receita menos todas as despesas.
            transactionData = [...revenueRows, ...cogsRows, ...opexRows].sort(byDateDesc).slice(0, 50);
            break;
          default:
            transactionData = [];
        }
      } else if (drillDownRequest.type === 'margin-trend' && drillDownRequest.dateKey) {
        const base = new Date(drillDownRequest.dateKey);
        const startStr = format(startOfMonth(base), 'yyyy-MM-dd');
        const endStr = format(endOfMonth(base), 'yyyy-MM-dd');
        const revTx = invoices.filter(i => i.issue_date >= startStr && i.issue_date <= endStr).map(i => ({
          date: format(new Date(i.issue_date), 'MMM dd, yyyy'), dateKey: i.issue_date,
          description: `Receita - ${i.channel || 'Geral'}`, amount: Number(i.amount_total) || 0, category: 'Receita',
        }));
        const expTx = expenses.filter(e => e.date >= startStr && e.date <= endStr).map(e => ({
          date: format(new Date(e.date), 'MMM dd, yyyy'), dateKey: e.date,
          description: e.vendor || 'Despesa', amount: -(Number(e.amount) || 0), category: e.category ?? undefined,
        }));
        transactionData = [...revTx, ...expTx].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 50);
      }

      return { type: drillDownRequest.type, metric: drillDownRequest.metric, period: drillDownRequest.period, data: transactionData };
    },
    enabled: !!drillDownRequest,
  });

  return {
    drillDownData: drillDownRequest ? drillDownData : null,
    isLoading,
    handleWaterfallClick: (metric: string) => setDrillDownRequest({ type: 'waterfall', metric }),
    handleMarginClick: (metric: string, period: string, dateKey: string) => setDrillDownRequest({ type: 'margin-trend', metric, period, dateKey }),
    clearDrillDown: () => setDrillDownRequest(null),
  };
}
