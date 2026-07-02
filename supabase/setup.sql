-- =============================================================================
-- FinanceFlow — Setup completo do banco de dados
-- =============================================================================
-- Arquivo único para novos devs. Roda tudo na sequência correta.
-- É idempotente: pode ser executado mais de uma vez sem erros.
--
-- AMBIENTE LOCAL (Docker):
--   docker exec -i masia_local_db_financeflow \psql -U masia -d tenant_local < supabase/setup.sql
--
-- NEON (produção / staging):
--   psql "postgresql://USER:PASS@HOST.neon.tech/DB?sslmode=require" \
--     -f supabase/setup.sql
--
-- O que este arquivo faz (em ordem):
--   1. Cria a tabela "user" (mock do Better-Auth — só necessária no dev local)
--   2. Cria todas as tabelas de negócio
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
-- PARTE 2 — Schema de negócio
-- =============================================================================

-- Trigger reutilizável para updated_at automático
create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── BUSINESS TABLES — owner_id obrigatório em todas ──────────────────────────

-- Clientes
create table if not exists customers (
  id         uuid primary key default gen_random_uuid(),
  owner_id   text not null references "user"(id) on delete cascade,
  name       text not null,
  email      text,
  phone      text,
  job_type   text,
  address    text,
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_customers_owner on customers(owner_id);
create or replace trigger trg_customers_updated_at
  before update on customers for each row execute function touch_updated_at();

-- Um cliente não pode repetir e-mail nem celular dentro do mesmo tenant.
-- Normalizado (e-mail em minúsculas, celular só com dígitos) pra pegar
-- "Fulano@x.com" == "fulano@x.com" e "(11) 99999-9999" == "11999999999".
create unique index if not exists uq_customers_owner_email
  on customers (owner_id, lower(email))
  where email is not null and email <> '';
create unique index if not exists uq_customers_owner_phone
  on customers (owner_id, regexp_replace(phone, '\D', '', 'g'))
  where phone is not null and phone <> '';

-- Faturas / Contas a Receber
create table if not exists invoices (
  id                     uuid primary key default gen_random_uuid(),
  owner_id               text not null references "user"(id) on delete cascade,
  customer_id            uuid references customers(id) on delete set null,
  issue_date             date not null,
  due_date               date,
  scheduled_payment_date date,
  amount_total           numeric(18,2) not null,           -- em base currency
  open_amount            numeric(18,2) not null,           -- saldo em aberto (base)
  original_amount        numeric(18,2),
  original_currency      text not null default 'BRL',
  status                 text not null default 'Open',     -- Open|Partial|Overdue|Partially Paid|Paid|Void
  channel                text,                             -- canal de venda (ex: Direct, Online)
  product_id             text,                             -- produto/serviço referenciado
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index if not exists idx_invoices_owner    on invoices(owner_id);
create index if not exists idx_invoices_customer on invoices(customer_id);
create index if not exists idx_invoices_due_date on invoices(due_date);
create or replace trigger trg_invoices_updated_at
  before update on invoices for each row execute function touch_updated_at();

-- Receitas e despesas (caixa real). `type` distingue 'income' de 'expense';
-- `amount` é sempre positivo, o sinal vem de `type`.
-- income: recebimento contra uma fatura (invoice_id preenchido).
-- expense: despesa avulsa, opcionalmente vinculada a um cliente (reembolsável).
create table if not exists transactions (
  id                uuid primary key default gen_random_uuid(),
  owner_id          text not null references "user"(id) on delete cascade,
  type              text not null,                     -- income | expense
  date              date not null,
  amount            numeric(18,2) not null,             -- em base currency, sempre positivo
  original_amount   numeric(18,2),
  original_currency text not null default 'BRL',
  status            text,                               -- income: Received|Pending|Failed|Refunded
  invoice_id        uuid references invoices(id) on delete set null,   -- income
  customer_id       uuid references customers(id) on delete set null,  -- expense
  category          text,                               -- expense: cogs|marketing|payroll|office|software|etc.
  vendor            text,                               -- expense
  description       text,
  project_id        text,
  department        text,
  product           text,
  region            text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint chk_transactions_type check (type in ('income', 'expense')),
  constraint chk_transactions_amount_positive check (amount >= 0)
);
create index if not exists idx_transactions_owner   on transactions(owner_id);
create index if not exists idx_transactions_date    on transactions(date desc);
create index if not exists idx_transactions_type    on transactions(type);
create index if not exists idx_transactions_invoice on transactions(invoice_id);
create or replace trigger trg_transactions_updated_at
  before update on transactions for each row execute function touch_updated_at();

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

-- Mesma regra dos clientes: um fornecedor não pode repetir e-mail nem
-- telefone dentro do mesmo tenant (normalizado igual acima).
create unique index if not exists uq_vendors_owner_email
  on vendors (owner_id, lower(email))
  where email is not null and email <> '';
create unique index if not exists uq_vendors_owner_phone
  on vendors (owner_id, regexp_replace(phone, '\D', '', 'g'))
  where phone is not null and phone <> '';

-- Contas a Pagar (notas de fornecedor)
create table if not exists vendor_bills (
  id                uuid primary key default gen_random_uuid(),
  owner_id          text not null references "user"(id) on delete cascade,
  vendor_id         uuid references vendors(id) on delete set null,
  vendor_name       text not null,
  issue_date        date not null,
  due_date          date not null,
  amount_total      numeric(18,2) not null,
  open_amount       numeric(18,2) not null,
  original_amount   numeric(18,2),
  original_currency text not null default 'BRL',
  status            text not null default 'Open',     -- Open|Pending|Overdue|Partial|Partially Paid|Paid|Void
  category          text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists idx_vendor_bills_owner    on vendor_bills(owner_id);
create index if not exists idx_vendor_bills_due_date on vendor_bills(due_date);
create or replace trigger trg_vendor_bills_updated_at
  before update on vendor_bills for each row execute function touch_updated_at();

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

-- Metas financeiras (alvo de receita por instância de período).
-- period_key identifica o período específico: '2026-07' (mês), '2026-Q3'
-- (trimestre) ou '2026' (ano) — assim cada mês/trimestre/ano tem sua própria
-- meta e o histórico é preservado.
create table if not exists financial_goals (
  id            uuid primary key default gen_random_uuid(),
  owner_id      text not null references "user"(id) on delete cascade,
  period_type   text not null,                       -- month | quarter | year
  period_key    text not null,                       -- 2026-07 | 2026-Q3 | 2026
  target_amount numeric(18,2) not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint uq_financial_goals_owner_period_key unique (owner_id, period_type, period_key),
  constraint chk_financial_goals_period check (period_type in ('month', 'quarter', 'year'))
);
create index if not exists idx_financial_goals_owner on financial_goals(owner_id);
create or replace trigger trg_financial_goals_updated_at
  before update on financial_goals for each row execute function touch_updated_at();
