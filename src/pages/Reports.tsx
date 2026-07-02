import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, TrendingUp, TrendingDown } from "lucide-react";
import { useFinancialMetrics, useRevenueSources, useExpenseCategories, useTopClients, useVendors } from "@/hooks/useFinancialData";
import { toast } from "@/hooks/use-toast";

const formatBRL = (amount: number) =>
  `R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Escapa um campo pra CSV: aspas duplas ao redor de qualquer valor que
// contenha vírgula, aspas ou quebra de linha, com "" pra aspas internas.
const csvField = (value: string | number) => {
  const str = String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
};

const csvRow = (cells: (string | number)[]) => cells.map(csvField).join(',') + '\n';

const Reports = () => {
  const { data: metrics, isLoading: metricsLoading } = useFinancialMetrics({});
  const { data: revenueSources, isLoading: revenueLoading } = useRevenueSources({});
  const { data: expenseCategories, isLoading: expenseLoading } = useExpenseCategories({});
  const { data: topClients, isLoading: clientsLoading } = useTopClients();
  const { data: vendors, isLoading: vendorsLoading } = useVendors({});

  const revenue = metrics?.find((m: { metric_type: string; amount: number }) => m.metric_type === 'revenue');
  const mrr = metrics?.find((m: { metric_type: string; amount: number }) => m.metric_type === 'mrr');
  const totalExpenses = expenseCategories?.reduce((s: number, e: { amount: number }) => s + e.amount, 0) ?? 0;
  const grossProfit = (revenue?.amount ?? 0) - totalExpenses;
  const margin = revenue?.amount ? (grossProfit / revenue.amount) * 100 : 0;

  const isLoading = metricsLoading || revenueLoading || expenseLoading;

  const handleExportCsv = () => {
    let csv = '';

    csv += csvRow(['Demonstração do Resultado (DRE)']);
    csv += csvRow(['Receita Total', formatBRL(revenue?.amount ?? 0)]);
    csv += csvRow(['Total de Despesas', formatBRL(totalExpenses)]);
    csv += csvRow(['Lucro / Prejuízo', formatBRL(grossProfit)]);
    csv += csvRow(['Margem', `${margin.toFixed(1)}%`]);
    csv += csvRow(['MRR (último mês)', formatBRL(mrr?.amount ?? 0)]);
    csv += '\n';

    csv += csvRow(['Receita por Canal']);
    csv += csvRow(['Canal', 'Valor', '%']);
    (revenueSources ?? []).forEach((src: { name: string; amount: number; percentage: number }) => {
      csv += csvRow([src.name, formatBRL(src.amount), `${src.percentage.toFixed(1)}%`]);
    });
    csv += '\n';

    csv += csvRow(['Despesas por Categoria']);
    csv += csvRow(['Categoria', 'Valor', '%']);
    (expenseCategories ?? []).forEach((exp: { name: string; amount: number; percentage: number }) => {
      csv += csvRow([exp.name, formatBRL(exp.amount), `${exp.percentage.toFixed(1)}%`]);
    });
    csv += '\n';

    csv += csvRow(['Top Clientes por Receita']);
    csv += csvRow(['Cliente', 'Receita']);
    (topClients ?? []).slice(0, 8).forEach((client: { name: string; revenue: number }) => {
      csv += csvRow([client.name, formatBRL(client.revenue)]);
    });
    csv += '\n';

    csv += csvRow(['Principais Fornecedores']);
    csv += csvRow(['Fornecedor', 'Categoria', 'Valor']);
    (vendors ?? []).slice(0, 8).forEach((vendor: { name: string; category: string; amount: number }) => {
      csv += csvRow([vendor.name, vendor.category, formatBRL(vendor.amount)]);
    });

    // BOM no início pra Excel reconhecer UTF-8 e não bagunçar os acentos.
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-financeiro-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({ title: "Relatório exportado", description: "O arquivo CSV foi baixado com sucesso." });
  };

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl tracking-tight">Relatórios</h1>
          <p className="text-muted-foreground">Visão consolidada do desempenho financeiro</p>
        </div>
        <Button variant="outline" onClick={handleExportCsv} disabled={isLoading}>
          <Download className="w-4 h-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin-fast mx-auto mb-4" />
            <p className="text-muted-foreground">Carregando dados...</p>
          </div>
        </div>
      ) : (
        <>
          {/* DRE Resumo */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Demonstração do Resultado (DRE)</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-border">
                    <td className="px-6 py-3 text-muted-foreground">Receita Total</td>
                    <td className="px-6 py-3 text-right font-medium text-success">
                      {formatBRL(revenue?.amount ?? 0)}
                    </td>
                    <td className="px-6 py-3 text-right w-24">
                      <Badge variant="secondary" className="text-xs">100%</Badge>
                    </td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="px-6 py-3 text-muted-foreground">Total de Despesas</td>
                    <td className="px-6 py-3 text-right font-medium text-destructive">
                      ({formatBRL(totalExpenses)})
                    </td>
                    <td className="px-6 py-3 text-right w-24">
                      <Badge variant="outline" className="text-xs">
                        {revenue?.amount ? ((totalExpenses / revenue.amount) * 100).toFixed(1) : '0'}%
                      </Badge>
                    </td>
                  </tr>
                  <tr className="bg-muted/30">
                    <td className="px-6 py-3 font-semibold">Lucro / Prejuízo</td>
                    <td className={`px-6 py-3 text-right font-bold ${grossProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                      <span className="flex items-center justify-end gap-1">
                        {grossProfit >= 0
                          ? <TrendingUp className="w-4 h-4" />
                          : <TrendingDown className="w-4 h-4" />}
                        {formatBRL(Math.abs(grossProfit))}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right w-24">
                      <Badge variant={grossProfit >= 0 ? "secondary" : "destructive"} className="text-xs">
                        {margin.toFixed(1)}%
                      </Badge>
                    </td>
                  </tr>
                  <tr className="border-t border-border">
                    <td className="px-6 py-3 text-muted-foreground">MRR (último mês)</td>
                    <td className="px-6 py-3 text-right font-medium">{formatBRL(mrr?.amount ?? 0)}</td>
                    <td className="px-6 py-3" />
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Receita por Canal */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Receita por Canal</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {revenueLoading ? (
                  <div className="p-6 text-center text-muted-foreground text-sm">Carregando...</div>
                ) : !revenueSources || revenueSources.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground text-sm">Sem dados no período</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="px-6 py-2 text-left font-medium">Canal</th>
                        <th className="px-6 py-2 text-right font-medium">Valor</th>
                        <th className="px-6 py-2 text-right font-medium w-16">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {revenueSources.map((src: { name: string; amount: number; percentage: number }, i: number) => (
                        <tr key={i} className="border-b border-border last:border-0">
                          <td className="px-6 py-3">{src.name}</td>
                          <td className="px-6 py-3 text-right font-medium">{formatBRL(src.amount)}</td>
                          <td className="px-6 py-3 text-right text-muted-foreground">
                            {src.percentage.toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>

            {/* Despesas por Categoria */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Despesas por Categoria</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {expenseLoading ? (
                  <div className="p-6 text-center text-muted-foreground text-sm">Carregando...</div>
                ) : !expenseCategories || expenseCategories.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground text-sm">Sem dados no período</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="px-6 py-2 text-left font-medium">Categoria</th>
                        <th className="px-6 py-2 text-right font-medium">Valor</th>
                        <th className="px-6 py-2 text-right font-medium w-16">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenseCategories.map((exp: { name: string; amount: number; percentage: number }, i: number) => (
                        <tr key={i} className="border-b border-border last:border-0">
                          <td className="px-6 py-3">{exp.name}</td>
                          <td className="px-6 py-3 text-right font-medium">{formatBRL(exp.amount)}</td>
                          <td className="px-6 py-3 text-right text-muted-foreground">
                            {exp.percentage.toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>

            {/* Top Clientes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top Clientes por Receita</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {clientsLoading ? (
                  <div className="p-6 text-center text-muted-foreground text-sm">Carregando...</div>
                ) : !topClients || topClients.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground text-sm">Sem dados no período</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="px-6 py-2 text-left font-medium">#</th>
                        <th className="px-6 py-2 text-left font-medium">Cliente</th>
                        <th className="px-6 py-2 text-right font-medium">Receita</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topClients.slice(0, 8).map((client: { name: string; revenue: number }, i: number) => (
                        <tr key={i} className="border-b border-border last:border-0">
                          <td className="px-6 py-3 text-muted-foreground">{i + 1}</td>
                          <td className="px-6 py-3 font-medium">{client.name}</td>
                          <td className="px-6 py-3 text-right">{formatBRL(client.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>

            {/* Principais Fornecedores */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Principais Fornecedores</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {vendorsLoading ? (
                  <div className="p-6 text-center text-muted-foreground text-sm">Carregando...</div>
                ) : !vendors || vendors.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground text-sm">Sem dados no período</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="px-6 py-2 text-left font-medium">Fornecedor</th>
                        <th className="px-6 py-2 text-left font-medium">Categoria</th>
                        <th className="px-6 py-2 text-right font-medium">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vendors.slice(0, 8).map((vendor: { name: string; category: string; amount: number }, i: number) => (
                        <tr key={i} className="border-b border-border last:border-0">
                          <td className="px-6 py-3 font-medium">{vendor.name}</td>
                          <td className="px-6 py-3 text-muted-foreground">{vendor.category}</td>
                          <td className="px-6 py-3 text-right">{formatBRL(vendor.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default Reports;
