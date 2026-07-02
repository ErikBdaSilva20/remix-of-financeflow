# Auditoria — `/reports` (Relatórios) e exportação CSV

Data: 2026-07-02. Escopo: `src/pages/Reports.tsx` (única tela de relatórios/
exportação da aplicação — não existe `src/lib/.../export*` ou `csv*` separado,
tudo está inline nesse arquivo). Motivo: nesta sessão fizemos mudanças grandes
em Despesas (`/revenue`), Orçamento (CRUD novo) e Contas a Receber/Pagar
(`/receivables`), e `/reports` não foi tocado — precisa ser conferido contra
o que mudou. **Este documento é só mapeamento — nada foi implementado.**

## Contexto: o que mudou nesta sessão (pra quem for executar isso)

Resumo do que já está em `git status`/`git diff` no branch, com os arquivos
novos que valem a pena conhecer antes de mexer em `Reports.tsx`:

- **`src/lib/finance/expenseCategories.ts`** (novo): fonte única das 8
  categorias de despesa fixas (`EXPENSE_CATEGORIES`), com `label` (nome
  legível), `color` (cor estável por categoria) e `group` (`'cogs' |
'operating'`). Exporta `expenseCategoryLabel(value)` e
  `expenseCategoryColor(value, fallbackIndex)`. **Reutilizável direto em
  `Reports.tsx`** — ver achado 1.3 e 2.1 abaixo.
- **`src/lib/finance/queryInvalidation.ts`** (novo): `invalidateExpenseQueries`,
  `invalidateRevenueQueries`, `invalidateBudgetQueries` — centralizam quais
  query keys cada mutação (despesa/receita/orçamento) precisa invalidar.
  `Reports.tsx` só lê dados (não muta nada), então não precisa chamar essas
  funções — mas **se beneficia** delas: como as chaves `expense-data`,
  `revenue-data`, `financial-metrics`, `top-clients`, `vendors` já são
  invalidadas corretamente em outros lugares do app, os dados de `/reports`
  devem atualizar sozinhos depois de qualquer lançamento — não é preciso
  mexer em cache aqui.
- **`src/hooks/useFinancialData.ts` → `useExpenseCategories`**: mudou de forma
  (ver achado 1.1, o mais importante deste documento).
- **`src/hooks/useReceivablesData.ts` → `useAPData`**: ganhou um 4º grupo
  `'Past due'`/`Overdue` (contas já vencidas, que antes somiam do
  agrupamento). `Reports.tsx` não usa `useAPData`/`useARData` hoje — ver
  achado 3.2 sobre se deveria passar a usar.
- **`CONTAS-A-RECEBER-VS-RECEITA-DESPESAS.md`** (novo, raiz do repo):
  documenta a diferença entre dado **realizado** (o que já aconteceu,
  `/revenue`) e dado **em aberto** (o que ainda está pendente, `/receivables`).
  Leia antes do achado 2.1 abaixo — é o mesmo tipo de confusão, só que dentro
  do próprio `/reports`.

---

## 1. Bugs — comportamento errado, causado pela mudança de forma de `useExpenseCategories`

### 1.1 "Despesas por Categoria" (tela e CSV) agora pode mostrar categorias fantasma com R$ 0,00

**Onde:** `src/pages/Reports.tsx:56-58` (CSV) e `:220-227` (tabela na tela).

**Causa:** `useExpenseCategories` (`src/hooks/useFinancialData.ts:143-196`)
mudou nesta sessão pra **sempre retornar todas as categorias**, inclusive as
que só têm orçamento definido e nenhuma despesa lançada ainda (isso foi
proposital — é o que faz o total de "Orçamento Máximo" bater certo em
`/revenue`). Antes, quem consumia esse hook recebia só categorias com
`amount > 0`.

Quem exibe a lista agora **precisa filtrar por conta própria**. Isso já foi
feito em `src/pages/RevenueExpenses.tsx:207` (`categoriesWithSpend =
(expenseCategories ?? []).filter((exp) => exp.amount > 0)`), mas
`Reports.tsx` consome `expenseCategories` direto do hook, sem esse filtro.

**Efeito:** se um tenant cadastrar um orçamento pra uma categoria que ainda
não gastou nada (ex: "Escritório", orçamento R$ 500, zero despesa lançada),
essa categoria vai aparecer na tabela "Despesas por Categoria" da tela E no
CSV exportado com `R$ 0,00` e `0.0%` — linha fantasma, sem sentido pra quem
lê o relatório.

**Não afeta:** o total "Total de Despesas" no DRE (`Reports.tsx:41`) —
soma de valor 0 não muda o total, só a lista de linhas individuais fica suja.

**Sugestão de correção:** aplicar o mesmo filtro que já existe em
`RevenueExpenses.tsx:207`, ali por perto de onde `expenseCategories` é lido
(linha 24), antes de usar a variável tanto no CSV quanto na tabela:

```ts
const categoriesWithSpend = (expenseCategories ?? []).filter((e) => e.amount > 0);
```

