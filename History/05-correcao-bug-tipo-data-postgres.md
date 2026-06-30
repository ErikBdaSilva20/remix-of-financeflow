# Causa raiz: faturas/despesas criadas não apareciam nos cards

**Data:** 2026-06-30

## Sintoma relatado

> "Verifica os cards, pq eu criei receitas, e despesas e não está retornando
> as informações."

## Investigação

`scripts/dev-server.ts` (o "mock gateway" local usado em `pnpm dev`) usa o
driver `pg` para falar com o Postgres. Por padrão, o `pg` converte colunas do
tipo `date` (OID 1082) em objetos `Date` do JavaScript — **não** em strings
`"YYYY-MM-DD"`.

Só que **todo** o front-end (hooks de `useFinancialData.ts`,
`usePeriodComparison.ts`, etc.) trata `issue_date`/`date` como string:
comparações lexicográficas (`i.issue_date >= s`), `.slice(0, 7)` para extrair
o mês, concatenação tipo `new Date(inv.issue_date + 'T00:00:00')`. Com um
objeto `Date` no lugar de string, essas operações falham silenciosamente
(coerção incorreta no melhor caso, `Invalid Date` no pior) — então qualquer
linha vinda do banco era descartada ou mal-agrupada nos filtros por data.
Faturas e despesas recém-criadas (ou qualquer dado vindo do banco real, não
de fixtures) simplesmente não apareciam nos totais.

## O que foi feito

Em `scripts/dev-server.ts`:

```ts
import { Pool, types } from 'pg';

// node-postgres devolve colunas `date` (OID 1082) como objetos Date por padrão.
// O front-end inteiro trata issue_date/due_date/date como strings "YYYY-MM-DD"
// (comparações lexicográficas, .slice(0,7), concatenação com 'T00:00:00'), então
// sem isto os filtros por data quebram silenciosamente para qualquer linha vinda do banco.
types.setTypeParser(1082, (val) => val);
```

Isso faz o `pg` devolver a coluna `date` como veio do Postgres (string), sem
conversão automática para `Date`.

## Escopo da correção

Esse fix vale só para o **servidor de dev local** (`scripts/dev-server.ts`,
porta 3000). O gateway de produção real ("tenant-gateway", contrato em
`src/lib/data/client.ts`) é externo a este repo e não foi tocado — não temos
visibilidade se ele tem o mesmo problema.

## Arquivos alterados

- `scripts/dev-server.ts`

## Verificação

`tsc --noEmit` e `vite build` limpos. Não foi possível validar end-to-end
contra um banco real rodando neste sandbox (sem `.env`/`DATABASE_URL`
configurado) — a correção é validada pela análise do comportamento documentado
do driver `pg`, não por teste ao vivo.
