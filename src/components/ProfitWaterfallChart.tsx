import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface WaterfallData {
  name: string;
  value: number;
  cumulative: number;
  type: 'positive' | 'negative' | 'total';
}

interface ProfitWaterfallChartProps {
  revenue: number;
  cogs: number;
  operatingExpenses: number;
  className?: string;
  onBarClick?: (metric: string) => void;
  formatCurrency: (amount: number) => string;
}

export function ProfitWaterfallChart({ revenue, cogs, operatingExpenses, className, onBarClick, formatCurrency }: ProfitWaterfallChartProps) {
  const grossProfit = revenue - cogs;
  const netProfit = grossProfit - operatingExpenses;

  const waterfallData: WaterfallData[] = [
    { name: 'Receita', value: revenue, cumulative: revenue, type: 'positive' },
    { name: 'CPV', value: -cogs, cumulative: grossProfit, type: 'negative' },
    { name: 'Lucro Bruto', value: grossProfit, cumulative: grossProfit, type: 'total' },
    { name: 'Desp. Oper.', value: -operatingExpenses, cumulative: netProfit, type: 'negative' },
    { name: 'Lucro Líquido', value: netProfit, cumulative: netProfit, type: 'total' }
  ];

  const getBarColor = (type: string) => {
    switch (type) {
      case 'positive':
        return '#047857';
      case 'negative':
        return '#EF4444';
      case 'total':
        return '#059669';
      default:
        return 'hsl(var(--neutral-400))';
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-card-foreground">{label}</p>
          <p className="text-sm text-muted-foreground">
            Valor: {formatCurrency(Math.abs(data.value))}
          </p>
          <p className="text-sm text-muted-foreground">
            Acumulado: {formatCurrency(data.cumulative)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Cascata de Lucro</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={waterfallData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <XAxis 
                dataKey="name" 
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
                tickFormatter={(value) => formatCurrency(value)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="cumulative" 
                radius={[4, 4, 0, 0]}
                maxBarSize={60}
                onClick={(data) => onBarClick?.(data.name)}
                cursor="pointer"
              >
                {waterfallData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(entry.type)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        {/* Legend */}
        <div className="flex justify-center gap-6 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#047857' }}></div>
            <span className="text-muted-foreground">Receita</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#EF4444' }}></div>
            <span className="text-muted-foreground">Despesas</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#059669' }}></div>
            <span className="text-muted-foreground">Lucro</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}