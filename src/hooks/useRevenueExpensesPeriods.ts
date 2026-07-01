import { useQuery } from "@tanstack/react-query";
import { format, startOfQuarter } from "date-fns";
import { fetchTable } from "./infra/tableCache";
import type { Invoice } from "@/lib/data/invoices.repo";
import type { Transaction } from "@/lib/data/transactions.repo";
import { isRealizedInvoice } from "@/lib/finance/invoiceStatus";

export interface PeriodPoint {
  period: string;
  dateKey: string;
  revenue: number;
  expenses: number;
  revenueCount: number;
  expensesCount: number;
}

export interface RevenueExpensesPeriods {
  month: PeriodPoint[];
  quarter: PeriodPoint[];
  year: PeriodPoint[];
}

export function useRevenueExpensesPeriods() {
  return useQuery({
    queryKey: ["revenue-expenses-periods"],
    queryFn: async (): Promise<RevenueExpensesPeriods> => {
      const [invoices, transactions] = await Promise.all([
        fetchTable<Invoice>('invoices'),
        fetchTable<Transaction>('transactions'),
      ]);

      const expenses = transactions.filter((t) => t.type === 'expense');
      const realizedInv = invoices.filter(isRealizedInvoice);

      const today = new Date();
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth();
      const currentDay = today.getDate();

      // Mês atual: um ponto por dia, do dia 1 até hoje
      const month: PeriodPoint[] = [];
      for (let day = 1; day <= currentDay; day++) {
        const d = new Date(currentYear, currentMonth, day);
        month.push({ period: format(d, "dd"), dateKey: format(d, "yyyy-MM-dd"), revenue: 0, expenses: 0, revenueCount: 0, expensesCount: 0 });
      }
      const monthByKey = new Map(month.map((p) => [p.dateKey, p]));
      realizedInv.forEach((inv) => {
        const p = monthByKey.get(inv.issue_date);
        if (p) { p.revenue += Number(inv.amount_total) || 0; p.revenueCount += 1; }
      });
      expenses.forEach((exp) => {
        const p = monthByKey.get(exp.date);
        if (p) { p.expenses += Number(exp.amount) || 0; p.expensesCount += 1; }
      });

      // Trimestre atual: um ponto por mês, do início do trimestre até o mês atual
      const quarterStartMonth = startOfQuarter(today).getMonth();
      const quarter: PeriodPoint[] = [];
      for (let m = quarterStartMonth; m <= currentMonth; m++) {
        const d = new Date(currentYear, m, 1);
        quarter.push({ period: format(d, "MMM"), dateKey: format(d, "yyyy-MM"), revenue: 0, expenses: 0, revenueCount: 0, expensesCount: 0 });
      }
      const quarterByKey = new Map(quarter.map((p) => [p.dateKey, p]));
      realizedInv.forEach((inv) => {
        const p = quarterByKey.get(inv.issue_date.slice(0, 7));
        if (p) { p.revenue += Number(inv.amount_total) || 0; p.revenueCount += 1; }
      });
      expenses.forEach((exp) => {
        const p = quarterByKey.get(exp.date.slice(0, 7));
        if (p) { p.expenses += Number(exp.amount) || 0; p.expensesCount += 1; }
      });

      // Ano atual: um ponto por mês, de janeiro até o mês atual
      const year: PeriodPoint[] = [];
      for (let m = 0; m <= currentMonth; m++) {
        const d = new Date(currentYear, m, 1);
        year.push({ period: format(d, "MMM"), dateKey: format(d, "yyyy-MM"), revenue: 0, expenses: 0, revenueCount: 0, expensesCount: 0 });
      }
      const yearByKey = new Map(year.map((p) => [p.dateKey, p]));
      realizedInv.forEach((inv) => {
        const p = yearByKey.get(inv.issue_date.slice(0, 7));
        if (p) { p.revenue += Number(inv.amount_total) || 0; p.revenueCount += 1; }
      });
      expenses.forEach((exp) => {
        const p = yearByKey.get(exp.date.slice(0, 7));
        if (p) { p.expenses += Number(exp.amount) || 0; p.expensesCount += 1; }
      });

      return { month, quarter, year };
    },
  });
}