e trocar as duas ocorrências de `expenseCategories` (linha ~56 e ~220) por
`categoriesWithSpend`.

### 1.2 "Despesas por Categoria" agora mostra nome legível — isso é uma melhoria, não bug, mas quebra paridade com "Principais Fornecedores"

Como efeito colateral de `useExpenseCategories` agora usar
`expenseCategoryLabel(key)` (linha 186 do hook), a coluna "Categoria" em
`Reports.tsx` passa a mostrar `"Marketing"`, `"Custo de Produtos/Serviços
(CPV)"` etc. em vez do slug cru (`marketing`, `cogs`). **Isso é uma correção
automática, bem-vinda.** Só que agora a tabela vizinha "Principais
Fornecedores" (`Reports.tsx:283-296`) mostra a categoria do fornecedor **sem**
essa formatação — ver achado 2.2.

---

## 2. Inconsistências de semântica encontradas na auditoria (não causadas por esta sessão, mas relevantes pro "dados novos e fluxos diferentes")

### 2.1 "Principais Fornecedores" mistura semântica: parece gasto realizado, mas é saldo em aberto

**Onde:** `src/hooks/useFinancialData.ts` → `useVendors` (linhas ~290-305) e
`Reports.tsx:268-299` (tela) / `:68-72` (CSV).

**O problema:** `useVendors` agrupa `vendor_bills` por `vendor_name` e soma
`b.open_amount` — ou seja, **quanto ainda falta pagar** pra cada fornecedor,
não quanto já foi realmente pago/gasto. No DRE logo acima, "Total de
Despesas" vem de `transactions` (gasto já realizado, cash). Então dentro do
mesmo relatório: uma seção é "o que já saiu do caixa" (Despesas por
Categoria) e a seção logo abaixo é "o que ainda vai sair" (Principais
Fornecedores) — exatamente a mesma confusão realizado-vs-aberto documentada
em `CONTAS-A-RECEBER-VS-RECEITA-DESPESAS.md`, só que aqui dentro de uma única
tela/CSV, sem nenhum aviso.

**Duas correções possíveis (decisão de produto, não é óbvio qual é certa —
por isso não implementei):**

- **(a) Deixar claro que é saldo em aberto:** renomear pra algo tipo
  "Fornecedores com Maior Saldo em Aberto", coerente com o vocabulário que
  já usamos em `/receivables` depois da reformulação desta sessão.
- **(b) Trocar a base de cálculo pra gasto realizado:** somar
  `vendor_bills` com `status === 'Paid'` (nesse caso `amount_total` é o valor
  cheio já pago), ou juntar com `transactions` (campo `vendor`) — mas
  `transactions` só tem o que foi lançado via "Nova Despesa" na tela
  `/revenue`; pagamento de conta a fornecedor via `BillPaymentDialog` **não**
  cria linha em `transactions` (achado já registrado em
  `CONTAS-A-RECEBER-VS-RECEITA-DESPESAS.md`, seção 5) — então essa opção sozinha
  ficaria incompleta a menos que também some `vendor_bills` pagas.

### 2.2 Categoria do fornecedor não usa o mesmo label legível de `EXPENSE_CATEGORIES`

**Onde:** `useVendors` (`src/hooks/useFinancialData.ts`, campo `category: b.category
|| 'Other'`) e exibido cru em `Reports.tsx:291` / CSV linha `:71`.

**Efeito:** na mesma tela, "Despesas por Categoria" mostra `"Marketing"` mas
"Principais Fornecedores" mostra `"marketing"` (slug cru) — inconsistência
visual visível lado a lado (os dois cards ficam um do lado do outro no grid,
`Reports.tsx:164-300`).

**Correção simples, sem ambiguidade:** importar `expenseCategoryLabel` de
`@/lib/finance/expenseCategories` (o módulo novo desta sessão) e aplicar em
`vendor.category` tanto na tabela quanto no CSV — mesmo padrão já usado em
`ExpenseDrillDownTable.tsx` e `BudgetDialog.tsx`.

---

## 3. Cobertura — dado novo desta sessão que `/reports` ainda ignora

### 3.1 Orçamento (CRUD novo) não aparece em lugar nenhum do relatório

`useExpenseCategories` já retorna `budget_amount` por categoria (usado em
`/revenue` no card "Orçamento Máximo vs Realizado"), mas `Reports.tsx` não lê
esse campo — o DRE e o CSV não têm nenhuma seção de orçado-vs-realizado.
Como o CRUD de orçamento é a funcionalidade nova mais trabalhada desta
sessão, faz sentido considerar uma seção **"Orçamento vs Realizado"** no CSV
(e talvez um card na tela), reaproveitando o campo `budget_amount` que já
existe — não precisa de hook novo, só usar o que `expenseCategories` já
retorna.

### 3.2 Nenhuma visão de Contas a Receber/Pagar no relatório

