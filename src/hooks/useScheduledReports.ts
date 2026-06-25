import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listScheduledReports,
  createScheduledReport as apiCreate,
  updateScheduledReport as apiUpdate,
  removeScheduledReport,
} from "@/lib/data/scheduled_reports.repo";
import type { ScheduledReport, ScheduledReportInsert } from "@/lib/data/scheduled_reports.repo";

export type { ScheduledReport };
export type ScheduledReportInput = ScheduledReportInsert;

// A configuração do agendamento é persistida via CRUD no gateway.
// A ENTREGA automática (gerar + enviar no horário) é cron = extensão Onda 2.
// Ver Importantdoc §A3 e TAREFAS-MIGRACAO-TEMPLATE.md E5.4.
export const useScheduledReports = () => {
  const queryClient = useQueryClient();

  const { data: scheduledReports = [], isLoading } = useQuery({
    queryKey: ["scheduled-reports"],
    queryFn: async () => {
      const rows = await listScheduledReports();
      return [...rows].sort((a, b) =>
        (a.next_run_date ?? "").localeCompare(b.next_run_date ?? "")
      );
    },
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["scheduled-reports"] });

  const createScheduledReport = useMutation({
    mutationFn: (input: ScheduledReportInput) => apiCreate(input),
    onSuccess: invalidate,
  });

  const updateScheduledReport = useMutation({
    mutationFn: ({ id, ...patch }: { id: string } & Partial<ScheduledReportInput>) =>
      apiUpdate(id, patch),
    onSuccess: invalidate,
  });

  const deleteScheduledReport = useMutation({
    mutationFn: (id: string) => removeScheduledReport(id),
    onSuccess: invalidate,
  });

  return {
    scheduledReports,
    isLoading,
    createScheduledReport,
    updateScheduledReport,
    deleteScheduledReport,
  };
};
