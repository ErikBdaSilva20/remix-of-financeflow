import { CashFlowDataTable } from '@/components/CashFlowDataTable';
import { MetricCard } from '@/components/MetricCard';
import { Card } from '@/components/ui/card';
import { useCashFlowDrillDown } from '@/hooks/useCashFlowDrillDown';
import { listBankTransactions } from '@/lib/data/bank_transactions.repo';
import { useQuery } from '@tanstack/react-query';
import { parseISO } from 'date-fns';
import { Banknote, ChevronLeft, ChevronRight, DollarSign, Plus, TrendingDown, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { TransactionDialog } from '@/components/TransactionDialog';

const formatBRL = (amount: number) =>
  `R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const MONTH_LABELS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
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

const CashFlow = () => {
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [year, setYear] = useState(actualCurrentYear);
  // Padrão: foca só no mês atual (com o anterior pra comparação). O ano
  // completo é carregado/renderizado só quando o usuário pede ("sob demanda").
  const [showFullYear, setShowFullYear] = useState(false);
  const { drillDownData, handlePeriodClick, clearDrillDown } = useCashFlowDrillDown();

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
      const allTxns = await listBankTransactions();

      // Saldo/fluxo "vida toda" — independe do ano selecionado no comparativo mensal
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

      return { totals, months, prevDecNet, prevDecHasData };
    },
  });

  const months = cashflowData?.months ?? [];
  const monthsWithData = months.filter((m) => m.hasData);

  const netCashFlow = (cashflowData?.totals.inflow || 0) - (cashflowData?.totals.outflow || 0);

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

  const cashBalance = netCashFlow;
  const freeCashFlow = netCashFlow;
  const hasData = (cashflowData?.totals.inflow || 0) > 0 || (cashflowData?.totals.outflow || 0) > 0;
  const runwayMonths = monthlyBurnRate > 0 && cashBalance > 0 ? cashBalance / monthlyBurnRate : 0;

  const buildMonthCard = (i: number) => {
    const m = months[i];
    const prev = i > 0
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
      onClick: m.hasData ? () => handlePeriodClick(`${MONTH_LABELS[i]}/${year}`, m.dateKey) : undefined,
      icon: m.hasData && m.net < 0 ? <TrendingDown className="w-5 h-5" /> : <TrendingUp className="w-5 h-5" />,
    };
  };

  // Visão focada (padrão): mês atual + mês anterior, sem precisar montar/exibir o ano inteiro
  const focusedCards = (() => {
    if (year !== actualCurrentYear) return [];
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
          icon: cashflowData.prevDecNet < 0 ? <TrendingDown className="w-5 h-5" /> : <TrendingUp className="w-5 h-5" />,
        },
        current,
      ];
    }
    return [current];
  })();

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl tracking-tight text-foreground">Gestão de Fluxo de Caixa</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Monitore entradas e saídas de caixa para manter liquidez saudável
          </p>
        </div>
        <Button onClick={() => setTransactionDialogOpen(true)} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 sm:mr-2" />
          <span className="hidden sm:inline">Nova Transação</span>
        </Button>
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

      {/* Cash Flow Summary */}
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

      {/* Monthly comparison */}
      <Card className="p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h3 className="text-base md:text-lg">
            {showFullYear ? `Comparativo Mensal — ${year}` : 'Comparativo Mensal — Mês Atual'}
          </h3>
          <div className="flex items-center gap-2">
            {showFullYear && (
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" onClick={() => setYear((y) => y - 1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => setYear((y) => y + 1)}>
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

      {/* Drill-down table */}
      {drillDownData && (
        <CashFlowDataTable
          drillDownData={drillDownData}
          onClose={clearDrillDown}
          formatCurrency={formatBRL}
        />
      )}

      <TransactionDialog
        open={transactionDialogOpen}
        onOpenChange={setTransactionDialogOpen}
      />
    </div>
  );
};

export default CashFlow;
