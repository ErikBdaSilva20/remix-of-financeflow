import { db } from './client';
import type { Database } from './types.gen';

export type AccountingSettings = Database['public']['Tables']['accounting_settings']['Row'];
export type AccountingSettingsInsert = Database['public']['Tables']['accounting_settings']['Insert'];
export type AccountingSettingsUpdate = Database['public']['Tables']['accounting_settings']['Update'];

export const listAccountingSettings = () => db.table<AccountingSettings>('accounting_settings').list();
export const createAccountingSettings = (input: AccountingSettingsInsert) => db.table<AccountingSettings>('accounting_settings').create(input);
export const updateAccountingSettings = (id: string, patch: AccountingSettingsUpdate) => db.table<AccountingSettings>('accounting_settings').update(id, patch);
