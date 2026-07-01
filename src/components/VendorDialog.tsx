import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { createVendor } from "@/lib/data/vendors.repo";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const vendorSchema = z.object({
  name: z.string().min(1, "O nome do fornecedor é obrigatório"),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  category: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

type VendorFormData = z.infer<typeof vendorSchema>;

interface VendorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VendorDialog({ open, onOpenChange }: VendorDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<VendorFormData>({
    resolver: zodResolver(vendorSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      category: "",
      notes: "",
    },
  });

  const onSubmit = async (data: VendorFormData) => {
    setIsSubmitting(true);
    try {
      await createVendor({
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        category: data.category || null,
        notes: data.notes || null,
      });

      toast.success("Fornecedor cadastrado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["vendors-list"] });
      form.reset();
      onOpenChange(false);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : "Erro ao cadastrar fornecedor";
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Fornecedor</DialogTitle>
          <DialogDescription>
            Cadastre um novo fornecedor para vincular contas a pagar.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome / Razão Social</FormLabel>
                  <FormControl>
                    <Input placeholder="ex: Google Cloud, Amazon..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail (Opcional)</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="contato@fornecedor.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone (Opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="(11) 99999-9999" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria Padrão (Opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="ex: Software, Marketing, CPV..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações (Opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Detalhes ou condições de pagamento..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Salvando..." : "Salvar Fornecedor"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
