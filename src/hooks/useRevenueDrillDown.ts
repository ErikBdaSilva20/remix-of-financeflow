import { useQuery } from "@tanstack/react-query";
import { fetchTable } from "./tableCache";
import type { Invoice } from "@/lib/data/invoices.repo";
import type { Customer } from "@/lib/data/customers.repo";

interface RevenueDrillDownParams {
  startDate: string;
  endDate: string;
  category?: string;
  categoryType?: "product" | "region" | "channel";
}

export function useRevenueDrillDown(params: RevenueDrillDownParams | null) {
  return useQuery({
    queryKey: ["revenue-drill-down", params],
    queryFn: async () => {
      if (!params) return [];

      const [invoices, customers] = await Promise.all([
        fetchTable<Invoice>('invoices'),
        fetchTable<Customer>('customers'),
      ]);

      const customerMap = new Map(customers.map(c => [c.id, c]));

      let filtered = invoices.filter(inv =>
        inv.issue_date >= params.startDate && inv.issue_date <= params.endDate
      );

      if (params.category && params.categoryType) {
        if (params.categoryType === "product") filtered = filtered.filter(i => i.product_id === params.category);
        else if (params.categoryType === "channel") filtered = filtered.filter(i => i.channel === params.category);
      }

      return filtered
        .sort((a, b) => b.issue_date.localeCompare(a.issue_date))
        .map(inv => ({
          ...inv,
          customers: customerMap.get(inv.customer_id ?? '') ?? null,
        }));
    },
    enabled: !!params,
  });
}
