import { db } from './client';
import type { Database } from './types.gen';

export type Vendor = Database['public']['Tables']['vendors']['Row'];
export type VendorInsert = Database['public']['Tables']['vendors']['Insert'];
export type VendorUpdate = Database['public']['Tables']['vendors']['Update'];

export const listVendors = () => db.table<Vendor>('vendors').list();
export const createVendor = (input: VendorInsert) => db.table<Vendor>('vendors').create(input);
export const updateVendor = (id: string, patch: VendorUpdate) => db.table<Vendor>('vendors').update(id, patch);
export const removeVendor = (id: string) => db.table('vendors').remove(id);

// Mesma normalização usada nos índices únicos de vendors em setup.sql
// (lower() pro e-mail, só dígitos pro celular).
export const normalizeEmail = (email: string) => email.trim().toLowerCase();
export const normalizePhone = (phone: string) => phone.replace(/\D/g, '');

/** Encontra um fornecedor existente com o mesmo e-mail ou celular (ignora o próprio registro ao editar). */
export function findDuplicateVendor(
  vendors: Vendor[],
  { email, phone }: { email?: string | null; phone?: string | null },
  excludeId?: string
): { field: 'email' | 'phone'; vendor: Vendor } | null {
  const normEmail = email ? normalizeEmail(email) : null;
  const normPhone = phone ? normalizePhone(phone) : null;

  for (const v of vendors) {
    if (excludeId && v.id === excludeId) continue;
    if (normEmail && v.email && normalizeEmail(v.email) === normEmail) {
      return { field: 'email', vendor: v };
    }
    if (normPhone && v.phone && normalizePhone(v.phone) === normPhone) {
      return { field: 'phone', vendor: v };
    }
  }
  return null;
}
