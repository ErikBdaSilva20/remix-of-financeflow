import { db } from './client';
import type { Database } from './types.gen';

export type VendorBill = Database['public']['Tables']['vendor_bills']['Row'];
export type VendorBillInsert = Database['public']['Tables']['vendor_bills']['Insert'];
export type VendorBillUpdate = Database['public']['Tables']['vendor_bills']['Update'];

export const listVendorBills = () => db.table<VendorBill>('vendor_bills').list();
export const createVendorBill = (input: VendorBillInsert) => db.table<VendorBill>('vendor_bills').create(input);
export const updateVendorBill = (id: string, patch: VendorBillUpdate) => db.table<VendorBill>('vendor_bills').update(id, patch);
export const removeVendorBill = (id: string) => db.table('vendor_bills').remove(id);

export interface PayVendorBillInput {
  billId: string;
  date: string;
  amount: number;
  currency: string;
  billNumber: string;
  vendor: string;
  category?: string | null;
}

/**
 * Quita (total ou parcialmente) uma conta a pagar: abate o valor pago do
 * open_amount da conta e ajusta o status.
 *
 * Sem get-by-id no modo genérico: faz list-then-find (§B5 do Importantdoc).
 */
export async function payVendorBill(input: PayVendorBillInput): Promise<void> {
  const allBills = await listVendorBills();
  const currentBill = allBills.find((b) => b.id === input.billId);
  if (!currentBill) return;

  const currentOpenAmount = Number(currentBill.open_amount ?? currentBill.amount_total);
  const newOpenAmount = Math.max(0, currentOpenAmount - input.amount);
  const newStatus = newOpenAmount <= 0 ? 'Paid' : 'Partial';

  await updateVendorBill(input.billId, {
    open_amount: newOpenAmount,
    status: newStatus,
  });
}
