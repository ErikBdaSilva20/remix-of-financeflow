import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

import { RevenueDrillDownTable } from '@/components/RevenueDrillDownTable';
import { RevenueProfitChart } from '@/components/RevenueProfitChart';
import { TimePeriod, TimePeriodSelector } from '@/components/TimePeriodSelector';
import { Badge } from '@/components/ui/badge';
import { useFinancialMetrics, useKPIs } from '@/hooks/useFinancialData';
import { usePeriodComparison } from '@/hooks/usePeriodComparison';
import { useRevenueDrillDown } from '@/hooks/useRevenueDrillDown';
import { useRevenueProfitData } from '@/hooks/useRevenueProfitData';
import { ArrowDownLeft, ArrowUpRight, DollarSign, Repeat, TrendingUp } from 'lucide-react';
import { useState } from 'react';

const formatBRL = (amount: number) =>
  `R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function Overview() {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('month');

  // Drill-down state for Revenue/Profit chart
  const [drillDownParams, setDrillDownParams] = useState<{
    startDate: string;
    endDate: string;
  } | null>(null);

  const { data: drillDownData, isLoading: drillDownLoading } = useRevenueDrillDown(drillDownParams);

  const { data: metrics } = useFinancialMetrics({});
  const { data: kpis } = useKPIs();
  const { data: revenueProfitData } = useRevenueProfitData({});

  const { data: periodComparison } = usePeriodComparison(selectedPeriod);

  // Helper function to get metric by type
  const getMetric = (type: string) => {
    return metrics?.find((m: { metric_type: string }) => m.metric_type === type);
  };

  // Helper function to get KPI by name
  const getKPI = (name: string) => {
    return kpis?.find((k: { kpi_name: string }) => k.kpi_name === name);
  };

  // Handle chart point click for drill-down
  const handleChartPointClick = (dateKey: string) => {
    // Determine the date range based on the dateKey format
    let startDate: string;
    let endDate: string;

    if (dateKey.length === 7) {
      // Monthly format (YYYY-MM)
      const [year, month] = dateKey.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      startDate = `${year}-${month}-01`;
      const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
      endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
    } else {
      // Daily format (YYYY-MM-DD)
      startDate = dateKey;
      endDate = dateKey;
    }

    setDrillDownParams({ startDate, endDate });
  };

  const closeDrillDown = () => {
    setDrillDownParams(null);
  };
  const periodNamesPt: Record<TimePeriod, string> = {
    month: 'mês',
    quarter: 'trimestre',
    year: 'ano',
  };

  const formatGrowth = (growth: number | undefined) => {
    if (growth === undefined || !isFinite(growth)) return '0.0%';
    const sign = growth >= 0 ? '+' : '';
    return `${sign}${growth.toFixed(1)}%`;
  };
  const revenue = getMetric('revenue');
  const profit = getMetric('profit');
  const cashFlow = getMetric('cash_flow');
  return (
    <div className="flex flex-col lg:flex-row gap-4 md:gap-6">
      {/* Main Content */}
      <div className="flex-1 space-y-4 md:space-y-6">
        {/* Period Selector */}
        <div className="flex justify-end">
          <TimePeriodSelector selectedPeriod={selectedPeriod} onPeriodChange={setSelectedPeriod} />
        </div>

        {/* Hero Card - Total Financial Assets */}
        <div className="relative overflow-hidden bg-gradient-to-br from-primary to-primary/80 rounded-xl md:rounded-2xl p-6 md:p-8 text-primary-foreground">
          <div className="relative z-10">
            <h2 className="text-base md:text-lg mb-2 opacity-90">Total de Ativos Financeiros</h2>
            <div className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              {profit || revenue ? (
                formatBRL((profit?.amount || 0) + (revenue?.amount || 0))
              ) : (
                <Badge variant="secondary" className="text-lg px-4 py-2">
                  Sem Dados
                </Badge>
              )}
            </div>
          </div>
          {/* Decorative elements */}
          <div className="absolute right-4 md:right-8 top-4 md:top-8 opacity-20">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-background rounded-full flex items-center justify-center">
              <DollarSign className="w-6 h-6 md:w-8 md:h-8" />
            </div>
          </div>
          <div className="absolute right-8 md:right-16 bottom-4 md:bottom-8 opacity-10">
            <div className="w-8 h-8 md:w-12 md:h-12 bg-background rounded-full" />
          </div>
        </div>

        {/* Key Metrics with Growth Indicators */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {/* Revenue */}
          <Card className="p-4 md:p-6">
            <div className="flex items-start justify-between mb-2">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-green-600" />
              </div>
            </div>
            <h3 className="text-xs md:text-sm text-muted-foreground mb-1">Receita</h3>
            <div className="text-xl md:text-2xl font-bold mb-2">
              {periodComparison ? (
                formatBRL(periodComparison.current.revenue)
              ) : (
                <Badge variant="secondary" className="text-xs">
                  Sem Dados
                </Badge>
              )}
            </div>
            {periodComparison && (
              <div
                className={`flex items-center gap-1 text-xs md:text-sm ${
                  periodComparison.growth.revenue >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {periodComparison.growth.revenue >= 0 ? (
                  <ArrowUpRight className="w-3 h-3 md:w-4 md:h-4" />
                ) : (
                  <ArrowDownLeft className="w-3 h-3 md:w-4 md:h-4" />
                )}
                <span className="font-medium">{formatGrowth(periodComparison.growth.revenue)}</span>
                <span className="text-muted-foreground hidden sm:inline">
                  vs {periodNamesPt[selectedPeriod]} anterior
                </span>
              </div>
            )}
          </Card>

          {/* Expenses */}
          <Card className="p-4 md:p-6">
            <div className="flex items-start justify-between mb-2">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <ArrowDownLeft className="w-4 h-4 md:w-5 md:h-5 text-red-600" />
              </div>
            </div>
            <h3 className="text-xs md:text-sm text-muted-foreground mb-1">Despesas</h3>
            <div className="text-xl md:text-2xl font-bold mb-2">
              {periodComparison ? (
                formatBRL(periodComparison.current.expenses)
              ) : (
                <Badge variant="secondary" className="text-xs">
                  Sem Dados
                </Badge>
              )}
            </div>
            {periodComparison && (
              <div
                className={`flex items-center gap-1 text-xs md:text-sm ${
                  periodComparison.growth.expenses >= 0 ? 'text-red-600' : 'text-green-600'
                }`}
              >
                {periodComparison.growth.expenses >= 0 ? (
                  <ArrowUpRight className="w-3 h-3 md:w-4 md:h-4" />
                ) : (
                  <ArrowDownLeft className="w-3 h-3 md:w-4 md:h-4" />
                )}
                <span className="font-medium">
                  {formatGrowth(periodComparison.growth.expenses)}
                </span>
                <span className="text-muted-foreground hidden sm:inline">
                  vs {periodNamesPt[selectedPeriod]} anterior
                </span>
              </div>
            )}
          </Card>

          {/* Profit */}
          <Card className="p-4 md:p-6">
            <div className="flex items-start justify-between mb-2">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-primary-light rounded-lg flex items-center justify-center">
                <DollarSign className="w-4 h-4 md:w-5 md:h-5 text-primary" />
              </div>
            </div>
            <h3 className="text-xs md:text-sm text-muted-foreground mb-1">Lucro</h3>
            <div className="text-xl md:text-2xl font-bold mb-2">
              {periodComparison ? (
                formatBRL(periodComparison.current.profit)
              ) : (
                <Badge variant="secondary" className="text-xs">
                  Sem Dados
                </Badge>
              )}
            </div>
            {periodComparison && (
              <div
                className={`flex items-center gap-1 text-xs md:text-sm ${
                  periodComparison.growth.profit >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {periodComparison.growth.profit >= 0 ? (
                  <ArrowUpRight className="w-3 h-3 md:w-4 md:h-4" />
                ) : (
                  <ArrowDownLeft className="w-3 h-3 md:w-4 md:h-4" />
                )}
                <span className="font-medium">{formatGrowth(periodComparison.growth.profit)}</span>
                <span className="text-muted-foreground hidden sm:inline">
                  vs {periodNamesPt[selectedPeriod]} anterior
                </span>
              </div>
            )}
          </Card>

          {/* Cash Flow */}
          <Card className="p-4 md:p-6">
            <div className="flex items-start justify-between mb-2">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-secondary-light rounded-lg flex items-center justify-center">
                <Repeat className="w-4 h-4 md:w-5 md:h-5 text-secondary" />
              </div>
            </div>
            <h3 className="text-xs md:text-sm text-muted-foreground mb-1">Fluxo de Caixa</h3>
            <div className="text-xl md:text-2xl font-bold mb-2">
              {periodComparison ? (
                formatBRL(periodComparison.current.cashFlow)
              ) : (
                <Badge variant="secondary" className="text-xs">
                  Sem Dados
                </Badge>
              )}
            </div>
            {periodComparison && (
              <div
                className={`flex items-center gap-1 text-xs md:text-sm ${
                  periodComparison.growth.cashFlow >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {periodComparison.growth.cashFlow >= 0 ? (
                  <ArrowUpRight className="w-3 h-3 md:w-4 md:h-4" />
                ) : (
                  <ArrowDownLeft className="w-3 h-3 md:w-4 md:h-4" />
                )}
                <span className="font-medium">
                  {formatGrowth(periodComparison.growth.cashFlow)}
                </span>
                <span className="text-muted-foreground hidden sm:inline">
                  vs {periodNamesPt[selectedPeriod]} anterior
                </span>
              </div>
            )}
          </Card>
        </div>

        <div className="gap-4 md:gap-6">
          {/* Account Balances */}
          <Card className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <h3 className="text-base md:text-lg">Saldos de Contas</h3>
            </div>
            <div className="space-y-3 md:space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 md:gap-3">
                  <div className="w-7 h-7 md:w-8 md:h-8 bg-primary-light rounded-full flex items-center justify-center">
                    <div className="w-3 h-3 md:w-4 md:h-4 bg-primary rounded-full" />
                  </div>
                  <span className="text-sm md:text-base font-medium">Conta Principal</span>
                </div>
                <div className="text-right">
                  <div className="text-sm md:text-base font-semibold">
                    {revenue ? (
                      formatBRL(revenue.amount)
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        Sem Dados
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">BRL</div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 md:gap-3">
                  <div className="w-7 h-7 md:w-8 md:h-8 bg-secondary-light rounded-full flex items-center justify-center">
                    <div className="w-3 h-3 md:w-4 md:h-4 bg-secondary rounded-full" />
                  </div>
                  <span className="text-sm md:text-base font-medium">Poupança</span>
                </div>
                <div className="text-right">
                  <div className="text-sm md:text-base font-semibold">
                    {cashFlow ? (
                      formatBRL(Math.abs(cashFlow.amount || 0))
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        Sem Dados
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">BRL</div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 md:gap-3">
                  <div className="w-7 h-7 md:w-8 md:h-8 bg-teal-100 rounded-full flex items-center justify-center">
                    <div className="w-3 h-3 md:w-4 md:h-4 bg-teal-500 rounded-full" />
                  </div>
                  <span className="text-sm md:text-base font-medium">Investimento</span>
                </div>
                <div className="text-right">
                  <div className="text-sm md:text-base font-semibold">
                    {profit ? (
                      formatBRL(profit.amount)
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        Sem Dados
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">BRL</div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Revenue vs Profit Chart */}
        <RevenueProfitChart
          data={revenueProfitData || []}
          formatCurrency={formatBRL}
          onPointClick={handleChartPointClick}
        />

        {/* Drill-down table */}
        {drillDownParams && (
          <RevenueDrillDownTable
            data={drillDownData || []}
            title={`Transações - ${drillDownParams.startDate}${
              drillDownParams.endDate !== drillDownParams.startDate
                ? ` a ${drillDownParams.endDate}`
                : ''
            }`}
            onClose={closeDrillDown}
            isLoading={drillDownLoading}
          />
        )}

        {/* Latest Transactions */}
        <Card className="p-4 md:p-6">
          <h3 className="text-base md:text-lg mb-3 md:mb-4">Últimas Transações</h3>
          <div className="flex items-center justify-center py-6 md:py-8">
            <Badge variant="secondary" className="text-xs md:text-sm">
              Sem dados disponíveis
            </Badge>
          </div>
        </Card>

      </div>
    </div>
  );
}
