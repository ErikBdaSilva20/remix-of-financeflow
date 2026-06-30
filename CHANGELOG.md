# FinanceFlow — Changelog Completo de Desenvolvimento

> Iniciado em 2026-06-29. Atualizado em 2026-06-30.

---

## 2026-06-30 — Auditoria de Conformidade (Sessão 2)

### Verificação pós-fixes

Todos os 17 itens da auditoria da sessão anterior foram verificados no código. 16 confirmados aplicados.

**Reaberto — M5:** `THIRD_PARTY.md` foi marcado como concluído na sessão anterior mas o arquivo não foi criado. Permanece pendente.

### Novos problemas identificados no Epic 6

**N1 — `BillPaymentDialog.tsx` usa `db` diretamente** (`src/components/BillPaymentDialog.tsx:75,87,95`)
Lógica de pagamento (calcular `open_amount`, determinar status `Paid`/`Partial`) está no componente em vez do repo. Pendente: extrair para `payVendorBill()` em `vendor_bills.repo.ts`.

**N2 — Tipos `any` no Epic 6**

- `src/pages/Receivables.tsx:48` — `useState<any | null>` para `selectedBill`
- `src/components/APTable.tsx:21` — `onPayBill?: (bill: any) => void`
  Pendente: definir e exportar interface `APBillDetail`.

### Correções aplicadas

**M5 (crítico) — `THIRD_PARTY.md` criado.** Arquivo na raiz creditando todas as
dependências do `package.json` com licença e link, separadas em: origem do markup
(shadcn/ui + Radix UI), libs de runtime, e ferramentas de dev/dev-server. Todas
permissivas (MIT/ISC/Apache-2.0), compatíveis com SaaS multi-tenant.

**N1 — `payVendorBill()` extraído para o repo.** Lógica de pagamento (transação
de saída + abatimento de `open_amount` + status) movida de `BillPaymentDialog.tsx`
para `vendor_bills.repo.ts`. O componente não usa mais `db` diretamente — chama
`payVendorBill(...)`. Padrão B5 do Importantdoc respeitado.

**N2 — Tipagem `APBillDetail`.** Interface exportada de `APTable.tsx`; `onPayBill`
e `selectedBill` (em `Receivables.tsx`) agora usam o tipo em vez de `any`.

Todas as pendências resolvidas. `tsc --noEmit` passa limpo.

---

---

## Visão Geral da Arquitetura

- **Frontend:** React 19 + Vite 6 + React Router (SPA)
- **Backend (dev):** Hono (`scripts/dev-server.ts`) — gateway mock local
- **Banco de dados:** PostgreSQL local (`localhost:5432/tenant_local`) ou Neon (produção)
- **State Management:** TanStack Query v5
- **Auth:** Sessão em memória no dev-server (Map de token → userId)
- **Schema:** `supabase/setup.sql` + `supabase/migrations/0001_business_schema.sql`
- **Tipagem:** `src/lib/data/types.gen.ts` (atualizado manualmente)

---

## Epics Concluídos

### ✅ Epic 1 — Cadastro de Faturas (Competência)

**Arquivo:** `src/components/InvoiceDialog.tsx`

- Modal "Nova Fatura" com campos: cliente, data de emissão, vencimento, valor, canal de venda
- Status inicial `Open`, `open_amount` = `amount_total`
- Ao salvar, invalida queries: `ar-data`, `ar-detailed`, `financial-metrics`, `revenue-trends`
- Botão "Nova Fatura" em `/revenue` e `/receivables`

### ✅ Epic 2 — Quitação de Faturas (Caixa)

**Arquivo:** `src/components/PaymentDialog.tsx`

- Modal "Registrar Recebimento" (dar baixa total ou parcial em fatura)
- Cria registro em `payments` vinculado à fatura
- Atualiza `open_amount` da fatura; se `<= 0`, muda status para `Paid`, senão `Partial`
- Invalida: `ar-data`, `ar-detailed`, `revenue-trends`, `cashflow-data`, `period-comparison`

### ✅ Epic 3 — Lançamento de Transações Bancárias

