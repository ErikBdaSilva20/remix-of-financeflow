import { db } from './client';
import { findDuplicateBy } from './duplicateContact';
import type { Database } from './types.gen';

export type Vendor = Database['public']['Tables']['vendors']['Row'];
export type VendorInsert = Database['public']['Tables']['vendors']['Insert'];
export type VendorUpdate = Database['public']['Tables']['vendors']['Update'];

export const listVendors = () => db.table<Vendor>('vendors').list();
export const createVendor = (input: VendorInsert) => db.table<Vendor>('vendors').create(input);
export const updateVendor = (id: string, patch: VendorUpdate) => db.table<Vendor>('vendors').update(id, patch);
export const removeVendor = (id: string) => db.table('vendors').remove(id);

/** Encontra um fornecedor existente com o mesmo e-mail ou celular (ignora o próprio registro ao editar). */
export function findDuplicateVendor(
  vendors: Vendor[],
  contact: { email?: string | null; phone?: string | null },
  excludeId?: string
): { field: 'email' | 'phone'; vendor: Vendor } | null {
  const duplicate = findDuplicateBy(vendors, contact, excludeId);
  return duplicate ? { field: duplicate.field, vendor: duplicate.row } : null;
}
