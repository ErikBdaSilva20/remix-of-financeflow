import { useQuery } from '@tanstack/react-query';
import {
  endOfMonth,
  endOfQuarter,
  endOfYear,
  format,
  startOfMonth,
  startOfQuarter,
  startOfYear,
  subMonths,
  subQuarters,
  subYears,
} from 'date-fns';
import { fetchTable } from './infra/tableCache';
import type { Invoice } from '@/lib/data/invoices.repo';
import type { Transaction } from '@/lib/data/transactions.repo';
import type { Customer } from '@/lib/data/customers.repo';
import type { VendorBill } from '@/lib/data/vendor_bills.repo';
import { isRealizedInvoice } from '@/lib/finance/invoiceStatus';
import type { TimePeriod } from './usePeriodComparison';

const INVOICE_OPEN = ['Open', 'Partial', 'Overdue', 'Partially Paid'];
const BILL_OPEN = ['Open', 'Pending', 'Overdue', 'Partial', 'Partially Paid'];

export interface RecentTransactionItem {
  id: string;
  kind: 'income' | 'expense';
  category: string;
  description: string;
  amount: number;
  positive: boolean;
  status: string;
  statusTone: 'success' | 'warning' | 'muted';
  date: string;
}

export interface OverviewData {
  openReceivables: { count: number; total: number };
  openPayables: { count: number; total: number };
  summary: { maiorReceita: number; maiorDespesa: number; ticketMedio: number; lancamentos: number };
  customers: { total: number; growth: number };
  recentTransactions: RecentTransactionItem[];
}

const EXPENSE_CATEGORY_PT: Record<string, string> = {
  cogs: 'Custo de Produtos',
  marketing: 'Marketing',
  salaries: 'Salários e RH',
  payroll: 'Salários e RH',
  technology: 'Tecnologia',
  operations: 'Operações',
  office: 'Escritório',
  travel: 'Viagens',
  other: 'Outros',
};

const INCOME_STATUS_PT: Record<string, { label: string; tone: 'success' | 'warning' | 'muted' }> = {
  Received: { label: 'Recebido', tone: 'success' },
  Pending: { label: 'Pendente', tone: 'warning' },
  Failed: { label: 'Falhou', tone: 'muted' },
  Refunded: { label: 'Reembolsado', tone: 'muted' },
};

function windowFor(period: TimePeriod, now: Date) {
  if (period === 'month')
    return {
      cS: startOfMonth(now),
      cE: endOfMonth(now),
      pS: startOfMonth(subMonths(now, 1)),
      pE: endOfMonth(subMonths(now, 1)),
    };
  if (period === 'quarter')
    return {
      cS: startOfQuarter(now),
      cE: endOfQuarter(now),
      pS: startOfQuarter(subQuarters(now, 1)),
      pE: endOfQuarter(subQuarters(now, 1)),
    };
  return {
    cS: startOfYear(now),
    cE: endOfYear(now),
    pS: startOfYear(subYears(now, 1)),
    pE: endOfYear(subYears(now, 1)),
  };
}

export function useOverviewData(period: TimePeriod) {
  return useQuery({
    queryKey: ['overview-data', period],
    queryFn: async (): Promise<OverviewData> => {
      const [invoices, transactions, customers, vendorBills] = await Promise.all([
        fetchTable<Invoice>('invoices'),
        fetchTable<Transaction>('transactions'),
        fetchTable<Customer>('customers'),
        fetchTable<VendorBill>('vendor_bills').catch(() => [] as VendorBill[]),
      ]);

      const now = new Date();
      const { cS, cE, pS, pE } = windowFor(period, now);
      const fd = (d: Date) => format(d, 'yyyy-MM-dd');
      const [cStart, cEnd, pStart, pEnd] = [fd(cS), fd(cE), fd(pS), fd(pE)];

      const expenses = transactions.filter((t) => t.type === 'expense');
      const incomes = transactions.filter((t) => t.type === 'income');

      // Faturas realizadas dentro da janela do período
      const realizedInWindow = invoices.filter(
        (i) => isRealizedInvoice(i) && i.issue_date >= cStart && i.issue_date <= cEnd
      );
      const expensesInWindow = expenses.filter((e) => e.date >= cStart && e.date <= cEnd);

      const revenueAmounts = realizedInWindow.map((i) => Number(i.amount_total || 0));
      const expenseAmounts = expensesInWindow.map((e) => Number(e.amount || 0));

      const maiorReceita = revenueAmounts.length ? Math.max(...revenueAmounts) : 0;
      const maiorDespesa = expenseAmounts.length ? Math.max(...expenseAmounts) : 0;
      const ticketMedio = revenueAmounts.length
        ? revenueAmounts.reduce((s, v) => s + v, 0) / revenueAmounts.length
        : 0;
      const lancamentos = realizedInWindow.length + expensesInWindow.length;

      // Recebíveis em aberto (snapshot atual, não filtrado por período)
      const openInv = invoices.filter((i) => INVOICE_OPEN.includes(i.status));
      const openReceivables = {
        count: openInv.length,
        total: openInv.reduce((s, i) => s + Number(i.open_amount || 0), 0),
      };

      // Contas a pagar em aberto (snapshot atual)
      const openBills = vendorBills.filter((b) => BILL_OPEN.includes(b.status));
      const openPayables = {
        count: openBills.length,
        total: openBills.reduce((s, b) => s + Number(b.open_amount || 0), 0),
      };

      // Clientes: total + crescimento (novos na janela atual vs. anterior)
      const newThis = customers.filter((c) => {
        const d = (c.created_at || '').slice(0, 10);
        return d >= cStart && d <= cEnd;
      }).length;
      const newPrev = customers.filter((c) => {
        const d = (c.created_at || '').slice(0, 10);
        return d >= pStart && d <= pEnd;
      }).length;
      const customerGrowth = newPrev === 0 ? (newThis > 0 ? 100 : 0) : ((newThis - newPrev) / newPrev) * 100;

      // Transações recentes (income + expense) mais recentes
      const recentTransactions: RecentTransactionItem[] = [...incomes, ...expenses]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 6)
        .map((t) => {
          if (t.type === 'income') {
            const st = INCOME_STATUS_PT[t.status ?? ''] ?? { label: t.status ?? 'Recebido', tone: 'success' as const };
            return {
              id: t.id,
              kind: 'income' as const,
              category: 'Recebimento',
              description: t.description || 'Recebimento de fatura',
              amount: Number((t.original_amount ?? t.amount) || 0),
              positive: true,
              status: st.label,
              statusTone: st.tone,
              date: t.date,
            };
          }
          return {
            id: t.id,
            kind: 'expense' as const,
            category: EXPENSE_CATEGORY_PT[t.category ?? ''] || t.category || 'Despesa',
            description: t.vendor || t.description || 'Despesa',
            amount: Number((t.original_amount ?? t.amount) || 0),
            positive: false,
            status: 'Pago',
            statusTone: 'success' as const,
            date: t.date,
          };
        });

      return {
        openReceivables,
        openPayables,
        summary: { maiorReceita, maiorDespesa, ticketMedio, lancamentos },
        customers: { total: customers.length, growth: customerGrowth },
        recentTransactions,
      };
    },
  });
}
