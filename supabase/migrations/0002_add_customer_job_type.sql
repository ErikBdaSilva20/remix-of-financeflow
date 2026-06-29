-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 0002_add_customer_job_type
-- Adiciona a coluna job_type à tabela customers.
--
-- SEGURO PARA RODAR MAIS DE UMA VEZ (usa IF NOT EXISTS).
-- Rode APENAS UMA VEZ por ambiente (Neon produção ou Docker local).
--
-- Contexto:
--   phone já existia desde 0001_business_schema.sql.
--   job_type é novo — registra o tipo de serviço/trabalho do cliente.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS job_type TEXT;

-- ─────────────────────────────────────────────────────────────────────────────
-- Após rodar este arquivo, atualize também src/lib/data/types.gen.ts:
--
--   customers > Row: adicionar a linha:
--     job_type: string | null;
--
-- Veja a seção "Passo a Passo" no final de docs/STORIES-CUSTOMER-INVOICE.md.
-- ─────────────────────────────────────────────────────────────────────────────
