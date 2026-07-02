# Auditoria de código — 2026-07-02

Escopo: `src/` inteiro (páginas, hooks, componentes, `lib/`). Foco pedido:
código morto, más práticas, duplicação/reutilização, nomes de arquivo x
conteúdo, informação financeira fixa (hardcoded) e fluxos quebrados.

Método: cruzamento de imports por arquivo/símbolo (cada nome buscado no
projeto inteiro fora do próprio arquivo) + leitura dos hooks de dados e
páginas — este
documento cobre o **código morto granular** e problemas que sobraram.

> Nada aqui foi alterado. É só o diagnóstico.

---

## 1. Código morto (zero uso confirmado por grep cruzado)

### 1.1 `src/lib/currencySymbols.ts` — arquivo inteiro morto

`CURRENCY_SYMBOLS` (mapa de 27 moedas) e `getCurrencySymbol` **não são
importados em lugar nenhum** fora do próprio arquivo. 33 linhas de mapa
multi-moeda que nada consome — coerente com o fato de a moeda estar
fixada em BRL em todo o resto do app. remover

### 1.2 `src/lib/utils.ts` → `formatCurrency(amount, currency='BRL')` — nunca importado

Ironia: é a **única** função de formatação que aceita a moeda como
parâmetro, e é justamente a que ninguém usa. Todas as telas usam versões
com BRL cravado (§3.1). Candidata natural a virar a formatação única do
app; hoje é peso morto.

### 1.3 Funções de formatação exportadas e não usadas

- `formatChange` — `src/hooks/useProfitabilityData.ts:220` (0 usos).
- `formatProfitCurrency` — `src/hooks/useProfitabilityData.ts:205` (0 usos).
  Além de morta, hardcoda o símbolo `$` (dólar), inconsistente com o
  resto do app em `R$`.
- `formatPercentage` — `src/hooks/useFinancialData.ts:333` (0 usos).

### 1.4 `useKPIs` é um stub que nunca retorna dado

`src/hooks/useFinancialData.ts:320` — `queryFn: async () => []`. Sempre
array vazio. Só é chamado em `useAppDataPrefetch.ts:26` (prefetch de uma
query que nunca traz nada). Consequência em cadeia: a interface `KPI` e o
campo **`KPI.growth_rate`** (`useFinancialData.ts:57`) só existem por causa
desse stub — é o último resquício do `growth_rate` hardcoded citado no
audit anterior (item 1.2 do `AUDITORIA.md`). Remover o hook mata a
interface e o campo junto.

### 1.5 Entrada de dicionário morta

`Profitability.tsx:93` — `trendNamesPt` mapeia `'EBITDA Margin'`, mas
`useMarginTrends` só devolve `Gross/Operating/Net Margin`. A chave EBITDA
nunca casa.

---

## 2. Fluxos quebrados / inconsistentes

### 2.1 Contas a pagar: resumo e detalhe filtram status diferentes (bug)

- `useAPData` (card/total/donut) filtra:
  `['Open','Pending','Overdue','Partial','Partially Paid']`
  (`useReceivablesData.ts:70-72`).
- `useAPDetailedData` (tabela detalhada) filtra só:
  `['Open','Partial','Partially Paid']` (`useReceivablesData.ts:273`).

Contas com status **`Pending`** ou **`Overdue`** entram no total e no card
de "vencidas", mas **somem da tabela detalhada** logo abaixo. O usuário vê
um total que não fecha com a lista. (No lado de recebíveis isto está
correto: `useARData` e `useARDetailedData` usam a mesma constante
`AR_OPEN`.)

### 2.2 Sem enum central de status → grafias divergentes espalhadas

Convivem `'Partial'` e `'Partially Paid'`, `'Open'` e `'Pending'`,
`'Overdue'`. AR usa a constante `AR_OPEN`; AP usa **duas listas inline
diferentes** (§2.1). Não há uma fonte única de "o que é uma fatura/conta
em aberto". É a causa-raiz do 2.1 e um convite a novos bugs.

### 2.3 `netMargin` = `operatingMargin` na série temporal (enganoso)

`useMarginTrendsTimeSeries` (`useProfitabilityData.ts:302`):
`netMargin = (operatingProfit / revenue) * 100` — **idêntico** à
`operatingMargin` da linha acima. A série rotulada "Margem Líquida" é uma
cópia da operacional (nenhum imposto/juro é modelado). Ou some com a
linha, ou modela a diferença; hoje é uma terceira linha redundante no
gráfico.

### 2.4 COGS calculado de dois jeitos diferentes

- `Reports.tsx:44-46` usa `CATEGORY_GROUP` (o `group` do enum
  `EXPENSE_CATEGORIES`).
- `useProfitabilityData.ts:80-84` e `useMarginTrendsTimeSeries:285` usam
  match de string (`.includes('cogs') || .includes('cost of goods')`).

DRE (Relatórios) e Rentabilidade podem classificar a mesma despesa em
grupos diferentes e mostrar CPV/lucro divergentes entre as duas telas.

---

## 3. Duplicação / candidatos a reutilização

### 3.1 `formatBRL` copiado em 3 páginas

Definição idêntica em `Profitability.tsx:35`, `ReceivablesPayables.tsx:49`
e `Reports.tsx:10`. Somando `useFinancialData.formatCurrency` e o
`utils.formatCurrency` morto, são **5 formatadores de moeda** no projeto,
todos presos a `pt-BR`/`R$`. Deveria existir **um** helper compartilhado
(idealmente o de `utils.ts`, que já aceita a moeda como parâmetro).

