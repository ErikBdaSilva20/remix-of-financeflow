import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listBudgets, createBudget, updateBudget, removeBudget, type Budget } from "@/lib/data/budgets.repo";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Pencil, Trash2, Check, X, Plus } from "lucide-react";
import { EXPENSE_CATEGORIES, expenseCategoryLabel } from "@/lib/finance/expenseCategories";
import { invalidateBudgetQueries } from "@/lib/finance/queryInvalidation";

const budgetSchema = z.object({
  category: z.string().min(1, "A categoria é obrigatória"),
  amount: z.string().min(1, "O limite é obrigatório"),
});

type BudgetFormData = z.infer<typeof budgetSchema>;

interface BudgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Categoria pra abrir o modal já focada nela — vinda de um clique em "Orçamento Máximo vs Realizado". */
  focusCategory?: string | null;
}

function BudgetRow({
  budget,
  editing,
  onEdit,
  onCancelEdit,
  onRequestDelete,
  rowRef,
}: {
  budget: Budget;
  editing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onRequestDelete: (budget: Budget) => void;
  rowRef?: (el: HTMLDivElement | null) => void;
}) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState(String(budget.amount));

  useEffect(() => {
    if (editing) setAmount(String(budget.amount));
  }, [editing, budget.amount]);

  const updateMutation = useMutation({
    mutationFn: (amountVal: number) => updateBudget(budget.id, { amount: amountVal }),
    onSuccess: () => {
      invalidateBudgetQueries(queryClient);
      toast.success("Orçamento atualizado");
      onCancelEdit();
    },
    onError: (error: unknown) => {
      const errMsg = error instanceof Error ? error.message : "Erro ao atualizar orçamento";
      toast.error(errMsg);
    },
  });

  const handleSave = () => {
    const amountVal = parseFloat(amount);
    if (Number.isNaN(amountVal) || amountVal < 0) {
      toast.error("Informe um valor válido");
      return;
    }
    updateMutation.mutate(amountVal);
  };

  return (
    <div
      ref={rowRef}
      className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 transition-colors ${editing ? 'border-primary/50 bg-primary/5' : 'border-border'}`}
    >
      <span className="text-sm font-medium text-foreground">{expenseCategoryLabel(budget.category)}</span>
      {editing ? (
        <div className="flex items-center gap-1.5">
          <Input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-8 w-28 text-right"
            autoFocus
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={handleSave}
            disabled={updateMutation.isPending}
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => {
              setAmount(String(budget.amount));
              onCancelEdit();
            }}
            disabled={updateMutation.isPending}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-muted-foreground">
            {budget.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={onEdit}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => onRequestDelete(budget)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}

export function BudgetDialog({ open, onOpenChange, focusCategory }: BudgetDialogProps) {
  const queryClient = useQueryClient();
  const [deletingBudget, setDeletingBudget] = useState<Budget | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const rowRefs = useRef(new Map<string, HTMLDivElement | null>()).current;

  const { data: budgets } = useQuery({
    queryKey: ["budgets"],
    queryFn: listBudgets,
    enabled: open,
  });

  const budgetedCategories = new Set((budgets ?? []).map((b) => b.category));
  const availableCategories = EXPENSE_CATEGORIES.filter((c) => !budgetedCategories.has(c.value));

  const form = useForm<BudgetFormData>({
    resolver: zodResolver(budgetSchema),
    defaultValues: { category: "", amount: "" },
  });

  // Ao abrir o modal focado numa categoria (clique em "Orçamento Máximo vs Realizado"):
  // se já existe orçamento pra ela, entra direto em modo edição; senão, deixa a
  // categoria pré-selecionada no formulário de "Adicionar categoria".
  useEffect(() => {
    if (!open) {
      setEditingId(null);
      return;
    }
    if (!focusCategory || !budgets) return;
    const existing = budgets.find((b) => b.category === focusCategory);
    if (existing) {
      setEditingId(existing.id);
      rowRefs.get(existing.id)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    } else {
      form.setValue("category", focusCategory);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, focusCategory, budgets]);

  const createMutation = useMutation({
    mutationFn: (data: BudgetFormData) =>
      createBudget({
        category: data.category,
        period_month: "ALL",
        amount: parseFloat(data.amount),
        currency: "BRL",
      }),
    onSuccess: () => {
      invalidateBudgetQueries(queryClient);
      toast.success("Orçamento adicionado");
      form.reset({ category: "", amount: "" });
    },
    onError: (error: unknown) => {
      const errMsg = error instanceof Error ? error.message : "Erro ao adicionar orçamento";
      toast.error(errMsg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => removeBudget(id),
    onSuccess: () => {
      invalidateBudgetQueries(queryClient);
      toast.success("Orçamento removido");
      setDeletingBudget(null);
    },
    onError: (error: unknown) => {
      const errMsg = error instanceof Error ? error.message : "Erro ao remover orçamento";
      toast.error(errMsg);
    },
  });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Orçamentos por Categoria</DialogTitle>
            <DialogDescription>
              Defina, edite ou remova o limite mensal de gastos de cada categoria de despesa.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {budgets && budgets.length > 0 ? (
              budgets
                .slice()
                .sort((a, b) => expenseCategoryLabel(a.category).localeCompare(expenseCategoryLabel(b.category)))
                .map((b) => (
                  <BudgetRow
                    key={b.id}
                    budget={b}
                    editing={editingId === b.id}
                    onEdit={() => setEditingId(b.id)}
                    onCancelEdit={() => setEditingId(null)}
                    onRequestDelete={setDeletingBudget}
                    rowRef={(el) => rowRefs.set(b.id, el)}
                  />
                ))
            ) : (
              <p className="py-2 text-sm text-muted-foreground">Nenhum orçamento definido ainda.</p>
            )}
          </div>

          {availableCategories.length > 0 && (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit((d) => createMutation.mutate(d))}
                className="space-y-3 border-t border-border pt-4"
              >
                <p className="text-sm font-medium">Adicionar categoria</p>
                <div className="flex items-start gap-2">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Categoria" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {availableCategories.map((c) => (
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
                      <FormItem className="w-32">
                        <FormControl>
                          <Input type="number" step="0.01" min="0" placeholder="0,00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" size="icon" disabled={createMutation.isPending}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            </Form>
          )}

          <div className="flex justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingBudget} onOpenChange={(o) => !o && setDeletingBudget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover orçamento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o orçamento de{' '}
              <strong>{deletingBudget ? expenseCategoryLabel(deletingBudget.category) : ''}</strong>? Esta ação
              não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deletingBudget && deleteMutation.mutate(deletingBudget.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Removendo...' : 'Remover'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
