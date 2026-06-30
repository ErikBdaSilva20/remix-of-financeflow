-- =============================================================================
-- FinanceFlow — Setup completo do banco de dados
-- =============================================================================
-- Arquivo único para novos devs. Roda tudo na sequência correta.
-- É idempotente: pode ser executado mais de uma vez sem erros.
--
-- AMBIENTE LOCAL (Docker):
--   docker exec -i masia_local_db_financeflow \
--     psql -U masia -d tenant_local < supabase/setup.sql
--
-- NEON (produção / staging):
--   psql "postgresql://USER:PASS@HOST.neon.tech/DB?sslmode=require" \
--     -f supabase/setup.sql
--
-- O que este arquivo faz (em ordem):
--   1. Cria a tabela "user" (mock do Better-Auth — só necessária no dev local)
--   2. Cria todas as tabelas de negócio (schema 0001)
--   3. Aplica a migration 0002 (coluna job_type em customers)
-- =============================================================================


-- =============================================================================
-- PARTE 1 — Tabela "user" (mock local do Better-Auth / gateway)
-- Em produção essa tabela já existe, criada pelo gateway.
-- Em dev local precisamos dela para as foreign keys funcionarem.
-- =============================================================================

CREATE TABLE IF NOT EXISTS "user" (
  id         text primary key default gen_random_uuid()::text,
  name       text not null,
  email      text unique not null,
  password   text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- =============================================================================
-- PARTE 2 — Schema de negócio (0001_business_schema)
-- =============================================================================

-- Trigger reutilizável para updated_at automático
create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── LOOKUP TABLES — sem owner_id; read-only para rep ─────────────────────────

create table if not exists fx_rates (
  id           uuid primary key default gen_random_uuid(),
  currency     text not null,
  date         date not null,
  rate_to_base numeric(18,6) not null,
  is_imputed   boolean not null default false,
  created_at   timestamptz not null default now(),
  constraint uq_fx_rates_currency_date unique (currency, date)
);
create index if not exists idx_fx_rates_currency_date on fx_rates(currency, date desc);

-- ── BUSINESS TABLES — owner_id obrigatório em todas ──────────────────────────

create table if not exists bank_transactions (
  id                uuid primary key default gen_random_uuid(),
  owner_id          text not null references "user"(id) on delete cascade,
  date              date not null,
  amount            numeric(18,2) not null,
  original_amount   numeric(18,2),
  original_currency text not null default 'BRL',
  type              text not null default 'out',
  counterparty      text,
  category          text,
  description       text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists idx_bank_transactions_owner on bank_transactions(owner_id);
create index if not exists idx_bank_transactions_date  on bank_transactions(date desc);
create or replace trigger trg_bank_transactions_updated_at
  before update on bank_transactions for each row execute function touch_updated_at();

create table if not exists customers (
  id         uuid primary key default gen_random_uuid(),
  owner_id   text not null references "user"(id) on delete cascade,
  name       text not null,
  email      text,
  phone      text,
  address    text,
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_customers_owner on customers(owner_id);
create or replace trigger trg_customers_updated_at
  before update on customers for each row execute function touch_updated_at();

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

create table if not exists invoices (
  id                uuid primary key default gen_random_uuid(),
  owner_id          text not null references "user"(id) on delete cascade,
  customer_id       uuid references customers(id) on delete set null,
  issue_date        date not null,
  due_date          date not null,
  amount_total      numeric(18,2) not null,
  open_amount       numeric(18,2) not null,
  original_amount   numeric(18,2),
  original_currency text not null default 'BRL',
  status            text not null default 'Open',
  channel           text,
  product_id        text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists idx_invoices_owner    on invoices(owner_id);
create index if not exists idx_invoices_customer on invoices(customer_id);
create index if not exists idx_invoices_due_date on invoices(due_date);
create or replace trigger trg_invoices_updated_at
  before update on invoices for each row execute function touch_updated_at();

create table if not exists payments (
  id                uuid primary key default gen_random_uuid(),
  owner_id          text not null references "user"(id) on delete cascade,
  invoice_id        uuid references invoices(id) on delete set null,
  date              date not null,
  amount            numeric(18,2) not null,
  original_amount   numeric(18,2),
  original_currency text not null default 'BRL',
  status            text not null default 'Received',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists idx_payments_owner   on payments(owner_id);
create index if not exists idx_payments_invoice on payments(invoice_id);
create or replace trigger trg_payments_updated_at
  before update on payments for each row execute function touch_updated_at();

create table if not exists expenses_new (
  id                uuid primary key default gen_random_uuid(),
  owner_id          text not null references "user"(id) on delete cascade,
  date              date not null,
  amount            numeric(18,2) not null,
  original_amount   numeric(18,2),
  original_currency text not null default 'BRL',
  category          text not null,
  vendor            text,
  description       text,
  project_id        text,
  department        text,
  product           text,
  region            text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists idx_expenses_new_owner on expenses_new(owner_id);
create index if not exists idx_expenses_new_date  on expenses_new(date desc);
create or replace trigger trg_expenses_new_updated_at
  before update on expenses_new for each row execute function touch_updated_at();

create table if not exists vendor_bills (
  id                uuid primary key default gen_random_uuid(),
  owner_id          text not null references "user"(id) on delete cascade,
  vendor_name       text not null,
  issue_date        date not null,
  due_date          date not null,
  amount_total      numeric(18,2) not null,
  open_amount       numeric(18,2) not null,
  original_amount   numeric(18,2),
  original_currency text not null default 'BRL',
  status            text not null default 'Open',
  category          text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists idx_vendor_bills_owner    on vendor_bills(owner_id);
create index if not exists idx_vendor_bills_due_date on vendor_bills(due_date);
create or replace trigger trg_vendor_bills_updated_at
  before update on vendor_bills for each row execute function touch_updated_at();

create table if not exists filter_segments (
  id            uuid primary key default gen_random_uuid(),
  owner_id      text not null references "user"(id) on delete cascade,
  segment_type  text not null,
  segment_value text not null,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint uq_filter_segments unique (owner_id, segment_type, segment_value)
);
create index if not exists idx_filter_segments_owner on filter_segments(owner_id);
create or replace trigger trg_filter_segments_updated_at
  before update on filter_segments for each row execute function touch_updated_at();

create table if not exists accounting_settings (
  id                 uuid primary key default gen_random_uuid(),
  owner_id           text not null references "user"(id) on delete cascade,
  basis              text not null default 'accrual',
  base_currency      text not null default 'BRL',
  timezone           text not null default 'UTC',
  allow_future_dates boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint uq_accounting_settings_owner unique (owner_id)
);
create index if not exists idx_accounting_settings_owner on accounting_settings(owner_id);
create or replace trigger trg_accounting_settings_updated_at
  before update on accounting_settings for each row execute function touch_updated_at();

create table if not exists scheduled_reports (
  id            uuid primary key default gen_random_uuid(),
  owner_id      text not null references "user"(id) on delete cascade,
  report_type   text not null,
  report_name   text not null,
  frequency     text not null default 'monthly',
  next_run_date date,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_scheduled_reports_owner on scheduled_reports(owner_id);
create or replace trigger trg_scheduled_reports_updated_at
  before update on scheduled_reports for each row execute function touch_updated_at();


-- =============================================================================
-- PARTE 3 — Migration 0002: coluna job_type em customers
-- =============================================================================

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS job_type TEXT;


-- =============================================================================
-- PARTE 4 — Migration 0003: customer_id em expenses_new + scheduled_payment_date em invoices
-- =============================================================================

ALTER TABLE expenses_new
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS scheduled_payment_date DATE;

ALTER TABLE invoices
  ALTER COLUMN due_date DROP NOT NULL;


-- =============================================================================
-- PARTE 5 — Tabela de Fornecedores (vendors) e atualização de vendor_bills
-- =============================================================================

CREATE TABLE IF NOT EXISTS vendors (
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
CREATE INDEX IF NOT EXISTS idx_vendors_owner ON vendors(owner_id);
CREATE OR REPLACE TRIGGER trg_vendors_updated_at
  BEFORE UPDATE ON vendors FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

ALTER TABLE vendor_bills
  ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL;


-- =============================================================================
-- PARTE 6 — Tabela de Orçamentos (budgets)
-- =============================================================================

CREATE TABLE IF NOT EXISTS budgets (
  id             uuid primary key default gen_random_uuid(),
  owner_id       text not null references "user"(id) on delete cascade,
  category       text not null,
  period_month   text not null default 'ALL',
  amount         numeric(18,2) not null,
  currency       text not null default 'BRL',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  CONSTRAINT uq_budgets_owner_cat_period UNIQUE (owner_id, category, period_month)
);
CREATE INDEX IF NOT EXISTS idx_budgets_owner ON budgets(owner_id);
CREATE OR REPLACE TRIGGER trg_budgets_updated_at
  BEFORE UPDATE ON budgets FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

