import { db } from './client';
import type { Database } from './types.gen';

export type Vendor = Database['public']['Tables']['vendors']['Row'];
export type VendorInsert = Database['public']['Tables']['vendors']['Insert'];
export type VendorUpdate = Database['public']['Tables']['vendors']['Update'];

export const listVendors = () => db.table<Vendor>('vendors').list();
export const createVendor = (input: VendorInsert) => db.table<Vendor>('vendors').create(input);
export const updateVendor = (id: string, patch: VendorUpdate) => db.table<Vendor>('vendors').update(id, patch);
export const removeVendor = (id: string) => db.table('vendors').remove(id);
