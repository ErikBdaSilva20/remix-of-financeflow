import { db } from './client';
import type { Database } from './types.gen';

export type Budget = Database['public']['Tables']['budgets']['Row'];
export type BudgetInsert = Database['public']['Tables']['budgets']['Insert'];
export type BudgetUpdate = Database['public']['Tables']['budgets']['Update'];

export const listBudgets = () => db.table<Budget>('budgets').list();
export const createBudget = (input: BudgetInsert) => db.table<Budget>('budgets').create(input);
export const updateBudget = (id: string, patch: BudgetUpdate) => db.table<Budget>('budgets').update(id, patch);
export const removeBudget = (id: string) => db.table('budgets').remove(id);
