import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { db } from "@/lib/data/client";
import type { ExpenseNew } from "@/lib/data/expenses_new.repo";

export interface ExpenseDrillDownData {
  filterType: "category" | "period";
  category?: string;
  periodLabel?: string;
  data: { date: string; dateKey: string; description: string; amount: number; category?: string; }[];
}

type DrillDownRequest =
  | { type: "category"; category: string }
  | { type: "period"; dateKey: string; label: string; granularity: "day" | "month" };

export function useExpenseDrillDown(dateRange?: { from?: Date; to?: Date }) {
  const [drillDownRequest, setDrillDownRequest] = useState<DrillDownRequest | null>(null);

  const { data: drillDownData, isLoading } = useQuery<ExpenseDrillDownData | null>({
    queryKey: ["expense-drill-down", drillDownRequest, dateRange?.from, dateRange?.to],
    queryFn: async () => {
      if (!drillDownRequest) return null;
      const expenses = await db.table<ExpenseNew>('expenses_new').list();

      let filtered: ExpenseNew[];
      if (drillDownRequest.type === "category") {
        const fromStr = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : null;
        const toStr = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : null;
        filtered = expenses.filter(e =>
          e.category === drillDownRequest.category &&
          (!fromStr || e.date >= fromStr) &&
          (!toStr || e.date <= toStr)
        );
      } else {
        let startStr: string, endStr: string;
        if (drillDownRequest.granularity === "day") {
          startStr = endStr = drillDownRequest.dateKey;
        } else {
          const base = new Date(drillDownRequest.dateKey.length === 7 ? `${drillDownRequest.dateKey}-01` : drillDownRequest.dateKey);
          startStr = format(startOfMonth(base), 'yyyy-MM-dd');
          endStr = format(endOfMonth(base), 'yyyy-MM-dd');
        }
        filtered = expenses.filter(e => e.date >= startStr && e.date <= endStr);
      }

      const transactions = filtered
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 200)
        .map(e => ({ date: format(new Date(e.date), "MMM dd, yyyy"), dateKey: e.date, description: e.vendor || e.category || "Expense", amount: e.amount, category: e.category ?? undefined }));

      if (drillDownRequest.type === "category") return { filterType: "category", category: drillDownRequest.category, data: transactions };
      return { filterType: "period", periodLabel: drillDownRequest.label, data: transactions };
    },
    enabled: !!drillDownRequest,
  });

  return {
    drillDownData: drillDownRequest ? drillDownData : null,
    isLoading,
    openCategoryDrillDown: (category: string) => setDrillDownRequest({ type: "category", category }),
    openPeriodDrillDown: (dateKey: string, label: string, granularity: "day" | "month") => setDrillDownRequest({ type: "period", dateKey, label, granularity }),
    clearDrillDown: () => setDrillDownRequest(null),
  };
}
