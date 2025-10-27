"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { Loader2, Paperclip } from "lucide-react";
import { Badge } from "@/components/ui/badge"; // Importación añadida

const attachmentSchema = z.object({
  name: z.string(),
  url: z.string(), // Esta URL puede ser la ruta de almacenamiento o la URL firmada
});

const emailFormSchema = z.object({
  to: z.string().email({ message: "Debe ser una dirección de correo válida." }),
  subject: z.string().min(1, { message: "El asunto es obligatorio." }),
  body: z.string().min(1, { message: "El cuerpo del correo no puede estar vacío." }),
  fromName: z.string().optional(),
  attachments: z.array(attachmentSchema).optional(), // Adjuntos para mostrar en el diálogo (usando URL firmada)
  attachmentsForSend: z.array(attachmentSchema).optional(), // Adjuntos para enviar (usando ruta de almacenamiento)
});

export type EmailFormValues = z.infer<typeof emailFormSchema>;

interface EmailDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  initialData: Partial<EmailFormValues>;
  onSend: (data: EmailFormValues) => Promise<void>;
  isSending: boolean;
}

const EmailDialog: React.FC<EmailDialogProps> = ({
  isOpen,
  onOpenChange,
  initialData,
  onSend,
  isSending,
}) => {
  const form = useForm<EmailFormValues>({
    resolver: zodResolver(emailFormSchema),
    defaultValues: {
      to: initialData.to || "",
      subject: initialData.subject || "",
      body: initialData.body || "",
      fromName: initialData.fromName || "",
      attachments: initialData.attachments || [],
      attachmentsForSend: initialData.attachmentsForSend || [],
    },
    values: { // Use values to ensure form updates when initialData changes
      to: initialData.to || "",
      subject: initialData.subject || "",
      body: initialData.body || "",
      fromName: initialData.fromName || "",
      attachments: initialData.attachments || [],
      attachmentsForSend: initialData.attachmentsForSend || [],
    },
  });

  const handleSubmit = async (data: EmailFormValues) => {
    // Si attachmentsForSend existe, lo usamos para el envío real, ya que contiene las rutas de almacenamiento.
    // Si no existe, usamos attachments (comportamiento por defecto).
    const dataToSend = {
      ...data,
      attachments: data.attachmentsForSend && data.attachmentsForSend.length > 0 
        ? data.attachmentsForSend 
        : data.attachments,
    };
    
    await onSend(dataToSend);
    form.reset(); // Reset form after sending
  };

  React.useEffect(() => {
    if (!isOpen) {
      form.reset(); // Reset form when dialog closes
    }
  }, [isOpen, form]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Redactar Correo Electrónico</DialogTitle>
          <DialogDescription>
            Este es un sistema de correo simulado. El contenido del correo se registrará en la consola.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="to"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Para</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} disabled={isSending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Asunto</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={isSending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="body"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cuerpo</FormLabel>
                  <FormControl>
                    <Textarea rows={8} {...field} disabled={isSending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="fromName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del Remitente (Opcional)</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={isSending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {form.watch("attachments") && form.watch("attachments")!.length > 0 && (
              <div className="space-y-2">
                <FormLabel>Adjuntos (Clic para previsualizar)</FormLabel>
                <div className="flex flex-wrap gap-2">
                  {/* Usamos 'attachments' aquí porque contiene las URL firmadas para la vista previa */}
                  {form.watch("attachments")!.map((attachment, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      <Paperclip className="h-3 w-3" />
                      <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="underline">
                        {attachment.name}
                      </a>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSending}>
                {isSending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...
                  </>
                ) : (
                  "Enviar Correo"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EmailDialog;