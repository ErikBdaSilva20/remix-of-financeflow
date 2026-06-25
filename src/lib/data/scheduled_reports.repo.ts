import { db } from './client';
import type { Database } from './types.gen';

export type ScheduledReport = Database['public']['Tables']['scheduled_reports']['Row'];
export type ScheduledReportInsert = Database['public']['Tables']['scheduled_reports']['Insert'];
export type ScheduledReportUpdate = Database['public']['Tables']['scheduled_reports']['Update'];

export const listScheduledReports = () => db.table<ScheduledReport>('scheduled_reports').list();
export const createScheduledReport = (input: ScheduledReportInsert) => db.table<ScheduledReport>('scheduled_reports').create(input);
export const updateScheduledReport = (id: string, patch: ScheduledReportUpdate) => db.table<ScheduledReport>('scheduled_reports').update(id, patch);
export const removeScheduledReport = (id: string) => db.table('scheduled_reports').remove(id);
