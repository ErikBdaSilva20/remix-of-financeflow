import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { db } from "@/lib/data/client";
import type { Invoice } from "@/lib/data/invoices.repo";
import type { ExpenseNew } from "@/lib/data/expenses_new.repo";
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

      const [invoices, expenses] = await Promise.all([
        db.table<Invoice>('invoices').list(),
        db.table<ExpenseNew>('expenses_new').list(),
      ]);

      let transactionData: any[] = [];

      if (drillDownRequest.type === 'waterfall') {
        if (drillDownRequest.metric === 'Revenue') {
          transactionData = invoices.slice(0, 50).map(i => ({
            date: format(new Date(i.issue_date), 'MMM dd, yyyy'),
            dateKey: i.issue_date,
            description: i.channel || 'Revenue',
            amount: i.amount_total,
            category: i.channel,
          }));
        } else if (drillDownRequest.metric === 'COGS') {
          transactionData = expenses.filter(e => ['cogs', 'Cost of Sales', 'Direct Costs', 'Materials'].includes(e.category)).slice(0, 50).map(e => ({
            date: format(new Date(e.date), 'MMM dd, yyyy'),
            dateKey: e.date,
            description: e.vendor || 'Cost of Goods',
            amount: e.amount,
            category: e.category,
          }));
        } else {
          transactionData = expenses.slice(0, 50).map(e => ({
            date: format(new Date(e.date), 'MMM dd, yyyy'),
            dateKey: e.date,
            description: e.vendor || e.category || 'Operating Expense',
            amount: e.amount,
            category: e.category,
          }));
        }
      } else if (drillDownRequest.type === 'margin-trend' && drillDownRequest.dateKey) {
        const base = new Date(drillDownRequest.dateKey);
        const startStr = format(startOfMonth(base), 'yyyy-MM-dd');
        const endStr = format(endOfMonth(base), 'yyyy-MM-dd');
        const revTx = invoices.filter(i => i.issue_date >= startStr && i.issue_date <= endStr).map(i => ({
          date: format(new Date(i.issue_date), 'MMM dd, yyyy'), dateKey: i.issue_date,
          description: `Revenue - ${i.channel || 'General'}`, amount: i.amount_total, category: 'Revenue',
        }));
        const expTx = expenses.filter(e => e.date >= startStr && e.date <= endStr).map(e => ({
          date: format(new Date(e.date), 'MMM dd, yyyy'), dateKey: e.date,
          description: e.vendor || e.category || 'Expense', amount: -e.amount, category: e.category,
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
