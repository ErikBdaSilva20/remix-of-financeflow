import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listBudgets, createBudget, updateBudget } from "@/lib/data/budgets.repo";
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

const CATEGORIES = [
  { value: "cogs", label: "Custo de Produtos/Serviços (CPV)" },
  { value: "marketing", label: "Marketing" },
  { value: "salaries", label: "Salários e RH" },
  { value: "technology", label: "Tecnologia e Software" },
  { value: "operations", label: "Operações" },
  { value: "office", label: "Escritório" },
  { value: "travel", label: "Viagens" },
  { value: "other", label: "Outros" },
] as const;

const budgetSchema = z.object({
  category: z.string().min(1, "A categoria é obrigatória"),
  period_month: z.string().default("ALL"),
  amount: z.string().min(1, "O limite é obrigatório"),
});

type BudgetFormData = z.infer<typeof budgetSchema>;

interface BudgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BudgetDialog({ open, onOpenChange }: BudgetDialogProps) {
  const queryClient = useQueryClient();

  const { data: budgets } = useQuery({
    queryKey: ["budgets"],
    queryFn: listBudgets,
    enabled: open,
  });

  const form = useForm<BudgetFormData>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      category: "",
      period_month: "ALL",
      amount: "",
    },
  });

  const selectedCategory = form.watch("category");

  // Auto-fill amount if budget already exists for this category
  useEffect(() => {
    if (selectedCategory && budgets) {
      const existing = budgets.find(
        (b) => b.category === selectedCategory && b.period_month === "ALL"
      );
      if (existing) {
        form.setValue("amount", String(existing.amount));
      } else {
        form.setValue("amount", "");
      }
    }
  }, [selectedCategory, budgets, form]);

  const mutation = useMutation({
    mutationFn: async (data: BudgetFormData) => {
      const amountVal = parseFloat(data.amount);
      const existing = budgets?.find(
        (b) => b.category === data.category && b.period_month === data.period_month
      );

      if (existing) {
        return updateBudget(existing.id, { amount: amountVal });
      } else {
        return createBudget({
          category: data.category,
          period_month: data.period_month,
          amount: amountVal,
          currency: "BRL",
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      queryClient.invalidateQueries({ queryKey: ["expense-data"] }); // Update budget card
      toast.success("Orçamento configurado com sucesso");
      form.reset();
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      const errMsg = error instanceof Error ? error.message : "Erro ao configurar orçamento";
      toast.error(errMsg);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Definir Orçamento (Budget)</DialogTitle>
          <DialogDescription>
            Defina o limite mensal de gastos para uma categoria de despesa.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria de Despesa</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a categoria" />
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
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Limite Mensal (BRL)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} />
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
                disabled={mutation.isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Salvando..." : "Salvar Orçamento"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
