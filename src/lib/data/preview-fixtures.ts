// PREVIEW fixtures — dados estáticos retornados pelo editor Sandpack.
// Nunca são enviados ao gateway. Edite aqui para mudar o que aparece no preview.
// PROTECTED: não edite as assinaturas exportadas (previewApi).

import type { Database } from './types.gen';

type Tables = Database['public']['Tables'];

const TODAY = new Date();
const d = (offset: number) => {
  const dt = new Date(TODAY);
  dt.setDate(dt.getDate() + offset);
  return dt.toISOString().split('T')[0];
};
const m = (offset: number) => {
  const dt = new Date(TODAY);
  dt.setMonth(dt.getMonth() + offset);
  return dt.toISOString().split('T')[0];
};

// ── Fixture data ──────────────────────────────────────────────────────────────

const customers: Tables['customers']['Row'][] = [
  { id: 'cust-1', owner_id: 'preview', name: 'Acme Corporation', email: 'billing@acme.com', phone: '+1 555-0100', address: '1 Acme Blvd, NY', notes: null, created_at: m(-6), updated_at: m(-6) },
  { id: 'cust-2', owner_id: 'preview', name: 'Globex Industries', email: 'ap@globex.com', phone: '+1 555-0200', address: '2 Globex Ave, CA', notes: null, created_at: m(-5), updated_at: m(-5) },
  { id: 'cust-3', owner_id: 'preview', name: 'Initech LLC', email: 'finance@initech.com', phone: '+1 555-0300', address: '3 Initech Dr, TX', notes: null, created_at: m(-4), updated_at: m(-4) },
];

const accounts: Tables['accounts']['Row'][] = [
  { id: 'acc-1', owner_id: 'preview', name: 'Main Operating Account', type: 'checking', currency: 'USD', balance: 125000, created_at: m(-12), updated_at: d(-1) },
  { id: 'acc-2', owner_id: 'preview', name: 'Savings Reserve', type: 'savings', currency: 'USD', balance: 80000, created_at: m(-12), updated_at: d(-1) },
];

const invoices: Tables['invoices']['Row'][] = [
  { id: 'inv-1', owner_id: 'preview', customer_id: 'cust-1', issue_date: m(-2), due_date: m(-1), amount_total: 24500, open_amount: 0, original_amount: 24500, original_currency: 'USD', status: 'Paid', channel: 'Direct', product_id: 'SAAS-PRO', created_at: m(-2), updated_at: m(-1) },
  { id: 'inv-2', owner_id: 'preview', customer_id: 'cust-2', issue_date: m(-1), due_date: d(15), amount_total: 18200, open_amount: 18200, original_amount: 18200, original_currency: 'USD', status: 'Open', channel: 'Online', product_id: 'SAAS-PRO', created_at: m(-1), updated_at: m(-1) },
  { id: 'inv-3', owner_id: 'preview', customer_id: 'cust-3', issue_date: m(-3), due_date: m(-2), amount_total: 9800, open_amount: 9800, original_amount: 9800, original_currency: 'USD', status: 'Overdue', channel: 'Direct', product_id: 'SAAS-BASIC', created_at: m(-3), updated_at: m(-3) },
  { id: 'inv-4', owner_id: 'preview', customer_id: 'cust-1', issue_date: m(-1), due_date: d(30), amount_total: 32000, open_amount: 16000, original_amount: 32000, original_currency: 'USD', status: 'Partially Paid', channel: 'Online', product_id: 'SAAS-ENT', created_at: m(-1), updated_at: d(-5) },
];