`/reports` não usa `useARData`/`useAPData`/`useDSO` (os hooks de
`useReceivablesData.ts`). Um "relatório financeiro" tipicamente inclui um
snapshot de recebíveis/pagáveis em aberto (o que também dá pra puxar do
bug corrigido nesta sessão: contas vencidas agora aparecem certinho no grupo
`'Past due'` de `useAPData`). Vale avaliar se cabe uma seção "Posição de
Recebíveis e Pagáveis" (total em aberto, vencido, DSO) no CSV — natural pra
alguém que exporta o relatório pra contabilidade/gestão olhar isso junto do
DRE.

### 3.3 DRE não separa CPV (COGS) de Despesas Operacionais

`Reports.tsx:41` mostra só "Total de Despesas" (uma linha só). A página de
Rentabilidade (`/profitability`, via `useProfitabilityData`) já faz a
separação CPV vs operacional pra calcular Margem Bruta. O módulo novo
`EXPENSE_CATEGORIES` (`src/lib/finance/expenseCategories.ts`) tem o campo
`group: 'cogs' | 'operating'` pronto pra isso — dava pra montar "Custo do
Produto (CPV)" e "Despesas Operacionais" como duas linhas no DRE em vez de
uma, reaproveitando esse campo em vez de reimplementar a checagem
`category.toLowerCase().includes('cogs')` que `useProfitabilityData.ts:80-85`
faz na unha.

---

## 4. Achados menores / não urgentes

### 4.1 `dateRange={}}` desativa o filtro padrão de 12 meses de `useFinancialMetrics`

**Pré-existente, não causado por esta sessão** — mas achado durante a
auditoria, então registrando. `Reports.tsx:22` chama
`useFinancialMetrics({})`. Dentro do hook (`useFinancialData.ts:81-88`), o
fallback de "últimos 12 meses" só entra se `dateRange` for `undefined`:

```ts
const dr = dateRange ?? { from: startOfMonth(subMonths(today, 12)), to: endOfMonth(today) };
```

Como `Reports.tsx` passa `{}` (objeto vazio, não `undefined`), `dr` vira
`{}`, e `filterByDateRange` (mesma lógica em várias hooks) não filtra nada
quando `!dateRange?.from && !dateRange?.to`. Resultado: "Receita Total" no
DRE é receita **desde o início dos tempos**, não dos últimos 12 meses como o
nome do fallback sugere. Mesma coisa pra `useRevenueSources({})` e
`useExpenseCategories({})` — todas as três chamadas em `Reports.tsx:22-24`
têm esse padrão.

Não é claro se isso é "bug" ou intencional (relatório = tudo, sempre) — mas
vale decidir e documentar, porque hoje é silencioso.

### 4.2 Sem seletor de período na tela de Relatórios

Reforça o achado 4.1: não existe nenhum controle de data em `/reports` — é
tudo all-time, sempre. `/revenue` e `/receivables` já têm o conceito de
período (mês/trimestre/ano) via `TimePeriod`. Se o objetivo é reaproveitar
esse padrão, dava pra adicionar os mesmos tabs e passar `dateRange` de
verdade pros hooks — resolveria o achado 4.1 de quebra.

### 4.3 Dois sistemas de toast em paralelo

`Reports.tsx:6` importa `toast` de `@/hooks/use-toast` (sistema shadcn
antigo, radix-based). Todo o resto do app usa `sonner`
(`import { toast } from "sonner"` — ver `BudgetDialog.tsx`,
`ExpenseDialog.tsx`, `InvoiceDialog.tsx`, `PaymentDialog.tsx`). Os dois
`<Toaster />` estão montados em `App.tsx:41-42`, então funciona — não é bug,
só inconsistência de padrão. Trocar pra `sonner` deixaria `Reports.tsx`
consistente com o resto.

---

## Checklist resumido pra quem for executar

- [ ] **1.1** — filtrar `expenseCategories` por `amount > 0` antes de montar
      a tabela/CSV de "Despesas por Categoria" (bug real, prioridade alta).
- [ ] **2.2** — aplicar `expenseCategoryLabel()` em `vendor.category`
      (fácil, resolve inconsistência visual).
- [ ] **2.1** — decidir: renomear "Principais Fornecedores" pra deixar claro
      que é saldo em aberto, OU trocar a base de cálculo pra gasto
      realizado (decisão de produto).
- [ ] **3.1** — avaliar adicionar seção "Orçamento vs Realizado" ao CSV/tela
      (dado já existe em `budget_amount`, não precisa hook novo).
- [ ] **3.2** — avaliar adicionar seção de Recebíveis/Pagáveis em aberto.
- [ ] **3.3** — avaliar separar CPV de Operacional no DRE usando
      `EXPENSE_CATEGORIES[].group`.
- [ ] **4.1/4.2** — decidir se `/reports` deveria ter período real (e
      corrigir o `dateRange={}}` que hoje desativa o filtro de 12 meses).
- [ ] **4.3** — opcional: trocar `use-toast` por `sonner` em `Reports.tsx`.
