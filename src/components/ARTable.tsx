import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ARTableProps {
  data: Array<{
    id: string;
    invoiceNumber: string;
    customer: string;
    issueDate: string;
    dueDate: string;
    status: string;
    amount: number;
    currency: string;
    daysOutstanding: number;
    agingBucket: string;
  }>;
  formatCurrency: (amount: number, currency: string, transactionDate?: string) => string;
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
}

export function ARTable({ data, formatCurrency, page = 1, totalPages = 1, onPageChange }: ARTableProps) {
  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "success" | "outline"> = {
      Open: "default",
      Partial: "secondary",
      Paid: "success",
      Overdue: "destructive",
    };
    return variants[status] || "default";
  };

  const statusLabelsPt: Record<string, string> = {
    Open: "Aberto",
    Partial: "Parcial",
    Paid: "Pago",
    Overdue: "Atrasado",
  };

  const getAgingBadge = (bucket: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      current: "default",
      "30-60": "secondary",
      "60+": "destructive",
    };
    return variants[bucket] || "default";
  };

  if (data.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-center text-muted-foreground">Nenhuma fatura aberta encontrada</p>
      </Card>
    );
  }

  return (
    <Card>
      {/* Mobile card view */}
      <div className="sm:hidden divide-y divide-border">
        {data.map((invoice) => (
          <div key={invoice.id} className="p-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-sm">{invoice.invoiceNumber}</span>
              <Badge variant={getStatusBadge(invoice.status)} className="text-xs">{statusLabelsPt[invoice.status] || invoice.status}</Badge>
            </div>
            <div className="text-sm font-medium truncate">{invoice.customer}</div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Emissão: {new Date(invoice.issueDate).toLocaleDateString('pt-BR')}</span>
              <span>Venc.: {new Date(invoice.dueDate).toLocaleDateString('pt-BR')}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <Badge variant={getAgingBadge(invoice.agingBucket)} className="text-xs">
                {invoice.agingBucket === "current" ? "0-30 dias" :
                 invoice.agingBucket === "30-60" ? "30-60 dias" : "60+ dias"}
              </Badge>
              <span className="font-bold text-sm">{formatCurrency(invoice.amount, invoice.currency, invoice.issueDate)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table view */}
      <div className="hidden sm:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nº da Fatura</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Data de Emissão</TableHead>
              <TableHead>Data de Vencimento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Aging (Vencimento)</TableHead>
              <TableHead className="text-right">Dias Pendentes</TableHead>
              <TableHead className="text-right">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                <TableCell>{invoice.customer}</TableCell>
                <TableCell>{new Date(invoice.issueDate).toLocaleDateString()}</TableCell>
                <TableCell>{new Date(invoice.dueDate).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Badge variant={getStatusBadge(invoice.status)}>{statusLabelsPt[invoice.status] || invoice.status}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={getAgingBadge(invoice.agingBucket)}>
                    {invoice.agingBucket === "current" ? "0-30 dias" :
                     invoice.agingBucket === "30-60" ? "30-60 dias" : "60+ dias"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">{invoice.daysOutstanding}</TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(invoice.amount, invoice.currency, invoice.issueDate)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && onPageChange && (
        <div className="flex items-center justify-between p-4 border-t">
          <div className="text-sm text-muted-foreground">Página {page} de {totalPages}</div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onPageChange(page - 1)} disabled={page === 1}>
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">Anterior</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => onPageChange(page + 1)} disabled={page === totalPages}>
              <span className="hidden sm:inline mr-1">Próximo</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
