import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MarginTrendTimeSeries } from '@/hooks/useProfitabilityData';
import { Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface MarginTrendsChartProps {
  className?: string;
  data?: MarginTrendTimeSeries[];
  onPointClick?: (metric: string, period: string, dateKey: string) => void;
}

export function MarginTrendsChart({ className, data, onPointClick }: MarginTrendsChartProps) {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-card-foreground mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value.toFixed(1)}%
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Tendências de Margem (6 Meses)</CardTitle>
      </CardHeader>
      <CardContent>
        {data && data.length > 0 ? (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
                  tick={{ fontSize: 12 }}
                  className="fill-muted-foreground"
                  tickFormatter={(value) => `${value}%`}
                  domain={['dataMin - 2', 'dataMax + 2']}
                />
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
                  dot={{
                    fill: '#0891B2',
                    strokeWidth: 2,
                    r: 4,
                    cursor: 'pointer',
                  }}
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
        ) : (
          <div className="flex items-center justify-center h-80">
            <Badge variant="secondary">Sem dados disponíveis</Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
