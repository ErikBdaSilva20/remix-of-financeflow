import { db } from './client';
import type { Database } from './types.gen';

export type FxRate = Database['public']['Tables']['fx_rates']['Row'];
export type FxRateInsert = Database['public']['Tables']['fx_rates']['Insert'];

export const listFxRates = () => db.table<FxRate>('fx_rates').list();
export const createFxRate = (input: FxRateInsert) => db.table<FxRate>('fx_rates').create(input);
