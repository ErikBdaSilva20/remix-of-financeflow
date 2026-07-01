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
