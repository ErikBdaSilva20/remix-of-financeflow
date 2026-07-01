import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { WeeklyFlowChart } from '@/components/WeeklyFlowChart';
import type { WeekPoint } from '@/hooks/useWeeklyBreakdown';

interface WeeklyBreakdownCardProps {
  title: string;
  data: WeekPoint[];
  variant: 'revenue' | 'expenses';
  formatCurrency: (value: number) => string;
}

export function WeeklyBreakdownCard({
  title,
  data,
  variant,
  formatCurrency,
}: WeeklyBreakdownCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <WeeklyFlowChart data={data} variant={variant} formatCurrency={formatCurrency} />
      </CardContent>
    </Card>
  );
}
