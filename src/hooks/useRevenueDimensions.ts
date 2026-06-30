import type { Invoice } from '@/lib/data/invoices.repo';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fetchTable } from './infra/tableCache';
import { isRealizedInvoice } from '@/lib/finance/invoiceStatus';

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
    queryKey: ['revenue-dimensions', dateRange?.from, dateRange?.to],
    queryFn: async (): Promise<RevenueDimensionsResult> => {
      const invoices = await fetchTable<Invoice>('invoices');

      const fromStr = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : null;
      const toStr = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : null;
      const filtered = invoices.filter((i) => {
        if (!isRealizedInvoice(i)) return false;
        if (fromStr && i.issue_date < fromStr) return false;
        if (toStr && i.issue_date > toStr) return false;
        return true;
      });

      if (filtered.length === 0) return { productData: [], regionData: [], channelData: [] };

      const totalRevenue = filtered.reduce((s, i) => s + Number(i.amount_total || 0), 0);

      const productMap = new Map<string, number>();
      const channelMap = new Map<string, number>();
      filtered.forEach((inv) => {
        const product = inv.product_id || 'Unspecified';
        productMap.set(product, (productMap.get(product) || 0) + Number(inv.amount_total || 0));
        const channel = inv.channel || 'Unspecified';
        channelMap.set(channel, (channelMap.get(channel) || 0) + Number(inv.amount_total || 0));
      });

      const toArray = (map: Map<string, number>): DimensionData[] =>
        Array.from(map.entries())
          .map(([dimension, amount]) => ({
            dimension,
            amount,
            percentage: totalRevenue > 0 ? (amount / totalRevenue) * 100 : 0,
          }))
          .sort((a, b) => b.amount - a.amount);

      return { productData: toArray(productMap), regionData: [], channelData: toArray(channelMap) };
    },
  });
}

const PRODUCT_TREND_COLORS = [
  '#059669',
  '#0891B2',
  '#047857',
  '#0E7490',
  '#065F46',
  '#164E63',
  '#10B981',
  '#06B6D4',
  '#34D399',
  '#22D3EE',
];

export interface RevenueByProductTrendsResult {
  chartData: Array<Record<string, string | number>>;
  products: string[];
  colors: string[];
}

export function useRevenueByProductTrends(dateRange?: { from?: Date; to?: Date }) {
  return useQuery({
    queryKey: ['revenue-by-product-trends', dateRange?.from, dateRange?.to],
    queryFn: async (): Promise<RevenueByProductTrendsResult> => {
      const invoices = await fetchTable<Invoice>('invoices');

      const fromStr = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : null;
      const toStr = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : null;
      const filtered = invoices.filter((i) => {
        if (!isRealizedInvoice(i)) return false;
        if (fromStr && i.issue_date < fromStr) return false;
        if (toStr && i.issue_date > toStr) return false;
        return true;
      });

      if (filtered.length === 0) return { chartData: [], products: [], colors: [] };

      const allDates = filtered.map((i) => i.issue_date).sort();
      const rangeDays =
        allDates.length > 1
          ? Math.abs(
              (new Date(allDates[allDates.length - 1]).getTime() -
                new Date(allDates[0]).getTime()) /
                86400000
            )
          : 0;
      const daily = rangeDays <= 30;

      const productSet = new Set<string>();
      filtered.forEach((inv) => productSet.add(inv.product_id || 'Outros'));

      const agg = new Map<string, Record<string, string | number>>();
      filtered.forEach((inv) => {
        const d = new Date(inv.issue_date + 'T00:00:00');
        const label = daily ? format(d, 'MMM dd') : format(d, 'MMM yyyy');
        const dateKey = daily ? format(d, 'yyyy-MM-dd') : format(d, 'yyyy-MM');
        const product = inv.product_id || 'Outros';
        if (!agg.has(label)) agg.set(label, { month: label, dateKey });
        const entry = agg.get(label)!;
        entry[product] = ((entry[product] as number) || 0) + Number(inv.amount_total || 0);
      });

      const products = Array.from(productSet);
      const chartData = Array.from(agg.values()).sort((a, b) =>
        String(a.dateKey).localeCompare(String(b.dateKey))
      );

      return {
        chartData,
        products,
        colors: products.map((_, i) => PRODUCT_TREND_COLORS[i % PRODUCT_TREND_COLORS.length]),
      };
    },
  });
}
