import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { fetchTable } from "./infra/tableCache";
import type { Transaction } from "@/lib/data/transactions.repo";

export interface CashFlowDrillDownData {
  period: string;
  dateKey: string;
  data: { date: string; dateKey: string; description: string; amount: number; type: 'inflow' | 'outflow'; category?: string; }[];
}

export function useCashFlowDrillDown() {
  const [drillDownRequest, setDrillDownRequest] = useState<{ period: string; dateKey: string } | null>(null);

  const { data: drillDownData, isLoading } = useQuery({
    queryKey: ['cashflow-drill-down', drillDownRequest],
    queryFn: async (): Promise<CashFlowDrillDownData | null> => {
      if (!drillDownRequest) return null;

      const isMonthly = drillDownRequest.dateKey.split('-').length === 2;
      let startDate: string, endDate: string;
      if (isMonthly) {
        const d = parseISO(`${drillDownRequest.dateKey}-01`);
        startDate = format(startOfMonth(d), 'yyyy-MM-dd');
        endDate = format(endOfMonth(d), 'yyyy-MM-dd');
      } else {
        startDate = endDate = drillDownRequest.dateKey;
      }

      const allTransactions = await fetchTable<Transaction>('transactions');
      const payments = allTransactions.filter((t) => t.type === 'income');
      const expenses = allTransactions.filter((t) => t.type === 'expense');

      const inflows = payments
        .filter((p) => p.date >= startDate && p.date <= endDate)
        .map((p) => ({
          date: format(new Date(p.date), 'MMM dd, yyyy'),
          dateKey: p.date,
          description: 'Pagamento recebido',
          amount: Math.abs(Number(p.amount || 0)),
          type: 'inflow' as const,
          category: undefined,
        }));

      const outflows = expenses
        .filter((e) => e.date >= startDate && e.date <= endDate)
        .map((e) => ({
          date: format(new Date(e.date), 'MMM dd, yyyy'),
          dateKey: e.date,
          description: e.vendor || e.category || 'Despesa',
          amount: Math.abs(Number(e.amount || 0)),
          type: 'outflow' as const,
          category: e.category ?? undefined,
        }));

      const data = [...inflows, ...outflows].sort((a, b) => b.dateKey.localeCompare(a.dateKey));

      return {
        period: drillDownRequest.period,
        dateKey: drillDownRequest.dateKey,
        data,
      };
    },
    enabled: !!drillDownRequest,
  });

  return {
    drillDownData: drillDownRequest ? drillDownData : null,
    isLoading,
    handlePeriodClick: (period: string, dateKey: string) => setDrillDownRequest({ period, dateKey }),
    clearDrillDown: () => setDrillDownRequest(null),
  };
}
