import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
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

      // Mês atual: fluxo ACUMULADO de entradas e saídas ao longo dos dias do mês
      // (quanto já entrou/saiu neste mês) — não é comparação com o mês anterior.
      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
      const monthDaily: PeriodPoint[] = [];
      for (let day = 1; day <= daysInMonth; day++) {
        const d = new Date(currentYear, currentMonth, day);
        monthDaily.push({ period: format(d, "dd"), dateKey: format(d, "yyyy-MM-dd"), revenue: 0, expenses: 0, revenueCount: 0, expensesCount: 0 });
      }
      const monthByKey = new Map(monthDaily.map((p) => [p.dateKey, p]));
      realizedInv.forEach((inv) => {
        const p = monthByKey.get(inv.issue_date);
        if (p) { p.revenue += Number(inv.amount_total) || 0; p.revenueCount += 1; }
      });
      expenses.forEach((exp) => {
        const p = monthByKey.get(exp.date);
        if (p) { p.expenses += Number(exp.amount) || 0; p.expensesCount += 1; }
      });
      // Transforma os totais diários em acumulados (running total)
      let accR = 0, accX = 0, accRC = 0, accXC = 0;
      const month: PeriodPoint[] = monthDaily.map((p) => {
        accR += p.revenue; accX += p.expenses; accRC += p.revenueCount; accXC += p.expensesCount;
        return { ...p, revenue: accR, expenses: accX, revenueCount: accRC, expensesCount: accXC };
      });

      // Últimos 3 meses: comparação mês a mês, sempre terminando no mês atual
      // (mês atual por último/à direita), independente do trimestre-calendário.
      const quarter: PeriodPoint[] = [];
      for (let offset = 2; offset >= 0; offset--) {
        const d = new Date(currentYear, currentMonth - offset, 1);
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

      // Ano atual: um ponto por mês, os 12 meses (jan-dez). Meses futuros
      // ficam com valor 0 — sem transações lançadas, não há o que somar —
      // então o gráfico naturalmente "para" no mês atual mesmo mostrando o
      // eixo completo.
      const year: PeriodPoint[] = [];
      for (let m = 0; m <= 11; m++) {
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
