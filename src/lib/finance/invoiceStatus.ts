/** Invoice statuses that represent money actually received. */
export const REALIZED_INVOICE_STATUSES = ["Paid", "PrepaidPending"] as const;

export function isRealizedInvoice(invoice: { status?: string | null }): boolean {
  return REALIZED_INVOICE_STATUSES.includes(invoice.status as typeof REALIZED_INVOICE_STATUSES[number]);
}
