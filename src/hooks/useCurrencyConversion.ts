import { useQuery } from "@tanstack/react-query";
import { getCurrencySymbol } from "@/lib/currencySymbols";
import { listFxRates } from "@/lib/data/fx_rates.repo";
import type { FxRate } from "@/lib/data/fx_rates.repo";

export const useCurrencyConversion = (currency: string = 'BRL') => {
  const { data: allFxRatesData } = useQuery({
    queryKey: ["all-fx-rates-with-dates"],
    queryFn: async () => {
      const rates = await listFxRates();
      rates.sort((a, b) => b.date.localeCompare(a.date));

      const byDate: Record<string, Record<string, number>> = {};
      const latest: Record<string, { rate_to_base: number; currency: string }> = {};

      rates.forEach((rate: FxRate) => {
        if (!byDate[rate.currency]) byDate[rate.currency] = {};
        if (!byDate[rate.currency][rate.date]) {
          byDate[rate.currency][rate.date] = rate.rate_to_base;
        }
        if (!latest[rate.currency]) {
          latest[rate.currency] = { rate_to_base: rate.rate_to_base, currency: rate.currency };
        }
      });

      return { byDate, latest };
    },
  });

  const { data: fxRate } = useQuery({
    queryKey: ["fx-rate", currency],
    queryFn: async () => {
      if (currency === 'USD') return { rate_to_base: 1, currency: 'USD' };
      const rates = await listFxRates();
      const match = rates
        .filter(r => r.currency === currency)
        .sort((a, b) => b.date.localeCompare(a.date));
      if (!match.length) return { rate_to_base: 1, currency };
      return { rate_to_base: match[0].rate_to_base, currency };
    },
    enabled: !!currency,
  });

  const getFxRateForDate = (targetCurrency: string, date: string): number => {
    if (targetCurrency === 'USD') return 1;
    if (!allFxRatesData?.byDate[targetCurrency]) return 1;
    const currencyRates = allFxRatesData.byDate[targetCurrency];
    if (currencyRates[date]) return currencyRates[date];
    const priorDate = Object.keys(currencyRates).sort().reverse().find(d => d <= date);
    return priorDate ? currencyRates[priorDate] : (allFxRatesData.latest[targetCurrency]?.rate_to_base || 1);
  };

  const convertAmount = (amount: number, fromCurrency: string = 'USD', transactionDate?: string): number => {
    if (!allFxRatesData || !fxRate) return amount;
    if (fromCurrency === currency) return amount;
    let fromRate: number;
    let toRate: number;
    if (transactionDate) {
      fromRate = fromCurrency === 'USD' ? 1 : getFxRateForDate(fromCurrency, transactionDate);
      toRate = currency === 'USD' ? 1 : getFxRateForDate(currency, transactionDate);
    } else {
      fromRate = fromCurrency === 'USD' ? 1 : (allFxRatesData.latest[fromCurrency]?.rate_to_base || 1);
      toRate = currency === 'USD' ? 1 : fxRate.rate_to_base;
    }
    return (amount * fromRate) / toRate;
  };

  return {
    fxRate,
    convertAmount,
    currencySymbol: getCurrencySymbol(currency),
    isLoading: !fxRate,
  };
};
