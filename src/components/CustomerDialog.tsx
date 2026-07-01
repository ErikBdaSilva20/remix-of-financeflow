import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createCustomer, updateCustomer, type Customer } from '@/lib/data/customers.repo';
import { db } from '@/lib/data/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import type { Database } from '@/lib/data/types.gen';

type Invoice = Database['public']['Tables']['invoices']['Row'];

const customerSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  job_type: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  invoice_id: z.string().optional(),
});

type CustomerFormData = z.infer<typeof customerSchema>;

interface CustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer | null;
  onSuccess?: (customer: Customer) => void;
}

export function CustomerDialog({ open, onOpenChange, customer, onSuccess }: CustomerDialogProps) {
  const queryClient = useQueryClient();
  const isEditing = !!customer;

  const { data: openInvoices } = useQuery({
    queryKey: ['invoices-without-customer'],
    queryFn: async () => {
      const all = await db.table<Invoice>('invoices').list();
      return all.filter(
        (inv) => !inv.customer_id && (inv.status === 'Open' || inv.status === 'Draft')
      );
    },
    enabled: !isEditing,
  });

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: customer?.name ?? '',
      email: customer?.email ?? '',
      phone: customer?.phone ?? '',
      job_type: customer?.job_type ?? '',
      address: customer?.address ?? '',
      notes: customer?.notes ?? '',
      invoice_id: '',
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      const payload = {
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        job_type: data.job_type || null,
        address: data.address || null,
        notes: data.notes || null,
      };

      let result: Customer;
      if (isEditing) {
        result = await updateCustomer(customer.id, payload);
      } else {
        result = await createCustomer(payload);
      }

      if (!isEditing && data.invoice_id) {
        await db.table('invoices').update(data.invoice_id, { customer_id: result.id });
        queryClient.invalidateQueries({ queryKey: ['ar-data'] });
        queryClient.invalidateQueries({ queryKey: ['ar-detailed'] });
      }

      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['invoices-without-customer'] });
      toast.success(isEditing ? 'Cliente atualizado' : 'Cliente criado');
      form.reset();
      onSuccess?.(result);
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erro ao salvar cliente');
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome do cliente" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="email@exemplo.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Celular</FormLabel>
                    <FormControl>
                      <Input placeholder="(11) 99999-9999" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="job_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Serviço</FormLabel>
                  <FormControl>
                    <Input placeholder="ex: Consultoria, Desenvolvimento..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Endereço</FormLabel>
                  <FormControl>
                    <Input placeholder="Endereço completo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Notas adicionais..." rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isEditing && openInvoices && openInvoices.length > 0 && (
              <FormField
                control={form.control}
                name="invoice_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vincular a fatura existente (opcional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Nenhuma" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {openInvoices.map((inv) => (
                          <SelectItem key={inv.id} value={inv.id}>
                            Fatura #{inv.id.slice(0, 8)} —{' '}
                            {inv.original_currency}{' '}
                            {inv.amount_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={mutation.isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar Cliente'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
