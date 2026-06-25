import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { fetchTable } from "./tableCache";
import type { BankTransaction } from "@/lib/data/bank_transactions.repo";

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

      const all = await fetchTable<BankTransaction>('bank_transactions');
      const filtered = all.filter(t => t.date >= startDate && t.date <= endDate)
        .sort((a, b) => b.date.localeCompare(a.date));

      return {
        period: drillDownRequest.period,
        dateKey: drillDownRequest.dateKey,
        data: filtered.map(t => ({
          date: format(new Date(t.date), 'MMM dd, yyyy'),
          dateKey: t.date,
          description: t.counterparty || t.category || 'Transaction',
          amount: Math.abs(t.amount),
          type: t.type === 'in' ? 'inflow' : 'outflow',
          category: t.category ?? undefined,
        })),
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
