import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

import { EntryDialog } from '@/components/EntryDialog';
import { RevenueDrillDownTable } from '@/components/RevenueDrillDownTable';
import { RevenueProfitChart } from '@/components/RevenueProfitChart';
import { TimePeriod, TimePeriodSelector } from '@/components/TimePeriodSelector';
import { Badge } from '@/components/ui/badge';
import { usePeriodComparison } from '@/hooks/usePeriodComparison';
import { useRevenueDrillDown } from '@/hooks/useRevenueDrillDown';
import { useRevenueProfitData } from '@/hooks/useRevenueProfitData';
import { ArrowDownLeft, ArrowUpRight, DollarSign, Plus, TrendingUp } from 'lucide-react';
import { useState } from 'react';

const formatBRL = (amount: number) =>
  `R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function Overview() {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('month');
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);

  // Drill-down state for Revenue/Profit chart
  const [drillDownParams, setDrillDownParams] = useState<{
    startDate: string;
    endDate: string;
  } | null>(null);

  const { data: drillDownData, isLoading: drillDownLoading } = useRevenueDrillDown(drillDownParams);

  const { data: revenueProfitData } = useRevenueProfitData({});

  const { data: periodComparison } = usePeriodComparison(selectedPeriod);

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
  return (
    <div className="flex flex-col lg:flex-row gap-4 md:gap-6">
      {/* Main Content */}
      <div className="flex-1 space-y-4 md:space-y-6">
        {/* Period Selector & Quick Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              className="bg-gradient-primary text-primary-foreground font-semibold"
              onClick={() => setEntryDialogOpen(true)}
            >
              <Plus className="w-4 h-4 mr-1" /> Novo Lançamento
            </Button>
          </div>
          <div className="flex justify-end">
            <TimePeriodSelector
              selectedPeriod={selectedPeriod}
              onPeriodChange={setSelectedPeriod}
            />
          </div>
        </div>

        {/* Key Metrics with Growth Indicators */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
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

          {/* Net Value (Revenue - Expenses) */}
          <Card className="p-4 md:p-6">
            <div className="flex items-start justify-between mb-2">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-primary-light rounded-lg flex items-center justify-center">
                <DollarSign className="w-4 h-4 md:w-5 md:h-5 text-primary" />
              </div>
            </div>
            <h3 className="text-xs md:text-sm text-muted-foreground mb-1">Valor Líquido Total</h3>
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

        <Card className="p-4 md:p-6">
          <h3 className="text-base md:text-lg mb-3 md:mb-4">Últimas Transações</h3>
          <div className="flex items-center justify-center py-6 md:py-8">
            <Badge variant="secondary" className="text-xs md:text-sm">
              Sem dados disponíveis
            </Badge>
          </div>
        </Card>
      </div>

      <EntryDialog open={entryDialogOpen} onOpenChange={setEntryDialogOpen} />
    </div>
  );
}
