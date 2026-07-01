import { MarginTrendsChart } from '@/components/MarginTrendsChart';
import { ProfitWaterfallChart } from '@/components/ProfitWaterfallChart';
import { ProfitabilityDataTable } from '@/components/ProfitabilityDataTable';
import { DashboardStatCard, PremiumScope } from '@/components/dashboard/shared';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  formatMarginPercentage,
  useMarginTrends,
  useMarginTrendsTimeSeries,
  useProfitBreakdown,
  useProfitabilityData,
} from '@/hooks/useProfitabilityData';
import { useProfitabilityDrillDown } from '@/hooks/useProfitabilityDrillDown';
import { DollarSign, Percent, PieChart, Target, TrendingDown, TrendingUp } from 'lucide-react';
import { useMemo } from 'react';

const formatBRL = (amount: number) =>
  `R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const Profitability = () => {
  const { data: profitabilityData, isLoading } = useProfitabilityData({ dateRange: {}, currency: 'BRL' });
  const profitBreakdown = useProfitBreakdown({ dateRange: {}, currency: 'BRL' });
  const marginTrends = useMarginTrends({ dateRange: {}, currency: 'BRL' });
  const { data: marginTrendsData } = useMarginTrendsTimeSeries({ dateRange: {}, currency: 'BRL' });
  const { drillDownData, handleWaterfallClick, handleMarginClick, clearDrillDown } =
    useProfitabilityDrillDown();

  // Check if there's any actual data - memoized to prevent recalculation on every render
  const hasData = useMemo(
    () =>
      profitBreakdown.revenue > 0 ||
      profitBreakdown.cogs > 0 ||
      profitBreakdown.operatingExpenses > 0,
    [profitBreakdown.revenue, profitBreakdown.cogs, profitBreakdown.operatingExpenses]
  );

  const trendNamesPt: Record<string, string> = {
    'Gross Margin': 'Margem Bruta',
    'Operating Margin': 'Margem Operacional',
    'Net Margin': 'Margem Líquida',
    'EBITDA Margin': 'Margem EBITDA'
  };

  if (isLoading) {
    return (
      <PremiumScope>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Análise de Rentabilidade
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Acompanhe suas margens de lucro e analise a rentabilidade do negócio
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 rounded-3xl" />
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-96 rounded-3xl" />
          <Skeleton className="h-96 rounded-3xl" />
        </div>
      </PremiumScope>
    );
  }

  if (!profitabilityData) return null;

  const getChangeType = (change: number): 'positive' | 'negative' | 'neutral' => {
    if (change > 0.5) return 'positive';
    if (change < -0.5) return 'negative';
    return 'neutral';
  };

  return (
    <PremiumScope>
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Análise de Rentabilidade
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Acompanhe suas margens de lucro e analise a rentabilidade do negócio
        </p>
      </header>

      {/* Key Metrics */}
      <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardStatCard
          label="Margem de Lucro Bruto"
          value={hasData ? formatMarginPercentage(profitabilityData.grossMargin) : '0.0%'}
          Icon={Percent}
        />
        <DashboardStatCard
          label="Margem de Lucro Líquido"
          value={hasData ? formatMarginPercentage(profitabilityData.netMargin) : '0.0%'}
          Icon={DollarSign}
        />
        <DashboardStatCard
          label="Lucro Operacional"
          value={hasData ? formatBRL(profitabilityData.operatingProfit) : `R$ 0,00`}
          hint={hasData ? getChangeType(profitabilityData.profitGrowth) === 'positive' ? 'Em alta' : getChangeType(profitabilityData.profitGrowth) === 'negative' ? 'Em queda' : 'Estável' : undefined}
          Icon={TrendingUp}
        />
      </section>

        {/* Charts Section */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Profit Waterfall Chart */}
          <ProfitWaterfallChart
            revenue={profitBreakdown.revenue}
            cogs={profitBreakdown.cogs}
            operatingExpenses={profitBreakdown.operatingExpenses}
            onBarClick={handleWaterfallClick}
            formatCurrency={formatBRL}
          />

          {/* Margin Trends Chart */}
          <MarginTrendsChart data={marginTrendsData} onPointClick={handleMarginClick} />
        </div>

        {/* Drill-down Data Table */}
        {drillDownData && (
          <ProfitabilityDataTable
            drillDownData={drillDownData}
            onClose={clearDrillDown}
            formatCurrency={formatBRL}
          />
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {/* Enhanced Profit Breakdown */}
          <Card className="rounded-3xl border-border/60 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <PieChart className="w-5 h-5 text-primary" />
              <h3 className="text-lg">Detalhamento de Lucro</h3>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Receita</span>
                <span className="font-medium text-success-600">
                  {formatBRL(profitBreakdown.revenue)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Despesas Operacionais</span>
                <span className="font-medium text-error-600">
                  -{formatBRL(profitBreakdown.operatingExpenses)}
                </span>
              </div>
              <div className="flex justify-between items-center border-t pt-2">
                <span className="text-sm font-medium">Lucro Líquido</span>
                <span className="font-semibold text-primary-600">
                  {formatBRL(profitBreakdown.netProfit)}
                </span>
              </div>
              <div className="text-xs text-muted-foreground text-right">
                Margem: {formatMarginPercentage(profitabilityData.netMargin)}
              </div>
            </div>
          </Card>

          {/* Enhanced Margin Trends */}
          <Card className="rounded-3xl border-border/60 p-6 shadow-sm">
            <h3 className="text-lg mb-4">Desempenho Atual da Margem</h3>
            <div className="space-y-4">
              {marginTrends.map((trend, index) => {
                const IconComponent =
                  trend.icon === 'up'
                    ? TrendingUp
                    : trend.icon === 'down'
                      ? TrendingDown
                      : Target;
                const iconColor =
                  trend.changeType === 'positive'
                    ? 'text-success-600'
                    : trend.changeType === 'negative'
                      ? 'text-error-600'
                      : 'text-warning-600';

                return (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <IconComponent className={`w-4 h-4 ${iconColor}`} />
                      <span className="text-sm">{trendNamesPt[trend.name] || trend.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatMarginPercentage(trend.current)}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Performance Indicators */}
            <div className="mt-6 pt-4 border-t">
              <h4 className="text-sm mb-3">Status de Desempenho</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Saúde da Rentabilidade</span>
                  <span
                    className={`font-medium ${
                      profitabilityData.netMargin >= 15
                        ? 'text-success-600'
                        : profitabilityData.netMargin >= 8
                          ? 'text-warning-600'
                          : 'text-error-600'
                    }`}
                  >
                    {profitabilityData.netMargin >= 15
                      ? 'Excelente'
                      : profitabilityData.netMargin >= 8
                        ? 'Boa'
                        : 'Precisa de Melhorias'}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Trajetória de Crescimento</span>
                  <span
                    className={`font-medium ${profitabilityData.profitGrowth >= 5 ? 'text-success-600' : 'text-warning-600'}`}
                  >
                    {profitabilityData.profitGrowth >= 5 ? 'Crescimento Forte' : 'Estável'}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>
    </PremiumScope>
  );
};

export default Profitability;
