import { CustomerDialog } from '@/components/CustomerDialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { db } from '@/lib/data/client';
import type { Customer } from '@/lib/data/customers.repo';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';

const today = () => new Date().toISOString().split('T')[0];

const invoiceSchema = z
  .object({
    customer_id: z.string().optional(),
    issue_date: z.string().min(1, 'A data de emissão é obrigatória'),
    due_date: z
      .string()
      .optional()
      .refine((val) => !val || val >= today(), 'Não é permitido registrar datas no passado'),
    has_due_date: z.boolean().default(false),
    amount_total: z.string().min(1, 'O valor é obrigatório'),
    original_currency: z.string().default('BRL'),
    status: z.enum(['Open', 'Paid', 'PrepaidPending']),
    channel: z.string().optional(),
    product_id: z.string().optional(),
    // Data futura só é permitida quando o usuário confirma que é um recebimento
    // adiantado — evita lançamentos acidentais como "2030" virarem receita real.
    confirmAdvance: z.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    if (data.issue_date < today()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Não é permitido registrar datas no passado',
        path: ['issue_date'],
      });
    } else if (data.issue_date > today() && !data.confirmAdvance) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Confirme abaixo que é um recebimento adiantado para usar uma data futura',
        path: ['confirmAdvance'],
      });
    }
  });

type InvoiceFormData = z.infer<typeof invoiceSchema>;

interface InvoiceFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function InvoiceForm({ onSuccess, onCancel }: InvoiceFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [linkedToCustomer, setLinkedToCustomer] = useState(false);
  const [hasDueDate, setHasDueDate] = useState(false);
  const queryClient = useQueryClient();

  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: () => db.table<Customer>('customers').list(),
  });

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      customer_id: '',
      issue_date: today(),
      due_date: '',
      has_due_date: false,
      amount_total: '',
      original_currency: 'BRL',
      status: 'Open',
      channel: '',
      product_id: '',
      confirmAdvance: false,
    },
  });

  const issueDateValue = form.watch('issue_date');
  const confirmAdvance = form.watch('confirmAdvance');
  const isFutureDate = issueDateValue > today();

  // Data futura só faz sentido como recebimento adiantado — trava o status
  // em "Pago Adiantado" assim que o usuário confirma, evitando um estado
  // contraditório (ex: fatura "Aberta" datada em 2030).
  useEffect(() => {
    if (isFutureDate && confirmAdvance) {
      form.setValue('status', 'PrepaidPending');
    }
  }, [isFutureDate, confirmAdvance, form]);

  const handleLinkedToggle = (linked: boolean) => {
    setLinkedToCustomer(linked);
    if (!linked) form.setValue('customer_id', undefined);
  };

  const onSubmit = async (data: InvoiceFormData) => {
    setIsSubmitting(true);
    try {
      const amountTotal = parseFloat(data.amount_total);

      await db.table('invoices').create({
        customer_id: linkedToCustomer && data.customer_id ? data.customer_id : null,
        issue_date: data.issue_date,
        due_date: hasDueDate && data.due_date ? data.due_date : null,
        amount_total: amountTotal,
        // Fatura "Aberta" mantém o valor cheio a receber; realizada (Paid/PrepaidPending) já nasce quitada
        open_amount: data.status === 'Open' ? amountTotal : 0,
        original_amount: amountTotal,
        original_currency: data.original_currency,
        status: data.status,
        channel: data.channel || null,
        product_id: data.product_id || null,
      });

      toast.success('Fatura criada com sucesso');
      // ar/receivables
      queryClient.invalidateQueries({ queryKey: ['ar-data'] });
      queryClient.invalidateQueries({ queryKey: ['ar-detailed'] });
      queryClient.invalidateQueries({ queryKey: ['recent-activity'] });
      queryClient.invalidateQueries({ queryKey: ['dso'] });
      // revenue page
      queryClient.invalidateQueries({ queryKey: ['financial-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['revenue-trends'] });
      queryClient.invalidateQueries({ queryKey: ['revenue-data'] });
      queryClient.invalidateQueries({ queryKey: ['revenue-dimensions'] });
      queryClient.invalidateQueries({ queryKey: ['revenue-by-product-trends'] });
      queryClient.invalidateQueries({ queryKey: ['revenue-drill-down'] });
      queryClient.invalidateQueries({ queryKey: ['period-comparison'] });
      queryClient.invalidateQueries({ queryKey: ['revenue-expenses-periods'] });
      queryClient.invalidateQueries({ queryKey: ['weekly-breakdown'] });
      // dashboard
      queryClient.invalidateQueries({ queryKey: ['top-clients'] });
      queryClient.invalidateQueries({ queryKey: ['profitability-data'] });
      // cash-flow
      queryClient.invalidateQueries({ queryKey: ['cashflow-data'] });
      form.reset();
      onSuccess();
    } catch (error: any) {
      const errorMessage = error?.message || 'Falha ao criar a fatura';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Vínculo com cliente */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Tipo de receita</p>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={!linkedToCustomer ? 'default' : 'outline'}
                onClick={() => handleLinkedToggle(false)}
              >
                Receita independente
              </Button>
              <Button
                type="button"
                size="sm"
                variant={linkedToCustomer ? 'default' : 'outline'}
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
                    <Select onValueChange={field.onChange} value={field.value ?? ''}>
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
                    <Input type="date" min={today()} {...field} />
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
                  variant={!hasDueDate ? 'default' : 'outline'}
                  onClick={() => {
                    setHasDueDate(false);
                    form.setValue('due_date', '');
                  }}
                >
                  Sem vencimento
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={hasDueDate ? 'default' : 'outline'}
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

          {isFutureDate && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="space-y-2">
                <p>
                  Esta data de emissão é futura. Isso só é permitido para um{' '}
                  <strong>recebimento adiantado</strong> — o status será travado em
                  "Pago Adiantado".
                </p>
                <FormField
                  control={form.control}
                  name="confirmAdvance"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <div className="flex flex-row items-center gap-2">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Confirmo que é um recebimento adiantado
                        </FormLabel>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </AlertDescription>
            </Alert>
          )}

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
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={isFutureDate}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Open">Aberta (a receber)</SelectItem>
                    <SelectItem value="Paid">Paga</SelectItem>
                    <SelectItem value="PrepaidPending">Pago Adiantado</SelectItem>
                  </SelectContent>
                </Select>
                {isFutureDate && (
                  <p className="text-xs text-muted-foreground">
                    Travado em "Pago Adiantado" por causa da data de emissão futura.
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

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
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Criando...' : 'Criar Fatura'}
            </Button>
          </div>
        </form>
      </Form>

      <CustomerDialog
        open={customerDialogOpen}
        onOpenChange={setCustomerDialogOpen}
        onSuccess={(newCustomer) => {
          queryClient.invalidateQueries({ queryKey: ['customers'] });
          form.setValue('customer_id', newCustomer.id);
          setCustomerDialogOpen(false);
        }}
      />
    </>
  );
}

interface InvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InvoiceDialog({ open, onOpenChange }: InvoiceDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Nova Fatura</DialogTitle>
          <DialogDescription>
            Adicione uma nova fatura para acompanhar as contas a receber
          </DialogDescription>
        </DialogHeader>
        <InvoiceForm onSuccess={() => onOpenChange(false)} onCancel={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
