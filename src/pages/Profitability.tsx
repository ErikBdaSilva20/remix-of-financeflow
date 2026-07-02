import { CashFlowDataTable } from '@/components/CashFlowDataTable';
import { MarginTrendsChart } from '@/components/MarginTrendsChart';
import { MetricCard } from '@/components/MetricCard';
import { ProfitWaterfallChart } from '@/components/ProfitWaterfallChart';
import { ProfitabilityDataTable } from '@/components/ProfitabilityDataTable';
import { DashboardStatCard, MiniStatCard, PremiumScope } from '@/components/dashboard/shared';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useCashFlowDrillDown } from '@/hooks/useCashFlowDrillDown';
import {
  formatMarginPercentage,
  useMarginTrends,
  useMarginTrendsTimeSeries,
  useProfitBreakdown,
  useProfitabilityData,
} from '@/hooks/useProfitabilityData';
import { useProfitabilityDrillDown } from '@/hooks/useProfitabilityDrillDown';
import { listTransactions } from '@/lib/data/transactions.repo';
import { formatCurrency as formatBRL } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { parseISO } from 'date-fns';
import {
  Banknote,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Percent,
  PieChart,
  Target,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { useMemo, useState } from 'react';

const MONTH_LABELS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

interface MonthBucket {
  dateKey: string; // yyyy-MM
  inflow: number;
  outflow: number;
  net: number;
  hasData: boolean;
}

const growthPct = (current: number, previous: number) => {
  if (previous === 0) return current > 0 ? 100 : current < 0 ? -100 : 0;
  return ((current - previous) / Math.abs(previous)) * 100;
};

const actualCurrentYear = new Date().getFullYear();
const actualCurrentMonthIndex = new Date().getMonth();

const Profitability = () => {
  // ---- Rentabilidade ----
  const { data: profitabilityData, isLoading } = useProfitabilityData({ dateRange: {} });
  const profitBreakdown = useProfitBreakdown({ dateRange: {} });
  const marginTrends = useMarginTrends({ dateRange: {} });
  const { data: marginTrendsData } = useMarginTrendsTimeSeries({ dateRange: {} });
  const { drillDownData, handleWaterfallClick, handleMarginClick, clearDrillDown } =
    useProfitabilityDrillDown();

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
  };

  // ---- Fluxo de Caixa ----
  const [year, setYear] = useState(actualCurrentYear);
  // Padrão: foca só no mês atual (com o anterior pra comparação). O ano
  // completo é carregado/renderizado só quando o usuário pede ("sob demanda").
  const [showFullYear, setShowFullYear] = useState(false);
  const {
    drillDownData: cashFlowDrillDownData,
    handlePeriodClick,
    clearDrillDown: clearCashFlowDrillDown,
  } = useCashFlowDrillDown();

  const toggleFullYear = () => {
    setShowFullYear((prev) => {
      const next = !prev;
      if (!next) setYear(actualCurrentYear);
      return next;
    });
  };

  const { data: cashflowData } = useQuery({
    queryKey: ['cashflow-data', year],
    queryFn: async () => {
      const transactions = await listTransactions();

      // Caixa real: pagamentos recebidos (entrada) e despesas (saída)
      const allTxns = [
        ...transactions
          .filter((t) => t.type === 'income')
          .map((p) => ({ date: p.date, amount: Math.abs(Number(p.amount || 0)) })),
        ...transactions
          .filter((t) => t.type === 'expense')
          .map((e) => ({ date: e.date, amount: -Math.abs(Number(e.amount || 0)) })),
      ];

      // Saldo real "hoje" — soma de tudo, não muda com o ano navegado no
      // comparativo (é o saldo de caixa atual, ponto).
      const totals = allTxns.reduce(
        (acc, row) => {
          const amt = Number(row.amount || 0);
          return {
            inflow: acc.inflow + (amt > 0 ? amt : 0),
            outflow: acc.outflow + (amt < 0 ? Math.abs(amt) : 0),
          };
        },
        { inflow: 0, outflow: 0 }
      );

      // Saldo acumulado até o fim do ano selecionado — histórico, muda
      // conforme o usuário navega entre anos no comparativo.
      const yearEndCutoff = `${year}-12-31`;
      const balanceAtYearEnd = allTxns
        .filter((row) => row.date <= yearEndCutoff)
        .reduce((sum, row) => sum + Number(row.amount || 0), 0);

      // Primeiro ano com transação registrada — usado para não deixar
      // navegar pra trás infinitamente no comparativo mensal.
      const earliestYear = allTxns.reduce(
        (min, row) => {
          const y = parseISO(row.date).getFullYear();
          return min === null || y < min ? y : min;
        },
        null as number | null
      );

      // Comparativo mês a mês: 12 baldes fixos (Jan-Dez) do ano selecionado
      const months: MonthBucket[] = Array.from({ length: 12 }, (_, i) => ({
        dateKey: `${year}-${String(i + 1).padStart(2, '0')}`,
        inflow: 0,
        outflow: 0,
        net: 0,
        hasData: false,
      }));

      // Dezembro do ano anterior — só pra dar base de comparação ao card de Janeiro
      let prevDecNet = 0;
      let prevDecHasData = false;

      allTxns.forEach((row) => {
        const d = parseISO(row.date);
        const amt = Number(row.amount || 0);
        if (d.getFullYear() === year) {
          const bucket = months[d.getMonth()];
          bucket.inflow += amt > 0 ? amt : 0;
          bucket.outflow += amt < 0 ? Math.abs(amt) : 0;
          bucket.net += amt;
          bucket.hasData = true;
        } else if (d.getFullYear() === year - 1 && d.getMonth() === 11) {
          prevDecNet += amt;
          prevDecHasData = true;
        }
      });

      return { totals, balanceAtYearEnd, earliestYear, months, prevDecNet, prevDecHasData };
    },
  });

  const months = cashflowData?.months ?? [];
  const monthsWithData = months.filter((m) => m.hasData);

  // Fluxo do ano selecionado — este É afetado pela navegação de ano do
  // comparativo mensal (soma só os meses daquele ano).
  const yearNetCashFlow = months.reduce((sum, m) => sum + m.net, 0);

  // Saldo de caixa atual (hoje) — não muda com o ano navegado, é o saldo real.
  const currentCashBalance =
    (cashflowData?.totals.inflow || 0) - (cashflowData?.totals.outflow || 0);

  // Saldo acumulado até o fim do ano navegado — muda com a navegação.
  const balanceAtYearEnd = cashflowData?.balanceAtYearEnd ?? 0;

  const earliestYear = cashflowData?.earliestYear ?? actualCurrentYear;
  const canGoToPreviousYear = year > earliestYear;
  const canGoToNextYear = year < actualCurrentYear;

  // Por padrão a queima mensal é simplesmente a saída do mês atual (sem
  // precisar de média entre vários meses). Só recai pra média quando o
  // usuário está navegando por um ano diferente do atual.
  const currentMonthBucket =
    year === actualCurrentYear ? months[actualCurrentMonthIndex] : undefined;
  const monthlyBurnRate = currentMonthBucket?.hasData
    ? currentMonthBucket.outflow
    : monthsWithData.length > 0
      ? monthsWithData.reduce((sum, m) => sum + m.outflow, 0) / monthsWithData.length
      : 0;

  const buildMonthCard = (i: number) => {
    const m = months[i];
    const prev =
      i > 0
        ? months[i - 1]
        : cashflowData?.prevDecHasData
          ? { net: cashflowData.prevDecNet, hasData: true }
          : null;
    const change = m.hasData && prev?.hasData ? growthPct(m.net, prev.net) : undefined;

    return {
      dateKey: m.dateKey,
      title: MONTH_LABELS[i],
      value: m.hasData ? formatBRL(m.net) : 'Sem dados',
      change: change !== undefined ? `${change >= 0 ? '+' : ''}${change.toFixed(1)}%` : undefined,
      hasData: m.hasData,
      onClick: m.hasData
        ? () => handlePeriodClick(`${MONTH_LABELS[i]}/${year}`, m.dateKey)
        : undefined,
      icon:
        m.hasData && m.net < 0 ? (
          <TrendingDown className="w-5 h-5" />
        ) : (
          <TrendingUp className="w-5 h-5" />
        ),
    };
  };

  // Visão focada (padrão): mês atual + mês anterior, sem precisar montar/exibir o ano inteiro
  const focusedCards = (() => {
    if (year !== actualCurrentYear) return [];
    if (months.length === 0) return []; // query ainda não resolveu
    const current = buildMonthCard(actualCurrentMonthIndex);
    if (actualCurrentMonthIndex > 0) {
      return [buildMonthCard(actualCurrentMonthIndex - 1), current];
    }
    if (cashflowData?.prevDecHasData) {
      const prevYear = actualCurrentYear - 1;
      return [
        {
          dateKey: `${prevYear}-12`,
          title: `Dezembro/${prevYear}`,
          value: formatBRL(cashflowData.prevDecNet),
          change: undefined,
          hasData: true,
          onClick: () => handlePeriodClick(`Dezembro/${prevYear}`, `${prevYear}-12`),
          icon:
            cashflowData.prevDecNet < 0 ? (
              <TrendingDown className="w-5 h-5" />
            ) : (
              <TrendingUp className="w-5 h-5" />
            ),
        },
        current,
      ];
    }
    return [current];
  })();

  if (isLoading) {
    return (
      <PremiumScope>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Rentabilidade &amp; Fluxo de Caixa
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Margens, custos e liquidez do seu negócio em um só lugar
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
          Rentabilidade &amp; Fluxo de Caixa
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Margens, custos e liquidez do seu negócio em um só lugar
        </p>
      </header>

      {/* ============================= Rentabilidade ============================= */}
      <section className="space-y-6">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Rentabilidade</h2>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
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
            hint={
              hasData
                ? getChangeType(profitabilityData.profitGrowth) === 'positive'
                  ? 'Em alta'
                  : getChangeType(profitabilityData.profitGrowth) === 'negative'
                    ? 'Em queda'
                    : 'Estável'
                : undefined
            }
            Icon={TrendingUp}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <ProfitWaterfallChart
            revenue={profitBreakdown.revenue}
            cogs={profitBreakdown.cogs}
            operatingExpenses={profitBreakdown.operatingExpenses}
            onBarClick={handleWaterfallClick}
            formatCurrency={formatBRL}
          />
          <MarginTrendsChart data={marginTrendsData} onPointClick={handleMarginClick} />
        </div>

        {drillDownData && (
          <ProfitabilityDataTable
            drillDownData={drillDownData}
            onClose={clearDrillDown}
            formatCurrency={formatBRL}
          />
        )}

        <div className="grid gap-6 md:grid-cols-2">
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

          <Card className="rounded-3xl border-border/60 p-6 shadow-sm">
            <h3 className="text-lg mb-4">Desempenho Atual da Margem</h3>
            <div className="space-y-4">
              {marginTrends.map((trend, index) => {
                const IconComponent =
                  trend.icon === 'up' ? TrendingUp : trend.icon === 'down' ? TrendingDown : Target;
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
      </section>

      {/* ============================= Fluxo de Caixa ============================= */}
      <section className="space-y-6 border-t border-border/60 pt-8">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Fluxo de Caixa</h2>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <DashboardStatCard
            label={`Fluxo de Caixa — ${year}`}
            value={formatBRL(yearNetCashFlow)}
            hint="muda com o ano selecionado"
            Icon={TrendingUp}
          />
          <DashboardStatCard
            label={`Saldo Acumulado até ${year}`}
            value={formatBRL(balanceAtYearEnd)}
            hint="muda com o ano selecionado"
            Icon={DollarSign}
          />
          <DashboardStatCard
            label="Saldo Atual"
            value={formatBRL(currentCashBalance)}
            hint="hoje, não muda com o filtro"
            Icon={Banknote}
          />
          <DashboardStatCard
            label="Taxa de Queima Mensal"
            value={formatBRL(monthlyBurnRate)}
            Icon={TrendingDown}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <MiniStatCard
            label={`Entradas de Caixa — ${year}`}
            value={`+${formatBRL(months.reduce((sum, m) => sum + m.inflow, 0))}`}
            Icon={TrendingUp}
          />
          <MiniStatCard
            label={`Saídas de Caixa — ${year}`}
            value={`-${formatBRL(months.reduce((sum, m) => sum + m.outflow, 0))}`}
            Icon={TrendingDown}
          />
        </div>

        <Card className="rounded-3xl border-border/60 p-4 shadow-sm md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div className="flex flex-col gap-2">
              <h3 className="text-base md:text-lg">
                {showFullYear ? `Comparativo Mensal — ${year}` : 'Comparativo Mensal — Mês Atual'}
              </h3>
              <span className="text-xs text-muted-foreground">
                Os dados só podem ser navegados a partir da primeira transação registrada
              </span>
            </div>
            <div className="flex flex-col items-end gap-2 text-sm">
              {showFullYear && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={!canGoToPreviousYear}
                    onClick={() => setYear((y) => y - 1)}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={!canGoToNextYear}
                    onClick={() => setYear((y) => y + 1)}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
              <Button variant="ghost" size="sm" onClick={toggleFullYear}>
                {showFullYear ? 'Mostrar só o mês atual' : 'Ver ano completo'}
              </Button>
            </div>
          </div>

          {showFullYear ? (
            monthsWithData.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <span className="inline-flex items-center justify-center rounded-md bg-muted px-3 py-1 text-sm text-muted-foreground">
                  Sem dados em {year}
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                {months.map((m, i) => {
                  const card = buildMonthCard(i);
                  return (
                    <MetricCard
                      key={card.dateKey}
                      title={card.title}
                      value={card.value}
                      change={card.change}
                      hasData={card.hasData}
                      className={!m.hasData ? 'opacity-50' : undefined}
                      onClick={card.onClick}
                      icon={card.icon}
                    />
                  );
                })}
              </div>
            )
          ) : focusedCards.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <span className="inline-flex items-center justify-center rounded-md bg-muted px-3 py-1 text-sm text-muted-foreground">
                Carregando...
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              {focusedCards.map((card) => (
                <MetricCard
                  key={card.dateKey}
                  title={card.title}
                  value={card.value}
                  change={card.change}
                  hasData={card.hasData}
                  className={!card.hasData ? 'opacity-50' : undefined}
                  onClick={card.onClick}
                  icon={card.icon}
                />
              ))}
            </div>
          )}
        </Card>

        {cashFlowDrillDownData && (
          <CashFlowDataTable
            drillDownData={cashFlowDrillDownData}
            onClose={clearCashFlowDrillDown}
            formatCurrency={formatBRL}
          />
        )}
      </section>
    </PremiumScope>
  );
};

export default Profitability;
