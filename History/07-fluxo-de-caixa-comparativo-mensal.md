# Fluxo de Caixa: de gráfico de linha para comparativo mês a mês

**Data:** 2026-06-30

Esta mudança aconteceu em duas etapas na mesma sessão: primeiro o redesign
geral (gráfico → cards mensais), depois um ajuste pra focar por padrão no mês
atual.

## Contexto

Perguntado se a tela de Fluxo de Caixa (`CashFlow.tsx`) era redundante com os
cards de Receita/Despesa do Overview. Resposta: são fontes de dados
diferentes — Overview usa faturas/despesas (regime de competência, só status
"realizado"); CashFlow usa `bank_transactions` lançadas manualmente (regime de
caixa). Mas a UI do CashFlow (gráfico de linha com toggle diário/mensal,
`dateRangeDays` calculado a partir do intervalo dos dados) foi considerada
confusa. Pedido: **converter para cards mês a mês, comparando mês X com mês
Y.**

## Etapa 1 — Redesign: cards Jan-Dez

### Reaproveitado

- `listBankTransactions()`, query key `cashflow-data`.
- KPIs do topo (Fluxo Operacional/Livre, Saldo, Taxa de Queima) e o resumo de
  Entradas/Saídas/Runway.
- `useCashFlowDrillDown` + `CashFlowDataTable` — o hook já aceitava
  `dateKey` no formato `yyyy-MM` pra expandir o mês inteiro num drill-down,
  então encaixou direto nos novos cards mensais sem precisar mudar o hook.
- `TransactionDialog` pra registrar novas transações.

### Jogado fora

- `LineChart`/`CartesianGrid`/`Legend`/`XAxis`/`YAxis` (recharts) e toda a
  lógica de granularidade diária vs. mensal baseada em `dateRangeDays`/
  `differenceInDays`.

### Novo

Doze cards (Janeiro–Dezembro) usando o componente `MetricCard` já existente
no projeto, cada um mostrando o valor líquido (entradas − saídas) daquele mês
e a variação percentual vs. o mês anterior (Janeiro compara com Dezembro do
ano anterior, se houver dado — rastreado separadamente como `prevDecNet`).
Clicar num card abre o drill-down das transações daquele mês. Botões `<`/`>`
trocam o ano exibido. "Taxa de Queima Mensal" virou a média de saídas dos
meses com dado no ano selecionado.

## Etapa 2 — Foco no mês atual por padrão

Item pendente anotado no `CHANGELOG.md` (a pedido do usuário, pra não
esquecer): *"limitar a busca/cálculo padrão ao mês atual (com opção de
navegar para meses anteriores sob demanda)"*. Implementado nesta mesma sessão,
depois do redesign:

- Por padrão a tela mostra só **2 cards**: mês atual + mês anterior
  (`focusedCards`), em vez da grade completa de 12 meses.
- "Taxa de Queima Mensal" passou a usar diretamente a saída do mês corrente
  (sem média entre vários meses); só recai pra média quando o usuário está
  navegando por um ano diferente do atual.
- Botão **"Ver ano completo"** revela a grade Jan–Dez sob demanda (com
  navegação de ano); "Mostrar só o mês atual" volta ao estado focado e
  reseta o ano selecionado pro ano corrente.
- Extraída a função `buildMonthCard(i)` pra gerar as props de um card de mês,
  reaproveitada tanto na visão focada quanto na grade completa.

### Ressalva (anotada e não resolvida)

`listBankTransactions()` continua buscando **todo** o histórico de
transações numa única chamada — `src/lib/data/client.ts` (contrato genérico
com o tenant-gateway) é um arquivo protegido (`masi.template.json` →
`editable.protect`) e seu `list()` não aceita parâmetros de filtro por data.
A limitação ao mês atual implementada aqui é só do lado do cálculo/render no
cliente; um filtro de verdade no servidor exigiria estender esse contrato (ou
a rota `GET /data/:table` do gateway) pra aceitar query params de intervalo
de datas — fora do escopo desta sessão.

## Arquivos alterados

- `src/pages/CashFlow.tsx`

## Verificação

`tsc --noEmit` e `vite build` limpos depois de cada etapa.
