import type { Customer } from '@/lib/data/customers.repo';
import type { Invoice } from '@/lib/data/invoices.repo';
import type { Payment } from '@/lib/data/payments.repo';
import type { VendorBill } from '@/lib/data/vendor_bills.repo';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fetchTable } from './tableCache';
import { formatCurrency } from './useFinancialData';

export interface ARAgingBucket {
  bucket: string;
  count: number;
  amount: number;
  percentage: number;
}

const AR_OPEN = ['Open', 'Partial', 'Overdue', 'Partially Paid'];

export function useARData(dateRange?: { from?: Date; to?: Date }) {
  return useQuery({
    queryKey: ['ar-data', dateRange?.from, dateRange?.to],
    queryFn: async () => {
      const invoices = await fetchTable<Invoice>('invoices');
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let filtered = invoices.filter((i) => AR_OPEN.includes(i.status));
      if (dateRange?.from) {
        const f = format(dateRange.from, 'yyyy-MM-dd');
        filtered = filtered.filter((i) => i.issue_date >= f);
      }
      if (dateRange?.to) {
        const t = format(dateRange.to, 'yyyy-MM-dd');
        filtered = filtered.filter((i) => i.issue_date <= t);
      }

      const buckets: Record<string, ARAgingBucket> = {
        current: { bucket: 'Current (0-30 days)', count: 0, amount: 0, percentage: 0 },
        '30-60': { bucket: '30-60 days', count: 0, amount: 0, percentage: 0 },
        '60+': { bucket: '60+ days overdue', count: 0, amount: 0, percentage: 0 },
      };
      const total = filtered.reduce((s, i) => s + Number(i.open_amount || 0), 0);
      filtered.forEach((inv) => {
        const dueStr = inv.due_date || '';
        const days = dueStr ? Math.ceil((today.getTime() - new Date(dueStr).getTime()) / 86400000) : 0;
        const b = days > 60 ? '60+' : days > 30 ? '30-60' : 'current';
        buckets[b].count++;
        buckets[b].amount += Number(inv.open_amount || 0);
      });
      Object.values(buckets).forEach((b) => {
        b.percentage = total > 0 ? (b.amount / total) * 100 : 0;
      });
      return { total, buckets: Object.values(buckets), averageCollectionPeriod: 0 };
    },
  });
}

export function useAPData(dateRange?: { from?: Date; to?: Date }) {
  return useQuery({
    queryKey: ['ap-data', dateRange?.from, dateRange?.to],
    queryFn: async () => {
      const bills = await fetchTable<VendorBill>('vendor_bills');
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let filtered = bills.filter((b) =>
        ['Open', 'Pending', 'Overdue', 'Partial', 'Partially Paid'].includes(b.status)
      );
      if (dateRange?.from) {
        const f = format(dateRange.from, 'yyyy-MM-dd');
        filtered = filtered.filter((b) => b.due_date >= f);
      }
      if (dateRange?.to) {
        const t = format(dateRange.to, 'yyyy-MM-dd');
        filtered = filtered.filter((b) => b.due_date <= t);
      }

      const withDays = filtered
        .map((b) => {
          const daysUntilDue = Math.ceil(
            (new Date(b.due_date).getTime() - today.getTime()) / 86400000
          );
          return { ...b, daysUntilDue };
        })
        .sort((a, b) => a.due_date.localeCompare(b.due_date));

      const urgent = withDays.filter((b) => b.daysUntilDue <= 7 && b.daysUntilDue >= 0);
      const current = withDays.filter((b) => b.daysUntilDue > 7 && b.daysUntilDue <= 30);
      const future = withDays.filter((b) => b.daysUntilDue > 30);
      const total = withDays.reduce((s, b) => s + Number(b.open_amount || 0), 0);

      return {
        total,
        groups: [
          {
            name: 'Due within 7 days',
            count: urgent.length,
            amount: urgent.reduce((s, b) => s + Number(b.open_amount || 0), 0),
            badge: 'Urgent',
          },
          {
            name: 'Due within 30 days',
            count: current.length,
            amount: current.reduce((s, b) => s + Number(b.open_amount || 0), 0),
            badge: 'Current',
          },
          {
            name: 'Due later',
            count: future.length,
            amount: future.reduce((s, b) => s + Number(b.open_amount || 0), 0),
            badge: 'Future',
          },
        ],
      };
    },
  });
}

export function useDSO() {
  return useQuery({
    queryKey: ['dso'],
    queryFn: async () => {
      const invoices = await fetchTable<Invoice>('invoices');
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 90);
      const startStr = format(startDate, 'yyyy-MM-dd');
      const endStr = format(endDate, 'yyyy-MM-dd');
      const periodInv = invoices.filter((i) => i.issue_date >= startStr && i.issue_date <= endStr);
      const revenue = periodInv.reduce((s, i) => s + Number(i.amount_total || 0), 0);
      const arBalance = invoices
        .filter((i) => AR_OPEN.includes(i.status))
        .reduce((s, i) => s + Number(i.open_amount || 0), 0);
      if (revenue === 0) return null;
      return Math.round((arBalance / revenue) * 90);
    },
  });
}

