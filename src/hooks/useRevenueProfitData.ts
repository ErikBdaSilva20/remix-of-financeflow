import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { fetchTable } from "./infra/tableCache";
import type { Invoice } from "@/lib/data/invoices.repo";
import type { ExpenseNew } from "@/lib/data/expenses_new.repo";

export interface RevenueProfitData {
  period: string;
  dateKey: string;
  revenue: number;
  profit: number;
}

export function useRevenueProfitData(dateRange?: { from?: Date; to?: Date }) {
  return useQuery({
    queryKey: ["revenue-profit-data", dateRange?.from, dateRange?.to],
    queryFn: async () => {
      const [invoices, expenses] = await Promise.all([
        fetchTable<Invoice>('invoices'),
        fetchTable<ExpenseNew>('expenses_new'),
      ]);

      const fromStr = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : null;
      const toStr = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : null;

      const filteredInv = invoices.filter(i => {
        if (fromStr && i.issue_date < fromStr) return false;
        if (toStr && i.issue_date > toStr) return false;
        return true;
      });
      const filteredExp = expenses.filter(e => {
        if (fromStr && e.date < fromStr) return false;
        if (toStr && e.date > toStr) return false;
        return true;
      });

      if (filteredInv.length === 0 && filteredExp.length === 0) return [];

      const allDates = [...filteredInv.map(i => i.issue_date), ...filteredExp.map(e => e.date)].sort();
      const rangeDays = allDates.length > 1
        ? Math.abs((new Date(allDates[allDates.length - 1]).getTime() - new Date(allDates[0]).getTime()) / 86400000)
        : 0;
      const daily = rangeDays <= 30;

      const revenueByPeriod = new Map<string, { dateKey: string; amount: number }>();
      filteredInv.forEach(inv => {
        const d = new Date(inv.issue_date + 'T00:00:00');
        const label = daily ? format(d, "MMM dd") : format(d, "MMM yyyy");
        const dateKey = daily ? format(d, "yyyy-MM-dd") : format(d, "yyyy-MM");
        if (!revenueByPeriod.has(label)) revenueByPeriod.set(label, { dateKey, amount: 0 });
        revenueByPeriod.get(label)!.amount += inv.amount_total;
      });

      const expByPeriod = new Map<string, number>();
      filteredExp.forEach(exp => {
        const d = new Date(exp.date + 'T00:00:00');
        const label = daily ? format(d, "MMM dd") : format(d, "MMM yyyy");
        expByPeriod.set(label, (expByPeriod.get(label) || 0) + exp.amount);
      });

      const allPeriods = new Set([...revenueByPeriod.keys(), ...expByPeriod.keys()]);
      const result: RevenueProfitData[] = [];
      allPeriods.forEach(period => {
        const rev = revenueByPeriod.get(period);
        result.push({ period, dateKey: rev?.dateKey || '', revenue: rev?.amount || 0, profit: (rev?.amount || 0) - (expByPeriod.get(period) || 0) });
      });

      return result.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
    },
  });
}
