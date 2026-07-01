import { db } from "@/lib/data/client";

// Deduplica leituras concorrentes da mesma tabela.
//
// Vários hooks de cálculo (receita, despesas, comparativo de período, etc.) leem
// a MESMA tabela bruta no mesmo render. Como cada um tem seu próprio queryKey no
// React Query, sem isto o React Query dispararia uma request HTTP por hook — no
// Overview, `invoices` era buscada 4x e `transactions` 3x num único carregamento.
//
// Enquanto um .list() está em andamento, novas chamadas reaproveitam a mesma
// Promise. Assim que resolve (ou falha), o slot é liberado: NÃO há cache
// persistente aqui, então mutações nunca veem dado velho. A persistência entre
// navegações continua por conta do staleTime das queries derivadas (App.tsx).
const inFlight = new Map<string, Promise<unknown>>();

export function fetchTable<R = Record<string, unknown>>(name: string): Promise<R[]> {
  const pending = inFlight.get(name) as Promise<R[]> | undefined;
  if (pending) return pending;

  const promise = db
    .table<R>(name)
    .list()
    .finally(() => {
      inFlight.delete(name);
    });
  inFlight.set(name, promise);
  return promise;
}
