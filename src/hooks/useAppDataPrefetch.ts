import {
  useExpenseCategories,
  useExpenseTrends,
  useFinancialMetrics,
  useKPIs,
  useRevenueSources,
  useRevenueTrends,
  useTopClients,
  useVendors,
} from "./useFinancialData";
import { useContacts } from "./useContacts";
import { usePeriodComparison } from "./usePeriodComparison";
import { useRevenueProfitData } from "./useRevenueProfitData";
import { useARData, useAPData, useDSO, useRecentActivity } from "./useReceivablesData";

// Fires all page queries in the background on app load so navigating between
// pages hits the React Query cache instead of showing a loading screen each time.
export function useAppDataPrefetch() {
  useFinancialMetrics();
  useRevenueSources();
  useExpenseCategories();
  useKPIs();
  useRevenueTrends();
  useExpenseTrends();
  useTopClients();
  useVendors();
  useContacts();
  usePeriodComparison("month");
  useRevenueProfitData();
  useARData();
  useAPData();
  useDSO();
  useRecentActivity();
}
