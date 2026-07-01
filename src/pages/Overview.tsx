import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  Building2,
  Clock,
  CreditCard,
  MoreHorizontal,
  Pencil,
  Plus,
  Receipt,
  ShoppingBag,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
  Zap,
} from 'lucide-react';

import { EntryDialog } from '@/components/EntryDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { usePeriodComparison, type TimePeriod } from '@/hooks/usePeriodComparison';
import { useRevenueExpensesPeriods } from '@/hooks/useRevenueExpensesPeriods';
import { useOverviewData, useRecentFlow, type RecentTransactionItem, type RecentFlowItem } from '@/hooks/useOverviewData';
import { periodKeyFor, useFinancialGoals } from '@/hooks/useFinancialGoals';
import { useWeeklyBreakdown } from '@/hooks/useWeeklyBreakdown';
import {
  DashboardStatCard,
  FlowChart,
  MiniStatCard,
  PremiumScope,
  StatusBadge,
  SummaryList,
  fmt0,
  fmt2,
  fmtDate,
} from '@/components/dashboard/shared';

/* --------------------------------- helpers -------------------------------- */

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
const periodAdj: Record<TimePeriod, string> = {
  month: 'mensal',
  quarter: 'trimestral',
  year: 'anual',
};

const txIcon: Record<string, typeof ShoppingBag> = {
  Recebimento: ShoppingBag,
  Marketing: CreditCard,
  Tecnologia: Zap,
  'Custo de Produtos': Building2,
};

/* --------------------------- internal components -------------------------- */

