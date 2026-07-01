import { APTable, type APBillDetail } from '@/components/APTable';
import { BillDialog } from '@/components/BillDialog';
import { BillPaymentDialog } from '@/components/BillPaymentDialog';
import { DonutChart } from '@/components/DonutChart';
import { VendorDialog } from '@/components/VendorDialog';
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
import { useAPData, useAPDetailedData } from '@/hooks/useReceivablesData';
import { AlertTriangle, Building2, Clock, Plus } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

const formatBRL = (amount: number) =>
  `R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const Payables = () => {
  const [vendorDialogOpen, setVendorDialogOpen] = useState(false);
  const [billDialogOpen, setBillDialogOpen] = useState(false);
  const [billPaymentDialogOpen, setBillPaymentDialogOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<APBillDetail | null>(null);
  const [apSortBy, setApSortBy] = useState('due_date_asc');

  const { data: apData } = useAPData({});
  const { data: apDetailedData, isLoading: apDetailedLoading } = useAPDetailedData({}, apSortBy);

  const badgeNamesPt: Record<string, string> = {
    Urgent: 'Urgente',
    Current: 'Próximos',
    Future: 'Futuros',
    Overdue: 'Vencido',
  };

  const groupNamesPt: Record<string, string> = {
    'Due within 7 days': 'Vence em até 7 dias',
    'Due within 30 days': 'Vence em até 30 dias',
    'Due later': 'Vence depois',
  };

  const hasAPData = apData && apData.total > 0;
  const urgentGroup = apData?.groups.find((g) => g.badge === 'Urgent');

  return (
    <PremiumScope>
      <header className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Contas a Pagar
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Gerencie fornecedores, faturas recebidas e obrigações de pagamento
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            className="rounded-full px-5"
            onClick={() => setVendorDialogOpen(true)}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Fornecedor
          </Button>
          <Button
            className="rounded-full bg-primary px-5 shadow-sm hover:bg-primary/90"
            onClick={() => setBillDialogOpen(true)}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Nova Fatura
          </Button>
        </div>
      </header>

      {/* Key Metrics */}
      <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardStatCard
          label="Contas a Pagar Pendentes"
          value={apData ? formatBRL(apData.total) : 'R$ 0'}
          Icon={AlertTriangle}
        />
        <DashboardStatCard
          label="Contas em Aberto"
          value={String(apDetailedData?.length ?? 0)}
          Icon={Building2}
        />
        <DashboardStatCard
          label="Vencendo em 7 dias"
          value={String(urgentGroup?.count ?? 0)}
          hint={urgentGroup ? formatBRL(urgentGroup.amount) : undefined}
          Icon={Clock}
        />
      </section>

      {/* AP Summary + Urgency */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="rounded-3xl border-border/60 p-6 shadow-sm flex flex-col gap-4">
          <h3 className="text-lg">Contas a Pagar por Urgência</h3>
          {hasAPData && apData?.groups && apData.groups.length > 0 ? (
            <div className="space-y-3">
              {apData.groups.map((group) => {
                const badgeVariant =
                  group.badge === 'Urgent'
                    ? 'destructive'
                    : group.badge === 'Current'
                      ? 'secondary'
                      : 'outline';
                return (
                  <div key={group.name} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <div>
                      <div className="font-medium text-sm">{groupNamesPt[group.name] || group.name}</div>
                      <div className="text-xs text-muted-foreground">{group.count} contas</div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <div className="font-semibold text-sm">{formatBRL(group.amount)}</div>
                      <Badge variant={badgeVariant} className="text-xs">{badgeNamesPt[group.badge] || group.badge}</Badge>
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

        {hasAPData && apData?.groups && apData.groups.length > 0 && (
          <DonutChart
            title="Urgência de Pagamento"
            data={apData.groups.map((group) => ({
              name: badgeNamesPt[group.name] || group.name,
              value: group.amount,
              color:
                group.badge === 'Urgent'
                  ? 'hsl(0, 84%, 60%)'
                  : group.badge === 'Current'
                    ? 'hsl(221, 83%, 53%)'
                    : 'hsl(240, 5%, 65%)',
            }))}
            centerValue={formatBRL(apData.total)}
            centerLabel="Total a Pagar"
          />
        )}
      </div>

      {/* Accounts Payable Table */}
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 px-1">
          <h3 className="text-lg">Contas de Fornecedores Abertas</h3>
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

      <Link
        to="/receivables"
        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
      >
        Ver contas a receber (clientes) →
      </Link>

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

export default Payables;
