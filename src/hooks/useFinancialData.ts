import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { fetchTable } from "./infra/tableCache";
import type { Invoice } from "@/lib/data/invoices.repo";
import type { ExpenseNew } from "@/lib/data/expenses_new.repo";
import type { Budget } from "@/lib/data/budgets.repo";
import type { Payment } from "@/lib/data/payments.repo";
import type { Customer } from "@/lib/data/customers.repo";
import type { VendorBill } from "@/lib/data/vendor_bills.repo";
import { useAccountingSettings } from "./useAccountingSettings";

export interface FinancialMetric {
  id: string;
  metric_type: string;
  amount: number;
  period_start: string;
  period_end: string;
  period_type: string;
}

export interface RevenueSource {
  id: string;
  name: string;
  category: string;
  amount: number;
  percentage: number;
  growth_rate: number;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  category: string;
  amount: number;
  percentage: number;
  growth_rate: number;
  budget_amount: number;
}

export interface RegionalRevenue {
  id: string;
  region: string;
  amount: number;
  percentage: number;
  growth_rate: number;
}

export interface Client {
  id: string;
  name: string;
  revenue: number;
  growth_rate: number;
}

export interface Vendor {
  id: string;
  name: string;
  category: string;
  amount: number;
}

export interface KPI {
  id: string;
  kpi_name: string;
  value: number;
  unit: string;
  growth_rate: number;
}

export interface RevenueTrendData {
  period: string;
  dateKey: string;
  accrual: number;
  cash: number;
}

function filterByDateRange<T extends { [k: string]: unknown }>(
  rows: T[],
  dateField: keyof T,
  dateRange?: { from?: Date; to?: Date }
): T[] {
  if (!dateRange?.from && !dateRange?.to) return rows;
  const from = dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : null;
  const to = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : null;
  return rows.filter(r => {
    const d = r[dateField] as string;
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  });
}

export function useFinancialMetrics(dateRange?: { from?: Date; to?: Date }) {
  const { data: settings } = useAccountingSettings();
  const basis = settings?.basis || 'accrual';

  return useQuery({
    queryKey: ["financial-metrics", basis, dateRange?.from, dateRange?.to],
    queryFn: async () => {
      const today = new Date();
      const dr = dateRange ?? { from: startOfMonth(subMonths(today, 12)), to: endOfMonth(today) };
      const invoices = await fetchTable<Invoice>('invoices');
      const filtered = filterByDateRange(invoices, 'issue_date', dr);

      const monthlyTotals: Record<string, number> = {};
      filtered.forEach(inv => {
        const month = inv.issue_date.slice(0, 7);
        monthlyTotals[month] = (monthlyTotals[month] || 0) + Number(inv.amount_total || 0);
      });

      const months = Object.keys(monthlyTotals).sort();
      const totalRevenue = Object.values(monthlyTotals).reduce((s, v) => s + v, 0);
      let mrr = 0;
      let recentMonth = '';
      for (let i = months.length - 1; i >= 0; i--) {
        if (monthlyTotals[months[i]] > 0) { mrr = monthlyTotals[months[i]]; recentMonth = months[i]; break; }
      }
      const arr = mrr * 12;
      const startStr = months.length > 0 ? `${months[0]}-01` : format(dr.from!, 'yyyy-MM-dd');
      const endStr = months.length > 0 ? `${months[months.length - 1]}-28` : format(dr.to!, 'yyyy-MM-dd');

      return [
        { id: 'derived-revenue', metric_type: 'revenue', amount: totalRevenue, period_start: startStr, period_end: endStr, period_type: 'derived' },
        { id: 'derived-mrr', metric_type: 'mrr', amount: mrr, period_start: recentMonth ? `${recentMonth}-01` : startStr, period_end: recentMonth ? `${recentMonth}-28` : endStr, period_type: 'derived' },
        { id: 'derived-arr', metric_type: 'arr', amount: arr, period_start: recentMonth ? `${recentMonth}-01` : startStr, period_end: recentMonth ? `${recentMonth}-28` : endStr, period_type: 'derived' },
      ] as FinancialMetric[];
    },
  });
}

