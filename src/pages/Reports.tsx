import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Plus, Trash2, TrendingUp, TrendingDown } from "lucide-react";
import { useFinancialMetrics, useRevenueSources, useExpenseCategories, useTopClients, useVendors } from "@/hooks/useFinancialData";
import { useScheduledReports } from "@/hooks/useScheduledReports";
import { ScheduleReportDialog } from "@/components/ScheduleReportDialog";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const formatBRL = (amount: number) =>
  `R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const Reports = () => {
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState<string | null>(null);

  const { data: metrics, isLoading: metricsLoading } = useFinancialMetrics({});
  const { data: revenueSources, isLoading: revenueLoading } = useRevenueSources({});
  const { data: expenseCategories, isLoading: expenseLoading } = useExpenseCategories({});
  const { data: topClients, isLoading: clientsLoading } = useTopClients();
  const { data: vendors, isLoading: vendorsLoading } = useVendors({});

  const { scheduledReports, isLoading: isLoadingSchedules, createScheduledReport, updateScheduledReport, deleteScheduledReport } = useScheduledReports();

  const revenue = metrics?.find((m: any) => m.metric_type === 'revenue');
  const mrr = metrics?.find((m: any) => m.metric_type === 'mrr');
  const totalExpenses = expenseCategories?.reduce((s: number, e: any) => s + e.amount, 0) ?? 0;
  const grossProfit = (revenue?.amount ?? 0) - totalExpenses;
  const margin = revenue?.amount ? (grossProfit / revenue.amount) * 100 : 0;

  const isLoading = metricsLoading || revenueLoading || expenseLoading;

  const handleScheduleSubmit = async (data: any) => {
    try {
      if (editingSchedule) {
        updateScheduledReport.mutate({ id: editingSchedule.id, ...data });
        toast({ title: "Agendamento atualizado", description: "O agendamento foi atualizado com sucesso." });
      } else {
        createScheduledReport.mutate(data);
        toast({ title: "Agendamento criado", description: "O relatório foi agendado com sucesso." });
      }
      setEditingSchedule(null);
    } catch {
      toast({ title: "Erro", description: "Falha ao salvar o agendamento.", variant: "destructive" });
    }
  };

  const handleDeleteSchedule = async () => {
    if (!scheduleToDelete) return;
    try {
      deleteScheduledReport.mutate(scheduleToDelete);
      toast({ title: "Agendamento excluído", description: "O agendamento foi excluído." });
    } catch {
      toast({ title: "Erro", description: "Falha ao excluir o agendamento.", variant: "destructive" });
    }
    setDeleteDialogOpen(false);
    setScheduleToDelete(null);
  };

  const frequencyNames: Record<string, string> = {
    daily: 'Diário', weekly: 'Semanal', monthly: 'Mensal', quarterly: 'Trimestral', yearly: 'Anual',
  };

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl tracking-tight">Relatórios</h1>
          <p className="text-muted-foreground">Visão consolidada do desempenho financeiro</p>
        </div>
        <Button variant="outline" onClick={() => { setEditingSchedule(null); setScheduleDialogOpen(true); }}>
          <Calendar className="w-4 h-4 mr-2" />
          Agendar Relatório
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
                      {revenueSources.map((src: any, i: number) => (
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
                      {expenseCategories.map((exp: any, i: number) => (
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
                      {topClients.slice(0, 8).map((client: any, i: number) => (
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
                      {vendors.slice(0, 8).map((vendor: any, i: number) => (
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

      {/* Relatórios Agendados */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Relatórios Agendados</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Entrega automática em breve — por ora os agendamentos ficam salvos como configuração.
              </p>
            </div>
            <Button size="sm" onClick={() => { setEditingSchedule(null); setScheduleDialogOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Agendamento
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingSchedules ? (
            <div className="text-center p-4 text-muted-foreground text-sm">Carregando agendamentos...</div>
          ) : scheduledReports && scheduledReports.length > 0 ? (
            <div className="space-y-2">
              {scheduledReports.map((schedule: any) => (
                <div key={schedule.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium text-sm">{schedule.report_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {frequencyNames[schedule.frequency] || schedule.frequency}
                      {schedule.next_run_date && (
                        <> • Próxima execução: {new Date(schedule.next_run_date).toLocaleDateString()}</>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={schedule.is_active ? "secondary" : "outline"} className="text-xs">
                      {schedule.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                    <Button size="sm" variant="outline" onClick={() => { setEditingSchedule(schedule); setScheduleDialogOpen(true); }}>
                      Editar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setScheduleToDelete(schedule.id); setDeleteDialogOpen(true); }}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center p-6 border-2 border-dashed rounded-lg">
              <div className="text-center">
                <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <div className="font-medium text-sm">Nenhum relatório agendado</div>
                <div className="text-xs text-muted-foreground mb-3">Configure a geração automática de relatórios</div>
                <Button size="sm" onClick={() => { setEditingSchedule(null); setScheduleDialogOpen(true); }}>
                  <Calendar className="w-4 h-4 mr-2" />
                  Agendar Relatório
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <ScheduleReportDialog
        open={scheduleDialogOpen}
        onOpenChange={setScheduleDialogOpen}
        onSubmit={handleScheduleSubmit}
        initialData={editingSchedule}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Relatório Agendado</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza de que deseja excluir este agendamento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSchedule}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Reports;
