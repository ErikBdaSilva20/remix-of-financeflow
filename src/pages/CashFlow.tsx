import { CashFlowDataTable } from '@/components/CashFlowDataTable';
import { MetricCard } from '@/components/MetricCard';
import { Card } from '@/components/ui/card';
import { useCashFlowDrillDown } from '@/hooks/useCashFlowDrillDown';
import { listAccounts } from '@/lib/data/accounts.repo';
import { listBankTransactions } from '@/lib/data/bank_transactions.repo';
import { useQuery } from '@tanstack/react-query';
import { differenceInDays, format, parseISO } from 'date-fns';
import { Banknote, DollarSign, TrendingDown, TrendingUp } from 'lucide-react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const formatBRL = (amount: number) =>
  `R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const CashFlow = () => {
  const { drillDownData, handlePeriodClick, clearDrillDown } = useCashFlowDrillDown();

  const { data: cashflowData } = useQuery({
    queryKey: ['cashflow-data'],
    queryFn: async () => {
      const allTxns = await listBankTransactions();

      const data = allTxns.sort((a, b) => a.date.localeCompare(b.date));

      const totals = data.reduce(
        (acc, row) => {
          const amt = Number(row.amount || 0);
          const inflow = amt > 0 ? amt : 0;
          const outflow = amt < 0 ? Math.abs(amt) : 0;
          return {
            inflow: acc.inflow + inflow,
            outflow: acc.outflow + outflow,
          };
        },
        { inflow: 0, outflow: 0 }
      );

      const dateRangeDays =
        data.length > 0
          ? differenceInDays(parseISO(data[data.length - 1].date), parseISO(data[0].date))
          : 0;
      const useDailyGranularity = dateRangeDays <= 30;

      const aggregated: Record<
        string,
        { period: string; dateKey: string; inflow: number; outflow: number; net: number }
      > = {};
      data.forEach((row) => {
        const key = useDailyGranularity
          ? format(parseISO(row.date), 'dd/MM')
          : format(parseISO(row.date), 'MM/yyyy');
        const dateKey = useDailyGranularity
          ? format(parseISO(row.date), 'yyyy-MM-dd')
          : format(parseISO(row.date), 'yyyy-MM');
        if (!aggregated[key])
          aggregated[key] = { period: key, dateKey, inflow: 0, outflow: 0, net: 0 };
        const amt = Number(row.amount || 0);
        const inflow = amt > 0 ? amt : 0;
        const outflow = amt < 0 ? Math.abs(amt) : 0;
        aggregated[key].inflow += inflow;
        aggregated[key].outflow += outflow;
        aggregated[key].net += inflow - outflow;
      });

      const chartData = Object.values(aggregated).sort((a, b) =>
        a.dateKey.localeCompare(b.dateKey)
      );

      return { totals, chartData };
    },
  });

  const { data: accountsData } = useQuery({
    queryKey: ['accounts-balance'],
    queryFn: async () => {
      const accounts = await listAccounts();
      return accounts.reduce((sum, account) => sum + Number(account.balance || 0), 0);
    },
  });

  // Forecast stubbed until E5.3 heuristic is implemented
  const forecastData = null;
  const isForecastLoading = false;

  const netCashFlow = (cashflowData?.totals.inflow || 0) - (cashflowData?.totals.outflow || 0);
  const totalOutflow = cashflowData?.totals.outflow || 0;

  let dateRangeDays = 30;
  if (cashflowData?.chartData && cashflowData.chartData.length > 0) {
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
          value={formatBRL(netCashFlow)}
          changeType="positive"
          hasData={hasData}
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <MetricCard
          title="Fluxo de Caixa Livre"
          value={formatBRL(freeCashFlow)}
          changeType="positive"
          hasData={hasData}
          icon={<DollarSign className="w-5 h-5" />}
        />
        <MetricCard
          title="Saldo em Caixa"
          value={formatBRL(cashBalance)}
          changeType="positive"
          hasData={cashBalance > 0}
          icon={<Banknote className="w-5 h-5" />}
        />
        <MetricCard
          title="Taxa de Queima Mensal"
          value={formatBRL(monthlyBurnRate)}
          changeType="negative"
          hasData={hasData}
          icon={<TrendingDown className="w-5 h-5" />}
        />
      </div>

      {/* Cash Flow Summary - full width grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flex justify-between items-center p-4 bg-card border rounded-xl">
          <span className="text-sm text-muted-foreground">Entradas de Caixa</span>
          <span className="font-semibold text-success-600">
            +{formatBRL(cashflowData?.totals.inflow || 0)}
          </span>
        </div>
        <div className="flex justify-between items-center p-4 bg-card border rounded-xl">
          <span className="text-sm text-muted-foreground">Saídas de Caixa</span>
          <span className="font-semibold text-destructive">
            -{formatBRL(cashflowData?.totals.outflow || 0)}
          </span>
        </div>
        <div className="flex justify-between items-center p-4 bg-card border rounded-xl">
          <span className="text-sm text-muted-foreground">Runway de Caixa</span>
          <span className="font-semibold">
            {runwayMonths > 0 ? `${runwayMonths.toFixed(1)} meses` : 'N/A'}
          </span>
        </div>
      </div>

      {/* Monthly Trends - full width */}
      <Card className="p-6 w-full min-w-0">
        <h3 className="text-lg mb-6">Tendências Mensais do Fluxo de Caixa</h3>
        {hasData && cashflowData?.chartData && cashflowData.chartData.length > 0 ? (
          <div className="overflow-x-auto w-full">
            <div style={{ minWidth: '520px' }} className="h-[360px] w-full">
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
                      if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
                      if (value >= 1000) return `R$ ${(value / 1000).toFixed(0)}K`;
                      return `R$ ${value.toFixed(0)}`;
                    }}
                  />
                  <Tooltip
                    formatter={(value) => formatBRL(Number(value))}
                    contentStyle={{
                      backgroundColor: '#F0FDF4',
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Line
                    type="monotone"
                    dataKey="inflow"
                    stroke="#059669"
                    name="Entradas"
                    strokeWidth={3}
                    dot={{ fill: '#059669', r: 4 }}
                    activeDot={{ cursor: 'pointer', r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="outflow"
                    stroke="#ef4444"
                    name="Saídas"
                    strokeWidth={3}
                    dot={{ fill: '#ef4444', r: 4 }}
                    activeDot={{ cursor: 'pointer', r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="net"
                    stroke="#0891B2"
                    name="Fluxo Líquido"
                    strokeWidth={3}
                    dot={{ fill: '#0891B2', r: 4 }}
                    activeDot={{ cursor: 'pointer', r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-12">
            <span className="inline-flex items-center justify-center rounded-md bg-muted px-3 py-1 text-sm text-muted-foreground">
              Sem Dados
            </span>
          </div>
        )}
      </Card>

      {/* Drill-down table */}
      {drillDownData && (
        <CashFlowDataTable
          drillDownData={drillDownData}
          onClose={clearDrillDown}
          formatCurrency={formatBRL}
        />
      )}
    </div>
  );
};

export default CashFlow;
