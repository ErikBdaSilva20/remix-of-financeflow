import type { ARInvoice } from '@/components/ARTable';
import { InvoiceDialog } from '@/components/InvoiceDialog';
import { MetricCard } from '@/components/MetricCard';
import { OpenInvoicesCard } from '@/components/OpenInvoicesCard';
import { PaymentDialog } from '@/components/PaymentDialog';
import { StackedBarChart } from '@/components/StackedBarChart';
import { DollarSign, FileText, Repeat, TrendingUp } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useFinancialMetrics, useRevenueTrends } from '@/hooks/useFinancialData';
import { usePeriodComparison } from '@/hooks/usePeriodComparison';
import { useARDetailedData } from '@/hooks/useReceivablesData';
import { useRevenueByProductTrends } from '@/hooks/useRevenueDimensions';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const formatBRL = (amount: number) =>
  `R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const Revenue = () => {
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<ARInvoice | null>(null);

  const { data: metrics } = useFinancialMetrics();
  const { data: revenueTrends } = useRevenueTrends();

  const { data: openInvoicesResult } = useARDetailedData({}, 'due_date_asc', 1, 5);
  const { data: productTrendsData } = useRevenueByProductTrends();
  const { data: monthComparison } = usePeriodComparison('month');
  const { data: yearComparison } = usePeriodComparison('year');

  // Helper function to get metric by type
  const getMetric = (type: string) => {
    return metrics?.find((m: any) => m.metric_type === type);
  };

  const revenue = getMetric('revenue');
  const mrr = getMetric('mrr');
  const arr = getMetric('arr');

  const maxRevenue = revenueTrends && revenueTrends.length > 0 
    ? Math.max(...revenueTrends.map((t: any) => Math.max(t.accrual, t.cash))) 
    : 0;

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl text-foreground">Análise de Receita</h1>
          <p className="text-sm md:text-base text-muted-foreground">Acompanhe e analise todos os fluxos de receita</p>
        </div>
        <Button onClick={() => setInvoiceDialogOpen(true)} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 sm:mr-2" />
          <span className="hidden sm:inline">Nova Fatura</span>
        </Button>
      </div>

      {/* Revenue Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Faturas a Receber"
          value={openInvoicesResult ? String(openInvoicesResult.total) : '0'}
          hasData={!!openInvoicesResult && openInvoicesResult.total > 0}
          icon={<FileText className="w-6 h-6" />}
        />
        <MetricCard
          title="Receita Total"
          value={revenue ? formatBRL(revenue.amount) : `R$ 0,00`}
          change={
            monthComparison
              ? `${monthComparison.growth.revenue >= 0 ? '+' : ''}${monthComparison.growth.revenue.toFixed(1)}% vs mês anterior`
              : undefined
          }
          changeType={
            monthComparison && monthComparison.growth.revenue >= 0 ? 'positive' : 'negative'
          }
          gradient="primary"
          icon={<DollarSign className="w-6 h-6" />}
        />
        <MetricCard
          title="Recorrência Mensal (MRR)"
          value={mrr ? formatBRL(mrr.amount) : `R$ 0,00`}
          change={
            monthComparison
              ? `${monthComparison.growth.revenue >= 0 ? '+' : ''}${monthComparison.growth.revenue.toFixed(1)}% vs mês anterior`
              : undefined
          }
          changeType={
            monthComparison && monthComparison.growth.revenue >= 0 ? 'positive' : 'negative'
          }
          icon={<Repeat className="w-6 h-6 text-success" />}
        />
        <MetricCard
          title="Recorrência Anual (ARR)"
          value={arr ? formatBRL(arr.amount) : `R$ 0,00`}
          change={
            yearComparison
              ? `${yearComparison.growth.revenue >= 0 ? '+' : ''}${yearComparison.growth.revenue.toFixed(1)}% vs ano anterior`
              : undefined
          }
          changeType={
            yearComparison && yearComparison.growth.revenue >= 0 ? 'positive' : 'negative'
          }
          gradient="success"
          icon={<TrendingUp className="w-6 h-6" />}
        />
      </div>

      {/* MRR/ARR Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Evolução do Faturamento (Competência vs Caixa)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-6 w-full min-w-0">
            <div className="flex flex-col justify-center items-start md:w-1/5 bg-muted/30 p-4 rounded-lg border border-border/50 flex-shrink-0">
              <span className="text-sm text-muted-foreground font-medium mb-1">Pico de Receita</span>
              <span className="text-2xl font-bold text-primary">{formatBRL(maxRevenue)}</span>
              <span className="text-xs text-muted-foreground mt-1 leading-tight">Maior valor registrado no período</span>
            </div>
            <div className="overflow-x-auto w-full md:w-4/5 flex-1 min-w-0">
              <div style={{ minWidth: '480px' }} className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={revenueTrends ?? []}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
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
                        tickFormatter={(value) => formatBRL(value)}
                      />
                      <Tooltip
                        formatter={(value: any) => [formatBRL(value), '']}
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
                        dataKey="accrual"
                        stroke="#059669"
                        strokeWidth={3}
                        dot={{ fill: '#059669', strokeWidth: 2, r: 4 }}
                        name="Receita de Competência"
                        activeDot={{ r: 6, stroke: '#059669', strokeWidth: 2 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="cash"
                        stroke="#0891B2"
                        strokeWidth={3}
                        dot={{ fill: '#0891B2', strokeWidth: 2, r: 4 }}
                        name="Receita de Caixa"
                        activeDot={{ r: 6, stroke: '#0891B2', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
        </CardContent>
      </Card>

      {/* Receita por Produto e Dimensão - lado a lado */}
      <div className="flex flex-col lg:flex-row gap-6">
        {productTrendsData && productTrendsData.chartData.length > 0 && (
          <div className="flex-1">
            <StackedBarChart
              data={productTrendsData.chartData}
              title="Receita por Produto"
              xAxisKey="month"
              bars={productTrendsData.products.map((p: any, i: number) => ({
                dataKey: p,
                name: p,
                color: productTrendsData.colors[i],
              }))}
              formatValue={formatBRL}
            />
          </div>
        )}

        <div className="flex-1">
          <OpenInvoicesCard
            invoices={openInvoicesResult?.data || []}
            totalCount={openInvoicesResult?.total || 0}
            formatCurrency={formatBRL}
            onReceivePayment={(invoice) => {
              setSelectedInvoice(invoice);
              setPaymentDialogOpen(true);
            }}
          />
        </div>
      </div>

      {/* Receita por Região — ocultado até que o campo region esteja disponível nas faturas */}

      <InvoiceDialog open={invoiceDialogOpen} onOpenChange={setInvoiceDialogOpen} />
      <PaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        invoice={selectedInvoice}
      />
    </div>
  );
};

export default Revenue;
