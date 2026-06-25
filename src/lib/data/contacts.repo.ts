import { db } from './client';
import type { Database } from './types.gen';

export type Contact = Database['public']['Tables']['contacts']['Row'];
export type ContactInsert = Database['public']['Tables']['contacts']['Insert'];
export type ContactUpdate = Database['public']['Tables']['contacts']['Update'];

export const listContacts = () => db.table<Contact>('contacts').list();
export const createContact = (input: ContactInsert) => db.table<Contact>('contacts').create(input);
export const updateContact = (id: string, patch: ContactUpdate) => db.table<Contact>('contacts').update(id, patch);
export const removeContact = (id: string) => db.table('contacts').remove(id);
