# Correção: status da fatura inflava o Total de Ativos Financeiros

**Data:** 2026-06-30

## Problema relatado

> "Independente se eu colocar atrasado, ele vai subir o meu total de ativos
> financeiros. Então eu acho que isso aqui não tá fazendo sentido."

No dashboard principal (`Overview.tsx`), o card "Total de Ativos Financeiros"
somava `amount_total` de **todas** as faturas, sem olhar o `status`. Uma fatura
marcada como `Overdue` (Atrasada) contava como se já tivesse sido recebida.

## Investigação

Busca por todos os pontos que somam `amount_total` de `invoices` encontrou
**10 locais** sem nenhum filtro de status:

- `useFinancialData.ts` — `useFinancialMetrics`, `useRevenueSources`,
  `useRevenueTrends` (linha "accrual"), `useTopClients`
- `usePeriodComparison.ts` — `sumInv()`
- `useRevenueDimensions.ts` — `useRevenueDimensions`,
  `useRevenueByProductTrends`
- `useRevenueProfitData.ts` — `useRevenueProfitData`
- `useProfitabilityData.ts` — `useMarginTrendsTimeSeries`

Já existia uma constante `AR_OPEN` em `useReceivablesData.ts` para Contas a
Receber, mas ela não era usada nos cálculos de receita/lucro — só no saldo de
AR.

## Decisão

Perguntado ao usuário qual regra de "realizado" usar. Resposta: **só `Paid`
(Paga) e `PrepaidPending` (Pago Adiantado) contam** como dinheiro de fato
recebido. Os demais status (`Draft`, `Open`, `Overdue`, `Cancelled`,
`Scheduled`) ficam fora do total.

Também foi decidido aplicar essa regra **uniformemente** em todos os 10 locais
(não só no card do dashboard), porque o modelo atual não distingue
"reconhecido" (accrual) de "recebido" (cash) em nenhum outro lugar — aplicar
em só um ponto deixaria os números do Overview e da página de Revenue
inconsistentes entre si.

## O que foi feito

Criado `src/lib/finance/invoiceStatus.ts`:

```ts
export const REALIZED_INVOICE_STATUSES = ["Paid", "PrepaidPending"] as const;
export function isRealizedInvoice(invoice: { status?: string | null }): boolean { ... }
```

Aplicado `.filter(isRealizedInvoice)` (ou equivalente inline) antes de somar
`amount_total` nos 10 locais listados acima.

## Arquivos alterados

- `src/lib/finance/invoiceStatus.ts` (novo)
- `src/hooks/useFinancialData.ts`
- `src/hooks/usePeriodComparison.ts`
- `src/hooks/useRevenueDimensions.ts`
- `src/hooks/useRevenueProfitData.ts`
- `src/hooks/useProfitabilityData.ts`

## Verificação

`tsc --noEmit` e `vite build` limpos após a mudança.
