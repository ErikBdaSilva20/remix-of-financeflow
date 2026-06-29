import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { createContact as apiCreate, updateContact as apiUpdate, removeContact } from "@/lib/data/contacts.repo";
import type { Contact, ContactInsert, ContactUpdate } from "@/lib/data/contacts.repo";
import { fetchTable } from "./infra/tableCache";

export type { Contact };
export type ContactInput = ContactInsert;

export function useContacts() {
  const queryClient = useQueryClient();

  const { data: contacts = [], isLoading, error } = useQuery({
    queryKey: ["contacts"],
    queryFn: async () => {
      const rows = await fetchTable<Contact>('contacts');
      return rows.sort((a, b) => a.name.localeCompare(b.name));
    },
  });

  const createContact = useMutation({
    mutationFn: (input: ContactInsert) => apiCreate(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast({ title: "Contact created", description: "The contact has been added successfully." });
    },
    onError: (error: Error) => {
      toast({ title: "Error creating contact", description: error.message, variant: "destructive" });
    },
  });

  const updateContact = useMutation({
    mutationFn: ({ id, input }: { id: string; input: ContactUpdate }) => apiUpdate(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast({ title: "Contact updated", description: "The contact has been updated successfully." });
    },
    onError: (error: Error) => {
      toast({ title: "Error updating contact", description: error.message, variant: "destructive" });
    },
  });

  const deleteContact = useMutation({
    mutationFn: (id: string) => removeContact(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast({ title: "Contact deleted", description: "The contact has been removed successfully." });
    },
    onError: (error: Error) => {
      toast({ title: "Error deleting contact", description: error.message, variant: "destructive" });
    },
  });

  return {
    contacts,
    isLoading,
    error,
    createContact: createContact.mutate,
    updateContact: updateContact.mutate,
    deleteContact: deleteContact.mutate,
    isCreating: createContact.isPending,
    isUpdating: updateContact.isPending,
    isDeleting: deleteContact.isPending,
  };
}
