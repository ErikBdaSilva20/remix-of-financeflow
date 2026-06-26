import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MetricCard } from "@/components/MetricCard";
import { TrendingUp, TrendingDown, DollarSign, Banknote } from "lucide-react";
import { FilterHeader, FilterState } from "@/components/FilterHeader";
import { useQuery } from "@tanstack/react-query";
import { listBankTransactions } from "@/lib/data/bank_transactions.repo";
import { listAccounts } from "@/lib/data/accounts.repo";
import { format, parseISO, differenceInDays } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useCurrencyConversion } from "@/hooks/useCurrencyConversion";
import { useCashFlowDrillDown } from "@/hooks/useCashFlowDrillDown";
import { CashFlowDataTable } from "@/components/CashFlowDataTable";

const CashFlow = () => {
  const [filters, setFilters] = useState<FilterState>({
    dateRange: {},
    currency: 'BRL'
  });

  const { convertAmount, currencySymbol } = useCurrencyConversion(filters.currency);
  const { drillDownData, handlePeriodClick, clearDrillDown } = useCashFlowDrillDown();

  const formatWithCurrency = (amount: number) => {
    return `${currencySymbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const { data: cashflowData } = useQuery({
    queryKey: ["cashflow-data", filters.dateRange, filters.currency],
    queryFn: async () => {
      const allTxns = await listBankTransactions();

      const fromStr = filters.dateRange?.from ? format(filters.dateRange.from, 'yyyy-MM-dd') : null;
      const toStr = filters.dateRange?.to ? format(filters.dateRange.to, 'yyyy-MM-dd') : null;

      const data = allTxns
        .filter(row => {
          if (fromStr && row.date < fromStr) return false;
          if (toStr && row.date > toStr) return false;
          return true;
        })
        .sort((a, b) => a.date.localeCompare(b.date));

      const totals = data.reduce((acc, row) => {
        const inflow = row.amount > 0 ? row.amount : 0;
        const outflow = row.amount < 0 ? Math.abs(row.amount) : 0;
        return {
          inflow: acc.inflow + convertAmount(inflow, 'USD', row.date),
          outflow: acc.outflow + convertAmount(outflow, 'USD', row.date),
        };
      }, { inflow: 0, outflow: 0 });

      const dateRangeDays = filters.dateRange?.from && filters.dateRange?.to
        ? differenceInDays(filters.dateRange.to, filters.dateRange.from)
        : data.length > 0
          ? differenceInDays(parseISO(data[data.length - 1].date), parseISO(data[0].date))
          : 0;
      const useDailyGranularity = dateRangeDays <= 30;

      const aggregated: Record<string, { period: string; dateKey: string; inflow: number; outflow: number; net: number }> = {};
      data.forEach(row => {
        const key = useDailyGranularity
          ? format(parseISO(row.date), "dd/MM")
          : format(parseISO(row.date), "MM/yyyy");
        const dateKey = useDailyGranularity
          ? format(parseISO(row.date), "yyyy-MM-dd")
          : format(parseISO(row.date), "yyyy-MM");
        if (!aggregated[key]) aggregated[key] = { period: key, dateKey, inflow: 0, outflow: 0, net: 0 };
        const inflow = row.amount > 0 ? row.amount : 0;
        const outflow = row.amount < 0 ? Math.abs(row.amount) : 0;
        const ci = convertAmount(inflow, 'USD', row.date);
        const co = convertAmount(outflow, 'USD', row.date);
        aggregated[key].inflow += ci;
        aggregated[key].outflow += co;
        aggregated[key].net += ci - co;
      });

      const chartData = Object.values(aggregated).sort((a, b) => a.dateKey.localeCompare(b.dateKey));

      return { totals, chartData };
    },
  });

  const { data: accountsData } = useQuery({
    queryKey: ["accounts-balance", filters.currency],
    queryFn: async () => {
      const accounts = await listAccounts();
      return accounts.reduce((sum, account) => {
        return sum + convertAmount(account.balance, account.currency || 'USD');
      }, 0);
    },
  });

  // Forecast stubbed until E5.3 heuristic is implemented
  const forecastData = null;
  const isForecastLoading = false;

  const netCashFlow = (cashflowData?.totals.inflow || 0) - (cashflowData?.totals.outflow || 0);
  const totalOutflow = cashflowData?.totals.outflow || 0;

  let dateRangeDays = 30;
  if (filters.dateRange?.from && filters.dateRange?.to) {
    dateRangeDays = differenceInDays(filters.dateRange.to, filters.dateRange.from);
  } else if (cashflowData?.chartData && cashflowData.chartData.length > 0) {
    const firstDate = (cashflowData.chartData[0] as any).dateKey;
    const lastDate = (cashflowData.chartData[cashflowData.chartData.length - 1] as any).dateKey;
    if (firstDate && lastDate) {
      dateRangeDays = differenceInDays(parseISO(lastDate), parseISO(firstDate));
    }
  }
  const monthlyBurnRate = dateRangeDays > 0 ? (totalOutflow / dateRangeDays) * 30 : 0;

  const cashBalance = accountsData || 0;
  const freeCashFlow = netCashFlow;
  const hasData = (cashflowData?.totals.inflow || 0) > 0 || (cashflowData?.totals.outflow || 0) > 0;
  const runwayMonths = monthlyBurnRate > 0 && cashBalance > 0 ? cashBalance / monthlyBurnRate : 0;

  return (
    <div className="space-y-0">
      <FilterHeader
        filters={filters}
        onFiltersChange={setFilters}
        showFxCurrency={true}
      />

      <div className="space-y-6 p-4">
      <div>
        <h1 className="text-3xl tracking-tight">Gestão de Fluxo de Caixa</h1>
        <p className="text-muted-foreground">
          Monitore entradas e saídas de caixa para manter liquidez saudável
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Fluxo de Caixa Operacional"
          value={formatWithCurrency(netCashFlow)}
          changeType="positive"
          hasData={hasData}
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <MetricCard
          title="Fluxo de Caixa Livre"
          value={formatWithCurrency(freeCashFlow)}
          changeType="positive"
          hasData={hasData}
          icon={<DollarSign className="w-5 h-5" />}
        />
        <MetricCard
          title="Saldo em Caixa"
          value={formatWithCurrency(cashBalance)}
          changeType="positive"
          hasData={cashBalance > 0}
          icon={<Banknote className="w-5 h-5" />}
        />
        <MetricCard
          title="Taxa de Queima Mensal"
          value={formatWithCurrency(monthlyBurnRate)}
          changeType="negative"
          hasData={hasData}
          icon={<TrendingDown className="w-5 h-5" />}
        />
      </div>

      {/* Cash Flow Summary - full width grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flex justify-between items-center p-4 bg-card border rounded-xl">
          <span className="text-sm text-muted-foreground">Entradas de Caixa</span>
          <span className="font-semibold text-success-600">+{formatWithCurrency(cashflowData?.totals.inflow || 0)}</span>
        </div>
        <div className="flex justify-between items-center p-4 bg-card border rounded-xl">
          <span className="text-sm text-muted-foreground">Saídas de Caixa</span>
          <span className="font-semibold text-destructive">-{formatWithCurrency(cashflowData?.totals.outflow || 0)}</span>
        </div>
        <div className="flex justify-between items-center p-4 bg-card border rounded-xl">
          <span className="text-sm text-muted-foreground">Runway de Caixa</span>
          <span className="font-semibold">{runwayMonths > 0 ? `${runwayMonths.toFixed(1)} meses` : 'N/A'}</span>
        </div>
      </div>

      {/* Monthly Trends - full width */}
      <Card className="p-6">
        <h3 className="text-lg mb-6">Tendências Mensais do Fluxo de Caixa</h3>
        {hasData && cashflowData?.chartData && cashflowData.chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={360}>
            <LineChart
              data={cashflowData.chartData}
              margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
              onClick={(data) => {
                if (data && data.activePayload && data.activePayload[0]) {
                  const payload = data.activePayload[0].payload;
                  handlePeriodClick(payload.period, payload.dateKey);
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" opacity={0.4} />
              <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, dx: -8 }}
                width={80}
                tickFormatter={(value) => {
                  const converted = convertAmount(value, 'USD');
                  if (converted >= 1000000) return `${currencySymbol}${(converted / 1000000).toFixed(1)}M`;
                  if (converted >= 1000) return `${currencySymbol}${(converted / 1000).toFixed(0)}K`;
                  return `${currencySymbol}${converted.toFixed(0)}`;
                }}
              />
              <Tooltip
                formatter={(value) => formatWithCurrency(Number(value))}
                contentStyle={{ backgroundColor: '#F0FDF4', border: '1px solid #E2E8F0', borderRadius: '8px' }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Line type="monotone" dataKey="inflow" stroke="#059669" name="Entradas" strokeWidth={3} dot={{ fill: '#059669', r: 4 }} activeDot={{ cursor: 'pointer', r: 6 }} />
              <Line type="monotone" dataKey="outflow" stroke="#ef4444" name="Saídas" strokeWidth={3} dot={{ fill: '#ef4444', r: 4 }} activeDot={{ cursor: 'pointer', r: 6 }} />
              <Line type="monotone" dataKey="net" stroke="#0891B2" name="Fluxo Líquido" strokeWidth={3} dot={{ fill: '#0891B2', r: 4 }} activeDot={{ cursor: 'pointer', r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center py-12">
            <span className="inline-flex items-center justify-center rounded-md bg-muted px-3 py-1 text-sm text-muted-foreground">Sem Dados</span>
          </div>
        )}
      </Card>

      {/* Drill-down table */}
      {drillDownData && (
        <CashFlowDataTable
          drillDownData={drillDownData}
          onClose={clearDrillDown}
          formatCurrency={formatWithCurrency}
        />
      )}

      {/* Cash Flow Forecast */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-lg">Previsão de Fluxo de Caixa - 12 Meses</h3>
          <Badge variant="secondary" className="bg-secondary-light text-secondary hover:bg-secondary-light-20">
            Gerado por IA
          </Badge>
        </div>
        {isForecastLoading ? (
          <div className="flex items-center justify-center py-8">
            <span className="inline-flex items-center justify-center rounded-md bg-muted px-3 py-1 text-sm text-muted-foreground">Gerando previsão por IA...</span>
          </div>
        ) : forecastData && (forecastData as any[]).length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={forecastData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip formatter={(value) => formatWithCurrency(Number(value))} />
              <Legend />
              <Line
                type="monotone"
                dataKey="inflow"
                stroke="#10b981"
                name="Entradas Projetadas"
                strokeWidth={2}
                strokeDasharray="5 5"
              />
              <Line
                type="monotone"
                dataKey="outflow"
                stroke="#ef4444"
                name="Saídas Projetadas"
                strokeWidth={2}
                strokeDasharray="5 5"
              />
              <Line
                type="monotone"
                dataKey="net"
                stroke="#3b82f6"
                name="Líquido Projetado"
                strokeWidth={2}
                strokeDasharray="5 5"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center py-8">
            <span className="inline-flex items-center justify-center rounded-md bg-muted px-3 py-1 text-sm text-muted-foreground">
              {hasData ? "Não foi possível gerar previsão" : "Adicione dados de fluxo de caixa para ver a previsão"}
            </span>
          </div>
        )}
      </Card>
      </div>
    </div>
  );
};

export default CashFlow;
