import type { QueryClient } from "@tanstack/react-query";

// Uma única fonte pra "quais queries dependem de despesa/receita/orçamento" —
// evita que cada dialog (Expense, Invoice, Payment, Budget) mantenha sua própria
// lista à mão e esqueça de invalidar alguma (foi exatamente isso que deixava o
// card "Orçamento Máximo vs Realizado" e outros gráficos dessincronizados de
// lançamentos novos).

function invalidate(queryClient: QueryClient, keys: readonly string[]) {
  keys.forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
}

// Queries que somam/agrupam transações do tipo "despesa" (transactions.type === 'expense').
// Qualquer criação, edição ou remoção de despesa precisa invalidar essas — inclui
// "expense-data" (categorias + Orçamento Máximo vs Realizado) e o drill-down por categoria.
export const EXPENSE_QUERY_KEYS = [
  "expense-data",
  "expense-trends",
  "expense-drill-down",
  "vendors",
  "profitability-data",
  "revenue-expenses-periods",
  "weekly-breakdown",
  "financial-metrics",
  "cashflow-data",
  "period-comparison",
] as const;

export function invalidateExpenseQueries(queryClient: QueryClient) {
  invalidate(queryClient, EXPENSE_QUERY_KEYS);
}

// Queries que dependem de receita (faturas emitidas e pagamentos recebidos).
export const REVENUE_QUERY_KEYS = [
  "ar-data",
  "ar-detailed",
  "recent-activity",
  "dso",
  "financial-metrics",
  "revenue-trends",
  "revenue-data",
  "revenue-dimensions",
  "revenue-by-product-trends",
  "revenue-drill-down",
  "period-comparison",
  "revenue-expenses-periods",
  "weekly-breakdown",
  "top-clients",
  "profitability-data",
  "cashflow-data",
] as const;

export function invalidateRevenueQueries(queryClient: QueryClient) {
  invalidate(queryClient, REVENUE_QUERY_KEYS);
}

// Queries que dependem do limite de orçamento por categoria (tabela `budgets`).
// Não mexe em séries de receita — só no que soma orçado x realizado por categoria.
export const BUDGET_QUERY_KEYS = ["budgets", "expense-data"] as const;

export function invalidateBudgetQueries(queryClient: QueryClient) {
  invalidate(queryClient, BUDGET_QUERY_KEYS);
}
