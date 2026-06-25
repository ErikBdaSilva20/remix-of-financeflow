import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { db } from "@/lib/data/client";
import type { Invoice } from "@/lib/data/invoices.repo";

interface DimensionData {
  dimension: string;
  amount: number;
  percentage: number;
}

interface RevenueDimensionsResult {
  productData: DimensionData[];
  regionData: DimensionData[];
  channelData: DimensionData[];
}

export function useRevenueDimensions(dateRange?: { from?: Date; to?: Date }) {
  return useQuery({
    queryKey: ["revenue-dimensions", dateRange?.from, dateRange?.to],
    queryFn: async (): Promise<RevenueDimensionsResult> => {
      const invoices = await db.table<Invoice>('invoices').list();

      const fromStr = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : null;
      const toStr = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : null;
      const filtered = invoices.filter(i => {
        if (fromStr && i.issue_date < fromStr) return false;
        if (toStr && i.issue_date > toStr) return false;
        return true;
      });

      if (filtered.length === 0) return { productData: [], regionData: [], channelData: [] };

      const totalRevenue = filtered.reduce((s, i) => s + i.amount_total, 0);

      const productMap = new Map<string, number>();
      const channelMap = new Map<string, number>();
      filtered.forEach(inv => {
        const product = inv.product_id || 'Unspecified';
        productMap.set(product, (productMap.get(product) || 0) + inv.amount_total);
        const channel = inv.channel || 'Unspecified';
        channelMap.set(channel, (channelMap.get(channel) || 0) + inv.amount_total);
      });

      const toArray = (map: Map<string, number>): DimensionData[] =>
        Array.from(map.entries())
          .map(([dimension, amount]) => ({ dimension, amount, percentage: totalRevenue > 0 ? (amount / totalRevenue) * 100 : 0 }))
          .sort((a, b) => b.amount - a.amount);

      return { productData: toArray(productMap), regionData: [], channelData: toArray(channelMap) };
    },
  });
}
