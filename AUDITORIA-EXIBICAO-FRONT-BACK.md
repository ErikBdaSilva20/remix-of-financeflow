# Auditoria — Exibição front-end × back-end (pós-unificação `transactions`)

**Data:** 2026-06-30
**Escopo:** falhas e riscos na exibição de dados quando o front-end lê/escreve no
gateway, com atenção especial ao que mudou na fusão `payments`+`expenses_new` →
`transactions` e ao problema recorrente dos gráficos do dashboard.

**Método:** schema real lido do container Docker (`masia_local_db_financeflow`),
gateway testado ao vivo (sign-up → inserir fatura/income/expense → ler de volta),
e leitura dos hooks/páginas/repos. Dados de teste inseridos foram removidos ao fim.

> Este arquivo é só o diagnóstico. Nenhuma correção foi aplicada — serve de base
> pra engatar os fixes depois.

---

## 🔴 CRÍTICO

### C1. Gateway devolve `numeric` como **string** → gráfico do dashboard quebra

**Causa raiz.** No `scripts/dev-server.ts` só há parser custom para `date`
(OID 1082, linha 12). As colunas `numeric(18,2)` (OID 1700) **não** têm parser,
então o `node-postgres` as devolve como string. Confirmado ao vivo:

```json
{ "type": "expense", "amount": "8900.00", "original_amount": "8900.00" }
```

`amount` chega como `"8900.00"`, não `8900`.

**Sintoma (o bug dos gráficos do dashboard).** Em
`src/hooks/useRevenueExpensesPeriods.ts` os acumuladores começam em `0` (número)
e recebem `+=` com a string crua, **sem `Number()`** — linhas 47, 51, 64, 68, 80, 84:

```ts
if (p) p.revenue += inv.amount_total; // 0 + "5000.00" => "05000.00" (string!)
if (p) p.expenses += exp.amount; // vira concatenação de string
```

Resultado: `revenue`/`expenses` viram string concatenada (`"05000.005000.00"`),
o Recharts recebe valores inconsistentes e a escala/linha do gráfico
Receita×Despesas do dashboard fica errada/achatada. **É esta a dificuldade
recorrente dos gráficos.**

**Observação importante:** este hook é o **único** que faz aritmética sem
`Number()`. Todos os outros (`usePeriodComparison`, `useFinancialData`,
`useProfitabilityData`, `useRevenueDimensions`, `useCashFlowDrillDown`, etc.) já
envolvem em `Number(... || 0)` — por isso os cards funcionam e só o gráfico
quebra.

**Fix sugerido (2 camadas):**

1. **Portátil (primário):** envolver em `Number()` os 6 `+=` do
   `useRevenueExpensesPeriods.ts`, igual ao padrão dos demais hooks.
2. **Sistêmico (defensivo):** adicionar no `dev-server.ts` um parser
   `types.setTypeParser(1700, v => v === null ? null : parseFloat(v))` pra todo
   `numeric` já voltar como número — blinda qualquer código futuro. (numeric é
   `18,2`, `parseFloat` é seguro pra exibição.)

---

## 🟠 ALTO

### A2. Transações `income` são inalcançáveis pela UI → Cash Flow "Entradas" e linha "caixa" sempre zeradas

Única forma de criar `transaction` type=`income` é o `PaymentDialog`
(`src/components/PaymentDialog.tsx`), que só abre pelo botão "Receber" da tabela
de Contas a Receber. Mas:

- `InvoiceDialog` só cria faturas com status `Paid`/`PrepaidPending`
  (`src/components/InvoiceDialog.tsx:50,288-289`).
- A tabela AR (`useARDetailedData`) só mostra faturas com status
  `Open|Partial|Overdue|Partially Paid` (`src/hooks/useReceivablesData.ts:17`).

Ou seja: toda fatura criada nasce "realizada", nunca entra na lista de "Faturas
Abertas", o botão "Receber" nunca aparece, e nenhuma `income` é criada.
Consequência: `CashFlow.tsx` "Entradas de Caixa" e a linha `cash` de
`useRevenueTrends` ficam sempre em 0 — parece que "sumiu dado" no front.
(Parte disso é anterior à fusão, mas a fusão tornou o Cash Flow dependente de
`income`, então o efeito ficou mais visível.)

