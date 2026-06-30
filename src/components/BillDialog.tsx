import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listVendors } from "@/lib/data/vendors.repo";
import { createVendorBill } from "@/lib/data/vendor_bills.repo";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const today = () => new Date().toISOString().split("T")[0];

const billSchema = z.object({
  vendor_id: z.string().min(1, "O fornecedor é obrigatório"),
  issue_date: z.string().min(1, "A data de emissão é obrigatória"),
  due_date: z.string().min(1, "A data de vencimento é obrigatória"),
  amount_total: z.string().min(1, "O valor é obrigatório"),
  category: z.string().optional().or(z.literal("")),
});

type BillFormData = z.infer<typeof billSchema>;

interface BillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BillDialog({ open, onOpenChange }: BillDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const { data: vendors } = useQuery({
    queryKey: ["vendors-list"],
    queryFn: listVendors,
    enabled: open,
  });

  const form = useForm<BillFormData>({
    resolver: zodResolver(billSchema),
    defaultValues: {
      vendor_id: "",
      issue_date: today(),
      due_date: today(),
      amount_total: "",
      category: "",
    },
  });

  const onSubmit = async (data: BillFormData) => {
    setIsSubmitting(true);
    try {
      const selectedVendor = vendors?.find((v) => v.id === data.vendor_id);
      if (!selectedVendor) throw new Error("Fornecedor não encontrado");

      const amountVal = parseFloat(data.amount_total);

      await createVendorBill({
        vendor_id: selectedVendor.id,
        vendor_name: selectedVendor.name,
        issue_date: data.issue_date,
        due_date: data.due_date,
        amount_total: amountVal,
        open_amount: amountVal, // Initially all open
        original_amount: amountVal,
        original_currency: "BRL",
        status: "Open",
        category: data.category || selectedVendor.category || null,
      });

      toast.success("Conta a pagar registrada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["ap-data"] });
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      form.reset();
      onOpenChange(false);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : "Erro ao registrar fatura";
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Conta a Pagar</DialogTitle>
          <DialogDescription>
            Registre uma obrigação futura para projetar o fluxo de caixa negativo.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="vendor_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fornecedor</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o fornecedor" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {vendors?.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="issue_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Emissão</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vencimento</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount_total"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor Total (BRL)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria (Opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Sobrescrever padrão..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                {isSubmitting ? "Registrando..." : "Salvar Fatura"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
