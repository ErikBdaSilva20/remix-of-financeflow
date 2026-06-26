import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { format } from "date-fns";

interface RevenueDrillDownTableProps {
  data: any[];
  title: string;
  onClose: () => void;
  isLoading?: boolean;
}

export function RevenueDrillDownTable({ data, title, onClose, isLoading }: RevenueDrillDownTableProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      paid: "bg-green-500/10 text-green-500 hover:bg-green-500/20",
      pending: "bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20",
      overdue: "bg-red-500/10 text-red-500 hover:bg-red-500/20",
      draft: "bg-muted text-muted-foreground hover:bg-muted-hover",
    };
    return statusColors[status.toLowerCase()] || "bg-muted text-muted-foreground";
  };

  const statusLabelsPt: Record<string, string> = {
    paid: "Pago",
    pending: "Pendente",
    overdue: "Atrasado",
    draft: "Rascunho",
    open: "Aberto",
    partial: "Parcial",
    cancelled: "Cancelado",
  };

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-muted-foreground">Carregando transações...</div>
          </div>
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-muted-foreground">Nenhuma transação encontrada para esta seleção</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Valor em Aberto</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Região</TableHead>
                  <TableHead>Canal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">
                      {format(new Date(invoice.issue_date), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{invoice.customers?.name || "N/A"}</span>
                        <span className="text-xs text-muted-foreground">{invoice.customers?.email || ""}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={getStatusBadge(invoice.status)}>
                        {statusLabelsPt[invoice.status?.toLowerCase()] || invoice.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{formatCurrency(invoice.amount_total)}</TableCell>
                    <TableCell>{formatCurrency(invoice.open_amount)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{invoice.product_id || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{invoice.region || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{invoice.channel || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
