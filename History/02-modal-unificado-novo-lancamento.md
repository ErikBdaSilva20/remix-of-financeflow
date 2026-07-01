# Unificação dos 3 botões de lançamento em um único modal

**Data:** 2026-06-30

## Problema relatado

> "Esses três botões... tá meio confuso, tá meio redundante... eu quero aqui
> ter uma nova despesa ou um novo ganho, tudo junto, pra não ficar tão
> confuso. A gente seleciona ali e mexe tudo em um local só, não três botões
> diferentes."

O dashboard principal tinha três botões separados — **Nova Fatura**
(`InvoiceDialog`), **Registrar Transação** (`TransactionDialog`) e **Nova
Despesa** (`ExpenseDialog`) — cada um abrindo seu próprio modal, com campos e
fluxos parecidos mas redundantes.

## Decisão de escopo

Perguntado ao usuário se a unificação deveria ser só de UI (1 modal, 3 seções,
mesma lógica por baixo) ou também unificar o modelo de dados (uma tabela só
para lançamentos). Resposta: **só UI** — menor risco, mantém
`Invoice`/`Expense`/`BankTransaction` como entidades separadas no banco.

## O que foi feito

Cada um dos três diálogos foi dividido em duas partes:

- Um componente **`*Form`** (`InvoiceForm`, `ExpenseForm`, `TransactionForm`)
  com a lógica e os campos do formulário, sem o `<Dialog>`/`<DialogContent>`
  ao redor — recebe `onSuccess`/`onCancel` como props.
- O componente **`*Dialog`** original (`InvoiceDialog`, `ExpenseDialog`,
  `TransactionDialog`) continua existindo, agora só envolvendo o `*Form`
  correspondente num `<Dialog>` — usado nas páginas Receivables, Revenue e
  Expenses, que abrem cada formulário isoladamente.

Criado `src/components/EntryDialog.tsx`: um único `<Dialog>` com `<Tabs>`
(shadcn/Radix) e três abas — **Fatura/Receita**, **Despesa**, **Transação
Bancária** — cada uma renderizando o `*Form` correspondente.

Em `Overview.tsx`, os três botões + três `useState` + três `<Dialog>` foram
trocados por um único botão **"Novo Lançamento"** e um único `<EntryDialog>`.

## Arquivos alterados

- `src/components/EntryDialog.tsx` (novo)
- `src/components/InvoiceDialog.tsx` (split em `InvoiceForm` + `InvoiceDialog`)
- `src/components/ExpenseDialog.tsx` (split em `ExpenseForm` + `ExpenseDialog`)
- `src/components/TransactionDialog.tsx` (split em `TransactionForm` +
  `TransactionDialog`)
- `src/pages/Overview.tsx` (wiring do botão único)

## Verificação

`tsc --noEmit` e `vite build` limpos. Build local sem servidor de navegador
disponível no sandbox (sem `chromium-cli`/Playwright instalado) — não foi
possível tirar screenshot do modal renderizado; recomendado testar localmente
com `pnpm dev` antes de confiar 100% no resultado visual.
