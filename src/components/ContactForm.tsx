import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Contact, ContactInput } from "@/hooks/useContacts";

const contactSchema = z.object({
  name: z.string().min(1, "O nome é obrigatório").max(100),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  phone: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val || val === "") return true;
        // Allow digits, spaces, hyphens, parentheses, plus sign
        const phoneRegex = /^[\d\s\-\(\)\+]+$/;
        return phoneRegex.test(val);
      },
      { message: "O telefone deve conter apenas números, espaços, +, -, ( )" }
    )
    .refine(
      (val) => {
        if (!val || val === "") return true;
        // Remove non-digit characters and check length (7-15 digits)
        const digitsOnly = val.replace(/\D/g, "");
        return digitsOnly.length >= 7 && digitsOnly.length <= 15;
      },
      { message: "O telefone deve conter de 7 a 15 números" }
    ),
  address: z.string().max(200).optional(),
  notes: z.string().max(500).optional(),
  avatar_color: z.string().optional(),
});

interface ContactFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact?: Contact;
  onSubmit: (data: ContactInput) => void;
  isSubmitting?: boolean;
}

const avatarColors = [
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#f59e0b", // amber
  "#10b981", // emerald
  "#3b82f6", // blue
  "#ef4444", // red
  "#06b6d4", // cyan
];

export function ContactForm({
  open,
  onOpenChange,
  contact,
  onSubmit,
  isSubmitting,
}: ContactFormProps) {
  const form = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
      notes: "",
      avatar_color: "#6366f1",
    },
  });

  // Reset form when dialog opens or contact changes
  useEffect(() => {
    if (open) {
      form.reset({
        name: contact?.name || "",
        email: contact?.email || "",
        phone: contact?.phone || "",
        address: contact?.address || "",
        notes: contact?.notes || "",
        avatar_color: contact?.avatar_color || "#6366f1",
      });
    }
  }, [open, contact, form]);

  const handleSubmit = (data: ContactInput) => {
    onSubmit(data);
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{contact ? "Editar Contato" : "Adicionar Contato"}</DialogTitle>
          <DialogDescription>
            {contact
              ? "Atualize as informações do contato abaixo."
              : "Adicione um novo contato ao seu cadastro."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome *</FormLabel>
                  <FormControl>
                    <Input placeholder="João da Silva" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="joao@exemplo.com" {...field} />
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
                  <FormLabel>Telefone</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="+55 (11) 91234-5678" 
                      {...field}
                      type="tel"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Endereço</FormLabel>
                  <FormControl>
                    <Input placeholder="Rua Principal, 123, Cidade, Estado" {...field} />
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
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Observações adicionais sobre este contato..."
                      {...field}
                      rows={3}
                    />
                  </FormControl>
                  <div className="text-xs text-muted-foreground text-right mt-1">
                    {(field.value?.length || 0)}/500 caracteres
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="avatar_color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cor do Avatar</FormLabel>
                  <FormControl>
                    <div className="flex gap-2">
                      {avatarColors.map((color) => (
                        <button
                          key={color}
                          type="button"
                          className={`w-8 h-8 rounded-full transition-all ${
                            field.value === color
                              ? "ring-2 ring-offset-2 ring-primary"
                              : "hover:scale-110"
                          }`}
                          style={{ backgroundColor: color }}
                          onClick={() => field.onChange(color)}
                        />
                      ))}
                    </div>
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
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Salvando..." : contact ? "Atualizar" : "Criar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
