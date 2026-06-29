-- Migration 0003: customer_id em expenses_new + scheduled_payment_date em invoices

ALTER TABLE expenses_new
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS scheduled_payment_date DATE;

ALTER TABLE invoices
  ALTER COLUMN due_date DROP NOT NULL;