export function useRevenueSources(dateRange?: { from?: Date; to?: Date }, _currency?: string) {
  return useQuery({
    queryKey: ["revenue-data", dateRange?.from, dateRange?.to],
    queryFn: async () => {
      const invoices = await fetchTable<Invoice>('invoices');
      const filtered = filterByDateRange(invoices, 'issue_date', dateRange);

      const grouped: Record<string, number> = {};
      filtered.forEach(inv => {
        const key = inv.channel || 'Other';
        grouped[key] = (grouped[key] || 0) + Number(inv.amount_total || 0);
      });

      const total = Object.values(grouped).reduce((s, v) => s + v, 0);
      return Object.entries(grouped).map(([name, amount], i) => ({
        id: `rev-${i}`,
        name,
        category: 'Revenue',
        amount,
        percentage: total > 0 ? (amount / total) * 100 : 0,
        growth_rate: 0,
      })) as RevenueSource[];
    },
  });
}

export function useExpenseCategories(dateRange?: { from?: Date; to?: Date }, _currency?: string) {
  return useQuery({
    queryKey: ["expense-data", dateRange?.from, dateRange?.to],
    queryFn: async () => {
      const [expenses, budgets] = await Promise.all([
        fetchTable<ExpenseNew>('expenses_new'),
        fetchTable<Budget>('budgets'),
      ]);
      const filtered = filterByDateRange(expenses, 'date', dateRange);

      const grouped: Record<string, { amount: number; budget: number }> = {};
      
      budgets.forEach(b => {
        const key = b.category;
        if (!grouped[key]) grouped[key] = { amount: 0, budget: 0 };
        // If we want monthly budgets, we'd scale by month. We'll just take the amount for now.
        grouped[key].budget += Number(b.amount || 0);
      });

      filtered.forEach(exp => {
        const key = exp.category || 'Other';
        if (!grouped[key]) grouped[key] = { amount: 0, budget: 0 };
        grouped[key].amount += Number(exp.amount || 0);
      });

      const total = Object.values(grouped).reduce((s, v) => s + v.amount, 0);
      return Object.entries(grouped).map(([name, data], i) => ({
        id: `exp-${i}`,
        name,
        category: name,
        amount: data.amount,
        percentage: total > 0 ? (data.amount / total) * 100 : 0,
        growth_rate: 0,
        budget_amount: data.budget,
      })) as ExpenseCategory[];
    },
  });
}

export function useExpenseTrends(dateRange?: { from?: Date; to?: Date }) {
  return useQuery({
    queryKey: ["expense-trends", dateRange?.from, dateRange?.to],
    queryFn: async () => {
      const expenses = await fetchTable<ExpenseNew>('expenses_new');
      const filtered = filterByDateRange(expenses, 'date', dateRange);
      if (filtered.length === 0) return [];

      const rangeDays = dateRange?.from && dateRange?.to
        ? Math.abs((dateRange.to.getTime() - dateRange.from.getTime()) / 86400000)
        : 180;
      const daily = rangeDays <= 30;

      const agg: Record<string, { period: string; dateKey: string; expenses: number; cogs: number; opex: number }> = {};
      filtered.forEach(exp => {
        const d = new Date(exp.date + 'T00:00:00');
        const key = daily ? format(d, "MMM dd") : format(d, "MMM yyyy");
        const dateKey = daily ? format(d, "yyyy-MM-dd") : format(d, "yyyy-MM");
        if (!agg[key]) agg[key] = { period: key, dateKey, expenses: 0, cogs: 0, opex: 0 };
        agg[key].expenses += Number(exp.amount || 0);
        if (exp.category === 'cogs') agg[key].cogs += Number(exp.amount || 0);
        else agg[key].opex += Number(exp.amount || 0);
      });

      return Object.values(agg).sort((a, b) => a.dateKey.localeCompare(b.dateKey));
    },
  });
}

