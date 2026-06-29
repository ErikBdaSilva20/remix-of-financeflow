-- LOCAL DEV ONLY — cria a tabela "user" que em produção é criada pelo Better-Auth/gateway.
-- Execute ANTES de 0001_business_schema.sql.
-- NÃO sobe para produção.

CREATE TABLE IF NOT EXISTS "user" (
  id         text primary key default gen_random_uuid()::text,
  name       text not null,
  email      text unique not null,
  password   text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
