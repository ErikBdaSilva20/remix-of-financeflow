-- Apaga tabelas que já saíram do schema/código mas continuam existindo em
-- bancos antigos, porque `setup.sql` usa `CREATE TABLE IF NOT EXISTS` (nunca
-- apaga nada sozinho). Rode isto manualmente depois de atualizar o schema.
--
-- AMBIENTE LOCAL (Docker):
--   docker exec -i masia_local_db_financeflow \
--     psql -U masia -d tenant_local < supabase/drop_legacy_tables.sql
--
-- ATENÇÃO: destrutivo — apaga as tabelas e todos os dados nelas.
-- Sem FKs de outras tabelas apontando para estas, então a ordem não importa.

-- payments + expenses_new → substituídas por transactions (type: income|expense)
drop table if exists payments;
drop table if exists expenses_new;

-- contacts, bank_transactions, fx_rates → removidas por serem código morto
drop table if exists contacts;
drop table if exists bank_transactions;
drop table if exists fx_rates;
