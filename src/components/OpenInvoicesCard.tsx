import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { ARInvoice } from '@/components/ARTable';
import { Link } from 'react-router-dom';

const statusLabelsPt: Record<string, string> = {
  Open: 'Aberto',
  Partial: 'Parcial',
  Overdue: 'Atrasado',
  'Partially Paid': 'Parcialmente Pago',
};

const statusVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Open: 'default',
  Partial: 'secondary',
  Overdue: 'destructive',
  'Partially Paid': 'secondary',
};

interface OpenInvoicesCardProps {
  invoices: ARInvoice[];
  totalCount: number;
  formatCurrency: (amount: number) => string;
  onReceivePayment: (invoice: ARInvoice) => void;
}

export function OpenInvoicesCard({
  invoices,
  totalCount,
  formatCurrency,
  onReceivePayment,
}: OpenInvoicesCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-lg">Prévia — Faturas a Receber</CardTitle>
          <CardDescription>
            As {invoices.length} mais próximas do vencimento. Cobrança e gestão completa ficam em
            Contas a Receber.
          </CardDescription>
        </div>
        <Link
          to="/receivables"
          className="shrink-0 whitespace-nowrap text-xs font-medium text-primary hover:underline"
        >
          Ver todas →
        </Link>
      </CardHeader>
      <CardContent>
        {invoices.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            Nenhuma fatura em aberto
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Valor em Aberto</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.customer}</TableCell>
                    <TableCell>
                      {invoice.dueDate
                        ? new Date(invoice.dueDate).toLocaleDateString('pt-BR')
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariants[invoice.status] || 'default'}>
                        {statusLabelsPt[invoice.status] || invoice.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(invoice.amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => onReceivePayment(invoice)}>
                        Receber
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {totalCount > invoices.length && (
              <p className="text-xs text-muted-foreground mt-3 text-center">
                Mostrando {invoices.length} de {totalCount} faturas em aberto
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
