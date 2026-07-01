-- Ajustes idempotentes para bancos JÁ provisionados (que você não quer recriar
-- do zero). O `setup.sql` já nasce correto para instalações novas; este script
-- alinha um banco antigo sem perder dados.
--
-- AMBIENTE LOCAL (Docker):
--   docker exec -i masia_local_db_financeflow \
--     psql -U masia -d tenant_local < supabase/apply_fixes_existing_db.sql
--
-- Seguro rodar mais de uma vez.

-- ── SQL-1: default original_currency USD → BRL (invoices + vendor_bills) ──────
-- Bancos antigos foram criados com default 'USD'; alinhamos com o schema atual.
ALTER TABLE invoices     ALTER COLUMN original_currency SET DEFAULT 'BRL';
ALTER TABLE vendor_bills ALTER COLUMN original_currency SET DEFAULT 'BRL';

-- ── SQL-2: reforça invariante transactions.amount >= 0 ───────────────────────
-- (amount é sempre positivo; o sinal vem de `type`.) ADD CONSTRAINT não tem
-- IF NOT EXISTS para CHECK, então guardamos num DO block.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_transactions_amount_positive'
  ) THEN
    ALTER TABLE transactions
      ADD CONSTRAINT chk_transactions_amount_positive CHECK (amount >= 0);
  END IF;
END $$;

-- ── SQL-3: tabela de metas financeiras (alvo de receita por instância de período) ──
create table if not exists financial_goals (
  id            uuid primary key default gen_random_uuid(),
  owner_id      text not null references "user"(id) on delete cascade,
  period_type   text not null,
  period_key    text not null,
  target_amount numeric(18,2) not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint uq_financial_goals_owner_period_key unique (owner_id, period_type, period_key),
  constraint chk_financial_goals_period check (period_type in ('month', 'quarter', 'year'))
);
create index if not exists idx_financial_goals_owner on financial_goals(owner_id);
create or replace trigger trg_financial_goals_updated_at
  before update on financial_goals for each row execute function touch_updated_at();

-- Migração para bancos que criaram financial_goals na versão sem period_key:
alter table financial_goals add column if not exists period_key text;
update financial_goals set period_key = to_char(now(), 'YYYY-MM') where period_key is null;
alter table financial_goals alter column period_key set not null;
alter table financial_goals drop constraint if exists uq_financial_goals_owner_period;
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'uq_financial_goals_owner_period_key'
  ) then
    alter table financial_goals
      add constraint uq_financial_goals_owner_period_key unique (owner_id, period_type, period_key);
  end if;
end $$;