const expenses: Tables['expenses_new']['Row'][] = [
  { id: 'exp-1', owner_id: 'preview', date: m(-1), amount: 8500, original_amount: 8500, original_currency: 'USD', category: 'payroll', vendor: 'ADP Payroll', description: 'Monthly payroll run', project_id: null, department: 'Engineering', product: null, region: null, created_at: m(-1), updated_at: m(-1) },
  { id: 'exp-2', owner_id: 'preview', date: m(-1), amount: 2400, original_amount: 2400, original_currency: 'USD', category: 'software', vendor: 'AWS', description: 'Cloud infrastructure', project_id: null, department: 'Engineering', product: null, region: null, created_at: m(-1), updated_at: m(-1) },
  { id: 'exp-3', owner_id: 'preview', date: m(-1), amount: 1200, original_amount: 1200, original_currency: 'USD', category: 'marketing', vendor: 'Google Ads', description: 'Digital advertising', project_id: null, department: 'Marketing', product: null, region: null, created_at: m(-1), updated_at: m(-1) },
  { id: 'exp-4', owner_id: 'preview', date: m(-2), amount: 8500, original_amount: 8500, original_currency: 'USD', category: 'payroll', vendor: 'ADP Payroll', description: 'Monthly payroll run', project_id: null, department: 'Engineering', product: null, region: null, created_at: m(-2), updated_at: m(-2) },
  { id: 'exp-5', owner_id: 'preview', date: m(-2), amount: 950, original_amount: 950, original_currency: 'USD', category: 'office', vendor: 'WeWork', description: 'Office rent', project_id: null, department: 'Operations', product: null, region: null, created_at: m(-2), updated_at: m(-2) },
];

const bankTransactions: Tables['bank_transactions']['Row'][] = [
  { id: 'bt-1', owner_id: 'preview', account_id: 'acc-1', date: d(-2), amount: 24500, original_amount: 24500, original_currency: 'USD', type: 'in', counterparty: 'Acme Corporation', category: 'Revenue', description: 'Invoice INV-001 payment', created_at: d(-2), updated_at: d(-2) },
  { id: 'bt-2', owner_id: 'preview', account_id: 'acc-1', date: d(-5), amount: -8500, original_amount: 8500, original_currency: 'USD', type: 'out', counterparty: 'ADP Payroll', category: 'payroll', description: 'Monthly payroll', created_at: d(-5), updated_at: d(-5) },
  { id: 'bt-3', owner_id: 'preview', account_id: 'acc-1', date: d(-10), amount: -2400, original_amount: 2400, original_currency: 'USD', type: 'out', counterparty: 'AWS', category: 'software', description: 'Cloud infrastructure', created_at: d(-10), updated_at: d(-10) },
  { id: 'bt-4', owner_id: 'preview', account_id: 'acc-1', date: d(-15), amount: 18200, original_amount: 18200, original_currency: 'USD', type: 'in', counterparty: 'Globex Industries', category: 'Revenue', description: 'Invoice payment', created_at: d(-15), updated_at: d(-15) },
  { id: 'bt-5', owner_id: 'preview', account_id: 'acc-1', date: d(-20), amount: -1200, original_amount: 1200, original_currency: 'USD', type: 'out', counterparty: 'Google Ads', category: 'marketing', description: 'Ad spend', created_at: d(-20), updated_at: d(-20) },
];

const vendorBills: Tables['vendor_bills']['Row'][] = [
  { id: 'vb-1', owner_id: 'preview', vendor_name: 'Office Supplies Co', issue_date: m(-1), due_date: d(10), amount_total: 450, open_amount: 450, original_amount: 450, original_currency: 'USD', status: 'Open', category: 'office', created_at: m(-1), updated_at: m(-1) },
  { id: 'vb-2', owner_id: 'preview', vendor_name: 'AWS', issue_date: m(-1), due_date: d(-5), amount_total: 2400, open_amount: 0, original_amount: 2400, original_currency: 'USD', status: 'Paid', category: 'software', created_at: m(-1), updated_at: d(-5) },
];

const fxRates: Tables['fx_rates']['Row'][] = [
  { id: 'fx-1', currency: 'EUR', date: d(-1), rate_to_base: 1.08, is_imputed: false, created_at: d(-1) },
  { id: 'fx-2', currency: 'GBP', date: d(-1), rate_to_base: 1.27, is_imputed: false, created_at: d(-1) },
  { id: 'fx-3', currency: 'BRL', date: d(-1), rate_to_base: 0.18, is_imputed: false, created_at: d(-1) },
];

const contacts: Tables['contacts']['Row'][] = [
  { id: 'con-1', owner_id: 'preview', customer_id: 'cust-1', name: 'John Smith', email: 'john@acme.com', phone: '+1 555-0101', address: null, notes: null, avatar_color: '#6366f1', created_at: m(-6), updated_at: m(-6) },
  { id: 'con-2', owner_id: 'preview', customer_id: 'cust-2', name: 'Sarah Connor', email: 'sarah@globex.com', phone: '+1 555-0201', address: null, notes: null, avatar_color: '#10b981', created_at: m(-5), updated_at: m(-5) },
];

