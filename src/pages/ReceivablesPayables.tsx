import { APTable, type APBillDetail } from '@/components/APTable';
import { ARTable, type ARInvoice } from '@/components/ARTable';
import { BillDialog } from '@/components/BillDialog';
import { BillPaymentDialog } from '@/components/BillPaymentDialog';
import { InvoiceDialog } from '@/components/InvoiceDialog';
import { PaymentDialog } from '@/components/PaymentDialog';
import { VendorDialog } from '@/components/VendorDialog';
import {
  DashboardStatCard,
  MiniStatCard,
  PremiumScope,
  SectionPanel,
  fmt0,
} from '@/components/dashboard/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useAPData,
  useAPDetailedData,
  useARData,
  useARDetailedData,
  useDSO,
  useRecentActivity,
} from '@/hooks/useReceivablesData';
import { db } from '@/lib/data/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckIcon,
  Clock,
  CreditCard,
  DollarSign,
  HandCoins,
  Plus,
  Receipt,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

const formatBRL = (amount: number) =>
  `R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const bucketNamesPt: Record<string, string> = {
  'Current (0-30 days)': 'No Prazo (0-30 dias)',
  '30-60 days': '30-60 dias',
  '60+ days overdue': 'Atrasado 60+ dias',
};

// Explica o que cada faixa significa — usado quando a faixa está vazia, pra
// linha continuar servindo de legenda em vez de sumir ou mostrar R$ 0,00 à toa.
const bucketMeaningPt: Record<string, string> = {
  'Current (0-30 days)': 'Faturas dentro do prazo normal',
  '30-60 days': 'Faturas atrasadas entre 30 e 60 dias',
  '60+ days overdue': 'Faturas atrasadas há mais de 60 dias',
};

const badgeNamesPt: Record<string, string> = {
  Urgent: 'Urgente',
  Current: 'Próximos',
  Future: 'Futuros',
  Overdue: 'Vencido',
};

const groupNamesPt: Record<string, string> = {
  'Past due': 'Vencido',
  'Due within 7 days': 'Vence em até 7 dias',
  'Due within 30 days': 'Vence em até 30 dias',
  'Due later': 'Vence depois',
};

const groupMeaningPt: Record<string, string> = {
  'Past due': 'Contas que já passaram da data de pagamento',
  'Due within 7 days': 'Contas que vencem nos próximos 7 dias',
  'Due within 30 days': 'Contas que vencem entre 8 e 30 dias',
  'Due later': 'Contas que vencem depois de 30 dias',
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

const ReceivablesPayables = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Diálogos
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<ARInvoice | null>(null);
  const [vendorDialogOpen, setVendorDialogOpen] = useState(false);
  const [billDialogOpen, setBillDialogOpen] = useState(false);
  const [billPaymentDialogOpen, setBillPaymentDialogOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<APBillDetail | null>(null);

  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [arSortBy, setArSortBy] = useState('due_date_asc');
  const [apSortBy, setApSortBy] = useState('due_date_asc');
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

  // Dados
  const { data: arData } = useARData({});
  const { data: apData } = useAPData({});
  const { data: dso } = useDSO();
  const { data: recentActivity, isLoading: activityLoading } = useRecentActivity();
  const { data: arDetailedResult, isLoading: arDetailedLoading } = useARDetailedData(
    {},
    arSortBy,
    arPage,
    20
  );
  const { data: apDetailedData, isLoading: apDetailedLoading } = useAPDetailedData({}, apSortBy);

  // Navegação vinda da busca global (resultado de fatura/pagamento/cliente)
  useEffect(() => {
    const invoiceId = searchParams.get('invoiceId');
    const paymentId = searchParams.get('paymentId');
    const customerId = searchParams.get('customerId');

    if (invoiceId) {
      setHighlightedId(invoiceId);
      toast('Fatura Encontrada', { description: 'Exibindo detalhes da fatura' });
      setTimeout(() => {
        document
          .querySelector(`[data-id="${invoiceId}"]`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 500);
    } else if (paymentId) {
      setHighlightedId(paymentId);
      toast('Pagamento Encontrado', { description: 'Exibindo detalhes do pagamento' });
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

    if (invoiceId || paymentId || customerId) {
      setTimeout(() => {
        setSearchParams({});
        setHighlightedId(null);
      }, 3000);
    }
  }, [searchParams, setSearchParams]);

  const hasARData = arData && arData.total > 0;

  const avgCollectionPeriod = hasARData
    ? `${Math.round(arData.averageCollectionPeriod)} dias`
    : 'N/A';

  // Faturas atrasadas (buckets 30-60 e 60+) — o que precisa de cobrança agora,
  // em destaque no primeiro card do painel de Contas a Receber.
  const overdueARBuckets = (arData?.buckets ?? []).filter((b) => b.bucket !== 'Current (0-30 days)');
  const overdueARCount = overdueARBuckets.reduce((s, b) => s + b.count, 0);
  const overdueARTotal = overdueARBuckets.reduce((s, b) => s + b.amount, 0);

  const hasDSOData = dso !== null && dso !== undefined;
  const overdueGroup = apData?.groups.find((g) => g.badge === 'Overdue');
  const urgentGroup = apData?.groups.find((g) => g.badge === 'Urgent');
  const netPosition = (arData?.total ?? 0) - (apData?.total ?? 0);

  const primaryStats = [
    {
      label: 'Recebíveis Pendentes',
      value: fmt0(arData?.total ?? 0),
      hint: 'ainda não recebido',
      Icon: HandCoins,
    },
    {
      label: 'Contas a Pagar Pendentes',
      value: fmt0(apData?.total ?? 0),
      hint: 'ainda não pago',
      Icon: Receipt,
    },
    {
      label: 'Saldo Líquido',
      value: fmt0(netPosition),
      hint: 'recebíveis − pagáveis em aberto',
      Icon: CreditCard,
    },
    {
      label: 'DSO (Prazo Médio de Recebimento)',
      value: hasDSOData ? `${dso} dias` : 'N/A',
      hint: 'dias em média até receber',
      Icon: Clock,
    },
  ];

  return (
    <PremiumScope>
      {/* Header */}
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Contas a Receber &amp; a Pagar
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Veja o que está prestes a vencer: faturas de clientes e contas de fornecedores que
            ainda não foram pagas.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            className="rounded-full px-5"
            onClick={() => setBillDialogOpen(true)}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Nova Conta a Pagar
          </Button>
          <Button
            className="rounded-full bg-primary px-5 shadow-sm hover:bg-primary/90"
            onClick={() => setInvoiceDialogOpen(true)}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Nova Fatura
          </Button>
        </div>
      </header>

      {/* Visão geral */}
      <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {primaryStats.map((s) => (
          <DashboardStatCard key={s.label} {...s} />
        ))}
      </section>

      {/* A Receber x A Pagar — separados por cor para leitura rápida */}
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SectionPanel
          tone="revenue"
          Icon={HandCoins}
          title="Contas a Receber"
          subtitle="Faturas de clientes ainda não pagas — priorize as mais atrasadas."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <MiniStatCard
              label="Faturas Vencidas"
              value={String(overdueARCount)}
              hint={overdueARCount > 0 ? formatBRL(overdueARTotal) : 'Nenhuma em atraso'}
              Icon={AlertTriangle}
            />
            <MiniStatCard
              label="Prazo Médio de Recebimento"
              value={avgCollectionPeriod}
              hint="tempo médio até o cliente pagar"
              Icon={Clock}
            />
          </div>

          <Card className="rounded-3xl border-border/60 shadow-sm">
            <CardHeader className="p-6 pb-3">
              <CardTitle className="text-base font-semibold">
                Contas a Receber por Vencimento
              </CardTitle>
              <CardDescription>Quanto mais vencida, mais prioridade na cobrança.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 p-6 pt-0">
            {arData?.buckets && arData.buckets.length > 0 ? (
              <div className="space-y-3">
                {arData.buckets.map((bucket, index) => {
                  const isEmpty = bucket.count === 0;
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
                    <div
                      key={bucket.bucket}
                      className={`flex justify-between items-center p-3 rounded-lg ${isEmpty ? 'bg-muted/40' : 'bg-muted'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isEmpty ? 'bg-muted' : iconColor}`}
                        >
                          <Icon className={`w-4 h-4 ${isEmpty ? 'text-muted-foreground' : textColor}`} />
                        </div>
                        <div>
                          <div
                            className={`font-medium text-sm ${isEmpty ? 'text-muted-foreground' : ''}`}
                          >
                            {bucketNamesPt[bucket.bucket] || bucket.bucket}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {isEmpty ? bucketMeaningPt[bucket.bucket] : `${bucket.count} faturas`}
                          </div>
                        </div>
                      </div>
                      {!isEmpty && (
                        <div className="text-right">
                          <div className="font-semibold text-sm">{formatBRL(bucket.amount)}</div>
                          <div className={`text-xs ${textColor}`}>
                            {bucket.percentage.toFixed(0)}%
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center py-8">
                <Badge variant="secondary">Sem dados disponíveis</Badge>
              </div>
            )}
            </CardContent>
          </Card>

          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 px-1">
              <h3 className="text-base font-semibold">Faturas Abertas</h3>
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
        </SectionPanel>

        <SectionPanel
          tone="expense"
          Icon={Receipt}
          title="Contas a Pagar"
          subtitle="Contas de fornecedores ainda não pagas — organize pelo que vence primeiro."
          action={
            <Button
              variant="outline"
              size="sm"
              className="rounded-full bg-background"
              onClick={() => setVendorDialogOpen(true)}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Fornecedor
            </Button>
          }
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <MiniStatCard
              label="Contas Vencidas"
              value={String(overdueGroup?.count ?? 0)}
              hint={overdueGroup && overdueGroup.count > 0 ? formatBRL(overdueGroup.amount) : 'Nenhuma em atraso'}
              Icon={AlertTriangle}
            />
            <MiniStatCard
              label="Vencendo em 7 dias"
              value={String(urgentGroup?.count ?? 0)}
              hint={urgentGroup ? formatBRL(urgentGroup.amount) : undefined}
              Icon={Clock}
            />
          </div>

          <Card className="rounded-3xl border-border/60 shadow-sm">
            <CardHeader className="p-6 pb-3">
              <CardTitle className="text-base font-semibold">Contas a Pagar por Urgência</CardTitle>
              <CardDescription>O que já venceu aparece primeiro — pague isso antes.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 p-6 pt-0">
            {apData?.groups && apData.groups.length > 0 ? (
              <div className="space-y-3">
                {apData.groups.map((group) => {
                  const isEmpty = group.count === 0;
                  const badgeVariant =
                    group.badge === 'Overdue' || group.badge === 'Urgent'
                      ? 'destructive'
                      : group.badge === 'Current'
                        ? 'secondary'
                        : 'outline';
                  return (
                    <div
                      key={group.name}
                      className={`flex justify-between items-center p-3 rounded-lg ${isEmpty ? 'bg-muted/40' : 'bg-muted'}`}
                    >
                      <div>
                        <div
                          className={`font-medium text-sm ${isEmpty ? 'text-muted-foreground' : ''}`}
                        >
                          {groupNamesPt[group.name] || group.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {isEmpty ? groupMeaningPt[group.name] : `${group.count} contas`}
                        </div>
                      </div>
                      {!isEmpty && (
                        <div className="text-right flex flex-col items-end gap-1">
                          <div className="font-semibold text-sm">{formatBRL(group.amount)}</div>
                          <Badge variant={badgeVariant} className="text-xs">
                            {badgeNamesPt[group.badge] || group.badge}
                          </Badge>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center py-8">
                <Badge variant="secondary">Sem dados disponíveis</Badge>
              </div>
            )}
            </CardContent>
          </Card>

          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 px-1">
              <h3 className="text-base font-semibold">Contas de Fornecedores Abertas</h3>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground shrink-0">Ordenar:</span>
                <Select value={apSortBy} onValueChange={setApSortBy}>
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
            {apDetailedLoading ? (
              <Card className="rounded-3xl border-border/60 p-6 shadow-sm">
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin-fast mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">Carregando contas...</p>
                  </div>
                </div>
              </Card>
            ) : (
              <APTable
                data={apDetailedData || []}
                formatCurrency={formatBRL}
                onPayBill={(bill) => {
                  setSelectedBill(bill);
                  setBillPaymentDialogOpen(true);
                }}
              />
            )}
          </div>
        </SectionPanel>
      </section>

      {/* Atividade Recente — feed de clientes (faturas/pagamentos) */}
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

      <InvoiceDialog open={invoiceDialogOpen} onOpenChange={setInvoiceDialogOpen} />
      <PaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        invoice={selectedInvoice}
      />
      <VendorDialog open={vendorDialogOpen} onOpenChange={setVendorDialogOpen} />
      <BillDialog open={billDialogOpen} onOpenChange={setBillDialogOpen} />
      <BillPaymentDialog
        open={billPaymentDialogOpen}
        onOpenChange={setBillPaymentDialogOpen}
        bill={selectedBill}
      />
    </PremiumScope>
  );
};

export default ReceivablesPayables;
