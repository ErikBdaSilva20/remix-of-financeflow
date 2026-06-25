import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { listAccountingSettings, updateAccountingSettings } from "@/lib/data/accounting_settings.repo";
import type { AccountingSettings } from "@/lib/data/accounting_settings.repo";

export type { AccountingSettings };

export function useAccountingSettings() {
  return useQuery({
    queryKey: ["accounting-settings"],
    queryFn: async () => {
      const rows = await listAccountingSettings();
      return rows[0] ?? null;
    },
  });
}

export function useUpdateAccountingBasis() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (basis: 'accrual' | 'cash') => {
      const rows = await listAccountingSettings();
      if (!rows[0]) throw new Error('Settings not found');
      return updateAccountingSettings(rows[0].id, { basis });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounting-settings"] });
      queryClient.invalidateQueries({ queryKey: ["revenue-data"] });
      queryClient.invalidateQueries({ queryKey: ["expense-data"] });
      queryClient.invalidateQueries({ queryKey: ["cashflow-data"] });
      queryClient.invalidateQueries({ queryKey: ["profitability-data"] });
      toast({ title: "Accounting basis updated", description: "Your financial data has been recalculated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update accounting basis", variant: "destructive" });
    },
  });
}
