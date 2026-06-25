import { db } from './client';
import type { Database } from './types.gen';

export type Customer = Database['public']['Tables']['customers']['Row'];
export type CustomerInsert = Database['public']['Tables']['customers']['Insert'];
export type CustomerUpdate = Database['public']['Tables']['customers']['Update'];

export const listCustomers = () => db.table<Customer>('customers').list();
export const createCustomer = (input: CustomerInsert) => db.table<Customer>('customers').create(input);
export const updateCustomer = (id: string, patch: CustomerUpdate) => db.table<Customer>('customers').update(id, patch);
export const removeCustomer = (id: string) => db.table('customers').remove(id);
