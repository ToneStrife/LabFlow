import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Save, PlusCircle, CheckCircle2, AlertCircle, CircleHelp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useSmtpAccounts,
  useUpsertSmtpAccount,
  type SmtpAccountPublic,
} from "@/hooks/use-smtp-accounts";
import { CORREO_NICETO } from "@/lib/farmacia";
import { esHostGmailSmtp } from "@/lib/smtp";

const formSchema = z.object({
  email: z.string().email({ message: "Correo inválido." }).or(z.literal("")),
  smtp_host: z.string().optional(),
  smtp_user: z.string().min(1, { message: "El usuario SMTP es obligatorio." }),
  smtp_password: z.string().optional(),
  label: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface SmtpAccountsSectionProps {
  /** Si true, lista todas y permite crear cualquier email (Admin). */
  adminMode?: boolean;
  /** Email del perfil actual: en modo no-admin solo se edita esa fila. */
  profileEmail?: string | null;
  title?: string;
  description?: string;
}

const emptyDefaults = (email?: string | null): FormValues => {
  const correo = (email ?? "").trim().toLowerCase();
  return {
    email: correo,
    smtp_host: correo && esHostGmailSmtp(correo) ? "smtp.gmail.com" : correo ? "" : "smtp.gmail.com",
    smtp_user: correo,
    smtp_password: "",
    label: "",
  };
};

const SmtpAccountsSection: React.FC<SmtpAccountsSectionProps> = ({
  adminMode = false,
  profileEmail,
  title = "Cuentas SMTP",
  description =
    "Puedes añadir cualquier buzón (p. ej. un Gmail de prueba): email, usuario, host smtp.gmail.com y contraseña de aplicación (cuenta Google → Seguridad → Contraseñas de aplicaciones; no la contraseña normal). Si Google la muestra con espacios, pégala igual. Vacío en contraseña = conservar la guardada.",
}) => {
  const { data: accounts = [], isLoading, error } = useSmtpAccounts();
  const upsertMutation = useUpsertSmtpAccount();
  const [editing, setEditing] = React.useState<SmtpAccountPublic | null>(null);
  const [showNewForm, setShowNewForm] = React.useState(false);
  const [ayudaAppPasswordOpen, setAyudaAppPasswordOpen] = React.useState(false);

  const lockedEmail = !adminMode ? (profileEmail || "").trim().toLowerCase() : "";

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: emptyDefaults(lockedEmail || CORREO_NICETO),
  });

  // Perfil: cargar la fila propia una vez (o tras guardar).
  const profileHydratedRef = React.useRef(false);
  React.useEffect(() => {
    if (adminMode || !lockedEmail || isLoading) return;
    if (profileHydratedRef.current && upsertMutation.isPending) return;

    const mine = accounts.find((a) => a.email === lockedEmail) || null;
    setEditing(mine);
    form.reset({
      email: mine?.email || lockedEmail,
      smtp_host: mine?.smtp_host || (esHostGmailSmtp(lockedEmail) ? "smtp.gmail.com" : ""),
      smtp_user: mine?.smtp_user || lockedEmail,
      smtp_password: "",
      label: mine?.label || "",
    });
    setShowNewForm(true);
    profileHydratedRef.current = true;
  }, [adminMode, lockedEmail, accounts, isLoading, form, upsertMutation.isSuccess]);

  // Admin: al elegir Editar, rellenar el formulario.
  React.useEffect(() => {
    if (!adminMode || !editing || !showNewForm) return;
    form.reset({
      email: editing.email,
      smtp_host: editing.smtp_host || (esHostGmailSmtp(editing.email) ? "smtp.gmail.com" : ""),
      smtp_user: editing.smtp_user,
      smtp_password: "",
      label: editing.label || "",
    });
  }, [adminMode, editing?.id, showNewForm]);

  const onSubmit = async (values: FormValues) => {
    const email = values.email.trim().toLowerCase();
    if (!email) {
      toast.error("Indica el correo (From).");
      return;
    }
    if (!adminMode && lockedEmail && email !== lockedEmail) {
      toast.error("Solo puedes configurar tu propio correo.");
      return;
    }

    const password = (values.smtp_password || "").replace(/\s+/g, "").trim();
    const smtpUser = values.smtp_user.trim() || email;

    await upsertMutation.mutateAsync({
      email,
      smtp_host: values.smtp_host?.trim() || (esHostGmailSmtp(email) ? "smtp.gmail.com" : null),
      smtp_user: smtpUser,
      smtp_password: password || undefined,
      label: values.label?.trim() || null,
    });

    form.setValue("smtp_password", "");
    if (adminMode) {
      setEditing(null);
      setShowNewForm(false);
    }
  };

  const startNew = () => {
    setEditing(null);
    form.reset(emptyDefaults(adminMode ? "" : lockedEmail));
    setShowNewForm(true);
  };

  const startEdit = (account: SmtpAccountPublic) => {
    setEditing(account);
    setShowNewForm(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Cargando cuentas SMTP...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-600 dark:text-red-400">
        Error al cargar cuentas SMTP: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {adminMode && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2 space-y-0">
            <div>
              <CardTitle className="text-xl">{title}</CardTitle>
              <CardDescription className="mt-1 max-w-2xl">{description}</CardDescription>
            </div>
            <Button size="sm" type="button" onClick={startNew}>
              <PlusCircle className="mr-2 h-4 w-4" /> Nueva cuenta
            </Button>
          </CardHeader>
          <CardContent>
            {accounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hay cuentas. Crea una para niceto@go.ugr.es, un Gmail de prueba u otro remitente.
              </p>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email (From)</TableHead>
                      <TableHead>Usuario SMTP</TableHead>
                      <TableHead>Host</TableHead>
                      <TableHead>Contraseña</TableHead>
                      <TableHead>Etiqueta</TableHead>
                      <TableHead className="w-[100px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accounts.map((account) => (
                      <TableRow key={account.id}>
                        <TableCell className="font-mono text-sm">{account.email}</TableCell>
                        <TableCell className="font-mono text-sm">{account.smtp_user}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {account.smtp_host || "SMTP_HOST (env)"}
                        </TableCell>
                        <TableCell>
                          {account.has_password ? (
                            <Badge variant="secondary" className="gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Configurada
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1 text-amber-700 border-amber-400">
                              <AlertCircle className="h-3 w-3" /> Pendiente
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{account.label || "—"}</TableCell>
                        <TableCell>
                          <Button type="button" variant="outline" size="sm" onClick={() => startEdit(account)}>
                            Editar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {(showNewForm || !adminMode) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {adminMode
                ? editing
                  ? `Editar ${editing.email}`
                  : "Nueva cuenta SMTP"
                : title}
            </CardTitle>
            {!adminMode && (
              <CardDescription>{description}</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-w-lg">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email (From)</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          autoComplete="off"
                          placeholder="tu.gmail@gmail.com"
                          {...field}
                          onChange={(e) => {
                            const next = e.target.value;
                            const prev = field.value;
                            field.onChange(next);
                            const userActual = form.getValues("smtp_user");
                            if (!userActual || userActual === prev) {
                              form.setValue("smtp_user", next.trim().toLowerCase());
                            }
                            if (esHostGmailSmtp(next) && !form.getValues("smtp_host")?.trim()) {
                              form.setValue("smtp_host", "smtp.gmail.com");
                            }
                          }}
                          disabled={upsertMutation.isPending || !adminMode}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="smtp_host"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Host SMTP</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="smtp.gmail.com"
                          autoComplete="off"
                          {...field}
                          disabled={upsertMutation.isPending}
                        />
                      </FormControl>
                      <FormDescription>
                        Gmail / @go.ugr.es: smtp.gmail.com. Vacío = el host por defecto de LabFlow.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="smtp_user"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Usuario SMTP</FormLabel>
                      <FormControl>
                        <Input
                          autoComplete="username"
                          placeholder="igual que el email"
                          {...field}
                          disabled={upsertMutation.isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="smtp_password"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <FormLabel className="m-0">Contraseña SMTP</FormLabel>
                        <Button
                          type="button"
                          variant="link"
                          size="sm"
                          className="h-auto p-0 text-xs"
                          onClick={() => setAyudaAppPasswordOpen(true)}
                        >
                          <CircleHelp className="mr-1 h-3.5 w-3.5" />
                          Cómo sacar la contraseña de aplicación
                        </Button>
                      </div>
                      <FormControl>
                        <Input
                          type="password"
                          autoComplete="new-password"
                          placeholder={
                            editing?.has_password || accounts.some((a) => a.email === form.getValues("email") && a.has_password)
                              ? "•••••••• (dejar en blanco para no cambiar)"
                              : "Contraseña de aplicación"
                          }
                          {...field}
                          disabled={upsertMutation.isPending}
                        />
                      </FormControl>
                      <FormDescription>
                        En Gmail/Google: contraseña de aplicación (no la del correo).
                        Vacía = conservar la actual.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {adminMode && (
                  <FormField
                    control={form.control}
                    name="label"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Etiqueta (opcional)</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={upsertMutation.isPending} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button type="submit" disabled={upsertMutation.isPending}>
                    {upsertMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" /> Guardar
                      </>
                    )}
                  </Button>
                  {adminMode && (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={upsertMutation.isPending}
                      onClick={() => {
                        setEditing(null);
                        setShowNewForm(false);
                        form.reset(emptyDefaults());
                      }}
                    >
                      Cancelar
                    </Button>
                  )}
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      <Dialog open={ayudaAppPasswordOpen} onOpenChange={setAyudaAppPasswordOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Contraseña de aplicación de Google</DialogTitle>
            <DialogDescription>
              Gmail no acepta la contraseña normal del correo para SMTP. Hay que crear una
              contraseña de aplicación y pegarla aquí.
            </DialogDescription>
          </DialogHeader>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-foreground">
            <li>
              Entra en la cuenta Google del buzón (
              <a
                href="https://myaccount.google.com/security"
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2"
              >
                myaccount.google.com/security
              </a>
              ).
            </li>
            <li>Activa <strong>Verificación en 2 pasos</strong> si aún no lo está.</li>
            <li>
              Abre{" "}
              <a
                href="https://myaccount.google.com/apppasswords"
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2"
              >
                Contraseñas de aplicaciones
              </a>
              .
            </li>
            <li>Nombre: «LabFlow» o «Correo» → Crear.</li>
            <li>Copia la clave (16 caracteres; si sale con espacios, pégala igual) y guárdala aquí.</li>
          </ol>
          <DialogFooter>
            <Button type="button" onClick={() => setAyudaAppPasswordOpen(false)}>
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SmtpAccountsSection;