**Arquivo:** `src/components/TransactionDialog.tsx`

- Modal "Registrar Transação" com campos: data, tipo (in/out), categoria, contraparte, valor
- Insere em `bank_transactions`
- Invalida: `cashflow-data`,

### ✅ Epic 4 — Ações Rápidas & Atalhos

**Arquivo:** `src/components/DashboardLayout.tsx`

- Menu de ações rápidas no header para criação rápida de dados de qualquer tela
- Botões de atalho para: Nova Fatura, Nova Despesa, Nova Transação

### ✅ Epic 5 — Gestão de Orçamento (Budget vs Realizado)

**Arquivos criados/alterados:**

- `src/components/BudgetDialog.tsx` — Modal para definir orçamento por categoria
- `src/lib/data/budgets.repo.ts` — CRUD de budgets
- `supabase/migrations/0001_business_schema.sql` — Adicionada tabela `budgets`
- `supabase/setup.sql` — PARTE 6: criação da tabela `budgets`
- `src/lib/data/types.gen.ts` — Interface `budgets` adicionada
- `scripts/dev-server.ts` — `budgets` adicionado a `TABLES_WITH_OWNER`
- `src/hooks/useFinancialData.ts` — `useExpenseCategories` agora faz join com `budgets`
- `src/pages/Expenses.tsx` — Botão "Definir Orçamento" no card de Budget vs Realizado

**Schema da tabela `budgets`:**

```sql
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
```

### ✅ Epic 6 — Contas a Pagar e Gestão de Fornecedores (Accounts Payable)

**Arquivos criados/alterados:**

#### Novos arquivos:

- `src/lib/data/vendors.repo.ts` — CRUD de fornecedores
- `src/components/VendorDialog.tsx` — Modal "Novo Fornecedor"
- `src/components/BillDialog.tsx` — Modal "Nova Conta a Pagar" (seleciona fornecedor cadastrado)
- `src/components/BillPaymentDialog.tsx` — Modal "Registrar Pagamento" de conta a pagar

#### Arquivos alterados:

- `src/components/APTable.tsx` — Adicionado prop `onPayBill` + botão "Pagar" por linha
- `src/pages/Receivables.tsx` — Integrado VendorDialog, BillDialog, BillPaymentDialog com botões `+ Fornecedor` e `+ Fatura`
- `supabase/setup.sql` — PARTE 5: criação da tabela `vendors` + coluna `vendor_id` em `vendor_bills`
- `supabase/migrations/0001_business_schema.sql` — Tabela `vendors` + FK em `vendor_bills`
- `src/lib/data/types.gen.ts` — Interface `vendors` adicionada; `vendor_id` adicionado a `vendor_bills`
- `scripts/dev-server.ts` — `vendors` adicionado a `TABLES_WITH_OWNER`

**Fluxo do pagamento de conta a pagar (BillPaymentDialog):**

1. Cria `bank_transactions` com `type = 'out'` (saída de caixa real)
2. Atualiza `vendor_bills.open_amount` subtraindo o valor pago
3. Se `open_amount <= 0`, muda status para `Paid`, senão `Partial`
4. Invalida: `ap-data`, `ap-detailed`, `cashflow-data`, `expense-data`

**Schema da tabela `vendors`:**

```sql
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
```

---

## Bugs Corrigidos

### Bug 1 — 401 Unauthorized ao criar despesas

**Causa:** Dev-server usa Map em memória para sessões. Ao reiniciar, a sessão era perdida.
**Fix:** `src/lib/data/client.ts` — ao receber 401, força `window.location.reload()` para redirecionar ao login.

### Bug 2 — Tipagem fraca com `any`

**Arquivos corrigidos:**

- `src/components/ARTable.tsx` — Interface `ARInvoice` definida, tipagem forte nos props
- `src/pages/Receivables.tsx` — `selectedInvoice` tipado como `ARInvoice | null`
- `src/components/PaymentDialog.tsx` — Removido `any`, usa interface `Invoice`
- `src/components/TransactionDialog.tsx` — Error handling tipado

