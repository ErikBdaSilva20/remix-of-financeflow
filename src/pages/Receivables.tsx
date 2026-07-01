import { ARTable, type ARInvoice } from '@/components/ARTable';
import { DonutChart } from '@/components/DonutChart';
import { InvoiceDialog } from '@/components/InvoiceDialog';
import { PaymentDialog } from '@/components/PaymentDialog';
import { DashboardStatCard, PremiumScope } from '@/components/dashboard/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useARData, useARDetailedData, useDSO, useRecentActivity } from '@/hooks/useReceivablesData';
import { db } from '@/lib/data/client';
import { AlertTriangle, CheckIcon, Clock, DollarSign, FileText, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Link, useSearchParams } from 'react-router-dom';

const formatBRL = (amount: number) =>
  `R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const Receivables = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<ARInvoice | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [arSortBy, setArSortBy] = useState('due_date_asc');
  const [arPage, setArPage] = useState(1);

  const queryClient = useQueryClient();

  const updateStatusMutation = useMutation({
    mutationFn: ({ invoiceId, status }: { invoiceId: string; status: string }) =>
      db.table('invoices').update(invoiceId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ar-detailed'] });
      queryClient.invalidateQueries({ queryKey: ['ar-data'] });
      toast.success('Status da fatura atualizado');
    },
    onError: () => {
      toast.error('Erro ao atualizar status');
    },
  });

  const handleStatusChange = (invoiceId: string, newStatus: string) => {
    updateStatusMutation.mutate({ invoiceId, status: newStatus });
  };

  const { data: arData } = useARData({});
  const { data: dso } = useDSO();
  const { data: recentActivity, isLoading: activityLoading } = useRecentActivity();
  const { data: arDetailedResult, isLoading: arDetailedLoading } = useARDetailedData(
    {},
    arSortBy,
    arPage,
    20
  );

  // Handle search result navigation
  useEffect(() => {
    const invoiceId = searchParams.get('invoiceId');
    const paymentId = searchParams.get('paymentId');
    const customerId = searchParams.get('customerId');

    if (invoiceId) {
      setHighlightedId(invoiceId);
      toast('Fatura Encontrada', {
        description: 'Exibindo detalhes da fatura',
      });
      // Scroll to the activity section
      setTimeout(() => {
        document
          .querySelector(`[data-id="${invoiceId}"]`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 500);
    } else if (paymentId) {
      setHighlightedId(paymentId);
      toast('Pagamento Encontrado', {
        description: 'Exibindo detalhes do pagamento',
      });
      setTimeout(() => {
        document
          .querySelector(`[data-id="${paymentId}"]`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 500);
    } else if (customerId) {
      toast('Filtro de Cliente Aplicado', {
        description: 'Exibindo transações para o cliente selecionado',
      });
    }

    // Clear the search params after handling
    if (invoiceId || paymentId || customerId) {
      setTimeout(() => {
        setSearchParams({});
        setHighlightedId(null);
      }, 3000);
    }
  }, [searchParams, setSearchParams]);

  const bucketNamesPt: Record<string, string> = {
    'Current (0-30 days)': 'No Prazo (0-30 dias)',
    '30-60 days': '30-60 dias',
    '60+ days overdue': 'Atrasado 60+ dias',
  };

  const statusNamesPt: Record<string, string> = {
    Paid: 'Pago',
    Received: 'Recebido',
    PrepaidPending: 'Pré-pago Pendente',
    Open: 'Aberto',
    Partial: 'Parcial',
    'Partially Paid': 'Parcialmente Pago',
    Overdue: 'Atrasado',
  };

  // Status que representam dinheiro recebido → badge verde/primário
  const paidStatuses = new Set(['Paid', 'Received', 'PrepaidPending']);

  const avgCollectionPeriod = arData?.averageCollectionPeriod
    ? `${Math.round(arData.averageCollectionPeriod)} dias`
    : 'N/A';

  const hasARData = arData && arData.total > 0;
  const hasDSOData = dso !== null && dso !== undefined;

  return (
    <PremiumScope>
      <header className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Contas a Receber
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Gerencie faturas pendentes e recebimentos de clientes
          </p>
        </div>
        <Button
          className="shrink-0 rounded-full bg-primary px-5 shadow-sm hover:bg-primary/90"
          onClick={() => setInvoiceDialogOpen(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Fatura
        </Button>
      </header>

      {/* Key Metrics */}
      <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardStatCard
          label="Recebíveis Pendentes"
          value={arData ? formatBRL(arData.total) : 'R$ 0'}
          Icon={DollarSign}
        />
        <DashboardStatCard
          label="Faturas em Aberto"
          value={String(arDetailedResult?.total ?? 0)}
          Icon={FileText}
        />
        <DashboardStatCard
          label="Prazo Médio de Recebimento"
          value={avgCollectionPeriod}
          Icon={Clock}
        />
        <DashboardStatCard
          label="DSO (Prazo Médio de Faturamento)"
          value={hasDSOData ? `${dso} dias` : 'N/A'}
          Icon={Clock}
        />
      </section>

      {/* AR Summary + Aging */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="rounded-3xl border-border/60 p-6 shadow-sm flex flex-col gap-4">
          <h3 className="text-lg">Contas a Receber por Vencimento</h3>
          {hasARData && arData?.buckets && arData.buckets.length > 0 ? (
            <div className="space-y-3">
              {arData.buckets.map((bucket, index) => {
                const iconColor =
                  index === 0 ? 'bg-green-100' : index === 1 ? 'bg-yellow-100' : 'bg-red-100';
                const textColor =
                  index === 0
                    ? 'text-green-600'
                    : index === 1
                      ? 'text-yellow-600'
                      : 'text-red-600';
                const Icon = index === 0 ? CheckIcon : index === 1 ? Clock : AlertTriangle;
                return (
                  <div key={bucket.bucket} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 ${iconColor} rounded-full flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`w-4 h-4 ${textColor}`} />
                      </div>
                      <div>
                        <div className="font-medium text-sm">{bucketNamesPt[bucket.bucket] || bucket.bucket}</div>
                        <div className="text-xs text-muted-foreground">{bucket.count} faturas</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-sm">{formatBRL(bucket.amount)}</div>
                      <div className={`text-xs ${textColor}`}>{bucket.percentage.toFixed(0)}%</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <Badge variant="secondary">Sem dados disponíveis</Badge>
            </div>
          )}
        </Card>

        {hasARData && arData?.buckets && arData.buckets.length > 0 && (
          <DonutChart
            title="Análise de Vencimento (Aging)"
            data={arData.buckets.map((bucket, index) => ({
              name: bucketNamesPt[bucket.bucket] || bucket.bucket,
              value: bucket.amount,
              color:
                index === 0
                  ? 'hsl(142, 76%, 36%)'
                  : index === 1
                    ? 'hsl(45, 93%, 47%)'
                    : 'hsl(0, 84%, 60%)',
            }))}
            centerValue={formatBRL(arData.total)}
            centerLabel="Total a Receber"
          />
        )}
      </div>

      {/* Accounts Receivable Table */}
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 px-1">
          <h3 className="text-lg">Faturas Abertas</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground shrink-0">Ordenar:</span>
            <Select value={arSortBy} onValueChange={setArSortBy}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="due_date_asc">Vencimento (Mais Próximo)</SelectItem>
                <SelectItem value="due_date_desc">Vencimento (Mais Distante)</SelectItem>
                <SelectItem value="issue_date_desc">Mais Recente</SelectItem>
                <SelectItem value="issue_date_asc">Mais Antiga Primeiro</SelectItem>
                <SelectItem value="amount_desc">Valor (Maior ao Menor)</SelectItem>
                <SelectItem value="amount_asc">Valor (Menor ao Maior)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {arDetailedLoading ? (
          <Card className="rounded-3xl border-border/60 p-6 shadow-sm">
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin-fast mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Carregando faturas...</p>
              </div>
            </div>
          </Card>
        ) : (
          <ARTable
            data={arDetailedResult?.data || []}
            formatCurrency={formatBRL}
            page={arDetailedResult?.page || 1}
            totalPages={arDetailedResult?.totalPages || 1}
            onPageChange={setArPage}
            onStatusChange={handleStatusChange}
            onReceivePayment={(invoice) => {
              setSelectedInvoice(invoice);
              setPaymentDialogOpen(true);
            }}
          />
        )}
      </div>

      {/* Recent Activity */}
      <Card className="rounded-3xl border-border/60 p-6 shadow-sm">
        <h3 className="text-lg mb-4">Atividade Recente</h3>
        {activityLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin-fast mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Carregando...</p>
            </div>
          </div>
        ) : recentActivity && recentActivity.length > 0 ? (
          <div className="space-y-2">
            {recentActivity.map((activity) => (
              <div
                key={activity.id}
                data-id={activity.id}
                className={`flex items-start gap-3 p-3 rounded-lg transition-all ${
                  highlightedId === activity.id
                    ? 'bg-primary-light-20 ring-2 ring-primary'
                    : 'bg-muted'
                }`}
              >
                {/* Icon */}
                <div
                  className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    activity.type === 'payment' ? 'bg-green-100' : 'bg-primary-light'
                  }`}
                >
                  {activity.type === 'payment' ? (
                    <CheckIcon className="w-4 h-4 text-green-600" />
                  ) : (
                    <DollarSign className="w-4 h-4 text-primary" />
                  )}
                </div>

                {/* Main content */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                    <p className="text-sm font-medium leading-tight truncate max-w-[60%]">
                      {activity.customerName}
                    </p>
                    <span className="text-sm font-bold whitespace-nowrap">
                      {formatBRL(activity.amount)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 mt-1">
                    <p className="text-xs text-muted-foreground">
                      {activity.type === 'payment' ? 'Pagamento Recebido' : 'Fatura Criada'} •{' '}
                      {new Date(activity.date).toLocaleDateString('pt-BR')}
                    </p>
                    <Badge
                      variant={
                        paidStatuses.has(activity.status ?? '')
                          ? 'default'
                          : activity.status === 'Overdue'
                            ? 'destructive'
                            : 'secondary'
                      }
                      className="text-xs"
                    >
                      {statusNamesPt[activity.status ?? ''] || activity.status}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center py-8">
            <Badge variant="secondary">Sem dados disponíveis</Badge>
          </div>
        )}
      </Card>

      <Link
        to="/payables"
        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
      >
        Ver contas a pagar (fornecedores) →
      </Link>

      <InvoiceDialog open={invoiceDialogOpen} onOpenChange={setInvoiceDialogOpen} />
      <PaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        invoice={selectedInvoice}
      />
    </PremiumScope>
  );
};

export default Receivables;
