import { db } from './client';
import type { Database } from './types.gen';

export type Invoice = Database['public']['Tables']['invoices']['Row'];
export type InvoiceInsert = Database['public']['Tables']['invoices']['Insert'];
export type InvoiceUpdate = Database['public']['Tables']['invoices']['Update'];

export const listInvoices = () => db.table<Invoice>('invoices').list();
export const createInvoice = (input: InvoiceInsert) => db.table<Invoice>('invoices').create(input);
export const updateInvoice = (id: string, patch: InvoiceUpdate) => db.table<Invoice>('invoices').update(id, patch);
export const removeInvoice = (id: string) => db.table('invoices').remove(id);
