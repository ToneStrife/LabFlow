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
import { Loader2, Paperclip, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { mobileDialogClass, dialogBodyScrollClass, dialogFooterMobileClass } from "@/lib/layout";
import { CORREO_NICETO } from "@/lib/farmacia";
// Quill pesa 111 KB comprimidos y solo hace falta al escribir un correo.
// Cargándolo aquí sale del paquete inicial de toda la aplicación.
const RichTextEditor = React.lazy(() => import('./RichTextEditor'));
import { normalizeAttachments, type EmailAttachment } from "@/utils/email-attachments";
import {
  segmentarCuerpoCorreo,
  montarCuerpoDesdeSegmentos,
  etiquetaDeBloque,
  type SegmentoCorreo,
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
  // El cuerpo se monta desde segmentos; este campo solo cumple el schema mínimo.
  body: z.string().optional(),
  fromName: z.string().optional(),
  from: z.string().email().optional().or(z.literal("")),
  attachments: z.array(attachmentSchema).optional(),
  attachmentsForSend: z.array(attachmentSchema).optional(),
});

export type EmailFormValues = z.infer<typeof emailFormSchema> & {
  body: string;
};

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
  const [segmentos, setSegmentos] = React.useState<SegmentoCorreo[]>([]);

  const form = useForm<z.infer<typeof emailFormSchema>>({
    resolver: zodResolver(emailFormSchema),
    defaultValues: {
      to: initialData.to || "",
      subject: initialData.subject || "",
      body: "",
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
      body: "",
      fromName: initialData.fromName || "",
      from: initialData.from || "",
      attachments: initialData.attachments || [],
    });
    attachmentsForSendRef.current = normalizeAttachments(initialData.attachmentsForSend);
    setSegmentos(segmentarCuerpoCorreo(initialData.body || ""));
  }, [form, initialData, isOpen]);

  const actualizarTexto = (indice: number, html: string) => {
    setSegmentos((prev) =>
      prev.map((seg, i) => (i === indice && seg.kind === "text" ? { ...seg, html } : seg))
    );
  };

  const quitarBloque = (indice: number) => {
    setSegmentos((prev) =>
      prev.map((seg, i) =>
        i === indice && seg.kind === "block" ? { ...seg, incluido: false } : seg
      )
    );
  };

  const handleSubmit = async (data: z.infer<typeof emailFormSchema>) => {
    const storageAttachments =
      attachmentsForSendRef.current.length > 0
        ? attachmentsForSendRef.current
        : data.attachments;

    const body = montarCuerpoDesdeSegmentos(segmentos);
    if (!body.replace(/<[^>]+>/g, "").trim()) {
      form.setError("body", { message: "El cuerpo del correo no puede estar vacío." });
      return;
    }

    await onSend({
      ...data,
      body,
      attachments: storageAttachments,
    });
    form.reset();
    attachmentsForSendRef.current = [];
    setSegmentos([]);
  };

  const handleCancel = () => {
    form.reset();
    attachmentsForSendRef.current = [];
    setSegmentos([]);
    onOpenChange(false);
  };

  const hayBloques = segmentos.some((s) => s.kind === "block" && s.incluido);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className={cn(mobileDialogClass, "sm:max-w-[640px] gap-0 overflow-hidden p-0")}>
        <div className="shrink-0 space-y-1.5 border-b px-6 py-4 pr-12">
          <DialogHeader className="space-y-1.5 text-left">
            <DialogTitle>Redactar Correo Electrónico</DialogTitle>
            <DialogDescription>
              Elige Para y De. Revisa el texto y los datos del pedido (ya cargados) y envía.
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

            <div className="space-y-3">
              <FormLabel>Cuerpo</FormLabel>
              {hayBloques && (
                <p className="text-xs text-muted-foreground">
                  Los recuadros con datos del pedido se envían con su diseño. Puedes
                  editar el texto de alrededor o quitar un bloque si no lo quieres.
                </p>
              )}
              <div className="space-y-3 rounded-md border bg-muted/20 p-3">
                {segmentos.map((seg, indice) => {
                  if (seg.kind === "text") {
                    return (
                      <React.Suspense
                        key={`text-${indice}`}
                        fallback={
                          <div className="h-24 animate-pulse rounded-md border bg-muted/40" />
                        }
                      >
                        <RichTextEditor
                          value={seg.html}
                          onChange={(html) => actualizarTexto(indice, html)}
                          disabled={isSending}
                          placeholder="Escribe el cuerpo del correo aquí..."
                        />
                      </React.Suspense>
                    );
                  }
                  if (!seg.incluido) return null;
                  return (
                    <div
                      key={`block-${seg.tipo}-${indice}`}
                      className="overflow-hidden rounded-md border bg-background"
                    >
                      <div className="flex items-center justify-between gap-2 border-b bg-muted/40 px-3 py-1.5">
                        <span className="text-xs font-medium capitalize text-muted-foreground">
                          {etiquetaDeBloque(seg.tipo)}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          disabled={isSending}
                          onClick={() => quitarBloque(indice)}
                        >
                          <X className="mr-1 h-3.5 w-3.5" />
                          Quitar
                        </Button>
                      </div>
                      <div
                        className="overflow-x-auto p-3 text-sm [&_table]:max-w-full"
                        dangerouslySetInnerHTML={{ __html: seg.html }}
                      />
                    </div>
                  );
                })}
              </div>
              <FormMessage />
            </div>

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
