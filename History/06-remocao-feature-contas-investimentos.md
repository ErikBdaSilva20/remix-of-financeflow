# Remoção completa da feature de "contas" (poupança/investimento)

**Data:** 2026-06-30

## Pedido

> "Delete todas as areas de 'accounts', não teremos area de investimentos e
> poupança, é código morto inutil p gente."

O usuário já tinha começado essa limpeza manualmente (apagou
`src/lib/data/accounts.repo.ts` e começou a tirar imports de
`TransactionDialog.tsx`), deixando o arquivo temporariamente quebrado
(`accounts` referenciado sem estar importado). O trabalho foi concluído de
forma sistemática.

## Levantamento

A tabela `accounts` (conta corrente/poupança/investimento, com campo
`balance`) era referenciada em:

- `TransactionDialog.tsx` — campo "Conta Financeira" no formulário, e lógica
  que atualizava `balance` da conta a cada transação.
- `CashFlow.tsx` — somava `balance` de todas as contas pra calcular "Saldo em
  Caixa".
- `Overview.tsx` — card "Saldos de Contas" (Conta Principal / Poupança /
  Investimento) — dados na verdade não vinham de contas reais, usavam métricas
  (`revenue`/`profit`/`cashFlow`) como valores de exibição; já tinha sido
  removido manualmente antes desta etapa.
- `src/lib/data/types.gen.ts` — tipo `accounts` e campo `account_id` em
  `bank_transactions`.
- `scripts/dev-server.ts` — `'accounts'` em `TABLES_WITH_OWNER` (rota
  genérica `/data/accounts`) — já removido manualmente pelo usuário antes
  desta etapa.
- `supabase/migrations/0001_business_schema.sql` e `supabase/setup.sql` —
  `create table accounts (...)` e a coluna `bank_transactions.account_id`
  (FK pra `accounts`).

## O que foi feito

- **`TransactionDialog.tsx`**: removido o campo "Conta Financeira" do
  formulário (`account_id`, `<Select>` de contas), a chamada a `updateAccount`
  (módulo já não existia mais) e as invalidações de query mortas
  (`accounts-balance`, `accounts`).
- **`CashFlow.tsx`**: removida a busca `listAccounts()`; "Saldo em Caixa"
  passou a ser o saldo líquido acumulado das próprias `bank_transactions`
  (`netCashFlow`), já que não existe mais um saldo de conta independente.
- **`types.gen.ts`**: removido o tipo da tabela `accounts` e o campo
  `account_id` de `bank_transactions`.
- **Schema SQL** (migration + `setup.sql`): removida a `create table
  accounts` e a coluna `account_id` (com sua FK) de `bank_transactions`.

## Ressalva importante (não resolvida)

Os scripts SQL usam `create table if not exists` — rodá-los de novo **não**
apaga a tabela `accounts` nem a coluna `account_id` de um banco já
provisionado. Isso só afeta setups novos. Se o usuário já tem um banco com
essas estruturas, é preciso um `DROP TABLE accounts` /
`ALTER TABLE bank_transactions DROP COLUMN account_id` manual à parte — não
foi feito por ser uma ação destrutiva em dados reais, fora do escopo
autorizado nesta sessão.

## Arquivos alterados

- `src/components/TransactionDialog.tsx`
- `src/pages/CashFlow.tsx`
- `src/lib/data/types.gen.ts`
- `supabase/migrations/0001_business_schema.sql`
- `supabase/setup.sql`
- `src/lib/data/accounts.repo.ts` (deletado — já estava deletado pelo usuário
  antes desta etapa; só foi formalizado no commit)

## Verificação

`tsc --noEmit` e `vite build` limpos.
