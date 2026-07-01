import { useQuery } from "@tanstack/react-query";
import { format, subMonths, subQuarters, subYears, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from "date-fns";
import { fetchTable } from "./infra/tableCache";
import type { Invoice } from "@/lib/data/invoices.repo";
import type { Transaction } from "@/lib/data/transactions.repo";
import { isRealizedInvoice } from "@/lib/finance/invoiceStatus";

export type TimePeriod = 'month' | 'quarter' | 'year';

interface PeriodData { revenue: number; expenses: number; profit: number; cashFlow: number; }
interface PeriodComparison {
  current: PeriodData;
  previous: PeriodData;
  growth: { revenue: number; expenses: number; profit: number; cashFlow: number; };
}

export function usePeriodComparison(period: TimePeriod) {
  return useQuery({
    queryKey: ["period-comparison", period],
    queryFn: async (): Promise<PeriodComparison> => {
      const now = new Date();
      let cS: Date, cE: Date, pS: Date, pE: Date;
      if (period === 'month') { cS = startOfMonth(now); cE = endOfMonth(now); pS = startOfMonth(subMonths(now, 1)); pE = endOfMonth(subMonths(now, 1)); }
      else if (period === 'quarter') { cS = startOfQuarter(now); cE = endOfQuarter(now); pS = startOfQuarter(subQuarters(now, 1)); pE = endOfQuarter(subQuarters(now, 1)); }
      else { cS = startOfYear(now); cE = endOfYear(now); pS = startOfYear(subYears(now, 1)); pE = endOfYear(subYears(now, 1)); }

      const fd = (d: Date) => format(d, 'yyyy-MM-dd');
      const [invoices, transactions] = await Promise.all([
        fetchTable<Invoice>('invoices'),
        fetchTable<Transaction>('transactions'),
      ]);
      const expenses = transactions.filter((t) => t.type === 'expense');

      const sumInv = (s: string, e: string) => invoices.filter(i => i.issue_date >= s && i.issue_date <= e && isRealizedInvoice(i)).reduce((a, i) => a + Number(i.amount_total || 0), 0);
      const sumExp = (s: string, e: string) => expenses.filter(x => x.date >= s && x.date <= e).reduce((a, x) => a + Number(x.amount || 0), 0);

      const cR = sumInv(fd(cS), fd(cE)); const cX = sumExp(fd(cS), fd(cE)); const cP = cR - cX;
      const pR = sumInv(fd(pS), fd(pE)); const pX = sumExp(fd(pS), fd(pE)); const pP = pR - pX;
      const g = (c: number, p: number) => p === 0 ? (c > 0 ? 100 : 0) : ((c - p) / Math.abs(p)) * 100;

      return {
        current: { revenue: cR, expenses: cX, profit: cP, cashFlow: cP },
        previous: { revenue: pR, expenses: pX, profit: pP, cashFlow: pP },
        growth: { revenue: g(cR, pR), expenses: g(cX, pX), profit: g(cP, pP), cashFlow: g(cP, pP) },
      };
    },
  });
}
