import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/data/client";
import type { Invoice } from "@/lib/data/invoices.repo";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const today = () => new Date().toISOString().split("T")[0];

const paymentSchema = z.object({
  date: z
    .string()
    .min(1, "A data do pagamento é obrigatória")
    .refine((val) => val <= today(), "Não é permitido registrar datas futuras"),
  amount: z.string().min(1, "O valor é obrigatório"),
  original_currency: z.string().default("BRL"),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice?: {
    id: string;
    invoiceNumber: string;
    customer: string;
    amount: number;
    currency: string;
  } | null;
}

export function PaymentDialog({ open, onOpenChange, invoice }: PaymentDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      date: today(),
      amount: invoice ? String(invoice.amount) : "",
      original_currency: invoice?.currency || "BRL",
    },
  });

  // react-hook-form's defaultValues are captured once at mount, when `invoice` is
  // still null (the dialog is mounted before the user ever picks a row). Re-sync
  // the form explicitly whenever the dialog opens with an invoice.
  useEffect(() => {
    if (open && invoice) {
      form.setValue("date", today());
      form.setValue("amount", String(invoice.amount));
      form.setValue("original_currency", invoice.currency);
    }
  }, [open, invoice, form]);

  const onSubmit = async (data: PaymentFormData) => {
    if (!invoice) return;
    setIsSubmitting(true);

    try {
      const amountPaid = parseFloat(data.amount);

      // 1. Create the income transaction (recebimento de fatura)
      await db.table("transactions").create({
        type: "income",
        invoice_id: invoice.id,
        date: data.date,
        amount: amountPaid,
        original_amount: amountPaid,
        original_currency: data.original_currency,
        status: "Received",
      });

      // 2. Fetch the invoice to get current state (or we can just calculate)
      // Since db client doesn't have get, we can fetch all invoices and filter
      const allInvoices = await db.table<Invoice>("invoices").list();
      const currentInvoice = allInvoices.find((i) => i.id === invoice.id);
      
      if (currentInvoice) {
        const currentOpenAmount = Number(currentInvoice.open_amount ?? currentInvoice.amount_total);
        const newOpenAmount = Math.max(0, currentOpenAmount - amountPaid);
        const newStatus = newOpenAmount <= 0 ? "Paid" : "Partial";

        // 3. Update the invoice status and open amount
        await db.table("invoices").update(invoice.id, {
          open_amount: newOpenAmount,
          status: newStatus,
        });
      }

      toast.success("Recebimento registrado com sucesso!");
      
      // Invalidate queries to refresh charts and tables
      queryClient.invalidateQueries({ queryKey: ["ar-data"] });
      queryClient.invalidateQueries({ queryKey: ["ar-detailed"] });
      queryClient.invalidateQueries({ queryKey: ["recent-activity"] });
      queryClient.invalidateQueries({ queryKey: ["financial-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["revenue-trends"] });
      queryClient.invalidateQueries({ queryKey: ["cashflow-data"] });
      queryClient.invalidateQueries({ queryKey: ["period-comparison"] });

      form.reset();
      onOpenChange(false);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : "Erro ao registrar o pagamento";
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Recebimento</DialogTitle>
          <DialogDescription>
            Baixe o valor recebido para a fatura <strong>#{invoice?.invoiceNumber}</strong> de <strong>{invoice?.customer}</strong>.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data do Recebimento</FormLabel>
                  <FormControl>
                    <Input type="date" max={today()} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor Recebido ({invoice?.currency})</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Registrando..." : "Confirmar Recebimento"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
