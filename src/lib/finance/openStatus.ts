// Fonte única de "o que é uma fatura/conta em aberto" — evita listas inline
// divergentes entre hooks (resumo x detalhe x overview mostrando totais que
// não batem entre si).
export const AR_OPEN_STATUSES = ['Open', 'Partial', 'Overdue', 'Partially Paid'] as const;
export const AP_OPEN_STATUSES = ['Open', 'Pending', 'Overdue', 'Partial', 'Partially Paid'] as const;

export function isOpenInvoice(status: string): boolean {
  return (AR_OPEN_STATUSES as readonly string[]).includes(status);
}

export function isOpenBill(status: string): boolean {
  return (AP_OPEN_STATUSES as readonly string[]).includes(status);
}
