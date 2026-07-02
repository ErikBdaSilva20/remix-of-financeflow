import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type { TimePeriod } from '@/hooks/usePeriodComparison';
import { WeeklyFlowChart } from '@/components/WeeklyFlowChart';
import type { WeekPoint } from '@/hooks/useWeeklyBreakdown';

/**
 * Primitivas visuais compartilhadas entre as telas do dashboard (Overview,
 * Receita & Despesas, etc). Puramente apresentacional — nenhuma delas busca
 * dados; toda a lógica de negócio continua nos hooks de cada página.
 */

export const fmt0 = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

export const fmt2 = (n: number) =>
  n.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const MONTHS_PT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
export const fmtDate = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split('-');
  if (!y || !m || !d) return iso;
  return `${d} ${MONTHS_PT[Number(m) - 1] ?? ''} ${y}`;
};

// Cores do gráfico — idênticas ao template (verde receita, cinza-azulado despesa).
export const CHART = {
  revStroke: 'oklch(0.68 0.17 155)',
  revFill: 'oklch(0.72 0.17 155)',
  expStroke: 'oklch(0.6 0.03 260)',
  expFill: 'oklch(0.55 0.03 260)',
};

export function DashboardStatCard({
  label,
  value,
  change,
  hint,
  positive,
  Icon,
}: {
  label: string;
  value: string;
  change?: number;
  hint?: string;
  positive?: boolean;
  Icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="group rounded-3xl border-border/60 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
            <Icon className="h-5 w-5" />
          </div>
          {change !== undefined ? (
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium',
                positive ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive',
              )}
            >
              {positive ? (
                <ArrowUpRight className="h-3.5 w-3.5" />
              ) : (
                <ArrowDownRight className="h-3.5 w-3.5" />
              )}
              {Math.abs(change).toFixed(1)}%
            </span>
          ) : hint ? (
            <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
              {hint}
            </span>
          ) : null}
        </div>
        <div className="mt-6">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function MiniStatCard({
  label,
  value,
  change,
  hint,
  Icon,
  onClick,
}: {
  label: string;
  value: string;
  change?: number;
  hint?: string;
  Icon: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
}) {
  const positive = (change ?? 0) >= 0;
  return (
    <Card
      className={cn(
        'rounded-3xl border-border/60 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md',
        onClick && 'cursor-pointer',
      )}
      onClick={onClick}
    >
      <CardContent className="flex items-center justify-between p-6">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1.5 text-2xl font-semibold tracking-tight">{value}</p>
          {change !== undefined ? (
            <div className={cn('mt-2 inline-flex items-center gap-1 text-xs font-medium', positive ? 'text-primary' : 'text-destructive')}>
              {positive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
              {Math.abs(change).toFixed(1)}% <span className="text-muted-foreground">vs. período anterior</span>
            </div>
          ) : hint ? (
            <p className="mt-2 text-xs text-muted-foreground">{hint}</p>
          ) : null}
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

export function StatusBadge({ tone, children }: { tone: 'success' | 'warning' | 'muted'; children: React.ReactNode }) {
  const styles = {
    success: 'bg-primary/10 text-primary hover:bg-primary/10',
    warning: 'bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-500/15 dark:text-amber-400',
    muted: 'bg-muted text-muted-foreground hover:bg-muted',
  } as const;
  return (
    <Badge variant="secondary" className={cn('rounded-full font-medium', styles[tone])}>
      <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </Badge>
  );
}

export function SummaryList({
  title,
  items,
}: {
  title: string;
  items: { label: string; value: string; Icon: React.ComponentType<{ className?: string }> }[];
}) {
  return (
    <Card className="rounded-3xl border-border/60 shadow-sm">
      <CardHeader className="p-6 pb-3">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-6 pt-0">
        <ul className="divide-y divide-border/60">
          {items.map(({ label, value, Icon }) => (
            <li key={label} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-sm text-muted-foreground">{label}</span>
              </div>
              <span className="text-sm font-semibold tracking-tight">{value}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border/60 bg-background/95 p-3 shadow-lg backdrop-blur">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="mt-2 space-y-1.5">
        {payload.map((p: any) => (
          <div key={p.dataKey} className="flex items-center gap-2 text-xs">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="capitalize text-muted-foreground">{p.dataKey}</span>
            <span className="ml-2 font-semibold text-foreground">{fmt0(p.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FlowChart({
  title,
  description,
  period,
  onPeriodChange,
  data,
  weeklyData,
}: {
  title: string;
  description: Record<TimePeriod, string>;
  period: TimePeriod;
  onPeriodChange: (p: TimePeriod) => void;
  data: { label: string; receita: number | null; despesa: number | null }[];
  weeklyData: WeekPoint[];
}) {
  return (
    <Card className="rounded-3xl border-border/60 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 p-6 pb-2">
        <div>
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          <CardDescription className="mt-1">{description[period]}</CardDescription>
        </div>
        <Tabs value={period} onValueChange={(v) => onPeriodChange(v as TimePeriod)}>
          <TabsList className="rounded-full bg-muted p-1">
            <TabsTrigger value="month" className="rounded-full px-3 text-xs">Mês</TabsTrigger>
            <TabsTrigger value="quarter" className="rounded-full px-3 text-xs">Trimestre</TabsTrigger>
            <TabsTrigger value="year" className="rounded-full px-3 text-xs">Ano</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent className="p-6 pt-4">
        <div className="mb-4 flex items-center gap-5 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary" /> Receita
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-muted-foreground/40" /> Despesa
          </div>
        </div>
        {period === 'month' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Receita por semana</p>
              <WeeklyFlowChart
                data={weeklyData}
                variant="revenue"
                formatCurrency={fmt0}
                height={240}
              />
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Despesa por semana</p>
              <WeeklyFlowChart
                data={weeklyData}
                variant="expenses"
                formatCurrency={fmt0}
                height={240}
              />
            </div>
          </div>
        ) : (
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART.revFill} stopOpacity={0.28} />
                    <stop offset="100%" stopColor={CHART.revFill} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART.expFill} stopOpacity={0.15} />
                    <stop offset="100%" stopColor={CHART.expFill} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="var(--chart-grid)" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'oklch(0.55 0.03 260)', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'oklch(0.55 0.03 260)', fontSize: 12 }} tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'oklch(0.9 0.01 255)' }} />
                <Area type="monotone" dataKey="receita" stroke={CHART.revStroke} strokeWidth={2.5} fill="url(#gRev)" />
                <Area type="monotone" dataKey="despesa" stroke={CHART.expStroke} strokeWidth={2} fill="url(#gExp)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function HorizontalBarList({
  title,
  items,
  formatValue,
}: {
  title: string;
  items: { label: string; value: number; percentage: number; color: string }[];
  formatValue: (value: number) => string;
}) {
  return (
    <Card className="rounded-3xl border-border/60 shadow-sm">
      <CardHeader className="p-6 pb-3">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-6 pt-0">
        {items.length === 0 ? (
          <div className="flex items-center justify-center py-6">
            <Badge variant="secondary">Sem dados disponíveis</Badge>
          </div>
        ) : (
          items.map((item) => (
            <div key={item.label}>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">{item.label}</span>
                <span className="text-muted-foreground">{formatValue(item.value)}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${Math.max(2, item.percentage)}%`, backgroundColor: item.color }}
                />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

// Wrapper com o override de variáveis CSS do template premium (cartões
// brancos, cinza-azulado neutro) sem alterar o tema verde do resto do app.
export function PremiumScope({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn('w-full space-y-8', className)}
      style={
        {
          '--color-card': '#FFFFFF',
          '--color-muted': '#F1F5F9',
          '--color-muted-foreground': '#64748B',
          '--color-secondary': '#F1F5F9',
          '--color-secondary-foreground': '#0F172A',
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}

// Painel colorido usado para separar visualmente os dois lados de uma tela
// (Receitas/Despesas em /revenue, Contas a Receber/Pagar em /receivables) —
// 'revenue' = verde (dinheiro entrando), 'expense' = âmbar (dinheiro saindo).
export function SectionPanel({
  tone,
  Icon,
  title,
  subtitle,
  action,
  children,
}: {
  tone: 'revenue' | 'expense';
  Icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const styles =
    tone === 'revenue'
      ? {
          wrapper: 'border-emerald-200/70 bg-emerald-50/40 dark:border-emerald-500/20 dark:bg-emerald-500/[0.03]',
          badge: 'bg-emerald-600/10 text-emerald-700 dark:text-emerald-400',
        }
      : {
          wrapper: 'border-amber-200/70 bg-amber-50/40 dark:border-amber-500/20 dark:bg-amber-500/[0.03]',
          badge: 'bg-amber-600/10 text-amber-700 dark:text-amber-500',
        };
  return (
    <div className={cn('rounded-[2rem] border p-5 sm:p-6', styles.wrapper)}>
      <div className="mb-5 flex flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={cn('flex h-10 w-10 items-center justify-center rounded-2xl', styles.badge)}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold leading-tight text-foreground">{title}</h2>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        {action}
      </div>
      <div className="space-y-6">{children}</div>
    </div>
  );
}