function FinancialGoals({
  period,
  target,
  achieved,
  onEdit,
}: {
  period: TimePeriod;
  target: number;
  achieved: number;
  onEdit: () => void;
}) {
  const hasGoal = target > 0;
  const progress = hasGoal ? Math.min(100, Math.round((achieved / target) * 100)) : 0;
  const restante = Math.max(0, target - achieved);
  return (
    <Card className="rounded-3xl border-border/60 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Target className="h-4 w-4" />
          </div>
          <CardTitle className="text-base font-semibold">Metas Financeiras</CardTitle>
        </div>
        <div className="flex items-center gap-2">
          {hasGoal && (
            <Badge variant="secondary" className="rounded-full font-medium">{progress}%</Badge>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 p-6 pt-2">
        {hasGoal ? (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Meta {periodAdj[period]}</p>
                <p className="mt-1 text-lg font-semibold tracking-tight">{fmt0(target)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Receita atingida</p>
                <p className="mt-1 text-lg font-semibold tracking-tight">{fmt0(achieved)}</p>
              </div>
            </div>
            <div>
              <Progress value={progress} className="h-2 bg-muted" />
              <p className="mt-3 text-xs text-muted-foreground">
                {restante > 0 ? (
                  <>Faltam <span className="font-medium text-foreground">{fmt0(restante)}</span> para atingir a meta de {periodLabel[period]}.</>
                ) : (
                  <>Meta de {periodLabel[period]} atingida. 🎉</>
                )}
              </p>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-start gap-3 py-2">
            <p className="text-sm text-muted-foreground">
              Você ainda não definiu uma meta {periodAdj[period]}. Defina um alvo de receita para acompanhar o progresso.
            </p>
            <Button size="sm" variant="outline" className="rounded-full" onClick={onEdit}>
              <Target className="mr-1.5 h-4 w-4" /> Definir meta
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RecentTransactions({ rows }: { rows: RecentTransactionItem[] }) {
  return (
    <Card className="rounded-3xl border-border/60 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-3">
        <div>
          <CardTitle className="text-base font-semibold">Últimas Movimentações</CardTitle>
          <CardDescription className="mt-1">Movimentações recentes do seu caixa.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="p-2 pb-4">
        {rows.length === 0 ? (
          <div className="flex items-center justify-center py-10">
            <Badge variant="secondary">Sem dados disponíveis</Badge>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/60 hover:bg-transparent">
                  <TableHead className="pl-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">Categoria</TableHead>
                  <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Descrição</TableHead>
                  <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Valor</TableHead>
                  <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</TableHead>
                  <TableHead className="pr-4 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((t) => {
                  const Icon = txIcon[t.category] ?? (t.positive ? ShoppingBag : Receipt);
                  return (
                    <TableRow key={t.id} className="border-border/60">
                      <TableCell className="pl-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                            <Icon className="h-4 w-4" />
                          </div>
                          <span className="text-sm font-medium">{t.category}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{t.description}</TableCell>
                      <TableCell className={cn('text-sm font-semibold tabular-nums', t.positive ? 'text-primary' : 'text-foreground')}>
                        {t.positive ? '+ ' : '- '}{fmt2(t.amount)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge tone={t.statusTone}>{t.status}</StatusBadge>
                      </TableCell>
                      <TableCell className="pr-4 text-right text-sm text-muted-foreground">{fmtDate(t.date)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RecentActivity({ items }: { items: RecentFlowItem[] }) {
  return (
    <Card className="rounded-3xl border-border/60 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
        <div>
          <CardTitle className="text-base font-semibold">Fluxo recente</CardTitle>
          <CardDescription className="mt-1">Resumo de despesas e receitas</CardDescription>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="p-6 pt-2">
        {items.length === 0 ? (
          <div className="flex items-center justify-center py-10">
            <Badge variant="secondary">Sem dados disponíveis</Badge>
          </div>
        ) : (
          <ol className="relative space-y-5 before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-px before:bg-border/70">
            {items.map((a) => {
              const isExpense = a.type === 'expense';
              const Icon = isExpense ? TrendingDown : TrendingUp;
              return (
                <li key={a.id} className="relative flex items-start gap-4">
                  <div className={cn('relative z-10 flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-background', isExpense ? 'text-red-600' : 'text-primary')}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex flex-1 items-center justify-between pt-1">
                    <div>
                      <p className="text-sm font-medium text-foreground">{isExpense ? 'Despesa' : 'Fatura emitida'}</p>
                      <p className="text-xs text-muted-foreground">{a.label}</p>
                    </div>
                    <div className="text-right">
                      <p className={cn('text-sm font-semibold tabular-nums', isExpense ? 'text-red-600' : 'text-primary')}>
                        {isExpense ? '- ' : '+ '}{fmt2(a.amount)}
                      </p>
                      <p className="text-xs text-muted-foreground">{fmtDate(a.date)}</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------ main export ------------------------------ */

export default function Overview() {
  const [period, setPeriod] = useState<TimePeriod>('month');
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [goalInput, setGoalInput] = useState('');

  const { data: pc } = usePeriodComparison(period);
  const { data: periods } = useRevenueExpensesPeriods();
  const { data: overview } = useOverviewData(period);
  const { getTarget, setGoal } = useFinancialGoals();
  const { data: recentFlow } = useRecentFlow();
  const { data: weeklyData } = useWeeklyBreakdown();

  const currentPeriodKey = periodKeyFor(period);

  const revenue = pc?.current.revenue ?? 0;
  const expenses = pc?.current.expenses ?? 0;
  const profit = pc?.current.profit ?? 0;
  const growth = pc?.growth ?? { revenue: 0, expenses: 0, profit: 0, cashFlow: 0 };

  const stats = [
    { label: 'Receita Total', value: fmt0(revenue), change: growth.revenue, positive: growth.revenue >= 0, Icon: Wallet },
    { label: 'Despesas Totais', value: fmt0(expenses), change: growth.expenses, positive: false, Icon: Receipt },
    { label: 'Saldo Líquido', value: fmt0(profit), change: growth.profit, positive: growth.profit >= 0, Icon: TrendingUp },
    {
      label: 'Pagamentos em Aberto',
      value: String(overview?.openReceivables.count ?? 0),
      hint: `${fmt0(overview?.openReceivables.total ?? 0)} a receber`,
      Icon: Clock,
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

  const summaryItems = [
    { label: 'Maior receita', value: fmt0(overview?.summary.maiorReceita ?? 0), Icon: TrendingUp },
    { label: 'Maior despesa', value: fmt0(overview?.summary.maiorDespesa ?? 0), Icon: TrendingDown },
    { label: 'Ticket médio', value: fmt0(overview?.summary.ticketMedio ?? 0), Icon: Receipt },
    { label: 'Lançamentos', value: (overview?.summary.lancamentos ?? 0).toLocaleString('pt-BR'), Icon: Activity },
  ];

  const navigate = useNavigate();
  const target = getTarget(period, currentPeriodKey);

  const openGoalDialog = () => {
    setGoalInput(target > 0 ? String(target) : '');
    setGoalDialogOpen(true);
  };
  const saveGoal = () => {
    const amount = parseFloat(goalInput);
    if (!isNaN(amount) && amount > 0) {
      setGoal.mutate(
        { period, periodKey: currentPeriodKey, amount },
        { onSuccess: () => setGoalDialogOpen(false) },
      );
    }
  };

  return (
    <PremiumScope>
      {/* Header */}
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Dashboard</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Acompanhe a saúde financeira do seu negócio.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Tabs value={period} onValueChange={(v) => setPeriod(v as TimePeriod)}>
            <TabsList className="rounded-full bg-muted p-1">
              <TabsTrigger value="month" className="rounded-full px-4 text-sm">Mês</TabsTrigger>
              <TabsTrigger value="quarter" className="rounded-full px-4 text-sm">Trimestre</TabsTrigger>
              <TabsTrigger value="year" className="rounded-full px-4 text-sm">Ano</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button className="rounded-full bg-primary px-5 shadow-sm hover:bg-primary/90" onClick={() => setEntryDialogOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Novo Lançamento
          </Button>
        </div>
      </header>

      {/* Row 1 */}
      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <DashboardStatCard key={s.label} {...s} />
        ))}
      </section>

      {/* Row 2 */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-10">
        <div className="lg:col-span-7">
          <FlowChart
            title="Receita vs Despesas"
            description={chartDescription}
            period={period}
            onPeriodChange={setPeriod}
            data={chartData}
            weeklyData={weeklyData ?? []}
          />
        </div>
        <div className="flex flex-col gap-5 lg:col-span-3">
          <FinancialGoals period={period} target={target} achieved={revenue} onEdit={openGoalDialog} />
          <SummaryList title="Resumo Financeiro" items={summaryItems} />
        </div>
      </section>

      {/* Row 3 */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-10">
        <div className="lg:col-span-7">
          <RecentActivity items={recentFlow ?? []} />
        </div>
        <div className="lg:col-span-3">
          <RecentTransactions rows={overview?.recentTransactions ?? []} />
        </div>
      </section>

      {/* Row 4 */}
      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <MiniStatCard
          label="Clientes ativos"
          value={(overview?.customers.total ?? 0).toLocaleString('pt-BR')}
          change={overview?.customers.growth}
          Icon={Users}
          onClick={() => navigate('/customers')}
        />
        <MiniStatCard
          label="Contas a pagar em aberto"
          value={String(overview?.openPayables.count ?? 0)}
          hint={`${fmt0(overview?.openPayables.total ?? 0)} a pagar`}
          Icon={CreditCard}
          onClick={() => navigate('/payables')}
        />
      </section>

      <EntryDialog open={entryDialogOpen} onOpenChange={setEntryDialogOpen} />

      {/* Diálogo de meta financeira */}
      <Dialog open={goalDialogOpen} onOpenChange={setGoalDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Meta {periodAdj[period]}</DialogTitle>
            <DialogDescription>
              Defina o alvo de receita para {periodLabel[period]}. O progresso é calculado sobre a receita realizada no período.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Meta de receita (R$)</label>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="0,00"
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveGoal();
              }}
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setGoalDialogOpen(false)} disabled={setGoal.isPending}>
              Cancelar
            </Button>
            <Button onClick={saveGoal} disabled={setGoal.isPending}>
              {setGoal.isPending ? 'Salvando...' : 'Salvar meta'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PremiumScope>
  );
}
