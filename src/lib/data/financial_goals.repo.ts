import { db } from './client';
import type { Database } from './types.gen';

export type FinancialGoal = Database['public']['Tables']['financial_goals']['Row'];
export type FinancialGoalInsert = Database['public']['Tables']['financial_goals']['Insert'];
export type FinancialGoalUpdate = Database['public']['Tables']['financial_goals']['Update'];

export const listFinancialGoals = () => db.table<FinancialGoal>('financial_goals').list();
export const createFinancialGoal = (input: FinancialGoalInsert) =>
  db.table<FinancialGoal>('financial_goals').create(input);
export const updateFinancialGoal = (id: string, patch: FinancialGoalUpdate) =>
  db.table<FinancialGoal>('financial_goals').update(id, patch);