export function useRecentActivity() {
  return useQuery({
    queryKey: ['recent-activity'],
    queryFn: async () => {
      const [invoices, payments, customers] = await Promise.all([
        fetchTable<Invoice>('invoices'),
        fetchTable<Payment>('payments'),
        fetchTable<Customer>('customers'),
      ]);
      const custMap = new Map(customers.map((c) => [c.id, c.name]));
      const activities = [
        ...invoices
          .sort((a, b) => b.issue_date.localeCompare(a.issue_date))
          .slice(0, 5)
          .map((inv) => ({
            id: inv.id,
            type: 'invoice' as const,
            date: inv.issue_date,
            amount: Number((inv.original_amount ?? inv.amount_total) || 0),
            currency: inv.original_currency || 'BRL',
            status: inv.status,
            customerName: custMap.get(inv.customer_id ?? '') || 'Unknown Customer',
          })),
        ...payments
          .sort((a, b) => b.date.localeCompare(a.date))
          .slice(0, 5)
          .map((pmt) => ({
            id: pmt.id,
            type: 'payment' as const,
            date: pmt.date,
            amount: Number((pmt.original_amount ?? pmt.amount) || 0),
            currency: pmt.original_currency || 'BRL',
            status: pmt.status,
            customerName: 'Unknown Customer',
          })),
      ];
      return activities.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
    },
  });
}

export function useARDetailedData(
  dateRange?: { from?: Date; to?: Date },
  sortBy: string = 'due_date_asc',
  page: number = 1,
  pageSize: number = 20
) {
  return useQuery({
    queryKey: ['ar-detailed', dateRange?.from, dateRange?.to, sortBy, page, pageSize],
    queryFn: async () => {
      const [invoices, customers] = await Promise.all([
        fetchTable<Invoice>('invoices'),
        fetchTable<Customer>('customers'),
      ]);
      const custMap = new Map(customers.map((c) => [c.id, c.name]));
      const today = new Date();

      let filtered = invoices.filter((i) => AR_OPEN.includes(i.status));
      if (dateRange?.from) {
        const f = format(dateRange.from, 'yyyy-MM-dd');
        filtered = filtered.filter((i) => i.issue_date >= f);
      }
      if (dateRange?.to) {
        const t = format(dateRange.to, 'yyyy-MM-dd');
        filtered = filtered.filter((i) => i.issue_date <= t);
      }

      const sorters: Record<string, (a: Invoice, b: Invoice) => number> = {
        due_date_asc: (a, b) => (a.due_date || '').localeCompare(b.due_date || ''),
        due_date_desc: (a, b) => (b.due_date || '').localeCompare(a.due_date || ''),
        issue_date_desc: (a, b) => b.issue_date.localeCompare(a.issue_date),
        issue_date_asc: (a, b) => a.issue_date.localeCompare(b.issue_date),
        amount_desc: (a, b) => Number(b.open_amount) - Number(a.open_amount),
        amount_asc: (a, b) => Number(a.open_amount) - Number(b.open_amount),
      };
      filtered.sort(sorters[sortBy] ?? sorters.due_date_asc);

      const total = filtered.length;
      const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

      return {
        data: paged.map((inv) => {
          const dueStr = inv.due_date || '';
          const daysOutstanding = dueStr ? Math.ceil(
            (today.getTime() - new Date(dueStr).getTime()) / 86400000
          ) : 0;
          return {
            id: inv.id,
            invoiceNumber: inv.id.slice(0, 8),
            customer: custMap.get(inv.customer_id ?? '') || 'Unknown',
            issueDate: inv.issue_date,
            dueDate: inv.due_date,
            status: inv.status,
            amount: Number(inv.open_amount || 0),
            currency: inv.original_currency || 'BRL',
            daysOutstanding,
            agingBucket: daysOutstanding > 60 ? '60+' : daysOutstanding > 30 ? '30-60' : 'current',
          };
        }),
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    },
  });
}

export function useAPDetailedData(
  dateRange?: { from?: Date; to?: Date },
  sortBy: string = 'due_date_asc'
) {
  return useQuery({
    queryKey: ['ap-detailed', dateRange?.from, dateRange?.to, sortBy],
    queryFn: async () => {
      const bills = await fetchTable<VendorBill>('vendor_bills');
      const today = new Date();
      let filtered = bills.filter((b) => ['Open', 'Partial', 'Partially Paid'].includes(b.status));
      if (dateRange?.from) {
        const f = format(dateRange.from, 'yyyy-MM-dd');
        filtered = filtered.filter((b) => b.issue_date >= f);
      }
      if (dateRange?.to) {
        const t = format(dateRange.to, 'yyyy-MM-dd');
        filtered = filtered.filter((b) => b.issue_date <= t);
      }
      const sorters: Record<string, (a: VendorBill, b: VendorBill) => number> = {
        due_date_asc: (a, b) => a.due_date.localeCompare(b.due_date),
        due_date_desc: (a, b) => b.due_date.localeCompare(a.due_date),
        issue_date_desc: (a, b) => b.issue_date.localeCompare(a.issue_date),
        issue_date_asc: (a, b) => a.issue_date.localeCompare(b.issue_date),
        amount_desc: (a, b) => Number(b.open_amount) - Number(a.open_amount),
        amount_asc: (a, b) => Number(a.open_amount) - Number(b.open_amount),
      };
      filtered.sort(sorters[sortBy] ?? sorters.due_date_asc);
      return filtered.map((b) => ({
        id: b.id,
        billNumber: b.id.slice(0, 8),
        vendor: b.vendor_name,
        issueDate: b.issue_date,
        dueDate: b.due_date,
        status: b.status,
        amount: Number(b.open_amount || 0),
        currency: b.original_currency || 'BRL',
        daysUntilDue: Math.ceil((new Date(b.due_date).getTime() - today.getTime()) / 86400000),
        category: b.category,
      }));
    },
  });
}

export { formatCurrency };
