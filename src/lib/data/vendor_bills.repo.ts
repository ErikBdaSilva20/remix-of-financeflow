import { db } from './client';
import type { Database } from './types.gen';

export type VendorBill = Database['public']['Tables']['vendor_bills']['Row'];
export type VendorBillInsert = Database['public']['Tables']['vendor_bills']['Insert'];
export type VendorBillUpdate = Database['public']['Tables']['vendor_bills']['Update'];

export const listVendorBills = () => db.table<VendorBill>('vendor_bills').list();
export const createVendorBill = (input: VendorBillInsert) => db.table<VendorBill>('vendor_bills').create(input);
export const updateVendorBill = (id: string, patch: VendorBillUpdate) => db.table<VendorBill>('vendor_bills').update(id, patch);
export const removeVendorBill = (id: string) => db.table('vendor_bills').remove(id);
