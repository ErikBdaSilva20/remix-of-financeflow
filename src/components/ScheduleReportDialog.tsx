import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScheduledReport, ScheduledReportInput } from "@/hooks/useScheduledReports";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScheduleReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ScheduledReportInput) => void;
  initialData?: ScheduledReport | null;
}

const emptyForm: ScheduledReportInput = {
  report_type: "profit-loss",
  report_name: "",
  frequency: "monthly",
  next_run_date: null,
  is_active: true,
};

export const ScheduleReportDialog = ({
  open,
  onOpenChange,
  onSubmit,
  initialData,
}: ScheduleReportDialogProps) => {
  const [formData, setFormData] = useState<ScheduledReportInput>(emptyForm);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();

  useEffect(() => {
    if (initialData) {
      setFormData({
        report_type: initialData.report_type,
        report_name: initialData.report_name,
        frequency: initialData.frequency,
        next_run_date: initialData.next_run_date,
        is_active: initialData.is_active,
      });
      setSelectedDate(initialData.next_run_date ? new Date(initialData.next_run_date) : undefined);
    } else {
      setFormData(emptyForm);
      setSelectedDate(undefined);
    }
  }, [initialData, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Editar Relatório Agendado" : "Agendar Novo Relatório"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="report_name">Nome do Relatório</Label>
            <Input
              id="report_name"
              value={formData.report_name}
              onChange={(e) => setFormData({ ...formData, report_name: e.target.value })}
              placeholder="Ex: Relatório Mensal de DRE"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="report_type">Tipo de Relatório</Label>
            <Select
              value={formData.report_type}
              onValueChange={(value) => setFormData({ ...formData, report_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="profit-loss">Demonstração de Resultados (DRE)</SelectItem>
                <SelectItem value="balance-sheet">Balanço Patrimonial</SelectItem>
                <SelectItem value="cash-flow">Demonstração do Fluxo de Caixa</SelectItem>
                <SelectItem value="tax-summary">Relatório Resumido de Impostos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="frequency">Frequência</Label>
            <Select
              value={formData.frequency}
              onValueChange={(value) => setFormData({ ...formData, frequency: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Diário</SelectItem>
                <SelectItem value="weekly">Semanal</SelectItem>
                <SelectItem value="monthly">Mensal</SelectItem>
                <SelectItem value="quarterly">Trimestral</SelectItem>
                <SelectItem value="yearly">Anual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="next_run_date">Próxima Execução</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "dd/MM/yyyy") : <span>Escolha uma data</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-background border z-50" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    setSelectedDate(date);
                    setFormData({ ...formData, next_run_date: date ? format(date, "yyyy-MM-dd") : null });
                  }}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="is_active">Ativo</Label>
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
          </div>

          <div className="flex gap-2 rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              O agendamento é salvo, mas a <strong>geração e o envio automáticos</strong> no horário
              dependem de integração de servidor (em breve).
            </span>
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              {initialData ? "Atualizar Agendamento" : "Criar Agendamento"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
