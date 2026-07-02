// Fonte única das categorias de despesa — usada por ExpenseDialog, BudgetDialog,
// useExpenseCategories (donut/distribuição) e o drill-down. Categorias são um
// enum fixo (não CRUD de usuário); manter em um só lugar evita rótulos/cores
// divergindo entre componentes ou mudando de posição a cada novo cadastro.
export interface ExpenseCategoryDef {
  value: string;
  label: string;
  color: string;
  group: 'cogs' | 'operating';
}

export const EXPENSE_CATEGORIES: ExpenseCategoryDef[] = [
  { value: 'cogs', label: 'Custo de Produtos/Serviços (CPV)', color: '#059669', group: 'cogs' },
  { value: 'marketing', label: 'Marketing', color: '#0891B2', group: 'operating' },
  { value: 'salaries', label: 'Salários e RH', color: '#7C3AED', group: 'operating' },
  { value: 'technology', label: 'Tecnologia e Software', color: '#DC2626', group: 'operating' },
  { value: 'operations', label: 'Operações', color: '#D97706', group: 'operating' },
  { value: 'office', label: 'Escritório', color: '#0EA5E9', group: 'operating' },
  { value: 'travel', label: 'Viagens', color: '#65A30D', group: 'operating' },
  { value: 'other', label: 'Outros', color: '#DB2777', group: 'operating' },
];

export const EXPENSE_CATEGORY_ORDER: Record<string, number> = Object.fromEntries(
  EXPENSE_CATEGORIES.map((c, i) => [c.value, i])
);

export const EXPENSE_CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  EXPENSE_CATEGORIES.map((c) => [c.value, c.label])
);

export const EXPENSE_CATEGORY_COLOR: Record<string, string> = Object.fromEntries(
  EXPENSE_CATEGORIES.map((c) => [c.value, c.color])
);

const FALLBACK_COLORS = ['#059669', '#0891B2', '#7C3AED', '#DC2626', '#D97706', '#0EA5E9', '#65A30D', '#DB2777'];

export function expenseCategoryLabel(value: string): string {
  return EXPENSE_CATEGORY_LABEL[value] ?? value;
}

export function expenseCategoryColor(value: string, fallbackIndex = 0): string {
  return EXPENSE_CATEGORY_COLOR[value] ?? FALLBACK_COLORS[fallbackIndex % FALLBACK_COLORS.length];
}
