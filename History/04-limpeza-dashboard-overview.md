# Limpeza dos cards do dashboard Overview

**Data:** 2026-06-30

## Pedido

> "Pega esse total de ativos financeiros, e remova ele completamente, deixe
> só os cards com receita, despesa, & lucro. Remova o card fluxo de caixa...
> Substitua ele [o card de Lucro] por valor líquido total."

## O que foi feito

Em `src/pages/Overview.tsx`:

1. **Removido** o hero card "Total de Ativos Financeiros"
   (`profit.amount + revenue.amount`).
2. **Removido** o card "Fluxo de Caixa" da grade de métricas; grade ajustada
   de 4 para 3 colunas (Receita, Despesas, Valor Líquido Total).
3. **Renomeado** o card "Lucro" para **"Valor Líquido Total"**. O cálculo já
   era `receita − despesas` em `usePeriodComparison.ts`
   (`cP = cR - cX`) — só o rótulo visível mudou, sem necessidade de tocar na
   lógica.
4. **Removido código morto**: depois que o hero card e o card "Saldos de
   Contas" (Conta Principal / Poupança / Investimento — dados fictícios, não
   ligados a nenhuma conta real) saíram, as variáveis `getMetric`, `getKPI`,
   `metrics`, `kpis`, `revenue`, `profit`, `cashFlow` e os hooks
   `useFinancialMetrics`/`useKPIs` ficaram órfãs e foram removidas.

## Arquivos alterados

- `src/pages/Overview.tsx`

## Verificação

`tsc --noEmit` e `vite build` limpos depois de cada etapa.
