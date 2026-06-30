import { Button } from '@/components/ui/button';
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
import { createBankTransaction } from '@/lib/data/bank_transactions.repo';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';

const today = () => new Date().toISOString().split('T')[0];

const transactionSchema = z.object({
  date: z.string().min(1, 'A data é obrigatória'),
  type: z.enum(['in', 'out']),
  amount: z.string().min(1, 'O valor é obrigatório'),
  original_currency: z.string().default('BRL'),
  category: z.string().optional(),
  counterparty: z.string().optional(),
  description: z.string().optional(),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

interface TransactionFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function TransactionForm({ onSuccess, onCancel }: TransactionFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      date: today(),
      type: 'in',
      amount: '',
      original_currency: 'BRL',
      category: '',
      counterparty: '',
      description: '',
    },
  });

  const onSubmit = async (data: TransactionFormData) => {
    setIsSubmitting(true);
    try {
      const amountVal = parseFloat(data.amount);
      // If type is 'out', amount should be negative
      const finalAmount = data.type === 'out' ? -amountVal : amountVal;

      await createBankTransaction({
        date: data.date,
        amount: finalAmount,
        original_amount: amountVal,
        original_currency: data.original_currency,
        type: data.type,
        category: data.category || null,
        counterparty: data.counterparty || null,
        description: data.description || null,
      });

      toast.success('Transação registrada com sucesso');

      // Invalidate queries to update Cash Flow and Overview dashboards
      queryClient.invalidateQueries({ queryKey: ['cashflow-data'] });
      queryClient.invalidateQueries({ queryKey: ['cashflow-drilldown'] });
      queryClient.invalidateQueries({ queryKey: ['financial-metrics'] });

      form.reset();
      onSuccess();
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Erro ao registrar transação';
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Transação</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="in">Entrada (Depósito / Receita)</SelectItem>
                    <SelectItem value="out">Saída (Pagamento / Despesa)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data da Transação</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="amount"
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

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Categoria (Opcional)</FormLabel>
                <FormControl>
                  <Input placeholder="ex: Marketing, Licença" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="counterparty"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contraparte (Opcional)</FormLabel>
                <FormControl>
                  <Input placeholder="ex: Google LLC" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição (Opcional)</FormLabel>
              <FormControl>
                <Input placeholder="ex: Pagamento mensal de licença SaaS" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Registrando...' : 'Registrar Transação'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

interface TransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransactionDialog({ open, onOpenChange }: TransactionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Transação Bancária</DialogTitle>
          <DialogDescription>
            Adicione uma entrada ou saída diretamente do extrato bancário
          </DialogDescription>
        </DialogHeader>
        <TransactionForm
          onSuccess={() => onOpenChange(false)}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
