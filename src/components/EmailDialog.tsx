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
import { Loader2, Paperclip } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { mobileDialogClass } from "@/lib/layout";
// Quill pesa 111 KB comprimidos y solo hace falta al escribir un correo.
// Cargándolo aquí sale del paquete inicial de toda la aplicación.
const RichTextEditor = React.lazy(() => import('./RichTextEditor'));
import { normalizeAttachments, type EmailAttachment } from "@/utils/email-attachments";

const attachmentSchema = z.object({
  name: z.string(),
  url: z.string(),
});

const emailFormSchema = z.object({
  to: z.string().email({ message: "Debe ser una dirección de correo válida." }),
  subject: z.string().min(1, { message: "El asunto es obligatorio." }),
  body: z.string().min(1, { message: "El cuerpo del correo no puede estar vacío." }),
  fromName: z.string().optional(),
  attachments: z.array(attachmentSchema).optional(),
  attachmentsForSend: z.array(attachmentSchema).optional(),
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
  const attachmentsForSendRef = React.useRef<EmailAttachment[]>([]);

  React.useEffect(() => {
    if (isOpen) {
      attachmentsForSendRef.current = normalizeAttachments(initialData.attachmentsForSend);
    }
  }, [initialData, isOpen]);

  const form = useForm<EmailFormValues>({
    resolver: zodResolver(emailFormSchema),
    defaultValues: {
      to: initialData.to || "",
      subject: initialData.subject || "",
      body: initialData.body || "",
      fromName: initialData.fromName || "",
      attachments: initialData.attachments || [],
    },
    values: {
      to: initialData.to || "",
      subject: initialData.subject || "",
      body: initialData.body || "",
      fromName: initialData.fromName || "",
      attachments: initialData.attachments || [],
    },
  });

  const handleSubmit = async (data: EmailFormValues) => {
    const storageAttachments =
      attachmentsForSendRef.current.length > 0
        ? attachmentsForSendRef.current
        : data.attachments;

    await onSend({
      ...data,
      attachments: storageAttachments,
    });
    form.reset();
    attachmentsForSendRef.current = [];
  };

  const handleCancel = () => {
    form.reset();
    attachmentsForSendRef.current = [];
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className={cn(mobileDialogClass, "sm:max-w-[600px] gap-4")}>
        <DialogHeader>
          <DialogTitle>Redactar Correo Electrónico</DialogTitle>
          <DialogDescription>
            Revisa el contenido y envía el correo cuando esté listo.
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
                    <React.Suspense
                      fallback={
                        <div className="h-40 animate-pulse rounded-md border bg-muted/40" />
                      }
                    >
                      <RichTextEditor
                        value={field.value}
                        onChange={field.onChange}
                        disabled={isSending}
                        placeholder="Escribe el cuerpo del correo aquí..."
                      />
                    </React.Suspense>
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
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4 shrink-0">
              <Button type="button" variant="outline" onClick={handleCancel} disabled={isSending}>
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
