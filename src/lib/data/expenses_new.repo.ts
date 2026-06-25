import { db } from './client';
import type { Database } from './types.gen';

export type ExpenseNew = Database['public']['Tables']['expenses_new']['Row'];
export type ExpenseNewInsert = Database['public']['Tables']['expenses_new']['Insert'];
export type ExpenseNewUpdate = Database['public']['Tables']['expenses_new']['Update'];

export const listExpensesNew = () => db.table<ExpenseNew>('expenses_new').list();
export const createExpenseNew = (input: ExpenseNewInsert) => db.table<ExpenseNew>('expenses_new').create(input);
export const updateExpenseNew = (id: string, patch: ExpenseNewUpdate) => db.table<ExpenseNew>('expenses_new').update(id, patch);
export const removeExpenseNew = (id: string) => db.table('expenses_new').remove(id);
