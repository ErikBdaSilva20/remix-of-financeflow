import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, TrendingUp, TrendingDown } from "lucide-react";
import { useFinancialMetrics, useRevenueSources, useExpenseCategories, useTopClients, useVendors } from "@/hooks/useFinancialData";
import { useARData, useAPData, useDSO } from "@/hooks/useReceivablesData";
import { EXPENSE_CATEGORIES, expenseCategoryLabel } from "@/lib/finance/expenseCategories";
import { toast } from "sonner";

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

const CATEGORY_GROUP: Record<string, 'cogs' | 'operating'> = Object.fromEntries(
  EXPENSE_CATEGORIES.map((c) => [c.value, c.group])
);

const Reports = () => {
  const { data: metrics, isLoading: metricsLoading } = useFinancialMetrics();
  const { data: revenueSources, isLoading: revenueLoading } = useRevenueSources();
  const { data: expenseCategories, isLoading: expenseLoading } = useExpenseCategories();
  const { data: topClients, isLoading: clientsLoading } = useTopClients();
  const { data: vendors, isLoading: vendorsLoading } = useVendors();
  const { data: arData, isLoading: arLoading } = useARData();
  const { data: apData, isLoading: apLoading } = useAPData();
  const { data: dso, isLoading: dsoLoading } = useDSO();

  const revenue = metrics?.find((m: { metric_type: string; amount: number }) => m.metric_type === 'revenue');
  const mrr = metrics?.find((m: { metric_type: string; amount: number }) => m.metric_type === 'mrr');
  // Categorias "fantasma" (só orçamento, zero despesa lançada) não devem virar
  // linha na listagem — mas continuam entrando no total do DRE (soma de 0 não muda nada).
  const categoriesWithSpend = (expenseCategories ?? []).filter((e) => e.amount > 0);
  const budgetCategories = (expenseCategories ?? []).filter((e) => e.budget_amount > 0);
  const totalExpenses = expenseCategories?.reduce((s: number, e: { amount: number }) => s + e.amount, 0) ?? 0;
  const cogsTotal = (expenseCategories ?? [])
    .filter((e) => CATEGORY_GROUP[e.category] === 'cogs')
    .reduce((s, e) => s + e.amount, 0);
  const operatingTotal = totalExpenses - cogsTotal;
  const grossProfit = (revenue?.amount ?? 0) - totalExpenses;
  const margin = revenue?.amount ? (grossProfit / revenue.amount) * 100 : 0;

  const isLoading = metricsLoading || revenueLoading || expenseLoading;

  const handleExportCsv = () => {
    let csv = '';

    csv += csvRow(['Demonstração do Resultado (DRE)']);
    csv += csvRow(['Receita Total', formatBRL(revenue?.amount ?? 0)]);
    csv += csvRow(['Custo do Produto/Serviço (CPV)', formatBRL(cogsTotal)]);
    csv += csvRow(['Despesas Operacionais', formatBRL(operatingTotal)]);
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
    categoriesWithSpend.forEach((exp: { name: string; amount: number; percentage: number }) => {
      csv += csvRow([exp.name, formatBRL(exp.amount), `${exp.percentage.toFixed(1)}%`]);
    });
    csv += '\n';

    csv += csvRow(['Orçamento vs Realizado']);
    csv += csvRow(['Categoria', 'Orçamento', 'Realizado', '% Usado']);
    budgetCategories.forEach((exp: { name: string; amount: number; budget_amount: number }) => {
      const pctUsed = exp.budget_amount > 0 ? (exp.amount / exp.budget_amount) * 100 : 0;
      csv += csvRow([exp.name, formatBRL(exp.budget_amount), formatBRL(exp.amount), `${pctUsed.toFixed(1)}%`]);
    });
    csv += '\n';

    csv += csvRow(['Top Clientes por Receita']);
    csv += csvRow(['Cliente', 'Receita']);
    (topClients ?? []).slice(0, 8).forEach((client: { name: string; revenue: number }) => {
      csv += csvRow([client.name, formatBRL(client.revenue)]);
    });
    csv += '\n';

    csv += csvRow(['Fornecedores com Maior Saldo em Aberto']);
    csv += csvRow(['Fornecedor', 'Categoria', 'Saldo em Aberto']);
    (vendors ?? []).slice(0, 8).forEach((vendor: { name: string; category: string; amount: number }) => {
      csv += csvRow([vendor.name, expenseCategoryLabel(vendor.category), formatBRL(vendor.amount)]);
    });
    csv += '\n';

    csv += csvRow(['Posição de Recebíveis e Pagáveis']);
    csv += csvRow(['Total a Receber (em aberto)', formatBRL(arData?.total ?? 0)]);
    csv += csvRow(['Total a Pagar (em aberto)', formatBRL(apData?.total ?? 0)]);
    csv += csvRow(['DSO (dias médios de recebimento)', dso != null ? `${dso}` : 'N/A']);
    csv += csvRow(['Contas a Pagar Vencidas', formatBRL(apData?.groups.find((g) => g.name === 'Past due')?.amount ?? 0)]);

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

    toast.success("Relatório exportado", { description: "O arquivo CSV foi baixado com sucesso." });
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
                    <td className="px-6 py-3 text-muted-foreground pl-10">Custo do Produto/Serviço (CPV)</td>
                    <td className="px-6 py-3 text-right font-medium text-destructive">
                      ({formatBRL(cogsTotal)})
                    </td>
                    <td className="px-6 py-3 text-right w-24">
                      <Badge variant="outline" className="text-xs">
                        {revenue?.amount ? ((cogsTotal / revenue.amount) * 100).toFixed(1) : '0'}%
                      </Badge>
                    </td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="px-6 py-3 text-muted-foreground pl-10">Despesas Operacionais</td>
                    <td className="px-6 py-3 text-right font-medium text-destructive">
                      ({formatBRL(operatingTotal)})
                    </td>
                    <td className="px-6 py-3 text-right w-24">
                      <Badge variant="outline" className="text-xs">
                        {revenue?.amount ? ((operatingTotal / revenue.amount) * 100).toFixed(1) : '0'}%
                      </Badge>
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
                ) : categoriesWithSpend.length === 0 ? (
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
                      {categoriesWithSpend.map((exp: { name: string; amount: number; percentage: number }, i: number) => (
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

            {/* Fornecedores com Maior Saldo em Aberto */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Fornecedores com Maior Saldo em Aberto</CardTitle>
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
                        <th className="px-6 py-2 text-right font-medium">Saldo em Aberto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vendors.slice(0, 8).map((vendor: { name: string; category: string; amount: number }, i: number) => (
                        <tr key={i} className="border-b border-border last:border-0">
                          <td className="px-6 py-3 font-medium">{vendor.name}</td>
                          <td className="px-6 py-3 text-muted-foreground">{expenseCategoryLabel(vendor.category)}</td>
                          <td className="px-6 py-3 text-right">{formatBRL(vendor.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>

            {/* Orçamento vs Realizado */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Orçamento vs Realizado</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {expenseLoading ? (
                  <div className="p-6 text-center text-muted-foreground text-sm">Carregando...</div>
                ) : budgetCategories.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground text-sm">Nenhum orçamento cadastrado</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="px-6 py-2 text-left font-medium">Categoria</th>
                        <th className="px-6 py-2 text-right font-medium">Orçamento</th>
                        <th className="px-6 py-2 text-right font-medium">Realizado</th>
                        <th className="px-6 py-2 text-right font-medium w-20">% Usado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {budgetCategories.map((exp: { name: string; amount: number; budget_amount: number }, i: number) => {
                        const pctUsed = exp.budget_amount > 0 ? (exp.amount / exp.budget_amount) * 100 : 0;
                        return (
                          <tr key={i} className="border-b border-border last:border-0">
                            <td className="px-6 py-3">{exp.name}</td>
                            <td className="px-6 py-3 text-right font-medium">{formatBRL(exp.budget_amount)}</td>
                            <td className="px-6 py-3 text-right">{formatBRL(exp.amount)}</td>
                            <td className="px-6 py-3 text-right">
                              <Badge variant={pctUsed > 100 ? "destructive" : "secondary"} className="text-xs">
                                {pctUsed.toFixed(1)}%
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>

            {/* Posição de Recebíveis e Pagáveis */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Posição de Recebíveis e Pagáveis</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {arLoading || apLoading || dsoLoading ? (
                  <div className="p-6 text-center text-muted-foreground text-sm">Carregando...</div>
                ) : (
                  <table className="w-full text-sm">
                    <tbody>
                      <tr className="border-b border-border">
                        <td className="px-6 py-3 text-muted-foreground">Total a Receber (em aberto)</td>
                        <td className="px-6 py-3 text-right font-medium text-success">
                          {formatBRL(arData?.total ?? 0)}
                        </td>
                      </tr>
                      <tr className="border-b border-border">
                        <td className="px-6 py-3 text-muted-foreground">Total a Pagar (em aberto)</td>
                        <td className="px-6 py-3 text-right font-medium text-destructive">
                          {formatBRL(apData?.total ?? 0)}
                        </td>
                      </tr>
                      <tr className="border-b border-border">
                        <td className="px-6 py-3 text-muted-foreground">Contas a Pagar Vencidas</td>
                        <td className="px-6 py-3 text-right font-medium text-destructive">
                          {formatBRL(apData?.groups.find((g) => g.name === 'Past due')?.amount ?? 0)}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-6 py-3 text-muted-foreground">DSO (dias médios de recebimento)</td>
                        <td className="px-6 py-3 text-right font-medium">{dso != null ? `${dso} dias` : 'N/A'}</td>
                      </tr>
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
