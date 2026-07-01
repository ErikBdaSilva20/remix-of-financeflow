import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InvoiceForm } from "@/components/InvoiceDialog";
import { ExpenseForm } from "@/components/ExpenseDialog";

type EntrySection = "revenue" | "expense";

interface EntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultSection?: EntrySection;
}

export function EntryDialog({ open, onOpenChange, defaultSection = "revenue" }: EntryDialogProps) {
  const [section, setSection] = useState<EntrySection>(defaultSection);

  const close = () => onOpenChange(false);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setSection(defaultSection);
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Lançamento</DialogTitle>
          <DialogDescription>
            Registre uma fatura ou uma despesa
          </DialogDescription>
        </DialogHeader>

        <Tabs value={section} onValueChange={(v) => setSection(v as EntrySection)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="revenue">Fatura / Receita</TabsTrigger>
            <TabsTrigger value="expense">Despesa</TabsTrigger>
          </TabsList>

          <TabsContent value="revenue">
            <InvoiceForm onSuccess={close} onCancel={close} />
          </TabsContent>
          <TabsContent value="expense">
            <ExpenseForm onSuccess={close} onCancel={close} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