**Decisão de produto necessária:** ou permitir criar fatura "Aberta" (pra fluir
pro recebimento), ou alimentar caixa/entradas direto das faturas realizadas.

### A3. `toast` shadowado em `Receivables.tsx` → erro em runtime ao mudar status

`src/pages/Receivables.tsx` importa `toast` do `sonner` (linha 33) **e** logo
abaixo faz `const { toast } = useToast()` (linha 41), que sombreia o import. O
`updateStatusMutation` chama `toast.success(...)`/`toast.error(...)` (linhas
62, 65), mas o `toast` do `useToast` é uma função sem `.success`/`.error` →
`TypeError` em runtime ao atualizar status de fatura. (São os erros TS 2339 já
apontados pelo `tsc` nessas linhas.)

---

## 🟡 MÉDIO

### M4. `formatBRL(string)` nos drill-downs → valor cru "8900.00" na tela

`formatBRL` (usado em toda a app) faz `` `R$ ${amount.toLocaleString('pt-BR', …)}` ``.
Se `amount` for **string**, chama `String.prototype.toLocaleString`, que ignora
as opções de moeda e retorna a string como está.

- `ExpenseDrillDownTable` recebe `row.amount` string de `useExpenseDrillDown`
  (`src/hooks/useExpenseDrillDown.ts:51`) → exibe "8900.00" em vez de "R$ 8.900,00".
- `ProfitabilityDataTable` idem para o waterfall (`useProfitabilityDrillDown`
  passa `amount: i.amount_total`/`e.amount` string).
- `RevenueDrillDownTable` **não** sofre (usa `Intl.NumberFormat().format()`, que
  coage string→número).

Resolvido de vez pelo fix sistêmico C1.2; senão, `Number()` na origem dos hooks.

### M5. Status em `Receivables.tsx` com chaves minúsculas vs valores capitalizados

`statusNamesPt` (linha 152) e a lógica de variante do badge (linhas 483-487) usam
chaves minúsculas (`paid`, `pending`, `completed`, `overdue`), mas os status reais
são capitalizados (`Paid`, `Received`, `Open`, `PrepaidPending`). Efeito na
"Atividade Recente": o label cai no fallback e mostra o texto em inglês, e o badge
fica sempre `outline` (nunca verde/secundário). Puramente de exibição.

### M6. Página de Recebíveis fica vazia por design (liga a A2)

Como nenhuma fatura nasce "Aberta", a tabela "Faturas Abertas", os cards de aging
e o DSO ficam sempre sem dados — usuário cria fatura e "não aparece" em Contas a
Receber. Mesma raiz do A2.

---

## 🟢 BAIXO / limpeza

### B7. Default `original_currency = 'USD'` no banco local

No container, `invoices` e `vendor_bills` têm default `'USD'` (o `setup.sql` diz
`'BRL'`, mas `CREATE TABLE IF NOT EXISTS` nunca atualizou o banco antigo). Não
quebra em runtime (o front sempre envia `original_currency` explícito), mas é
inconsistente. Some ao recriar o banco do zero com o `setup.sql` atual.

### B8. Código morto em `Expenses.tsx`

`useFinancialMetrics()` + `getMetric('expenses')` (linhas 48, 69-71, 101):
`useFinancialMetrics` só retorna `revenue`/`mrr`/`arr`, nunca `expenses`, então
`expenses` é sempre `undefined` e só aparece em código comentado. Remover
`metrics`/`getMetric`/`expenses` (é o warning TS 6133 da linha 101).

### B9. "Gasto Médio Diário" fixo em /31

`Expenses.tsx:166` divide por `31` fixo em vez dos dias do período. Impreciso.

### B10. Erros TS pré-existentes que valem entrar no mesmo pente

Não são de exibição, mas convém corrigir junto (rodar `tsc --noEmit`):

- `Reports.tsx:53` — `handleScheduleSubmit` recebe `Partial<...>` mas
  `createScheduledReport` exige objeto completo (`is_active` etc.).
