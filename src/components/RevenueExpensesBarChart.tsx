import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

function formatCompactBRL(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000) {
    const v = abs / 1_000_000;
    return `${sign}R$ ${(v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)).replace('.', ',')}M`;
  }
  if (abs >= 1_000) {
    const v = abs / 1_000;
    return `${sign}R$ ${(v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)).replace('.', ',')}k`;
  }
  return `${sign}R$ ${abs.toFixed(0)}`;
}

interface RevenueExpensesBarChartProps {
  title: string;
  data: Array<{
    period: string;
    dateKey: string;
    revenue: number;
    expenses: number;
    revenueCount: number;
    expensesCount: number;
  }>;
  formatCurrency: (value: number) => string;
}

function CustomTooltip({ active, payload, label, formatCurrency }: any) {
  if (!active || !payload || !payload.length) return null;
  const point = payload[0]?.payload;
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
      <p className="font-medium text-card-foreground mb-2">{label}</p>
      <p className="text-sm" style={{ color: '#059669' }}>
        Receita: {formatCurrency(point?.revenue ?? 0)}
        {point?.revenueCount > 0 && (
          <span className="text-muted-foreground"> ({point.revenueCount} transaç{point.revenueCount === 1 ? 'ão' : 'ões'})</span>
        )}
      </p>
      <p className="text-sm" style={{ color: '#DC2626' }}>
        Despesas: {formatCurrency(point?.expenses ?? 0)}
        {point?.expensesCount > 0 && (
          <span className="text-muted-foreground"> ({point.expensesCount} transaç{point.expensesCount === 1 ? 'ão' : 'ões'})</span>
        )}
      </p>
    </div>
  );
}

export function RevenueExpensesBarChart({ title, data, formatCurrency }: RevenueExpensesBarChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <Badge variant="secondary">Sem dados disponíveis</Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full min-w-0">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 w-full min-w-0">
        <div className="overflow-x-auto w-full">
          <div style={{ minWidth: '480px' }}>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" opacity={0.3} />
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
                    tickFormatter={formatCompactBRL}
                    domain={[0, (max: number) => Math.ceil(max * 1.15)]}
                    width={70}
                  />
                  <Tooltip content={<CustomTooltip formatCurrency={formatCurrency} />} />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar dataKey="revenue" fill="#059669" name="Receita" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="expenses" fill="#DC2626" name="Despesas" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
