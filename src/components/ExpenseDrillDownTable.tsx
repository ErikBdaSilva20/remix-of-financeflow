import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { ExpenseDrillDownData } from "@/hooks/useExpenseDrillDown";
import { expenseCategoryLabel } from "@/lib/finance/expenseCategories";

interface ExpenseDrillDownTableProps {
  drillDownData: ExpenseDrillDownData | null;
  onClose: () => void;
  isLoading?: boolean;
  formatCurrency: (amount: number, date?: string) => string;
}

export function ExpenseDrillDownTable({
  drillDownData,
  onClose,
  isLoading,
  formatCurrency,
}: ExpenseDrillDownTableProps) {
  if (!drillDownData) return null;

  const getTitle = () => {
    if (drillDownData.filterType === "category") {
      return `Despesas - ${expenseCategoryLabel(drillDownData.category ?? "")}`;
    }
    return `Despesas - ${drillDownData.periodLabel}`;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold">{getTitle()}</CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fechar detalhamento de despesas">
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            Carregando transações...
          </div>
        ) : drillDownData.data.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  {drillDownData.data[0]?.category && <TableHead>Categoria</TableHead>}
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drillDownData.data.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell>{row.date}</TableCell>
                    <TableCell>{row.description}</TableCell>
                    {row.category && (
                      <TableCell>
                        <Badge variant="secondary">{expenseCategoryLabel(row.category)}</Badge>
                      </TableCell>
                    )}
                    <TableCell className="text-right font-medium">
                      {formatCurrency(row.amount, row.dateKey)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            Nenhuma transação encontrada para esta seleção
          </div>
        )}
      </CardContent>
    </Card>
  );
}
