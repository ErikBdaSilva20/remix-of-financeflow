import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Badge } from '@/components/ui/badge';
import type { WeekPoint } from '@/hooks/useWeeklyBreakdown';

interface WeeklyFlowChartProps {
  data: WeekPoint[];
  variant: 'revenue' | 'expenses';
  formatCurrency: (value: number) => string;
  height?: number;
}

const COLORS = { revenue: '#059669', expenses: '#DC2626' } as const;

function WeeklyTooltip({ active, payload, label, variant, formatCurrency }: any) {
  if (!active || !payload?.length) return null;
  const point: WeekPoint | undefined = payload[0]?.payload;
  if (!point) return null;
  const count = variant === 'revenue' ? point.revenueCount : point.expensesCount;
  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-lg">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">
        {formatCurrency(payload[0]?.value ?? 0)}
      </p>
      {count > 0 && (
        <p className="mt-0.5 text-xs text-muted-foreground">
          {count} lançamento{count === 1 ? '' : 's'}
        </p>
      )}
    </div>
  );
}

export function WeeklyFlowChart({
  data,
  variant,
  formatCurrency,
  height = 256,
}: WeeklyFlowChartProps) {
  const dataKey = variant === 'revenue' ? 'revenue' : 'expenses';
  const color = COLORS[variant];
  const hasData = data.some((d) => d.revenue > 0 || d.expenses > 0);

  if (!hasData) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <Badge variant="secondary">Sem dados disponíveis</Badge>
      </div>
    );
  }

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" opacity={0.4} vertical={false} />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12 }}
            className="fill-muted-foreground"
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12 }}
            className="fill-muted-foreground"
            tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
            width={48}
          />
          <Tooltip
            content={<WeeklyTooltip variant={variant} formatCurrency={formatCurrency} />}
            cursor={{ fill: color, opacity: 0.08 }}
          />
          <Bar dataKey={dataKey} fill={color} radius={[6, 6, 2, 2]} maxBarSize={56} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
