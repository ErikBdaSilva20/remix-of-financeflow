-- FinanceFlow — Business Schema
-- Roda no Neon do tenant DEPOIS que o gateway cria as tabelas do Better-Auth.
-- Regras: owner_id text references "user"(id); snake_case; sem RLS; sem nomes reservados.

-- Trigger reutilizável para updated_at automático
create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ────────────────────────────────────────────────────────────
-- LOOKUP TABLES — sem owner_id; read-only para rep
-- ────────────────────────────────────────────────────────────

-- Taxas de câmbio (imputed diariamente)
create table if not exists fx_rates (
  id          uuid primary key default gen_random_uuid(),
  currency    text not null,
  date        date not null,
  rate_to_base numeric(18,6) not null,
  is_imputed  boolean not null default false,
  created_at  timestamptz not null default now(),
  constraint uq_fx_rates_currency_date unique (currency, date)
);
create index if not exists idx_fx_rates_currency_date on fx_rates(currency, date desc);

-- ────────────────────────────────────────────────────────────
-- BUSINESS TABLES — owner_id obrigatório em todas
-- ────────────────────────────────────────────────────────────

-- Transações bancárias
create table if not exists bank_transactions (
  id                  uuid primary key default gen_random_uuid(),
  owner_id            text not null references "user"(id) on delete cascade,
  date                date not null,
  amount              numeric(18,2) not null,           -- em base currency (BRL)
  original_amount     numeric(18,2),
  original_currency   text not null default 'BRL',
  type                text not null default 'out',      -- in | out | transfer
  counterparty        text,
  category            text,
  description         text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists idx_bank_transactions_owner on bank_transactions(owner_id);
create index if not exists idx_bank_transactions_date  on bank_transactions(date desc);
create or replace trigger trg_bank_transactions_updated_at
  before update on bank_transactions for each row execute function touch_updated_at();

-- Clientes
create table if not exists customers (
  id          uuid primary key default gen_random_uuid(),
  owner_id    text not null references "user"(id) on delete cascade,
  name        text not null,
  email       text,
  phone       text,
  job_type    text,
  address     text,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_customers_owner on customers(owner_id);
create or replace trigger trg_customers_updated_at
  before update on customers for each row execute function touch_updated_at();

-- Contatos (pessoas físicas ligadas a clientes ou independentes)
create table if not exists contacts (
  id           uuid primary key default gen_random_uuid(),
  owner_id     text not null references "user"(id) on delete cascade,
  customer_id  uuid references customers(id) on delete set null,
  name         text not null,
  email        text,
  phone        text,
  address      text,
  notes        text,
  avatar_color text not null default '#6366f1',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_contacts_owner    on contacts(owner_id);
create index if not exists idx_contacts_customer on contacts(customer_id);
create or replace trigger trg_contacts_updated_at
  before update on contacts for each row execute function touch_updated_at();

-- Faturas / Contas a Receber
create table if not exists invoices (
  id                  uuid primary key default gen_random_uuid(),
  owner_id            text not null references "user"(id) on delete cascade,
  customer_id         uuid references customers(id) on delete set null,
  issue_date          date not null,
  due_date            date,
  scheduled_payment_date date,
  amount_total        numeric(18,2) not null,           -- em base currency
  open_amount         numeric(18,2) not null,           -- saldo em aberto (base)
  original_amount     numeric(18,2),
  original_currency   text not null default 'BRL',
  status              text not null default 'Open',     -- Open|Partial|Overdue|Partially Paid|Paid|Void
  channel             text,                             -- canal de venda (ex: Direct, Online)
  product_id          text,                             -- produto/serviço referenciado
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists idx_invoices_owner    on invoices(owner_id);
create index if not exists idx_invoices_customer on invoices(customer_id);
create index if not exists idx_invoices_due_date on invoices(due_date);
create or replace trigger trg_invoices_updated_at
  before update on invoices for each row execute function touch_updated_at();

-- Pagamentos (recebimentos contra faturas)
create table if not exists payments (
  id                  uuid primary key default gen_random_uuid(),
  owner_id            text not null references "user"(id) on delete cascade,
  invoice_id          uuid references invoices(id) on delete set null,
  date                date not null,
  amount              numeric(18,2) not null,           -- em base currency
  original_amount     numeric(18,2),
  original_currency   text not null default 'BRL',
  status              text not null default 'Received', -- Received|Pending|Failed|Refunded
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists idx_payments_owner   on payments(owner_id);
create index if not exists idx_payments_invoice on payments(invoice_id);
create or replace trigger trg_payments_updated_at
  before update on payments for each row execute function touch_updated_at();

-- Despesas
create table if not exists expenses_new (
  id                  uuid primary key default gen_random_uuid(),
  owner_id            text not null references "user"(id) on delete cascade,
  customer_id         uuid references customers(id) on delete set null,
  date                date not null,
  amount              numeric(18,2) not null,           -- em base currency
  original_amount     numeric(18,2),
  original_currency   text not null default 'BRL',
  category            text not null,                   -- cogs | marketing | payroll | office | software | etc.
  vendor              text,
  description         text,
  project_id          text,
  department          text,
  product             text,
  region              text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists idx_expenses_new_owner on expenses_new(owner_id);
create index if not exists idx_expenses_new_date  on expenses_new(date desc);
create or replace trigger trg_expenses_new_updated_at
  before update on expenses_new for each row execute function touch_updated_at();

-- Fornecedores (Vendors)
create table if not exists vendors (
  id          uuid primary key default gen_random_uuid(),
  owner_id    text not null references "user"(id) on delete cascade,
  name        text not null,
  email       text,
  phone       text,
  category    text,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_vendors_owner on vendors(owner_id);
create or replace trigger trg_vendors_updated_at
  before update on vendors for each row execute function touch_updated_at();

-- Contas a Pagar (notas de fornecedor)
create table if not exists vendor_bills (
  id                  uuid primary key default gen_random_uuid(),
  owner_id            text not null references "user"(id) on delete cascade,
  vendor_id           uuid references vendors(id) on delete set null,
  vendor_name         text not null,
  issue_date          date not null,
  due_date            date not null,
  amount_total        numeric(18,2) not null,
  open_amount         numeric(18,2) not null,
  original_amount     numeric(18,2),
  original_currency   text not null default 'BRL',
  status              text not null default 'Open',     -- Open|Pending|Overdue|Partial|Partially Paid|Paid|Void
  category            text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists idx_vendor_bills_owner    on vendor_bills(owner_id);
create index if not exists idx_vendor_bills_due_date on vendor_bills(due_date);
create or replace trigger trg_vendor_bills_updated_at
  before update on vendor_bills for each row execute function touch_updated_at();

-- Segmentos de filtro (project | department | product | region)
create table if not exists filter_segments (
  id             uuid primary key default gen_random_uuid(),
  owner_id       text not null references "user"(id) on delete cascade,
  segment_type   text not null,     -- project | department | product | region
  segment_value  text not null,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint uq_filter_segments unique (owner_id, segment_type, segment_value)
);
create index if not exists idx_filter_segments_owner on filter_segments(owner_id);
create or replace trigger trg_filter_segments_updated_at
  before update on filter_segments for each row execute function touch_updated_at();

-- Configurações contábeis do tenant
create table if not exists accounting_settings (
  id                  uuid primary key default gen_random_uuid(),
  owner_id            text not null references "user"(id) on delete cascade,
  basis               text not null default 'accrual',  -- accrual | cash
  base_currency       text not null default 'BRL',
  timezone            text not null default 'UTC',
  allow_future_dates  boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint uq_accounting_settings_owner unique (owner_id)
);
create index if not exists idx_accounting_settings_owner on accounting_settings(owner_id);
create or replace trigger trg_accounting_settings_updated_at
  before update on accounting_settings for each row execute function touch_updated_at();

-- Budgets (Orçamentos por categoria)
create table if not exists budgets (
  id             uuid primary key default gen_random_uuid(),
  owner_id       text not null references "user"(id) on delete cascade,
  category       text not null,
  period_month   text not null, -- formato 'YYYY-MM' ou 'ALL' para padrão
  amount         numeric(18,2) not null,
  currency       text not null default 'BRL',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint uq_budgets_owner_cat_period unique (owner_id, category, period_month)
);
create index if not exists idx_budgets_owner on budgets(owner_id);
create or replace trigger trg_budgets_updated_at
  before update on budgets for each row execute function touch_updated_at();

-- Relatórios agendados (config apenas; a ENTREGA automática é cron = extensão Onda 2)
create table if not exists scheduled_reports (
  id             uuid primary key default gen_random_uuid(),
  owner_id       text not null references "user"(id) on delete cascade,
  report_type    text not null,                       -- profit-loss | balance-sheet | cash-flow | tax-summary
  report_name    text not null,
  frequency      text not null default 'monthly',     -- daily | weekly | monthly | quarterly | yearly
  next_run_date  date,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists idx_scheduled_reports_owner on scheduled_reports(owner_id);
create or replace trigger trg_scheduled_reports_updated_at
  before update on scheduled_reports for each row execute function touch_updated_at();
