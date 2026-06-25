import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface NotificationSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationSettingsDialog({
  open,
  onOpenChange,
}: NotificationSettingsDialogProps) {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [inAppNotifications, setInAppNotifications] = useState(true);
  const [transactionAlerts, setTransactionAlerts] = useState(true);
  const [monthlyReports, setMonthlyReports] = useState(false);
  const [email, setEmail] = useState("");

  const handleSave = () => {
    toast.success("Notification settings saved successfully!");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Configurações de Notificação</DialogTitle>
          <DialogDescription>
            Configure como você deseja receber notificações sobre suas atividades financeiras.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="email">Endereço de E-mail</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu.email@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Enviaremos notificações para este endereço de e-mail
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="in-app-notifications">Notificações no App</Label>
                <p className="text-sm text-muted-foreground">
                  Mostrar notificações dentro do aplicativo
                </p>
              </div>
              <Switch
                id="in-app-notifications"
                checked={inAppNotifications}
                onCheckedChange={setInAppNotifications}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email-notifications">Notificações por E-mail</Label>
                <p className="text-sm text-muted-foreground">
                  Receber atualizações por e-mail sobre sua conta
                </p>
              </div>
              <Switch
                id="email-notifications"
                checked={emailNotifications}
                onCheckedChange={setEmailNotifications}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="transaction-alerts">Alertas de Transação</Label>
                <p className="text-sm text-muted-foreground">
                  Receber alertas instantâneos para todas as transações
                </p>
              </div>
              <Switch
                id="transaction-alerts"
                checked={transactionAlerts}
                onCheckedChange={setTransactionAlerts}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="monthly-reports">Relatórios Mensais</Label>
                <p className="text-sm text-muted-foreground">
                  Receber resumos financeiros mensais
                </p>
              </div>
              <Switch
                id="monthly-reports"
                checked={monthlyReports}
                onCheckedChange={setMonthlyReports}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>Salvar Configurações</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
