import {
  useExpenseCategories,
  useExpenseTrends,
  useFinancialMetrics,
  useKPIs,
  useRevenueSources,
  useRevenueTrends,
  useTopClients,
  useVendors,
} from "../useFinancialData";
import { usePeriodComparison } from "../usePeriodComparison";
import { useRevenueExpensesPeriods } from "../useRevenueExpensesPeriods";
import { useARData, useAPData, useDSO, useRecentActivity } from "../useReceivablesData";

import { startOfMonth, endOfMonth, subMonths } from "date-fns";

// Fires all page queries in the background on app load so navigating between
// pages hits the React Query cache instead of showing a loading screen each time.
export function useAppDataPrefetch() {
  const today = new Date();
  const defaultDateRange = { from: startOfMonth(subMonths(today, 12)), to: endOfMonth(today) };

  useFinancialMetrics(defaultDateRange);
  useRevenueSources(defaultDateRange);
  useExpenseCategories(defaultDateRange);
  useKPIs();
  useRevenueTrends(defaultDateRange);
  useExpenseTrends(defaultDateRange);
  useTopClients();
  useVendors(defaultDateRange);
  usePeriodComparison("month");
  useRevenueExpensesPeriods();
  useARData();
  useAPData();
  useDSO();
  useRecentActivity();
}
