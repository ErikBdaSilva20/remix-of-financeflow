import { db } from './client';
import type { Database } from './types.gen';

export type FilterSegment = Database['public']['Tables']['filter_segments']['Row'];
export type FilterSegmentInsert = Database['public']['Tables']['filter_segments']['Insert'];
export type FilterSegmentUpdate = Database['public']['Tables']['filter_segments']['Update'];

export const listFilterSegments = () => db.table<FilterSegment>('filter_segments').list();
export const createFilterSegment = (input: FilterSegmentInsert) => db.table<FilterSegment>('filter_segments').create(input);
export const updateFilterSegment = (id: string, patch: FilterSegmentUpdate) => db.table<FilterSegment>('filter_segments').update(id, patch);
export const removeFilterSegment = (id: string) => db.table('filter_segments').remove(id);
