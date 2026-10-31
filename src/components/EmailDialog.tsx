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
import { useSmtpAccounts } from "@/hooks/use-smtp-accounts";
import { normalizeAttachments, type EmailAttachment } from "@/utils/email-attachments";
import EmailComposeBody from "@/components/EmailComposeBody";

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
  const { data: smtpAccounts = [] } = useSmtpAccounts();
  const attachmentsForSendRef = React.useRef<EmailAttachment[]>([]);
  const composeApiRef = React.useRef<{ getHtml: () => string } | null>(null);
  const [composeKey, setComposeKey] = React.useState(0);

  const fromOptions = React.useMemo(() => {
    const emails = new Set<string>();
    emails.add(CORREO_NICETO);
    for (const account of smtpAccounts) {
      if (account.email) emails.add(account.email.trim().toLowerCase());
    }
    return [...emails].sort((a, b) => {
      if (a === CORREO_NICETO) return -1;
      if (b === CORREO_NICETO) return 1;
      return a.localeCompare(b);
    });
  }, [smtpAccounts]);

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
    setComposeKey((k) => k + 1);
  }, [form, initialData, isOpen]);

  const handleSubmit = async (data: z.infer<typeof emailFormSchema>) => {
    const storageAttachments =
      attachmentsForSendRef.current.length > 0
        ? attachmentsForSendRef.current
        : data.attachments;

    const body = composeApiRef.current?.getHtml() || "";
    if (!body.replace(/<[^>]+>/g, "").trim()) {
      form.setError("body", { message: "El cuerpo del correo no puede estar vacío." });
      return;
    }

    try {
      await onSend({
        ...data,
        body,
        attachments: storageAttachments,
      });
    } catch {
      // Quien envía ya avisa del fallo; el formulario conserva lo escrito.
      return;
    }
    form.reset();
    attachmentsForSendRef.current = [];
    composeApiRef.current = null;
  };

  const handleCancel = () => {
    form.reset();
    attachmentsForSendRef.current = [];
    composeApiRef.current = null;
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className={cn(mobileDialogClass, "sm:max-w-[920px] gap-0 overflow-hidden p-0")}>
        <div className="shrink-0 space-y-1.5 border-b px-6 py-4 pr-12">
          <DialogHeader className="space-y-1.5 text-left">
            <DialogTitle>Redactar correo</DialogTitle>
            <DialogDescription>
              Revisa destinatario, asunto y el mensaje (con los datos del pedido ya incluidos).
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
                      Varios correos separados por coma.
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
                        {fromOptions.map((email) => {
                          const account = smtpAccounts.find(
                            (a) => a.email.trim().toLowerCase() === email
                          );
                          const pendiente = account && !account.has_password;
                          return (
                            <SelectItem key={email} value={email}>
                              {email}
                              {pendiente ? " (sin contraseña)" : ""}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    {field.value ? (
                      <p className="text-xs text-muted-foreground">
                        Se autentica con la cuenta SMTP de {field.value} (Admin → Cuentas SMTP
                        o Correo).
                      </p>
                    ) : null}
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

              <div className="space-y-2">
                <FormLabel>Cuerpo</FormLabel>
                <EmailComposeBody
                  key={composeKey}
                  initialHtml={initialData.body || ""}
                  disabled={isSending}
                  onReady={(api) => {
                    composeApiRef.current = api;
                  }}
                />
                <FormMessage />
              </div>

              <FormField
                control={form.control}
                name="fromName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre del remitente (opcional)</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={isSending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {form.watch("attachments") && form.watch("attachments")!.length > 0 && (
                <div className="space-y-2">
                  <FormLabel>Adjuntos</FormLabel>
                  <div className="flex flex-wrap gap-2">
                    {form.watch("attachments")!.map((attachment, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1">
                        <Paperclip className="h-3 w-3" />
                        <a
                          href={attachment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline"
                        >
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
                  "Enviar correo"
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
