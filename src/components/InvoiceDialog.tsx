import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/data/client";
import type { Customer } from "@/lib/data/customers.repo";
import { CustomerDialog } from "@/components/CustomerDialog";
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
import { useQuery } from "@tanstack/react-query";

const today = () => new Date().toISOString().split("T")[0];

const invoiceSchema = z
  .object({
    customer_id: z.string().optional(),
    issue_date: z
      .string()
      .min(1, "A data de emissão é obrigatória")
      .refine((val) => val >= today(), "Não é permitido registrar datas no passado"),
    due_date: z
      .string()
      .optional()
      .refine((val) => !val || val >= today(), "Não é permitido registrar datas no passado"),
    has_due_date: z.boolean().default(false),
    amount_total: z.string().min(1, "O valor é obrigatório"),
    original_currency: z.string().default("BRL"),
    status: z.enum(["Draft", "Open", "Paid", "Overdue", "Cancelled", "PrepaidPending", "Scheduled"]),
    scheduled_payment_date: z.string().optional(),
    channel: z.string().optional(),
    product_id: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.status === "Scheduled") {
        return !!data.scheduled_payment_date && data.scheduled_payment_date >= today();
      }
      return true;
    },
    {
      message: "Informe uma data de pagamento válida (não pode ser no passado)",
      path: ["scheduled_payment_date"],
    }
  );

type InvoiceFormData = z.infer<typeof invoiceSchema>;

interface InvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InvoiceDialog({ open, onOpenChange }: InvoiceDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [linkedToCustomer, setLinkedToCustomer] = useState(false);
  const [hasDueDate, setHasDueDate] = useState(false);
  const queryClient = useQueryClient();

  const { data: customers } = useQuery({
    queryKey: ["customers"],
    queryFn: () => db.table<Customer>("customers").list(),
  });

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      customer_id: "",
      issue_date: today(),
      due_date: "",
      has_due_date: false,
      amount_total: "",
      original_currency: "BRL",
      status: "Open",
      scheduled_payment_date: "",
      channel: "",
      product_id: "",
    },
  });

  const watchStatus = form.watch("status");

  const handleLinkedToggle = (linked: boolean) => {
    setLinkedToCustomer(linked);
    if (!linked) form.setValue("customer_id", undefined);
  };

  const onSubmit = async (data: InvoiceFormData) => {
    setIsSubmitting(true);
    try {
      const amountTotal = parseFloat(data.amount_total);

      await db.table("invoices").create({
        customer_id: linkedToCustomer && data.customer_id ? data.customer_id : null,
        issue_date: data.issue_date,
        due_date: hasDueDate && data.due_date ? data.due_date : null,
        amount_total: amountTotal,
        open_amount: amountTotal,
        original_amount: amountTotal,
        original_currency: data.original_currency,
        status: data.status,
        scheduled_payment_date:
          data.status === "Scheduled" && data.scheduled_payment_date
            ? data.scheduled_payment_date
            : null,
        channel: data.channel || null,
        product_id: data.product_id || null,
      });

      toast.success("Fatura criada com sucesso");
      // ar/receivables
      queryClient.invalidateQueries({ queryKey: ["ar-data"] });
      queryClient.invalidateQueries({ queryKey: ["ar-detailed"] });
      queryClient.invalidateQueries({ queryKey: ["recent-activity"] });
      queryClient.invalidateQueries({ queryKey: ["dso"] });
      // revenue page
      queryClient.invalidateQueries({ queryKey: ["financial-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["revenue-trends"] });
      queryClient.invalidateQueries({ queryKey: ["revenue-data"] });
      queryClient.invalidateQueries({ queryKey: ["revenue-dimensions"] });
      queryClient.invalidateQueries({ queryKey: ["revenue-by-product-trends"] });
      queryClient.invalidateQueries({ queryKey: ["revenue-drill-down"] });
      queryClient.invalidateQueries({ queryKey: ["period-comparison"] });
      queryClient.invalidateQueries({ queryKey: ["revenue-profit-data"] });
      // dashboard
      queryClient.invalidateQueries({ queryKey: ["top-clients"] });
      queryClient.invalidateQueries({ queryKey: ["profitability-data"] });
      // cash-flow
      queryClient.invalidateQueries({ queryKey: ["cashflow-data"] });
      queryClient.invalidateQueries({ queryKey: ["accounts-balance"] });
      form.reset();
      onOpenChange(false);
    } catch (error: any) {
      const errorMessage = error?.message || "Falha ao criar a fatura";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Nova Fatura</DialogTitle>
          <DialogDescription>
            Adicione uma nova fatura para acompanhar as contas a receber
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Vínculo com cliente */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Tipo de receita</p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={!linkedToCustomer ? "default" : "outline"}
                  onClick={() => handleLinkedToggle(false)}
                >
                  Receita independente
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={linkedToCustomer ? "default" : "outline"}
                  onClick={() => handleLinkedToggle(true)}
                >
                  Vinculada a cliente
                </Button>
              </div>
            </div>

            {linkedToCustomer && (
              <FormField
                control={form.control}
                name="customer_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente</FormLabel>
                    <div className="flex items-center gap-2">
                      <Select onValueChange={field.onChange} value={field.value ?? ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um cliente" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {customers?.map((customer) => (
                            <SelectItem key={customer.id} value={customer.id}>
                              {customer.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setCustomerDialogOpen(true)}
                      >
                        + Novo
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="issue_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Emissão</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        min={today()}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <p className="text-sm font-medium">Data de Vencimento</p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={!hasDueDate ? "default" : "outline"}
                    onClick={() => { setHasDueDate(false); form.setValue("due_date", ""); }}
                  >
                    Sem vencimento
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={hasDueDate ? "default" : "outline"}
                    onClick={() => setHasDueDate(true)}
                  >
                    Definir data
                  </Button>
                </div>
                {hasDueDate && (
                  <FormField
                    control={form.control}
                    name="due_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input type="date" min={today()} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount_total"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="original_currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Moeda</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="BRL">BRL</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                        <SelectItem value="JPY">JPY</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Draft">Rascunho</SelectItem>
                      <SelectItem value="Open">Aberta</SelectItem>
                      <SelectItem value="Paid">Paga</SelectItem>
                      <SelectItem value="PrepaidPending">Pago Adiantado</SelectItem>
                      <SelectItem value="Scheduled">Marcado a Pagar</SelectItem>
                      <SelectItem value="Overdue">Atrasada</SelectItem>
                      <SelectItem value="Cancelled">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {watchStatus === "Scheduled" && (
              <FormField
                control={form.control}
                name="scheduled_payment_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Pagamento Agendada *</FormLabel>
                    <FormControl>
                      <Input type="date" min={today()} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="channel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Canal (Opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="ex: Online" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="product_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ID do Produto (Opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="ex: PROD-001" {...field} />
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
                {isSubmitting ? "Criando..." : "Criar Fatura"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>

      <CustomerDialog
        open={customerDialogOpen}
        onOpenChange={setCustomerDialogOpen}
        onSuccess={(newCustomer) => {
          queryClient.invalidateQueries({ queryKey: ["customers"] });
          form.setValue("customer_id", newCustomer.id);
          setCustomerDialogOpen(false);
        }}
      />
    </Dialog>
  );
}