### Bug 3 — Layout quebrado no Overview

**Arquivo:** `src/pages/Overview.tsx`
**Causa:** Tags `div` mal fechadas no componente.
**Fix:** Estrutura de fechamento restaurada; card "Latest Transactions" recuperado.

### Bug 4 — Set iteration error no TypeScript

**Arquivo:** `scripts/dev-server.ts`
**Causa:** `new Set([...set1, ...set2])` incompatível com target do compilador.
**Fix:** Substituído por `.forEach()` para construir o Set combinado.

### Bug 5 — GET sem filtro de tenant (CRÍTICO de segurança)

**Arquivo:** `scripts/dev-server.ts`
**Causa:** `GET /data/:table` retornava todos os registros sem filtrar por `owner_id`.
**Fix:** Para tabelas em `TABLES_WITH_OWNER`, agora executa `WHERE owner_id = $1` usando o userId da sessão. Retorna 401 se não autenticado.

### Bug 6 — INSERT falhava silenciosamente com UUID vazio

**Arquivo:** `scripts/dev-server.ts`
**Causa:** Campos UUID opcionais enviados como string vazia `""` causavam erro de tipo no Postgres. O `catch {}` engolia o erro sem logar.
**Fix:**

- Loop de sanitização: `if (body[key] === '' || body[key] === undefined) body[key] = null`
- `catch (e: unknown)` com `console.error` para debug

### Bug 7 — Form de despesa bloqueava datas passadas

**Arquivo:** `src/components/ExpenseDialog.tsx`
**Causa:** `.refine((val) => val >= today(), ...)` impedia registrar despesas retroativas.
**Fix:** Validação removida. Campo de data também não tem mais `min={today()}`.

### Bug 8 — Despesas não apareciam (CRÍTICO — causa raiz)

**Arquivo:** `src/hooks/useFinancialData.ts`
**Causa:** `useExpenseCategories` fazia `Promise.all([fetchExpenses, fetchBudgets])`. A tabela `budgets` não existia no banco → SQL error → `Promise.all` rejeitava inteiro → zero despesas na UI.
**Fix:**

```ts
fetchTable<Budget>('budgets').catch(() => [] as Budget[]);
```

A falha do budgets agora é silenciosa; as despesas continuam sendo retornadas.

### Bug 9 — Tabelas `budgets` e `vendors` não existiam no banco

**Causa:** Foram criadas nos arquivos de migration, mas o banco local não havia sido migrado.
**Fix:** Script `migrate.js` (temporário, já removido) executou os `CREATE TABLE IF NOT EXISTS` necessários. O `setup.sql` foi atualizado com as PARTES 5 e 6 para que novos ambientes criem essas tabelas automaticamente.

### Bug 10 — staleTime de 30 minutos ignorava invalidações

**Arquivo:** `src/App.tsx`
**Causa:** `staleTime: 30 * 60 * 1000` fazia com que dados mutados demorassem até 30min para aparecer na UI, pois o cache não era considerado stale.
**Fix:** `staleTime: 2 * 60 * 1000` (2 minutos). `gcTime` mantido em 30min.

---

## Infraestrutura & Dev Server

### `scripts/dev-server.ts` — Tabelas permitidas

```ts
const TABLES_WITH_OWNER = new Set<string>([
  'bank_transactions',
  'customers',
  'contacts',
  'invoices',
  'payments',
  'expenses_new',
  'vendors', // ← adicionado (Epic 6)
  'vendor_bills',
  'filter_segments',
  'accounting_settings',
  'scheduled_reports',
  'budgets', // ← adicionado (Epic 5)
]);
```

### Padrão de invalidação após mutações

Sempre que um modal salva dados, invalide **todas** as queries que dependem daquela tabela:

```ts
// Exemplo: após criar uma despesa
queryClient.invalidateQueries({ queryKey: ['expense-data'] });
queryClient.invalidateQueries({ queryKey: ['expense-trends'] });
queryClient.invalidateQueries({ queryKey: ['financial-metrics'] });
queryClient.invalidateQueries({ queryKey: ['profitability-data'] });
queryClient.invalidateQueries({ queryKey: ['cashflow-data'] });
```

