import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchTable } from './tableCache';
import type { Invoice } from '@/lib/data/invoices.repo';
import type { Customer } from '@/lib/data/customers.repo';
import type { Contact } from '@/lib/data/contacts.repo';
import type { Payment } from '@/lib/data/payments.repo';

export interface SearchResult {
  id: string;
  type: 'invoice' | 'payment' | 'customer' | 'contact';
  title: string;
  subtitle: string;
  amount?: number;
  status?: string;
  date?: string;
}

export const useGlobalSearch = (searchQuery: string) => {
  const [isSearching] = useState(false);

  const { data: results = [], isLoading } = useQuery({
    queryKey: ['global-search', searchQuery],
    queryFn: async (): Promise<SearchResult[]> => {
      if (!searchQuery || searchQuery.trim().length < 2) return [];

      const q = searchQuery.toLowerCase().trim();
      const [invoices, customers, contacts, payments] = await Promise.all([
        fetchTable<Invoice>('invoices'),
        fetchTable<Customer>('customers'),
        fetchTable<Contact>('contacts'),
        fetchTable<Payment>('payments'),
      ]);

      const custMap = new Map(customers.map(c => [c.id, c.name]));
      const allResults: SearchResult[] = [];

      invoices.filter(i => (custMap.get(i.customer_id ?? '') || '').toLowerCase().includes(q) || i.status.toLowerCase().includes(q))
        .slice(0, 5).forEach(inv => allResults.push({ id: inv.id, type: 'invoice', title: `Invoice - ${custMap.get(inv.customer_id ?? '') || 'Unknown'}`, subtitle: `${inv.status} • ${inv.issue_date}`, amount: inv.amount_total, status: inv.status, date: inv.issue_date }));

      customers.filter(c => c.name.toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q))
        .slice(0, 5).forEach(c => allResults.push({ id: c.id, type: 'customer', title: c.name, subtitle: c.email || 'Customer' }));

      contacts.filter(c => c.name.toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q) || (c.phone || '').toLowerCase().includes(q))
        .slice(0, 5).forEach(c => allResults.push({ id: c.id, type: 'contact', title: c.name, subtitle: [c.email, c.phone].filter(Boolean).join(' • ') || 'Contact' }));

      payments.filter(p => p.status.toLowerCase().includes(q))
        .slice(0, 5).forEach(p => allResults.push({ id: p.id, type: 'payment', title: `Payment`, subtitle: `${p.status} • ${p.date}`, amount: p.amount, status: p.status, date: p.date }));

      return allResults;
    },
    enabled: searchQuery.trim().length >= 2,
    staleTime: 30000,
  });

  return { results, isLoading: isLoading || isSearching };
};
