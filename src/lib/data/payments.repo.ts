import { db } from './client';
import type { Database } from './types.gen';

export type Payment = Database['public']['Tables']['payments']['Row'];
export type PaymentInsert = Database['public']['Tables']['payments']['Insert'];
export type PaymentUpdate = Database['public']['Tables']['payments']['Update'];

export const listPayments = () => db.table<Payment>('payments').list();
export const createPayment = (input: PaymentInsert) => db.table<Payment>('payments').create(input);
export const updatePayment = (id: string, patch: PaymentUpdate) => db.table<Payment>('payments').update(id, patch);
export const removePayment = (id: string) => db.table('payments').remove(id);
