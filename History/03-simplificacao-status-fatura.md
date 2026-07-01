# Status da fatura reduzido a Paga / Pago Adiantado

**Data:** 2026-06-30

## Pedido

> "Precisa ficar somente o status de pago adiantado, e pago, o resto sai
> tudo."

O formulário de Fatura/Receita (`InvoiceForm`, dentro do `EntryDialog` e do
`InvoiceDialog` standalone) tinha um campo Status com 7 opções: Rascunho,
Aberta, Paga, Pago Adiantado, Marcado a Pagar, Atrasada, Cancelada. Ao criar
uma fatura, o usuário podia escolher qualquer uma — inclusive "Atrasada", que
é justamente o status que o item
[01](01-correcao-status-fatura-ativos-financeiros.md) passou a excluir dos
totais de receita.

## O que foi feito

Em `src/components/InvoiceDialog.tsx`:

- Schema Zod do status restrito a `z.enum(["Paid", "PrepaidPending"])`.
- `<SelectContent>` do campo Status só lista "Paga" e "Pago Adiantado".
- Valor padrão do formulário trocado de `"Open"` para `"Paid"`.
- Removida toda a lógica do status `Scheduled` (que não existe mais como
  opção): o campo `scheduled_payment_date`, o `watchStatus`, o bloco
  condicional do formulário e o `.refine()` de validação ligado a ele.

Isso alinha o que o usuário consegue criar com o que o sistema considera
"receita realizada" — não dá mais para criar uma fatura num status que seria
silenciosamente ignorado nos totais.

## Arquivos alterados

- `src/components/InvoiceDialog.tsx`

## Verificação

`tsc --noEmit` e `vite build` limpos. Confirmado por grep que nenhum outro
ponto do código dependia dos status removidos para *criar* faturas — páginas
como Receivables ainda podem *exibir* faturas antigas com status `Overdue`
etc. (dado legado), só não dá mais para criar uma fatura nova nesses status.