### QueryKeys mapeados por tabela

| Tabela              | QueryKeys que dependem dela                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------------- |
| `invoices`          | `ar-data`, `ar-detailed`, `financial-metrics`, `revenue-trends`, `revenue-data`                   |
| `payments`          | `ar-data`, `ar-detailed`, `revenue-trends`, `cashflow-data`, `period-comparison`                  |
| `expenses_new`      | `expense-data`, `expense-trends`, `expense-categories`, `financial-metrics`, `profitability-data` |
| `budgets`           | `expense-data`                                                                                    |
| `bank_transactions` | `cashflow-data`, `accounts-balance`, `ap-data`                                                    |
| `vendor_bills`      | `ap-data`, `ap-detailed`, `vendors`                                                               |
| `vendors`           | `vendors-list`                                                                                    |

---

## Repositórios de Dados (`src/lib/data/`)

| Arquivo                     | Tabela              | Exports                                                   |
| --------------------------- | ------------------- | --------------------------------------------------------- |
| `invoices.repo.ts`          | `invoices`          | `listInvoices`, `createInvoice`, `updateInvoice`          |
| `payments.repo.ts`          | `payments`          | `listPayments`, `createPayment`                           |
| `expenses_new.repo.ts`      | `expenses_new`      | `listExpensesNew`, `createExpenseNew`                     |
| `vendor_bills.repo.ts`      | `vendor_bills`      | `listVendorBills`, `createVendorBill`, `updateVendorBill` |
| `vendors.repo.ts`           | `vendors`           | `listVendors`, `createVendor`, `updateVendor`             |
| `budgets.repo.ts`           | `budgets`           | `listBudgets`, `createBudget`, `updateBudget`             |
| `bank_transactions.repo.ts` | `bank_transactions` | `listBankTransactions`, `createBankTransaction`           |
| `customers.repo.ts`         | `customers`         | `listCustomers`, `createCustomer`                         |

---

## Estado Atual dos Epics no `stories.md`

| Epic                              | Status       |
| --------------------------------- | ------------ |
| Epic 1 — Cadastro de Faturas      | ✅ Concluído |
| Epic 2 — Quitação e Recebimentos  | ✅ Concluído |
| Epic 3 — Transações Bancárias     | ✅ Concluído |
| Epic 4 — Ações Rápidas            | ✅ Concluído |
| Epic 5 — Gestão de Orçamento      | ✅ Concluído |
| Epic 6 — Contas a Pagar / Vendors | ✅ Concluído |
| Epic 7 — Relatórios e Exportação  | 🔜 Próximo   |

---

## Próximos Passos (Epic 7)

- [ ] Tela de Relatórios com filtros de período
- [ ] Exportação de dados para CSV/PDF
- [ ] Agendamento de relatórios (tabela `scheduled_reports`)

---

## Pendências — Fluxo de Caixa

- [x] **Limitar o *cálculo/visão padrão* de `CashFlow.tsx` ao mês corrente.**
  Implementado em 2026-06-30. A tela agora abre mostrando só mês atual + mês
  anterior (via `buildMonthCard`/`focusedCards`), com "Taxa de Queima Mensal"
  calculada direto pela saída do mês corrente (sem média entre vários meses).
  O comparativo Jan-Dez (`months`) só é montado/exibido quando o usuário clica
  em "Ver ano completo" — isto é o "navegar sob demanda" pedido.
  **Ressalva:** `listBankTransactions()` ainda busca *todo* o histórico do
  `owner_id` em uma chamada — `src/lib/data/client.ts` é um arquivo protegido
  (contrato genérico com o tenant-gateway, ver `masi.template.json` →
  `editable.protect`) e seu `list()` não aceita parâmetros de filtro por data.
  Um filtro de verdade no servidor exigiria estender esse contrato (ou a rota
  `GET /data/:table` do gateway) para aceitar query params de intervalo de
  datas — fora do escopo desta mudança, que ficou só client-side.
- [ ] Comparativo de períodos (mês atual vs anterior)
