import { db } from './client';
import type { Database } from './types.gen';

export type Transaction = Database['public']['Tables']['transactions']['Row'];
export type TransactionInsert = Database['public']['Tables']['transactions']['Insert'];
export type TransactionUpdate = Database['public']['Tables']['transactions']['Update'];

export const listTransactions = () => db.table<Transaction>('transactions').list();
export const createTransaction = (input: TransactionInsert) => db.table<Transaction>('transactions').create(input);
export const updateTransaction = (id: string, patch: TransactionUpdate) => db.table<Transaction>('transactions').update(id, patch);
export const removeTransaction = (id: string) => db.table('transactions').remove(id);
