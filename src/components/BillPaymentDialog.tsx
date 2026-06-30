import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { payVendorBill } from "@/lib/data/vendor_bills.repo";
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

const billPaymentSchema = z.object({
  date: z.string().min(1, "A data do pagamento é obrigatória"),
  amount: z.string().min(1, "O valor é obrigatório"),
});

type BillPaymentFormData = z.infer<typeof billPaymentSchema>;

interface BillPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bill?: {
    id: string;
    billNumber: string;
    vendor: string;
    amount: number;
    currency: string;
    category?: string | null;
  } | null;
}

export function BillPaymentDialog({ open, onOpenChange, bill }: BillPaymentDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<BillPaymentFormData>({
    resolver: zodResolver(billPaymentSchema),
    defaultValues: {
      date: today(),
      amount: bill ? String(bill.amount) : "",
    },
  });

  useEffect(() => {
    if (bill) {
      form.setValue("amount", String(bill.amount));
    }
  }, [bill, form]);

  const onSubmit = async (data: BillPaymentFormData) => {
    if (!bill) return;
    setIsSubmitting(true);

    try {
      await payVendorBill({
        billId: bill.id,
        date: data.date,
        amount: parseFloat(data.amount),
        currency: bill.currency,
        billNumber: bill.billNumber,
        vendor: bill.vendor,
        category: bill.category,
      });

      toast.success("Pagamento registrado com sucesso!");
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["ap-data"] });
      queryClient.invalidateQueries({ queryKey: ["ap-detailed"] });
      queryClient.invalidateQueries({ queryKey: ["recent-activity"] });
      queryClient.invalidateQueries({ queryKey: ["cashflow-data"] });
      queryClient.invalidateQueries({ queryKey: ["expense-data"] });

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
          <DialogTitle>Registrar Pagamento</DialogTitle>
          <DialogDescription>
            Baixe o valor pago para a fatura <strong>#{bill?.billNumber}</strong> de <strong>{bill?.vendor}</strong>.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data do Pagamento</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
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
                  <FormLabel>Valor Pago ({bill?.currency})</FormLabel>
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
                {isSubmitting ? "Registrando..." : "Confirmar Pagamento"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
