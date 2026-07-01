import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export interface APBillDetail {
  id: string;
  billNumber: string;
  vendor: string;
  issueDate: string;
  dueDate: string;
  status: string;
  amount: number;
  currency: string;
  daysUntilDue: number;
  category: string | null;
}

interface APTableProps {
  data: APBillDetail[];
  formatCurrency: (amount: number, currency: string, transactionDate?: string) => string;
  onPayBill?: (bill: APBillDetail) => void;
}

export function APTable({ data, formatCurrency, onPayBill }: APTableProps) {
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

  const getUrgencyBadge = (daysUntilDue: number) => {
    if (daysUntilDue < 0) return { variant: "destructive" as const, label: "Vencido" };
    if (daysUntilDue <= 7) return { variant: "destructive" as const, label: "Vence Logo" };
    if (daysUntilDue <= 30) return { variant: "secondary" as const, label: "No Prazo" };
    return { variant: "default" as const, label: "Futuro" };
  };

  if (data.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-center text-muted-foreground">Nenhuma conta de fornecedor aberta encontrada</p>
      </Card>
    );
  }

  return (
    <Card>
      {/* Mobile card view */}
      <div className="sm:hidden divide-y divide-border">
        {data.map((bill) => {
          const urgency = getUrgencyBadge(bill.daysUntilDue);
          return (
            <div key={bill.id} className="p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-sm">{bill.billNumber}</span>
                <Badge variant={urgency.variant} className="text-xs">{urgency.label}</Badge>
              </div>
              <div className="text-sm font-medium truncate">{bill.vendor}</div>
              {bill.category && <div className="text-xs text-muted-foreground">{bill.category}</div>}
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Emissão: {new Date(bill.issueDate).toLocaleDateString('pt-BR')}</span>
                <span>Venc.: {new Date(bill.dueDate).toLocaleDateString('pt-BR')}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <Badge variant={getStatusBadge(bill.status)} className="text-xs">{statusLabelsPt[bill.status] || bill.status}</Badge>
                <span className="font-bold text-sm">{formatCurrency(bill.amount, bill.currency, bill.issueDate)}</span>
              </div>
              {onPayBill && (bill.status === "Open" || bill.status === "Partial" || bill.status === "Overdue") && (
                <div className="pt-2">
                  <Button size="sm" className="w-full" onClick={() => onPayBill(bill)}>
                    Pagar
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop table view */}
      <div className="hidden sm:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nº da Conta</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Data de Emissão</TableHead>
              <TableHead>Data de Vencimento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Urgência</TableHead>
              <TableHead className="text-right">Dias Até Vencer</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((bill) => {
              const urgency = getUrgencyBadge(bill.daysUntilDue);
              return (
                <TableRow key={bill.id}>
                  <TableCell className="font-medium">{bill.billNumber}</TableCell>
                  <TableCell>{bill.vendor}</TableCell>
                  <TableCell>{bill.category || "—"}</TableCell>
                  <TableCell>{new Date(bill.issueDate).toLocaleDateString()}</TableCell>
                  <TableCell>{new Date(bill.dueDate).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadge(bill.status)}>{statusLabelsPt[bill.status] || bill.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={urgency.variant}>{urgency.label}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {bill.daysUntilDue < 0 ? `${Math.abs(bill.daysUntilDue)} dias` : bill.daysUntilDue}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(bill.amount, bill.currency, bill.issueDate)}
                  </TableCell>
                  <TableCell>
                    {onPayBill && (bill.status === "Open" || bill.status === "Partial" || bill.status === "Overdue") && (
                      <Button size="sm" variant="default" onClick={() => onPayBill(bill)}>
                        Pagar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
