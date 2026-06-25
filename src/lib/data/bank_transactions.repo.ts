import { db } from './client';
import type { Database } from './types.gen';

export type BankTransaction = Database['public']['Tables']['bank_transactions']['Row'];
export type BankTransactionInsert = Database['public']['Tables']['bank_transactions']['Insert'];
export type BankTransactionUpdate = Database['public']['Tables']['bank_transactions']['Update'];

export const listBankTransactions = () => db.table<BankTransaction>('bank_transactions').list();
export const createBankTransaction = (input: BankTransactionInsert) => db.table<BankTransaction>('bank_transactions').create(input);
export const updateBankTransaction = (id: string, patch: BankTransactionUpdate) => db.table<BankTransaction>('bank_transactions').update(id, patch);
export const removeBankTransaction = (id: string) => db.table('bank_transactions').remove(id);
