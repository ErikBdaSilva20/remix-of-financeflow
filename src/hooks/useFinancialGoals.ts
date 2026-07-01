import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createFinancialGoal,
  listFinancialGoals,
  updateFinancialGoal,
  type FinancialGoal,
} from '@/lib/data/financial_goals.repo';
import type { TimePeriod } from './usePeriodComparison';

/**
 * Chave da instância de período de uma meta:
 *  - month   -> '2026-07'
 *  - quarter -> '2026-Q3'
 *  - year    -> '2026'
 * Assim cada mês/trimestre/ano tem sua própria meta e o histórico é preservado.
 */
export function periodKeyFor(period: TimePeriod, date: Date = new Date()): string {
  const year = date.getFullYear();
  if (period === 'year') return String(year);
  if (period === 'quarter') return `${year}-Q${Math.floor(date.getMonth() / 3) + 1}`;
  return `${year}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/** Metas de receita por instância de período (period_type + period_key). */
export function useFinancialGoals() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['financial-goals'],
    queryFn: () => listFinancialGoals(),
  });

  const goals = query.data ?? [];

  const getGoal = (period: TimePeriod, periodKey: string): FinancialGoal | undefined =>
    goals.find((g) => g.period_type === period && g.period_key === periodKey);

  const getTarget = (period: TimePeriod, periodKey: string): number =>
    getGoal(period, periodKey)?.target_amount ?? 0;

  const setGoal = useMutation({
    // Upsert manual por (period_type, period_key): como o gateway genérico não
    // tem get-by-id, decidimos create vs update pela meta já carregada.
    mutationFn: async ({
      period,
      periodKey,
      amount,
    }: {
      period: TimePeriod;
      periodKey: string;
      amount: number;
    }) => {
      const existing = getGoal(period, periodKey);
      if (existing) {
        return updateFinancialGoal(existing.id, { target_amount: amount });
      }
      return createFinancialGoal({ period_type: period, period_key: periodKey, target_amount: amount });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-goals'] });
    },
  });

  return { goals, getGoal, getTarget, isLoading: query.isLoading, setGoal };
}
