import { db } from './client';
import type { Database } from './types.gen';

export type Account = Database['public']['Tables']['accounts']['Row'];
export type AccountInsert = Database['public']['Tables']['accounts']['Insert'];
export type AccountUpdate = Database['public']['Tables']['accounts']['Update'];

export const listAccounts = () => db.table<Account>('accounts').list();
export const createAccount = (input: AccountInsert) => db.table<Account>('accounts').create(input);
export const updateAccount = (id: string, patch: AccountUpdate) => db.table<Account>('accounts').update(id, patch);
export const removeAccount = (id: string) => db.table('accounts').remove(id);
