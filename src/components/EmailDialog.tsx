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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Paperclip } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { mobileDialogClass, dialogBodyScrollClass, dialogFooterMobileClass } from "@/lib/layout";
import { CORREO_NICETO } from "@/lib/farmacia";
// Quill pesa 111 KB comprimidos y solo hace falta al escribir un correo.
// Cargándolo aquí sale del paquete inicial de toda la aplicación.
const RichTextEditor = React.lazy(() => import('./RichTextEditor'));
import { normalizeAttachments, type EmailAttachment } from "@/utils/email-attachments";
import {
  extraerBloques,
  restaurarBloques,
  marcaDeBloque,
  type BloquesCorreo,
} from "@/utils/email-dialog-blocks";

/** Valor interno del Select: Radix no admite value vacío. Se envía como from vacío → SMTP_FROM. */
const FROM_SMTP_DEFAULT = "__smtp_default__";

const attachmentSchema = z.object({
  name: z.string(),
  url: z.string(),
});

/** Uno o varios correos separados por coma o punto y coma. */
const emailsListSchema = z
  .string()
  .min(1, { message: "Indica al menos un destinatario." })
  .refine(
    (value) => {
      const parts = value
        .split(/[,;]+/)
        .map((p) => p.trim())
        .filter(Boolean);
      if (parts.length === 0) return false;
      return parts.every((p) => z.string().email().safeParse(p).success);
    },
    { message: "Cada destinatario debe ser un correo válido (separa con comas)." }
  );

const emailFormSchema = z.object({
  to: emailsListSchema,
  subject: z.string().min(1, { message: "El asunto es obligatorio." }),
  body: z.string().min(1, { message: "El cuerpo del correo no puede estar vacío." }),
  fromName: z.string().optional(),
  from: z.string().email().optional().or(z.literal("")),
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
  // Bloques con diseño (tablas) que no pasan por Quill; ver email-dialog-blocks.ts.
  const bloquesRef = React.useRef<BloquesCorreo>({});
  const [marcasBloques, setMarcasBloques] = React.useState<string[]>([]);

  const form = useForm<EmailFormValues>({
    resolver: zodResolver(emailFormSchema),
    defaultValues: {
      to: initialData.to || "",
      subject: initialData.subject || "",
      body: extraerBloques(initialData.body || "").html,
      fromName: initialData.fromName || "",
      from: initialData.from || "",
      attachments: initialData.attachments || [],
    },
  });

  // Reset al abrir (o al cambiar el borrador). No usar `values` controlado:
  // si no, editar Para se pisa en cada re-render del padre.
  React.useEffect(() => {
    if (!isOpen) return;
    form.reset({
      to: initialData.to || "",
      subject: initialData.subject || "",
      body: extraerBloques(initialData.body || "").html,
      fromName: initialData.fromName || "",
      from: initialData.from || "",
      attachments: initialData.attachments || [],
    });
    attachmentsForSendRef.current = normalizeAttachments(initialData.attachmentsForSend);
    const { bloques } = extraerBloques(initialData.body || "");
    bloquesRef.current = bloques;
    setMarcasBloques(
      (Object.keys(bloques) as Array<keyof BloquesCorreo>).map((tipo) => marcaDeBloque(tipo))
    );
  }, [form, initialData, isOpen]);

  const handleSubmit = async (data: EmailFormValues) => {
    const storageAttachments =
      attachmentsForSendRef.current.length > 0
        ? attachmentsForSendRef.current
        : data.attachments;

    await onSend({
      ...data,
      body: restaurarBloques(data.body, bloquesRef.current),
      attachments: storageAttachments,
    });
    form.reset();
    attachmentsForSendRef.current = [];
    bloquesRef.current = {};
  };

  const handleCancel = () => {
    form.reset();
    attachmentsForSendRef.current = [];
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className={cn(mobileDialogClass, "sm:max-w-[600px] gap-0 overflow-hidden p-0")}>
        <div className="shrink-0 space-y-1.5 border-b px-6 py-4 pr-12">
          <DialogHeader className="space-y-1.5 text-left">
            <DialogTitle>Redactar Correo Electrónico</DialogTitle>
            <DialogDescription>
              Elige Para y De (SMTP LabFlow o niceto@). Revisa el resto y envía.
            </DialogDescription>
          </DialogHeader>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex min-h-0 flex-1 flex-col">
            <div className={cn(dialogBodyScrollClass, "space-y-4 px-6 py-4")}>
            <FormField
              control={form.control}
              name="to"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Para</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      inputMode="email"
                      placeholder="proveedor@ejemplo.es, otro@ejemplo.es"
                      {...field}
                      disabled={isSending}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Puedes poner varios correos separados por coma (p. ej. varios
                    contactos del proveedor para pedir presupuesto).
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="from"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>De</FormLabel>
                  <Select
                    value={field.value ? field.value : FROM_SMTP_DEFAULT}
                    onValueChange={(value) =>
                      field.onChange(value === FROM_SMTP_DEFAULT ? "" : value)
                    }
                    disabled={isSending}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Cuenta SMTP de LabFlow (por defecto)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={FROM_SMTP_DEFAULT}>
                        Cuenta SMTP de LabFlow (por defecto)
                      </SelectItem>
                      <SelectItem value={CORREO_NICETO}>{CORREO_NICETO}</SelectItem>
                    </SelectContent>
                  </Select>
                  {field.value === CORREO_NICETO && (
                    <p className="text-xs text-muted-foreground">
                      Se envía autenticando con la cuenta SMTP de {CORREO_NICETO}
                      (Admin → Cuentas SMTP o Perfil → Mi correo de envío). Si aún
                      no hay contraseña configurada, el envío fallará con un aviso claro.
                    </p>
                  )}
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
                  {marcasBloques.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Las marcas entre corchetes dobles ({marcasBloques.join(", ")}) se envían como
                      bloques con su diseño. No las edites; bórralas si no quieres ese bloque.
                    </p>
                  )}
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
            </div>
            <div className={cn(dialogFooterMobileClass, "px-6 pb-4")}>
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
