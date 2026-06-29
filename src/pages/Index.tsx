import { MetricCard } from '@/components/MetricCard';
import {
  Activity,
  DollarSign,
  Download,
  Eye,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Upload,
} from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  formatCurrency,
  useExpenseCategories,
  useFinancialMetrics,
  useRevenueSources,
} from '@/hooks/useFinancialData';
import { useProfitabilityData } from '@/hooks/useProfitabilityData';
import { useRevenueProfitData } from '@/hooks/useRevenueProfitData';
import { usePeriodComparison } from '@/hooks/usePeriodComparison';
import { useState } from 'react';
import { Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export default function Index() {
  const { data: metrics, isLoading: metricsLoading } = useFinancialMetrics();
  const { data: revenueSources, isLoading: revenueLoading } = useRevenueSources();
  const { data: expenseCategories, isLoading: expensesLoading } = useExpenseCategories();
  const { data: profitabilityData, isLoading: profitLoading } = useProfitabilityData();
  const { data: revenueProfitChartData } = useRevenueProfitData();
  const { data: monthComparison } = usePeriodComparison('month');
  const { data: quarterComparison } = usePeriodComparison('quarter');
  const { data: yearComparison } = usePeriodComparison('year');

  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);

  // Helper function to get metric by type
  const getMetric = (type: string) => {
    return metrics?.find((m) => m.metric_type === type);
  };

  if (metricsLoading || revenueLoading || expensesLoading || profitLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin-fast mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando dados do painel...</p>
        </div>
      </div>
    );
  }

  const revenue = getMetric('revenue');
  const expenses = getMetric('expenses');
  const totalExpenses = expenseCategories?.reduce((sum, exp) => sum + exp.amount, 0) || 0;
  const totalRevenue = revenueSources?.reduce((sum, rev) => sum + rev.amount, 0) || 0;
  const netProfit = totalRevenue - totalExpenses;
  const cashFlow = monthComparison?.current.cashFlow ?? netProfit;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-card-foreground mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl text-foreground">Visão Geral Financeira</h1>
          <p className="text-muted-foreground">Principais métricas e indicadores de desempenho</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" onClick={() => setShowImportModal(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Importar CSV
          </Button>
          <Button variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Sincronizar Dados
          </Button>
          <Badge variant="secondary">Este Mês</Badge>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Receita"
          value={revenue ? formatCurrency(revenue.amount) : formatCurrency(totalRevenue)}
          change={monthComparison ? `${monthComparison.growth.revenue >= 0 ? '+' : ''}${monthComparison.growth.revenue.toFixed(1)}% vs mês anterior` : undefined}
          changeType={monthComparison && monthComparison.growth.revenue >= 0 ? 'positive' : 'negative'}
          gradient="primary"
          icon={<DollarSign className="w-6 h-6" />}
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setSelectedMetric('revenue')}
        />
        <MetricCard
          title="Despesas totais"
          value={expenses ? formatCurrency(expenses.amount) : formatCurrency(totalExpenses)}
          change={monthComparison ? `${monthComparison.growth.expenses >= 0 ? '+' : ''}${monthComparison.growth.expenses.toFixed(1)}% vs mês anterior` : undefined}
          changeType={monthComparison && monthComparison.growth.expenses >= 0 ? 'negative' : 'positive'}
          icon={<TrendingDown className="w-6 h-6" />}
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setSelectedMetric('expenses')}
        />
        <MetricCard
          title="Lucro Líquido"
          value={
            profitabilityData
              ? formatCurrency(profitabilityData.netProfit)
              : formatCurrency(netProfit)
          }
          change={monthComparison ? `${monthComparison.growth.profit >= 0 ? '+' : ''}${monthComparison.growth.profit.toFixed(1)}% vs mês anterior` : undefined}
          changeType={monthComparison && monthComparison.growth.profit >= 0 ? 'positive' : 'negative'}
          gradient="success"
          icon={<TrendingUp className="w-6 h-6" />}
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setSelectedMetric('profit')}
        />
        <MetricCard
          title="Fluxo de Caixa"
          value={formatCurrency(cashFlow)}
          change={monthComparison ? `${monthComparison.growth.cashFlow >= 0 ? '+' : ''}${monthComparison.growth.cashFlow.toFixed(1)}% vs mês anterior` : undefined}
          changeType={monthComparison && monthComparison.growth.cashFlow >= 0 ? 'positive' : 'negative'}
          icon={<Activity className="w-6 h-6" />}
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setSelectedMetric('cashflow')}
        />
      </div>

      {/* Revenue vs Profit Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl">Tendência de Receita vs Lucro</CardTitle>
            <p className="text-sm text-muted-foreground">Comparação de desempenho de 6 meses</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Eye className="w-4 h-4 mr-2" />
              Ver Detalhes
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={revenueProfitChartData || []}
                margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
              >
                <XAxis
                  dataKey="period"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12 }}
                  className="fill-muted-foreground"
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, dx: -10 }}
                  className="fill-muted-foreground"
                  tickFormatter={(value) => formatCurrency(value)}
                  width={90}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#059669"
                  strokeWidth={3}
                  dot={{ fill: '#059669', strokeWidth: 2, r: 4 }}
                  name="Receita"
                  activeDot={{ r: 6, stroke: '#059669', strokeWidth: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="profit"
                  stroke="#047857"
                  strokeWidth={3}
                  dot={{ fill: '#047857', strokeWidth: 2, r: 4 }}
                  name="Lucro Líquido"
                  activeDot={{ r: 6, stroke: '#047857', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Period Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Crescimento vs Trimestre Anterior</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Crescimento da Receita</span>
              <span className={`font-semibold ${quarterComparison && quarterComparison.growth.revenue >= 0 ? 'text-success' : 'text-destructive'}`}>
                {quarterComparison ? `${quarterComparison.growth.revenue >= 0 ? '+' : ''}${quarterComparison.growth.revenue.toFixed(1)}%` : 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Crescimento do Lucro</span>
              <span className={`font-semibold ${quarterComparison && quarterComparison.growth.profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                {quarterComparison ? `${quarterComparison.growth.profit >= 0 ? '+' : ''}${quarterComparison.growth.profit.toFixed(1)}%` : 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Crescimento das Despesas</span>
              <span className={`font-semibold ${quarterComparison && quarterComparison.growth.expenses <= 0 ? 'text-success' : 'text-warning'}`}>
                {quarterComparison ? `${quarterComparison.growth.expenses >= 0 ? '+' : ''}${quarterComparison.growth.expenses.toFixed(1)}%` : 'N/A'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Crescimento vs Ano Anterior</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Crescimento da Receita</span>
              <span className={`font-semibold ${yearComparison && yearComparison.growth.revenue >= 0 ? 'text-success' : 'text-destructive'}`}>
                {yearComparison ? `${yearComparison.growth.revenue >= 0 ? '+' : ''}${yearComparison.growth.revenue.toFixed(1)}%` : 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Crescimento do Lucro</span>
              <span className={`font-semibold ${yearComparison && yearComparison.growth.profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                {yearComparison ? `${yearComparison.growth.profit >= 0 ? '+' : ''}${yearComparison.growth.profit.toFixed(1)}%` : 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Crescimento das Despesas</span>
              <span className={`font-semibold ${yearComparison && yearComparison.growth.expenses <= 0 ? 'text-success' : 'text-warning'}`}>
                {yearComparison ? `${yearComparison.growth.expenses >= 0 ? '+' : ''}${yearComparison.growth.expenses.toFixed(1)}%` : 'N/A'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Principais Índices</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Margem de Lucro</span>
              <span className="font-semibold">
                {profitabilityData ? `${profitabilityData.netMargin.toFixed(1)}%` : 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Margem Bruta</span>
              <span className="font-semibold">
                {profitabilityData ? `${profitabilityData.grossMargin.toFixed(1)}%` : 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Margem Operacional</span>
              <span className={`font-semibold ${profitabilityData && profitabilityData.operatingMargin >= 0 ? 'text-success' : 'text-destructive'}`}>
                {profitabilityData ? `${profitabilityData.operatingMargin.toFixed(1)}%` : 'N/A'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Drill-down Table (conditional rendering) */}
      {selectedMetric && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">
              {selectedMetric === 'revenue' && 'Detalhamento de Receitas'}
              {selectedMetric === 'expenses' && 'Detalhamento de Despesas'}
              {selectedMetric === 'profit' && 'Análise de Lucro'}
              {selectedMetric === 'cashflow' && 'Detalhes do Fluxo de Caixa'}
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => setSelectedMetric(null)}>
              Fechar
            </Button>
          </CardHeader>
          <CardContent>
            {selectedMetric === 'revenue' && (
              <div className="space-y-2">
                {revenueSources?.map((source) => (
                  <div
                    key={source.id}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <span className="font-medium">{source.name}</span>
                    <div className="text-right">
                      <span className="font-semibold">{formatCurrency(source.amount)}</span>
                      <span className="text-sm text-muted-foreground ml-2">
                        ({source.percentage?.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {selectedMetric === 'expenses' && (
              <div className="space-y-2">
                {expenseCategories?.map((expense) => (
                  <div
                    key={expense.id}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <span className="font-medium">{expense.name}</span>
                    <div className="text-right">
                      <span className="font-semibold">{formatCurrency(expense.amount)}</span>
                      <span className="text-sm text-muted-foreground ml-2">
                        ({expense.percentage?.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
