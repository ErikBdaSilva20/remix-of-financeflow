# Histórico — Sessão "finance-rework" (2026-06-30)

Esta pasta documenta o trabalho feito numa sessão de IA na branch `finance-rework`,
a partir de um pedido inicial em `req.md` (UX confusa dos botões de lançamento +
bug no total de ativos financeiros). Cada arquivo cobre um pedaço coeso do
trabalho, na ordem em que foi feito, com o problema, a decisão tomada (e por quê)
e os arquivos tocados.

## Ordem dos eventos

1. [01-correcao-status-fatura-ativos-financeiros.md](01-correcao-status-fatura-ativos-financeiros.md)
   — Faturas "Atrasada" inflavam o Total de Ativos Financeiros. Filtro de status
   "realizado" aplicado em todos os cálculos de receita/lucro.
2. [02-modal-unificado-novo-lancamento.md](02-modal-unificado-novo-lancamento.md)
   — Os 3 botões do dashboard (Nova Fatura / Registrar Transação / Nova Despesa)
   viraram um único modal com abas.
3. [03-simplificacao-status-fatura.md](03-simplificacao-status-fatura.md)
   — Campo Status da fatura reduzido a só Paga / Pago Adiantado.
4. [04-limpeza-dashboard-overview.md](04-limpeza-dashboard-overview.md)
   — Removido o hero card "Total de Ativos Financeiros" e o card "Fluxo de
   Caixa"; "Lucro" virou "Valor Líquido Total"; código morto removido.
5. [05-correcao-bug-tipo-data-postgres.md](05-correcao-bug-tipo-data-postgres.md)
   — Causa raiz de "criei fatura/despesa e não aparece nos cards": `pg` devolvia
   colunas `date` como objetos `Date`, quebrando todo filtro de data por string.
6. [06-remocao-feature-contas-investimentos.md](06-remocao-feature-contas-investimentos.md)
   — Área de "contas" (poupança/investimento) removida por completo: UI, tipos,
   schema e rota do dev-server.
7. [07-fluxo-de-caixa-comparativo-mensal.md](07-fluxo-de-caixa-comparativo-mensal.md)
   — Tela de Fluxo de Caixa trocou o gráfico de linha por cards de comparação
   mês a mês (Jan-Dez), e depois passou a focar por padrão no mês atual + mês
   anterior, com o ano completo disponível sob demanda.
8. [08-remocao-tabelas-mortas-e-unificacao-transactions.md](08-remocao-tabelas-mortas-e-unificacao-transactions.md)
   — Removidas as tabelas mortas `contacts`, `bank_transactions` e `fx_rates`
   (Cash Flow reescrito para usar `payments`+`expenses_new`); depois essas duas
   foram fundidas numa única tabela `transactions` (`type: income|expense`),
   com `setup.sql` reescrito do zero sem os patches incrementais soltos.

## O que **não** está documentado aqui

Esta branch também tinha, antes desta sessão de IA começar, trabalho já em
andamento de uma sessão anterior — Epic 6 (Contas a Pagar / Vendors:
`BillDialog`, `BillPaymentDialog`, `VendorDialog`, `vendors.repo.ts`,
`payVendorBill()`), ajuste de moeda base (USD → BRL) e remoção de um filtro de
moeda não usado em `FilterHeader.tsx`. Esse trabalho já está descrito em
`../CHANGELOG.md` (seções "Epic 6", "N1", "N2") e foi apenas **commitado** nesta
sessão, não documentado aqui, pois não foi feito por mim.

## Pendência conhecida (ainda não implementada)

Ver `../CHANGELOG.md` → "Pendências — Fluxo de Caixa": a busca de transações
bancárias (`listBankTransactions()`) ainda traz todo o histórico numa única
chamada, porque `src/lib/data/client.ts` é um contrato protegido (não aceita
filtro por data). Filtro real do lado do servidor exigiria estender esse
contrato — fora do escopo do que foi feito até aqui.