- `Receivables.tsx:367` — `ARInvoice.dueDate` é `string`, mas `useARDetailedData`
  devolve `dueDate: string | null` → incompatível (e `ARTable` faz
  `new Date(invoice.dueDate)` que viraria "Invalid Date" se null).
- Vários `useState`/imports não usados (`BudgetDialog`, `CustomerDialog`,
  `DashboardLayout`, `DonutChart`, `MetricCard`, `TimePeriodSelector`,
  `calendar.tsx`, `Profitability.tsx`, `Receivables.tsx` arLoading/apLoading).

---

## 🗄️ Alterações de SQL / schema — ✅ JÁ APLICADAS nos arquivos

As mudanças de schema abaixo **já foram feitas** nos arquivos `.sql` (prontas pra
rodar). A maioria dos outros fixes da auditoria é em TS, não em SQL.

### SQL-1 + SQL-2 — o que mudou
- **`supabase/setup.sql`** e **`supabase/migrations/0001_business_schema.sql`**:
  a tabela `transactions` ganhou `constraint chk_transactions_amount_positive
  check (amount >= 0)` (invariante "amount sempre positivo, sinal vem de `type`").
  O default de `original_currency` já era `'BRL'` aqui.
- **Novo `supabase/apply_fixes_existing_db.sql`** (idempotente): pra bancos
  **já provisionados** que não vão ser recriados. Faz:
  1. `original_currency` default USD → BRL em `invoices` e `vendor_bills`
     (banco antigo tinha nascido com `'USD'`);
  2. adiciona o `chk_transactions_amount_positive` (guardado em `DO block`).

### Como rodar depois
- **Recriando do zero (dev local):** só o `setup.sql` já basta —
  ```
  docker compose down -v && docker compose up -d
  docker exec -i masia_local_db_financeflow psql -U masia -d tenant_local < supabase/setup.sql
  ```
- **Sem recriar (manter dados) / Neon:**
  ```
  docker exec -i masia_local_db_financeflow psql -U masia -d tenant_local < supabase/apply_fixes_existing_db.sql
  ```
  > Já rodei este no seu Docker local — os 3 defaults estão `'BRL'` e os dois
  > CHECK de `transactions` estão presentes. Falta rodar só onde mais precisar (ex: Neon).

### Não é SQL
- **C1** (numeric vindo como string): o fix sistêmico é no `scripts/dev-server.ts`
  (`types.setTypeParser(1700, …)`), **não** DDL. O schema `numeric(18,2)` está
  correto — o problema é só a serialização do driver `pg`.
- **A2/M6** (fluxo fatura→recebimento): é decisão de produto/lógica no front, não
  precisa mudar schema (a coluna `status` já existe e comporta os valores).

---

## Resumo priorizado

| #      | Sev | Onde                                               | Efeito visível                                                           |
| ------ | --- | -------------------------------------------------- | ------------------------------------------------------------------------ |
| C1     | 🔴  | `useRevenueExpensesPeriods.ts` (+ `dev-server.ts`) | Gráfico Receita×Despesas do dashboard quebrado (string em vez de número) |
| A2     | 🟠  | Invoice/AR/PaymentDialog                           | Cash Flow "Entradas" e linha caixa sempre 0                              |
| A3     | 🟠  | `Receivables.tsx` toast                            | Erro em runtime ao mudar status de fatura                                |
| M4     | 🟡  | Expense/Profitability drill-down                   | Valor cru "8900.00" na tabela                                            |
| M5     | 🟡  | `Receivables.tsx` status                           | Label em inglês + badge sempre neutro                                    |
| M6     | 🟡  | Recebíveis                                         | Página sem dados (liga a A2)                                             |
| B7     | 🟢  | schema/banco                                       | Default USD inconsistente                                                |
| B8-B10 | 🟢  | vários                                             | Código morto / erros TS                                                  |

**Ordem de ataque sugerida:** C1 (resolve o gráfico, que é a dor principal) →
A3 (crash) → A2/M6 (decisão de produto sobre fluxo fatura→recebimento) → M4/M5
(cosmético) → B7-B10 (limpeza).