export function useRevenueTrends(dateRange?: { from?: Date; to?: Date }) {
  return useQuery({
    queryKey: ["revenue-trends", dateRange?.from, dateRange?.to],
    queryFn: async () => {
      const [invoices, payments] = await Promise.all([
        fetchTable<Invoice>('invoices'),
        fetchTable<Payment>('payments'),
      ]);
      const filteredInv = filterByDateRange(invoices, 'issue_date', dateRange);
      const filteredPmt = filterByDateRange(payments, 'date', dateRange);

      // Ensure we always have a timeline even if there's no data
      const allDates = [
        ...filteredInv.map(i => i.issue_date),
        ...filteredPmt.map(p => p.date),
      ].sort();
      const rangeDays = allDates.length > 1
        ? Math.abs((new Date(allDates[allDates.length - 1]).getTime() - new Date(allDates[0]).getTime()) / 86400000)
        : 180;
      const daily = rangeDays <= 30 && dateRange?.from;

      const agg: Record<string, RevenueTrendData> = {};

      // Initialize the last 6 months to ensure the chart always renders
      if (!daily) {
        const today = new Date();
        for (let i = 5; i >= 0; i--) {
          const d = subMonths(today, i);
          const key = format(d, "MMM yyyy");
          const dateKey = format(d, "yyyy-MM");
          agg[key] = { period: key, dateKey, accrual: 0, cash: 0 };
        }
      }
      filteredInv.forEach(inv => {
        const d = new Date(inv.issue_date + 'T00:00:00');
        const key = daily ? format(d, "MMM dd") : format(d, "MMM yyyy");
        const dateKey = daily ? format(d, "yyyy-MM-dd") : format(d, "yyyy-MM");
        if (!agg[key]) agg[key] = { period: key, dateKey, accrual: 0, cash: 0 };
        agg[key].accrual += Number(inv.amount_total || 0);
      });
      filteredPmt.forEach(pmt => {
        const d = new Date(pmt.date + 'T00:00:00');
        const key = daily ? format(d, "MMM dd") : format(d, "MMM yyyy");
        const dateKey = daily ? format(d, "yyyy-MM-dd") : format(d, "yyyy-MM");
        if (!agg[key]) agg[key] = { period: key, dateKey, accrual: 0, cash: 0 };
        agg[key].cash += Number(pmt.amount || 0);
      });

      return Object.values(agg).sort((a, b) => a.dateKey.localeCompare(b.dateKey));
    },
  });
}

export function useRegionalRevenue() {
  return useQuery({ queryKey: ["regional-revenue"], queryFn: async (): Promise<RegionalRevenue[]> => [] });
}

export function useTopClients() {
  return useQuery({
    queryKey: ["top-clients"],
    queryFn: async () => {
      const [invoices, customers] = await Promise.all([
        fetchTable<Invoice>('invoices'),
        fetchTable<Customer>('customers'),
      ]);
      const customerMap = new Map(customers.map(c => [c.id, c.name]));
      const grouped: Record<string, number> = {};
      invoices.forEach(inv => {
        if (inv.customer_id) grouped[inv.customer_id] = (grouped[inv.customer_id] || 0) + Number(inv.amount_total || 0);
      });
      return Object.entries(grouped)
        .map(([id, revenue]) => ({ id, name: customerMap.get(id) || 'Unknown', revenue, growth_rate: 0 }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10) as Client[];
    },
  });
}

export function useVendors(_dateRange?: { from?: Date; to?: Date }) {
  return useQuery({
    queryKey: ["vendors"],
    queryFn: async () => {
      const bills = await fetchTable<VendorBill>('vendor_bills');
      const grouped: Record<string, { name: string; category: string; amount: number }> = {};
      bills.forEach(b => {
        if (!grouped[b.vendor_name]) grouped[b.vendor_name] = { name: b.vendor_name, category: b.category || 'Other', amount: 0 };
        grouped[b.vendor_name].amount += Number(b.open_amount || 0);
      });
      return Object.entries(grouped)
        .map(([, v], i) => ({ id: `vendor-${i}`, ...v }))
        .sort((a, b) => b.amount - a.amount) as Vendor[];
    },
  });
}

export function useKPIs() {
  return useQuery({ queryKey: ["kpis"], queryFn: async (): Promise<KPI[]> => [] });
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatPercentage(percentage: number): string {
  return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(1)}%`;
}
