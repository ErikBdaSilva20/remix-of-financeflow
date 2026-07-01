# Limpeza de tabelas mortas (contacts, bank_transactions, fx_rates) e unificação payments+expenses_new em transactions

**Data:** 2026-06-30

## Pedido (parte 1 — lixo morto)

> "tenho muitas tabelas inuteis, como, conctacts, accounts, bank_transactions.
> essas quero tirar, e a fx rates eu n lembro pra q serve" → confirmado: remover
> as 3 mesmo sabendo que `bank_transactions` e `fx_rates` alimentavam features
> ativas (Cash Flow e conversão de moeda).

## Levantamento

- `contacts`: **lixo de verdade** — `ContactsDialog.tsx`/`ContactForm.tsx`
  existiam mas não eram importados em nenhuma página (sem rota acessível).
- `bank_transactions`: alimentava a página inteira de Cash Flow (totais,
  comparativo mensal, drill-down) e a aba "Transação Bancária" do
  `EntryDialog`.
- `fx_rates`: usada só em `useMarginTrendsTimeSeries` (Profitability), sempre
  chamada com `currency: 'BRL'` → `convertAmount` já era um no-op na prática.

## O que foi feito

- Deletados: `ContactAvatar.tsx`, `ContactForm.tsx`, `ContactsDialog.tsx`,
  `useContacts.ts`, `contacts.repo.ts`, `useCurrencyConversion.ts` (zero
  consumidores), `fx_rates.repo.ts`, `bank_transactions.repo.ts`,
  `TransactionDialog.tsx`.
- `useProfitabilityData.ts`: removida a lógica de conversão de câmbio
  (fxMap/getFxRate/convertAmount), usa os valores brutos diretamente.
- `useCashFlowDrillDown.ts` e `CashFlow.tsx`: reescritos para derivar caixa
  real de `payments` (entrada) + `expenses_new` (saída) em vez de
  `bank_transactions`.
- `EntryDialog.tsx`: removida a aba "Transação Bancária" (só Fatura/Receita e
  Despesa).
- `vendor_bills.repo.ts`: `payVendorBill()` não grava mais transação bancária
  morta ao quitar uma conta a pagar.
- `types.gen.ts`, `useAppDataPrefetch.ts`, `scripts/dev-server.ts`: tipos e
  rotas genéricas das 3 tabelas removidos.
- Schema SQL (`0001_business_schema.sql`, `setup.sql`): `create table` de
  `contacts`, `bank_transactions`, `fx_rates` removidas — só afeta instalações
  novas (scripts usam `if not exists`).
- `supabase/drop_unused_tables.sql` criado com os `DROP TABLE` manuais, não
  executado (sem acesso ao banco do usuário).

## Pedido (parte 2 — unificação payments + expenses_new)

> "Pega esse setup.sql ... vamos colocar todos os valores dentro de uma ÚNICA
> tabela, pra gente colocar expense e income em uma tabela só. [...] precisamos
> melhorar essa organização das tabelas pra gente rodar novamente no docker."

Decisões fechadas com o usuário antes de mexer:

- Fundir **só** `payments` + `expenses_new` numa tabela `transactions`
  (`type: 'income' | 'expense'`). `invoices` e `vendor_bills` continuam
  separados — precisam de status/vencimento/valor em aberto para Contas a
  Receber/Pagar.
- Recebíveis/Pagáveis continuam funcionando como hoje.
- É só banco de dev local (Docker) — schema recriado do zero, sem script de
  migração de dados existentes.
- SQL + código da aplicação na mesma etapa.

## O que foi feito

- Tabela `transactions`: `type`, `date`, `amount` (sempre positivo, sinal vem
  de `type`), `original_amount`, `original_currency`, `status` (só income),
  `invoice_id` (só income), `customer_id` (despesa vinculada a cliente,
  reembolsável), `category`/`vendor` (só expense), `description`,
  `project_id`, `department`, `product`, `region`. Constraint
  `chk_transactions_type` trava `type` em `income`/`expense`.
- Novo `src/lib/data/transactions.repo.ts` substitui `payments.repo.ts` e
  `expenses_new.repo.ts` (deletados).
- Todo consumidor das tabelas antigas migrado para `transactions` filtrando
  por `type` client-side: `useFinancialData.ts` (`useExpenseCategories`,
  `useExpenseTrends`, `useRevenueTrends`), `usePeriodComparison.ts`,
  `useProfitabilityData.ts`, `useProfitabilityDrillDown.ts`,
  `useRevenueExpensesPeriods.ts`, `useExpenseDrillDown.ts`,
  `useCashFlowDrillDown.ts`, `useReceivablesData.ts` (`useRecentActivity`),
  `CashFlow.tsx`.
- `ExpenseDialog.tsx` e `PaymentDialog.tsx`: criam `transactions` com
  `type: 'expense'`/`type: 'income'` em vez de `expenses_new`/`payments`.
- `setup.sql` reescrito do zero: as duas tabelas viram `transactions`, e os
  `ALTER TABLE` avulsos de "PARTE 3/4" (job_type, customer_id em despesas,
  scheduled_payment_date, due_date nullable) foram incorporados direto nas
  definições das tabelas — sem mais patches incrementais soltos no fim do
  arquivo.
- `0001_business_schema.sql` espelha a mesma tabela `transactions`.
- De passagem: corrigidos dois bugs de tipagem pré-existentes em
  `useProfitabilityDrillDown.ts` (campos `category`/`channel` nullable
  atribuídos a um tipo que não aceitava `null`).

## Verificação

`tsc --noEmit` limpo — os únicos erros restantes são pré-existentes,
em arquivos não tocados nesta sessão (Receivables.tsx, Reports.tsx,
Profitability.tsx, etc.), confirmados idênticos à baseline de antes da
sessão.

## Pendência

Banco Docker local ainda tem as tabelas antigas (`payments`, `expenses_new`,
`contacts`, `bank_transactions`, `fx_rates`) fisicamente — `setup.sql` usa
`if not exists`, então rodar de novo só _adiciona_ `transactions`, não some
com as antigas. Como combinado, é dev local sem dado real: a forma mais limpa
é derrubar o container/volume do Postgres e subir de novo do zero rodando o
`setup.sql` atualizado.
