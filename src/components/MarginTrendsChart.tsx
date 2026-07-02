import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { MarginTrendTimeSeries } from '@/hooks/useProfitabilityData';
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface MarginTrendsChartProps {
  className?: string;
  data?: MarginTrendTimeSeries[];
  onPointClick?: (metric: string, period: string, dateKey: string) => void;
}

export function MarginTrendsChart({ className, data, onPointClick }: MarginTrendsChartProps) {
  // Só plota períodos com dado real — nada de meses fabricados em 0%, que
  // fazia parecer que a margem tinha zerado quando na verdade não havia
  // nenhum lançamento ainda naquele mês.
  const chartData = data ?? [];
  const hasData = chartData.length > 0;
  const periodRangeLabel = hasData
    ? chartData.length === 1
      ? chartData[0].period
      : `${chartData[0].period} – ${chartData[chartData.length - 1].period}`
    : null;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-card-foreground mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {Number(entry.value).toFixed(1)}%
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className={`${className ?? ''} w-full min-w-0`}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Tendências de Margem</CardTitle>
        {periodRangeLabel && (
          <p className="text-xs text-muted-foreground">{periodRangeLabel}</p>
        )}
      </CardHeader>
      <CardContent className="p-4 w-full min-w-0">
        {!hasData ? (
          <div className="flex h-80 items-center justify-center">
            <Badge variant="secondary">Sem dados disponíveis</Badge>
          </div>
        ) : (
        <div className="overflow-x-auto w-full">
          <div style={{ minWidth: '520px' }}>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke="var(--chart-grid)" vertical={false} />
                  <XAxis
                    dataKey="period"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <ReferenceLine y={0} stroke="var(--color-border)" strokeWidth={1} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="line" />
                  <Line
                    type="monotone"
                    dataKey="grossMargin"
                    stroke="#047857"
                    strokeWidth={3}
                    dot={{ fill: '#047857', strokeWidth: 2, r: 4, cursor: 'pointer' }}
                    name="Margem Bruta"
                    activeDot={{
                      r: 6,
                      stroke: '#047857',
                      strokeWidth: 2,
                      cursor: 'pointer',
                      onClick: (_: any, payload: any) =>
                        onPointClick?.(
                          'Gross Margin',
                          payload.payload.period,
                          payload.payload.dateKey
                        ),
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="operatingMargin"
                    stroke="#059669"
                    strokeWidth={3}
                    dot={{ fill: '#059669', strokeWidth: 2, r: 4, cursor: 'pointer' }}
                    name="Margem Operacional"
                    activeDot={{
                      r: 6,
                      stroke: '#059669',
                      strokeWidth: 2,
                      cursor: 'pointer',
                      onClick: (_: any, payload: any) =>
                        onPointClick?.(
                          'Operating Margin',
                          payload.payload.period,
                          payload.payload.dateKey
                        ),
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        )}
      </CardContent>
    </Card>
  );
}
