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

  const fxRate = (() => {
    if (currency === 'BRL') return { rate_to_base: 1, currency: 'BRL' };
    if (!allFxRatesData) return undefined;
    return allFxRatesData.latest[currency] || { rate_to_base: 1, currency };
  })();

  const getFxRateForDate = (targetCurrency: string, date: string): number => {
    if (targetCurrency === 'BRL') return 1;
    if (!allFxRatesData?.byDate[targetCurrency]) return 1;
    const currencyRates = allFxRatesData.byDate[targetCurrency];
    if (currencyRates[date]) return currencyRates[date];
    const priorDate = Object.keys(currencyRates).sort().reverse().find(d => d <= date);
    return priorDate ? currencyRates[priorDate] : (allFxRatesData.latest[targetCurrency]?.rate_to_base || 1);
  };

  const convertAmount = (amount: number, fromCurrency: string = 'BRL', transactionDate?: string): number => {
    if (!allFxRatesData || !fxRate) return amount;
    if (fromCurrency === currency) return amount;
    let fromRate: number;
    let toRate: number;
    if (transactionDate) {
      fromRate = fromCurrency === 'BRL' ? 1 : getFxRateForDate(fromCurrency, transactionDate);
      toRate = currency === 'BRL' ? 1 : getFxRateForDate(currency, transactionDate);
    } else {
      fromRate = fromCurrency === 'BRL' ? 1 : (allFxRatesData.latest[fromCurrency]?.rate_to_base || 1);
      toRate = currency === 'BRL' ? 1 : fxRate.rate_to_base;
    }
    return (amount * fromRate) / toRate;
  };

  return {
    fxRate,
    convertAmount,
    currencySymbol: getCurrencySymbol(currency),
    isLoading: !allFxRatesData,
  };
};
