import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface RevenueProfitChartProps {
  data: Array<{
    period: string;
    dateKey: string;
    revenue: number;
    profit: number;
  }>;
  formatCurrency: (value: number) => string;
  onPointClick?: (dateKey: string) => void;
}

export function RevenueProfitChart({
  data,
  formatCurrency,
  onPointClick,
}: RevenueProfitChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Receita vs. Lucro</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-80">
            <Badge variant="secondary">Sem dados disponíveis</Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full min-w-0">
      <CardHeader>
        <CardTitle className="text-lg">Receita vs. Lucro</CardTitle>
      </CardHeader>
      <CardContent className="p-4 w-full min-w-0">
        <div className="overflow-x-auto w-full">
          <div style={{ minWidth: '480px' }}>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
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
                    tickFormatter={(value) => formatCurrency(value)}
                    width={90}
                  />
                  <Tooltip
                    formatter={(value: any) => [formatCurrency(value), '']}
                    labelStyle={{ color: '#0F172A' }}
                    contentStyle={{
                      backgroundColor: '#F0FDF4',
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#059669"
                    strokeWidth={3}
                    dot={{ fill: '#059669', strokeWidth: 2, r: 4, cursor: 'pointer' }}
                    name="Revenue"
                    activeDot={{
                      r: 6,
                      stroke: '#059669',
                      strokeWidth: 2,
                      cursor: 'pointer',
                      onClick: (_: any, payload: any) => onPointClick?.(payload.payload.dateKey),
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="profit"
                    stroke="#047857"
                    strokeWidth={3}
                    dot={{ fill: '#047857', strokeWidth: 2, r: 4, cursor: 'pointer' }}
                    name="Profit"
                    activeDot={{
                      r: 6,
                      stroke: '#047857',
                      strokeWidth: 2,
                      cursor: 'pointer',
                      onClick: (_: any, payload: any) => onPointClick?.(payload.payload.dateKey),
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