const filterSegments: Tables['filter_segments']['Row'][] = [
  { id: 'fs-1', owner_id: 'preview', segment_type: 'department', segment_value: 'Engineering', is_active: true, created_at: m(-12), updated_at: m(-12) },
  { id: 'fs-2', owner_id: 'preview', segment_type: 'department', segment_value: 'Marketing', is_active: true, created_at: m(-12), updated_at: m(-12) },
  { id: 'fs-3', owner_id: 'preview', segment_type: 'department', segment_value: 'Operations', is_active: true, created_at: m(-12), updated_at: m(-12) },
  { id: 'fs-4', owner_id: 'preview', segment_type: 'product', segment_value: 'SAAS-PRO', is_active: true, created_at: m(-12), updated_at: m(-12) },
  { id: 'fs-5', owner_id: 'preview', segment_type: 'product', segment_value: 'SAAS-BASIC', is_active: true, created_at: m(-12), updated_at: m(-12) },
  { id: 'fs-6', owner_id: 'preview', segment_type: 'product', segment_value: 'SAAS-ENT', is_active: true, created_at: m(-12), updated_at: m(-12) },
];

const accountingSettings: Tables['accounting_settings']['Row'][] = [
  { id: 'as-1', owner_id: 'preview', basis: 'accrual', base_currency: 'USD', timezone: 'America/New_York', allow_future_dates: false, created_at: m(-12), updated_at: m(-12) },
];

const scheduledReports: Tables['scheduled_reports']['Row'][] = [
  { id: 'sr-1', owner_id: 'preview', report_type: 'profit-loss', report_name: 'DRE Mensal', frequency: 'monthly', next_run_date: m(1), is_active: true, created_at: m(-2), updated_at: m(-2) },
  { id: 'sr-2', owner_id: 'preview', report_type: 'cash-flow', report_name: 'Fluxo de Caixa Semanal', frequency: 'weekly', next_run_date: d(5), is_active: false, created_at: m(-1), updated_at: m(-1) },
];

// ── Route table ───────────────────────────────────────────────────────────────

const FIXTURES: Record<string, unknown[]> = {
  customers,
  invoices,
  expenses_new: expenses,
  bank_transactions: bankTransactions,
  vendor_bills: vendorBills,
  fx_rates: fxRates,
  accounts,
  contacts,
  filter_segments: filterSegments,
  accounting_settings: accountingSettings,
  scheduled_reports: scheduledReports,
};

// ── Public API ────────────────────────────────────────────────────────────────

let _nextId = 1000;

export function previewApi<T>(method: string, path: string, body?: unknown): T {
  // GET /data/:table → list
  const listMatch = path.match(/^\/data\/([^/]+)$/);
  if (method === 'GET' && listMatch) {
    const table = listMatch[1];
    return ((FIXTURES[table] ?? []) as unknown) as T;
  }

  // POST /data/:table → create (optimistic: return body + generated id)
  const createMatch = path.match(/^\/data\/([^/]+)$/);
  if (method === 'POST' && createMatch) {
    const record = { id: `preview-${_nextId++}`, owner_id: 'preview', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...(body as object) };
    return record as unknown as T;
  }

  // PATCH /data/:table/:id → update (optimistic: echo back patch)
  if (method === 'PATCH') {
    return { ...(body as object) } as unknown as T;
  }

  // DELETE /data/:table/:id → no-op
  if (method === 'DELETE') {
    return undefined as unknown as T;
  }

  // Auth routes
  if (path === '/auth/me') {
    return { id: 'preview', email: 'demo@masia.cloud', name: 'Preview User', role: 'admin' } as unknown as T;
  }
  if (path === '/auth/sign-in' || path === '/auth/sign-up') {
    return { id: 'preview', email: 'demo@masia.cloud', name: 'Preview User', role: 'admin' } as unknown as T;
  }
  if (path === '/auth/sign-out') {
    return undefined as unknown as T;
  }

  return undefined as unknown as T;
}
