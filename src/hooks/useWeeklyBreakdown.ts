import { useQuery } from "@tanstack/react-query";
import { eachWeekOfInterval, endOfMonth, endOfWeek, format, max, min, startOfMonth } from "date-fns";
import { fetchTable } from "./infra/tableCache";
import type { Invoice } from "@/lib/data/invoices.repo";
import type { Transaction } from "@/lib/data/transactions.repo";
import { isRealizedInvoice } from "@/lib/finance/invoiceStatus";

export interface WeekPoint {
  label: string;
  weekStart: string;
  weekEnd: string;
  revenue: number;
  expenses: number;
  revenueCount: number;
  expensesCount: number;
}

/**
 * Quebra um mês nas semanas que ele realmente tem (4 ou 5, calculadas via
 * date-fns — segunda a domingo) e soma receita/despesa de cada semana
 * separadamente (não acumulado, cada semana com seu próprio total).
 */
export function useWeeklyBreakdown(monthDate: Date = new Date()) {
  const monthKey = format(monthDate, "yyyy-MM");

  return useQuery({
    queryKey: ["weekly-breakdown", monthKey],
    queryFn: async (): Promise<WeekPoint[]> => {
      const [invoices, transactions] = await Promise.all([
        fetchTable<Invoice>("invoices"),
        fetchTable<Transaction>("transactions"),
      ]);
      const expenses = transactions.filter((t) => t.type === "expense");
      const realizedInv = invoices.filter(isRealizedInvoice);

      const mStart = startOfMonth(monthDate);
      const mEnd = endOfMonth(monthDate);
      const mStartStr = format(mStart, "yyyy-MM-dd");
      const mEndStr = format(mEnd, "yyyy-MM-dd");

      // Semanas (seg-dom) que tocam o mês, recortadas às bordas do mês para
      // não puxar dias de outro mês pra dentro da "Semana 1"/última semana.
      const weekStarts = eachWeekOfInterval({ start: mStart, end: mEnd }, { weekStartsOn: 1 });
      const weeks: WeekPoint[] = weekStarts.map((ws, i) => {
        const rangeStart = max([ws, mStart]);
        const rangeEnd = min([endOfWeek(ws, { weekStartsOn: 1 }), mEnd]);
        return {
          label: `Sem ${i + 1}`,
          weekStart: format(rangeStart, "yyyy-MM-dd"),
          weekEnd: format(rangeEnd, "yyyy-MM-dd"),
          revenue: 0,
          expenses: 0,
          revenueCount: 0,
          expensesCount: 0,
        };
      });

      const findWeek = (dateStr: string) =>
        weeks.find((w) => dateStr >= w.weekStart && dateStr <= w.weekEnd);

      realizedInv.forEach((inv) => {
        if (inv.issue_date < mStartStr || inv.issue_date > mEndStr) return;
        const w = findWeek(inv.issue_date);
        if (w) {
          w.revenue += Number(inv.amount_total) || 0;
          w.revenueCount += 1;
        }
      });
      expenses.forEach((exp) => {
        if (exp.date < mStartStr || exp.date > mEndStr) return;
        const w = findWeek(exp.date);
        if (w) {
          w.expenses += Number(exp.amount) || 0;
          w.expensesCount += 1;
        }
      });

      return weeks;
    },
  });
}
