import { db } from './client';
import type { Database } from './types.gen';

export type Customer = Database['public']['Tables']['customers']['Row'];
export type CustomerInsert = Database['public']['Tables']['customers']['Insert'];
export type CustomerUpdate = Database['public']['Tables']['customers']['Update'];

export const listCustomers = () => db.table<Customer>('customers').list();
export const createCustomer = (input: CustomerInsert) => db.table<Customer>('customers').create(input);
export const updateCustomer = (id: string, patch: CustomerUpdate) => db.table<Customer>('customers').update(id, patch);
export const removeCustomer = (id: string) => db.table('customers').remove(id);

// Mesma normalização usada nos índices únicos de customers em setup.sql
// (lower() pro e-mail, só dígitos pro celular) — precisa bater exatamente
// pra o aviso no formulário e a constraint do banco concordarem.
export const normalizeEmail = (email: string) => email.trim().toLowerCase();
export const normalizePhone = (phone: string) => phone.replace(/\D/g, '');

/** Encontra um cliente existente com o mesmo e-mail ou celular (ignora o próprio registro ao editar). */
export function findDuplicateCustomer(
  customers: Customer[],
  { email, phone }: { email?: string | null; phone?: string | null },
  excludeId?: string
): { field: 'email' | 'phone'; customer: Customer } | null {
  const normEmail = email ? normalizeEmail(email) : null;
  const normPhone = phone ? normalizePhone(phone) : null;

  for (const c of customers) {
    if (excludeId && c.id === excludeId) continue;
    if (normEmail && c.email && normalizeEmail(c.email) === normEmail) {
      return { field: 'email', customer: c };
    }
    if (normPhone && c.phone && normalizePhone(c.phone) === normPhone) {
      return { field: 'phone', customer: c };
    }
  }
  return null;
}
