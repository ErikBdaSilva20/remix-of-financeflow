import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { Textarea } from '@/components/ui/textarea';
import { db } from '@/lib/data/client';
import type { Customer } from '@/lib/data/customers.repo';
import { createTransaction } from '@/lib/data/transactions.repo';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';

const CATEGORIES = [
  { value: 'cogs', label: 'Custo de Produtos/Serviços (CPV)' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'salaries', label: 'Salários e RH' },
  { value: 'technology', label: 'Tecnologia e Software' },
  { value: 'operations', label: 'Operações' },
  { value: 'office', label: 'Escritório' },
  { value: 'travel', label: 'Viagens' },
  { value: 'other', label: 'Outros' },
] as const;

const today = () => new Date().toISOString().split('T')[0];

const expenseSchema = z.object({
  date: z
    .string()
    .min(1, 'Data é obrigatória')
    .refine((val) => val <= today(), 'Não é permitido registrar datas futuras'),
  amount: z.string().min(1, 'Valor é obrigatório'),
  original_currency: z.string().default('BRL'),
  category: z.string().min(1, 'Categoria é obrigatória'),
  vendor: z.string().optional(),
  description: z.string().optional(),
  department: z.string().optional(),
  project_id: z.string().optional(),
  product: z.string().optional(),
  region: z.string().optional(),
  linked_to_customer: z.boolean().default(false),
  customer_id: z.string().optional(),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

interface ExpenseFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function ExpenseForm({ onSuccess, onCancel }: ExpenseFormProps) {
  const queryClient = useQueryClient();
  const [linkedToCustomer, setLinkedToCustomer] = useState(false);

  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: () => db.table<Customer>('customers').list(),
  });

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      date: today(),
      amount: '',
      original_currency: 'BRL',
      category: '',
      vendor: '',
      description: '',
      department: '',
      project_id: '',
      product: '',
      region: '',
      linked_to_customer: false,
      customer_id: undefined,
    },
  });

  const mutation = useMutation({
    mutationFn: (data: ExpenseFormData) =>
      createTransaction({
        type: 'expense',
        date: data.date,
        amount: parseFloat(data.amount),
        original_amount: parseFloat(data.amount),
        original_currency: data.original_currency,
        status: null,
        invoice_id: null,
        category: data.category,
        vendor: data.vendor || null,
        description: data.description || null,
        department: data.department || null,
        project_id: data.project_id || null,
        product: data.product || null,
        region: data.region || null,
        customer_id: linkedToCustomer && data.customer_id ? data.customer_id : null,
      }),
    onSuccess: () => {
      // invalidar todas as queries que dependem de transactions
      queryClient.invalidateQueries({ queryKey: ['expense-data'] });
      queryClient.invalidateQueries({ queryKey: ['expense-trends'] });
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['profitability-data'] });
      queryClient.invalidateQueries({ queryKey: ['revenue-expenses-periods'] });
      queryClient.invalidateQueries({ queryKey: ['financial-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['cashflow-data'] });
      queryClient.invalidateQueries({ queryKey: ['period-comparison'] });
      toast.success('Despesa registrada com sucesso');
      setLinkedToCustomer(false);
      form.reset({
        date: today(),
        amount: '',
        original_currency: 'BRL',
        category: '',
      });
      onSuccess();
    },
    onError: (error: unknown) => {
      const errMsg = error instanceof Error ? error.message : 'Erro ao registrar despesa';
      toast.error(errMsg);
    },
  });

  const handleLinkedToggle = (linked: boolean) => {
    setLinkedToCustomer(linked);
    if (!linked) form.setValue('customer_id', undefined);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
        {/* Vínculo com cliente */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Tipo de despesa</p>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={!linkedToCustomer ? 'default' : 'outline'}
              onClick={() => handleLinkedToggle(false)}
            >
              Gasto independente
            </Button>
            <Button
              type="button"
              size="sm"
              variant={linkedToCustomer ? 'default' : 'outline'}
              onClick={() => handleLinkedToggle(true)}
            >
              Vinculado a cliente
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
                <Select onValueChange={field.onChange} value={field.value ?? ''}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um cliente (opcional)" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {customers?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data *</FormLabel>
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
                <FormLabel>Valor *</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" min="0" placeholder="0,00" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Categoria *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="vendor"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fornecedor</FormLabel>
              <FormControl>
                <Input placeholder="Nome do fornecedor ou prestador" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição</FormLabel>
              <FormControl>
                <Textarea placeholder="Detalhes da despesa..." rows={2} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="department"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Departamento</FormLabel>
                <FormControl>
                  <Input placeholder="ex: Comercial" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="product"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Produto</FormLabel>
                <FormControl>
                  <Input placeholder="ex: SaaS, App Mobile" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="project_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Projeto</FormLabel>
                <FormControl>
                  <Input placeholder="ex: PROJ-001" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="region"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Região</FormLabel>
                <FormControl>
                  <Input placeholder="ex: Sul, Nordeste" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Salvando...' : 'Registrar Despesa'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

interface ExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExpenseDialog({ open, onOpenChange }: ExpenseDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Despesa</DialogTitle>
        </DialogHeader>
        <ExpenseForm onSuccess={() => onOpenChange(false)} onCancel={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