### 3.2 Helpers de deduplicação copiados entre repos

`normalizeEmail`, `normalizePhone` e o corpo de `findDuplicate*` são
praticamente idênticos em `customers.repo.ts` e `vendors.repo.ts`. Dá para
extrair um `findDuplicateBy({email, phone}, rows)` genérico.

### 3.3 Três hooks de drill-down com o mesmo formato

`useProfitabilityDrillDown`, `useCashFlowDrillDown`, `useExpenseDrillDown`
seguem o mesmo padrão (state + open/close + payload). Generalizável num
`useDrillDown<T>()`. Prioridade baixa — funciona, só é repetitivo.

---

## 4. Informação financeira fixa (hardcoded)

### 4.1 Moeda BRL/pt-BR cravada em toda a exibição

Todos os formatadores (§3.1) assumem Brasil. Sendo isto um **template para
clonar** por outros tenants, a moeda-base deveria ser configuração, não
constante. Observação: os dados guardam `original_currency`/
`original_amount` por linha e a "Atividade Recente" (`useReceivablesData`/
`useOverviewData`) até respeita isso — mas todas as agregações/relatórios
somam `amount_total` e exibem em `R$` fixo. O suporte multi-moeda existe no
schema e está semiadormecido na UI.

### 4.2 Filtro de moeda é decorativo (não muda nenhum número)

`useProfitabilityData` recebe `currency` na assinatura e na `queryKey`, mas
o repassa como `_currency` (parâmetro ignorado, prefixo `_`) para
`useRevenueSources`/`useExpenseCategories`. E `Profitability.tsx` sempre
passa `currency: 'BRL'`. Trocar a moeda não altera cálculo algum — mesma
categoria de problema que o "regime contábil" do audit anterior.

### 4.3 Superfície de filtro morta em `useProfitabilityData`

A assinatura promete `project`, `department`, `product`, `region`,
`currency`, mas o `queryFn` só usa `dateRange` (via sub-hooks). Os demais
entram na `queryKey` (causando refetch à toa se preenchidos) e nunca são
lidos. `useMarginTrendsTimeSeries` usa `product`; `region` é explicitamente
ignorado ("region not in invoices schema"). API enganosa — parece que
filtra por projeto/departamento/região, mas não filtra.

### 4.4 Limiares de negócio no JSX

`Profitability.tsx:440-459` — "Saúde da Rentabilidade" (`netMargin >= 15`
Excelente, `>= 8` Boa) e "Trajetória" (`profitGrowth >= 5` Forte) são
números mágicos embutidos no componente. Menor, mas são regras de negócio
que ninguém consegue configurar.

---

## 5. Nomes de arquivo x conteúdo

Sem descompasso grave. Dois pontos leves:

- `useFinancialData.ts` virou um catch-all (métricas, receita, despesa,
  top-clientes, fornecedores, KPIs, `formatCurrency`, `formatPercentage`).
  O nome é genérico demais para o tanto de responsabilidade — dá para
  quebrar por domínio, mas não é urgente.
- `EntryDialog.tsx` é um dispatcher de lançamento (abas Receita/Despesa
  reaproveitando `InvoiceForm`/`ExpenseForm`). Nome ok.

---

## 6. Boas práticas menores

- **Tipagem fraca com `any`**: tooltips de gráficos (`dashboard/shared.tsx`,
  `DonutChart`, `MarginTrendsChart`, `WeeklyFlowChart`), `error: any` em
  alguns `catch` (`CustomerDialog:129`, `InvoiceDialog:151`) e
  `metrics?.find((m: any) ...)` em `RevenueExpenses.tsx:126`. Recharts é
  chato de tipar, mas o `getMetric` e os `catch` dá pra tipar.
- **Positivo**: nenhum `console.log`/`debugger`/`alert` de sobra, nenhum
  `onClick={() => {}}` nem `href="#"`, nenhum "em breve"/placeholder de
  feature. O grosso do código está limpo.

---

## 7. Resumo priorizado

| #       | Item                                                                  | Tipo                 | Prioridade |
| ------- | --------------------------------------------------------------------- | -------------------- | ---------- |
| 2.1     | AP resumo x detalhe com status divergentes                            | Bug visível          | **Alta**   |
| 2.2     | Sem enum central de status (causa-raiz do 2.1)                        | Arquitetura          | Alta       |
| 2.4     | COGS calculado de 2 formas (DRE x Rentabilidade)                      | Inconsistência       | Alta       |
| 1.4     | `useKPIs` stub + `KPI.growth_rate` residual                           | Código morto         | Média      |
| 1.1/1.2 | `currencySymbols.ts` e `utils.formatCurrency` mortos                  | Código morto         | Média      |
| 4.2/4.3 | Filtro de moeda/projeto/região decorativo                             | Fluxo sem sentido    | Média      |
| 3.1/3.2 | `formatBRL` e helpers de repo duplicados                              | Reutilização         | Média      |
| 2.3     | `netMargin` == `operatingMargin` na série                             | Enganoso             | Média      |
| 1.3/1.5 | `formatChange`/`formatProfitCurrency`/`formatPercentage`/chave EBITDA | Código morto         | Baixa      |
| 4.1/4.4 | Moeda e limiares hardcoded                                            | Config vs. constante | Baixa      |
| 6       | `any` em tooltips/catch                                               | Tipagem              | Baixa      |
