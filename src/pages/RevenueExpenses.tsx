import type { ARInvoice } from '@/components/ARTable';
import { BudgetDialog } from '@/components/BudgetDialog';
import { DonutChart } from '@/components/DonutChart';
import { ExpenseDialog } from '@/components/ExpenseDialog';
import { ExpenseDrillDownTable } from '@/components/ExpenseDrillDownTable';
import { InvoiceDialog } from '@/components/InvoiceDialog';
import { OpenInvoicesCard } from '@/components/OpenInvoicesCard';
import { PaymentDialog } from '@/components/PaymentDialog';
import {
  DashboardStatCard,
  FlowChart,
  HorizontalBarList,
  MiniStatCard,
  PremiumScope,
  SectionPanel,
  SummaryList,
  fmt0,
} from '@/components/dashboard/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useExpenseDrillDown } from '@/hooks/useExpenseDrillDown';
import { useExpenseCategories, useFinancialMetrics } from '@/hooks/useFinancialData';
import { useOverviewData } from '@/hooks/useOverviewData';
import { usePeriodComparison, type TimePeriod } from '@/hooks/usePeriodComparison';
import { useARData, useARDetailedData } from '@/hooks/useReceivablesData';
import { useRevenueExpensesPeriods } from '@/hooks/useRevenueExpensesPeriods';
import { useWeeklyBreakdown } from '@/hooks/useWeeklyBreakdown';
import {
  AlertTriangle,
  Building,
  Clock,
  FileText,
  Plus,
  Receipt,
  Repeat,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

const formatBRL = (amount: number) =>
  `R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const periodLabel: Record<TimePeriod, string> = {
  month: 'este mês',
  quarter: 'este trimestre',
  year: 'este ano',
};
const chartDescription: Record<TimePeriod, string> = {
  month: 'Receita e despesa por semana',
  quarter: 'Comparativo mês a mês do trimestre',
  year: 'Evolução ao longo do ano',
};

const CATEGORY_COLORS = [
  '#059669',
  '#0891B2',
  '#7C3AED',
  '#DC2626',
  '#D97706',
  '#0EA5E9',
  '#65A30D',
  '#DB2777',
];

function InsightsCard({
  insights,
}: {
  insights: { Icon: React.ComponentType<{ className?: string }>; text: string }[];
}) {
  return (
    <Card className="rounded-3xl border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card shadow-sm">
      <CardHeader className="flex flex-row items-center gap-3 space-y-0 p-6 pb-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <CardTitle className="text-base font-semibold">Insights</CardTitle>
          <p className="text-xs text-muted-foreground">
            Leitura automática dos seus dados financeiros
          </p>
        </div>
      </CardHeader>
      <CardContent className="p-6 pt-0">
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {insights.map((insight, i) => (
            <li key={i} className="flex items-start gap-3 rounded-2xl bg-background/60 p-3">
              <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <insight.Icon className="h-3.5 w-3.5" />
              </div>
              <p className="text-sm text-foreground">{insight.text}</p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

const RevenueExpenses = () => {
  const [period, setPeriod] = useState<TimePeriod>('month');

  // Diálogos
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<ARInvoice | null>(null);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);

  // Dados
  const { data: metrics } = useFinancialMetrics();
  const { data: pc } = usePeriodComparison(period);
  const { data: overview } = useOverviewData(period);
  const { data: periods } = useRevenueExpensesPeriods();
  const { data: weeklyData } = useWeeklyBreakdown();
  const { data: openInvoicesResult } = useARDetailedData({}, 'due_date_asc', 1, 5);
  const { data: arData } = useARData();
  const { data: expenseCategories } = useExpenseCategories();
  const {
    drillDownData,
    isLoading: drillDownLoading,
    openCategoryDrillDown,
    clearDrillDown,
  } = useExpenseDrillDown({});

  const getMetric = (type: string) => metrics?.find((m: any) => m.metric_type === type);
  const mrr = getMetric('mrr');
  const arr = getMetric('arr');

  const revenue = pc?.current.revenue ?? 0;
  const expenses = pc?.current.expenses ?? 0;
  const profit = pc?.current.profit ?? 0;
  const growth = pc?.growth ?? { revenue: 0, expenses: 0, profit: 0, cashFlow: 0 };
  const netCashPosition =
    (overview?.openReceivables.total ?? 0) - (overview?.openPayables.total ?? 0);

  const overdueCount =
    arData?.buckets
      .filter((b) => b.bucket !== 'Current (0-30 days)')
      .reduce((s, b) => s + b.count, 0) ?? 0;

  const primaryStats = [
    {
      label: 'Receita Total',
      value: fmt0(revenue),
      change: growth.revenue,
      positive: growth.revenue >= 0,
      Icon: Wallet,
    },
    {
      label: 'Despesas Totais',
      value: fmt0(expenses),
      change: growth.expenses,
      positive: growth.expenses <= 0,
      Icon: Receipt,
    },
    {
      label: 'Saldo Atual',
      value: fmt0(profit),
      change: growth.profit,
      positive: growth.profit >= 0,
      Icon: TrendingUp,
    },
    {
      label: 'A Receber − A Pagar',
      value: fmt0(netCashPosition),
      hint: 'faturas em aberto agora',
      Icon: Wallet,
    },
  ];

  // Mês corrente em yyyy-MM — usado só pra não desenhar uma "queda pra zero"
  // nos meses futuros do ano (eles ainda não têm lançamento nenhum).
  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const chartData = (periods?.[period] ?? []).map((p) => {
    const isFutureMonth = period === 'year' && p.dateKey > currentMonthKey;
    return {
      label: p.period,
      receita: isFutureMonth ? null : p.revenue,
      despesa: isFutureMonth ? null : p.expenses,
    };
  });

  const flowIndicators = [
    { label: 'Maior receita', value: fmt0(overview?.summary.maiorReceita ?? 0), Icon: TrendingUp },
    { label: 'Ticket médio', value: fmt0(overview?.summary.ticketMedio ?? 0), Icon: Receipt },
    {
      label: `Crescimento (${periodLabel[period]})`,
      value: `${growth.revenue >= 0 ? '+' : ''}${growth.revenue.toFixed(1)}%`,
      Icon: TrendingUp,
    },
    {
      label: 'Lançamentos',
      value: (overview?.summary.lancamentos ?? 0).toLocaleString('pt-BR'),
      Icon: Building,
    },
  ];

  const revenueSummary = [
    { label: 'MRR', value: fmt0(mrr?.amount ?? 0), Icon: Repeat },
    { label: 'ARR', value: fmt0(arr?.amount ?? 0), Icon: TrendingUp },
    { label: 'Ticket médio', value: fmt0(overview?.summary.ticketMedio ?? 0), Icon: Receipt },
  ];

  const totalExpenses = expenseCategories?.reduce((sum, exp) => sum + exp.amount, 0) || 0;
  const operatingExpenses =
    expenseCategories
      ?.filter((exp) => exp.category !== 'cogs')
      .reduce((sum, exp) => sum + exp.amount, 0) || 0;
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const avgDailySpend = totalExpenses / daysInMonth;

  const expenseSummary = [
    { label: 'Despesas Operacionais', value: fmt0(operatingExpenses), Icon: Building },
    { label: 'Gasto Médio Diário', value: fmt0(avgDailySpend), Icon: TrendingDown },
    {
      label: 'Maior despesa',
      value: fmt0(overview?.summary.maiorDespesa ?? 0),
      Icon: AlertTriangle,
    },
  ];

  const donutData =
    expenseCategories?.map((expense, index) => ({
      name: expense.name,
      value: expense.amount,
      color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
    })) || [];

  const distributionItems = (expenseCategories ?? [])
    .slice()
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6)
    .map((exp, i) => ({
      label: exp.name,
      value: exp.amount,
      percentage: exp.percentage ?? 0,
      color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
    }));

  const topCategory = expenseCategories?.length
    ? [...expenseCategories].sort((a, b) => b.amount - a.amount)[0]
    : null;
  const topCategoryShare =
    topCategory && totalExpenses > 0 ? (topCategory.amount / totalExpenses) * 100 : 0;

  const insights = [
    {
      Icon: growth.revenue >= 0 ? TrendingUp : TrendingDown,
      text: `Receita ${growth.revenue >= 0 ? 'aumentou' : 'caiu'} ${Math.abs(growth.revenue).toFixed(0)}% ${periodLabel[period]}.`,
    },
    topCategory && {
      Icon: Building,
      text: `${topCategory.name} representa ${topCategoryShare.toFixed(0)}% das despesas.`,
    },
    {
      Icon: AlertTriangle,
      text:
        overdueCount > 0
          ? `Existem ${overdueCount} conta${overdueCount === 1 ? '' : 's'} atrasada${overdueCount === 1 ? '' : 's'}.`
          : 'Nenhuma conta atrasada no momento.',
    },
    {
      Icon: FileText,
      text: `${openInvoicesResult?.total ?? 0} fatura${(openInvoicesResult?.total ?? 0) === 1 ? '' : 's'} em aberto, totalizando ${fmt0(overview?.openReceivables.total ?? 0)}.`,
    },
  ].filter(Boolean) as { Icon: React.ComponentType<{ className?: string }>; text: string }[];

  return (
    <PremiumScope>
      {/* Header */}
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Receitas &amp; Despesas
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Acompanhe entradas e saídas do seu caixa em um só lugar.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Tabs value={period} onValueChange={(v) => setPeriod(v as TimePeriod)}>
            <TabsList className="rounded-full bg-muted p-1">
              <TabsTrigger value="month" className="rounded-full px-4 text-sm">
                Mês
              </TabsTrigger>
              <TabsTrigger value="quarter" className="rounded-full px-4 text-sm">
                Trimestre
              </TabsTrigger>
              <TabsTrigger value="year" className="rounded-full px-4 text-sm">
                Ano
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button
            variant="outline"
            className="rounded-full px-5"
            onClick={() => setExpenseDialogOpen(true)}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Nova Despesa
          </Button>
          <Button
            className="rounded-full bg-primary px-5 shadow-sm hover:bg-primary/90"
            onClick={() => setInvoiceDialogOpen(true)}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Nova Receita
          </Button>
        </div>
      </header>

      {/* Visão geral — o resumo que precisa "bater o olho" primeiro */}
      <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {primaryStats.map((s) => (
          <DashboardStatCard key={s.label} {...s} />
        ))}
      </section>

      {/* Fluxo Financeiro — tendência geral, logo abaixo do resumo */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-10">
        <div className="lg:col-span-8">
          <FlowChart
            title="Fluxo Financeiro"
            description={chartDescription}
            period={period}
            onPeriodChange={setPeriod}
            data={chartData}
            weeklyData={weeklyData ?? []}
          />
        </div>
        <div className="lg:col-span-2 space-y-3">
          <SummaryList title="Indicadores" items={flowIndicators} />
          <Link
            to="/profitability"
            className="inline-flex items-center gap-1 px-1 text-xs font-medium text-primary hover:underline"
          >
            Ver fluxo de caixa detalhado (runway, queima mensal) →
          </Link>
        </div>
      </section>

      {/* Receitas x Despesas — separados por cor para leitura rápida */}
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SectionPanel
          tone="revenue"
          Icon={TrendingUp}
          title="Receitas"
          subtitle="Entradas, recorrência e faturas a receber"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <MiniStatCard
              label="MRR"
              value={fmt0(mrr?.amount ?? 0)}
              hint="Recorrência mensal"
              Icon={Repeat}
            />
            <MiniStatCard
              label="ARR"
              value={fmt0(arr?.amount ?? 0)}
              hint="Recorrência anual"
              Icon={TrendingUp}
            />
            <MiniStatCard
              label="Faturas em aberto"
              value={String(openInvoicesResult?.total ?? 0)}
              hint={`${fmt0(overview?.openReceivables.total ?? 0)} a receber`}
              Icon={FileText}
            />
            <MiniStatCard
              label="Contas atrasadas"
              value={String(overdueCount)}
              hint={overdueCount > 0 ? 'Requer atenção' : 'Tudo em dia'}
              Icon={Clock}
            />
          </div>
          <SummaryList title="Resumo" items={revenueSummary} />
          <OpenInvoicesCard
            invoices={openInvoicesResult?.data || []}
            totalCount={openInvoicesResult?.total || 0}
            formatCurrency={formatBRL}
            onReceivePayment={(invoice) => {
              setSelectedInvoice(invoice);
              setPaymentDialogOpen(true);
            }}
          />
          <Link
            to="/receivables"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Ver todas as faturas em aberto →
          </Link>
        </SectionPanel>

        <SectionPanel
          tone="expense"
          Icon={Receipt}
          title="Despesas"
          subtitle="Categorias, orçamento e distribuição de gastos"
          action={
            <Button
              variant="outline"
              size="sm"
              className="rounded-full bg-background"
              onClick={() => setBudgetDialogOpen(true)}
            >
              Definir Orçamento
            </Button>
          }
        >
          <Card className="rounded-3xl border-border/60 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between p-6 pb-3">
              <CardTitle className="text-base font-semibold">Orçamento vs Realizado</CardTitle>
              <Link
                to="/profitability"
                className="text-xs font-medium text-primary hover:underline"
              >
                Ver rentabilidade completa →
              </Link>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              {(expenseCategories &&
                expenseCategories.reduce((s, e) => s + (e.budget_amount || 0), 0) > 0) ||
              totalExpenses > 0 ? (
                (() => {
                  const totalBudget =
                    expenseCategories?.reduce((sum, exp) => sum + (exp.budget_amount || 0), 0) ||
                    0;
                  return (
                    <div className="space-y-4">
                      <div>
                        <div className="mb-2 flex items-center justify-between text-sm">
                          <span className="font-medium">Orçado</span>
                          <span>{formatBRL(totalBudget)}</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: totalBudget > 0 ? '100%' : '0%' }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="mb-2 flex items-center justify-between text-sm">
                          <span className="font-medium">Realizado</span>
                          <span>{formatBRL(totalExpenses)}</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted">
                          <div
                            className={`h-full rounded-full ${totalBudget > 0 ? (totalExpenses > totalBudget ? 'bg-destructive' : 'bg-primary') : 'bg-muted'}`}
                            style={{
                              width:
                                totalBudget > 0
                                  ? `${Math.min((totalExpenses / totalBudget) * 100, 100)}%`
                                  : '0%',
                            }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between border-t border-border pt-4 text-sm">
                        <span className="font-medium">Variação</span>
                        <span
                          className={`font-semibold ${totalBudget > 0 ? (totalExpenses > totalBudget ? 'text-destructive' : 'text-primary') : 'text-muted-foreground'}`}
                        >
                          {totalBudget > 0 && (totalExpenses > totalBudget ? '+' : '-')}
                          {formatBRL(Math.abs(totalBudget - totalExpenses))} (
                          {totalBudget > 0
                            ? (((totalExpenses - totalBudget) / totalBudget) * 100).toFixed(1) +
                              '%'
                            : 'N/A'}
                          )
                        </span>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="flex items-center justify-center py-8">
                  <Badge variant="secondary">Sem dados disponíveis</Badge>
                </div>
              )}
            </CardContent>
          </Card>

          <DonutChart
            data={donutData}
            title="Categorias"
            centerValue={formatBRL(totalExpenses)}
            centerLabel="Despesas Totais"
            onSliceClick={(entry) => openCategoryDrillDown(entry.name)}
          />
          <HorizontalBarList
            title="Distribuição das Despesas"
            items={distributionItems}
            formatValue={formatBRL}
          />
          <SummaryList title="Resumo" items={expenseSummary} />
          <Link
            to="/receivables"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Ver contas a pagar (fornecedores) →
          </Link>
        </SectionPanel>
      </section>

      {drillDownData && (
        <ExpenseDrillDownTable
          drillDownData={drillDownData}
          onClose={clearDrillDown}
          isLoading={drillDownLoading}
          formatCurrency={formatBRL}
        />
      )}

      {/* Insights */}
      <InsightsCard insights={insights} />

      <InvoiceDialog open={invoiceDialogOpen} onOpenChange={setInvoiceDialogOpen} />
      <PaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        invoice={selectedInvoice}
      />
      <ExpenseDialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen} />
      <BudgetDialog open={budgetDialogOpen} onOpenChange={setBudgetDialogOpen} />
    </PremiumScope>
  );
};

export default RevenueExpenses;
