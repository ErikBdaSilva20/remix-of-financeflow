import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { MarginTrendTimeSeries } from '@/hooks/useProfitabilityData';
import { Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { subMonths, format } from 'date-fns';
import { useMemo } from 'react';

interface MarginTrendsChartProps {
  className?: string;
  data?: MarginTrendTimeSeries[];
  onPointClick?: (metric: string, period: string, dateKey: string) => void;
}

/** Always returns at least 6 months of data — flat at 0% if there's nothing from the DB. */
function ensureTimeline(data?: MarginTrendTimeSeries[]): MarginTrendTimeSeries[] {
  const today = new Date();
  const defaults: MarginTrendTimeSeries[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = subMonths(today, i);
    defaults.push({
      period: format(d, 'MMM yyyy'),
      dateKey: format(d, 'yyyy-MM'),
      grossMargin: 0,
      operatingMargin: 0,
      netMargin: 0,
    });
  }

  if (!data || data.length === 0) return defaults;

  // Merge real data into the defaults timeline
  const map = new Map(data.map((d) => [d.dateKey, d]));
  return defaults.map((def) => map.get(def.dateKey) ?? def);
}

export function MarginTrendsChart({ className, data, onPointClick }: MarginTrendsChartProps) {
  const chartData = useMemo(() => ensureTimeline(data), [data]);

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
        <CardTitle className="text-lg font-semibold">Tendências de Margem (6 Meses)</CardTitle>
      </CardHeader>
      <CardContent className="p-4 w-full min-w-0">
        <div className="overflow-x-auto w-full">
          <div style={{ minWidth: '520px' }}>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                  <XAxis
                    dataKey="period"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <ReferenceLine y={0} stroke="hsl(var(--border))" strokeWidth={1} />
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
                  <Line
                    type="monotone"
                    dataKey="netMargin"
                    stroke="#0891B2"
                    strokeWidth={3}
                    dot={{ fill: '#0891B2', strokeWidth: 2, r: 4, cursor: 'pointer' }}
                    name="Margem Líquida"
                    activeDot={{
                      r: 6,
                      stroke: '#0891B2',
                      strokeWidth: 2,
                      cursor: 'pointer',
                      onClick: (_: any, payload: any) =>
                        onPointClick?.('Net Margin', payload.payload.period, payload.payload.dateKey),
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
