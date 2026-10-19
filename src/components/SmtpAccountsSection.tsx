"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Save, PlusCircle, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  useSmtpAccounts,
  useUpsertSmtpAccount,
  type SmtpAccountPublic,
} from "@/hooks/use-smtp-accounts";
import { CORREO_NICETO } from "@/lib/farmacia";

const formSchema = z.object({
  email: z.string().email({ message: "Correo inválido." }),
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

const emptyDefaults = (email?: string | null): FormValues => ({
  email: email?.trim().toLowerCase() || CORREO_NICETO,
  smtp_host: "",
  smtp_user: email?.trim().toLowerCase() || CORREO_NICETO,
  smtp_password: "",
  label: "",
});

const SmtpAccountsSection: React.FC<SmtpAccountsSectionProps> = ({
  adminMode = false,
  profileEmail,
  title = "Cuentas SMTP",
  description = "Correo go.ugr.es (por ejemplo niceto@go.ugr.es) y la contraseña del buzón. LabFlow autentica con esa cuenta al enviar. La contraseña no se vuelve a mostrar; déjala en blanco para conservarla.",
}) => {
  const { data: accounts = [], isLoading, error } = useSmtpAccounts();
  const upsertMutation = useUpsertSmtpAccount();
  const [editing, setEditing] = React.useState<SmtpAccountPublic | null>(null);
  const [showNewForm, setShowNewForm] = React.useState(false);

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
      smtp_host: mine?.smtp_host || "",
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
      smtp_host: editing.smtp_host || "",
      smtp_user: editing.smtp_user,
      smtp_password: "",
      label: editing.label || "",
    });
  }, [adminMode, editing?.id, showNewForm]);

  const onSubmit = async (values: FormValues) => {
    const email = values.email.trim().toLowerCase();
    if (!adminMode && lockedEmail && email !== lockedEmail) {
      toast.error("Solo puedes configurar tu propio correo.");
      return;
    }

    await upsertMutation.mutateAsync({
      email,
      smtp_host: values.smtp_host?.trim() || null,
      smtp_user: values.smtp_user.trim(),
      smtp_password: values.smtp_password || undefined,
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
    // En el perfil no tapamos el resto de la página si la tabla aún no existe.
    if (!adminMode) return null;
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
                No hay cuentas. Crea una para niceto@go.ugr.es u otro remitente.
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
                          {...field}
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
                      <FormLabel>Host SMTP (opcional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Vacío = SMTP_HOST del entorno"
                          autoComplete="off"
                          {...field}
                          disabled={upsertMutation.isPending}
                        />
                      </FormControl>
                      <FormDescription>
                        Si lo dejas vacío se usa el mismo host que LabFlow.
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
                      <FormLabel>Contraseña SMTP</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          autoComplete="new-password"
                          placeholder={
                            editing?.has_password || accounts.some((a) => a.email === form.getValues("email") && a.has_password)
                              ? "•••••••• (dejar en blanco para no cambiar)"
                              : "Contraseña del buzón / app password"
                          }
                          {...field}
                          disabled={upsertMutation.isPending}
                        />
                      </FormControl>
                      <FormDescription>
                        Nunca se muestra en claro. Déjala vacía para conservar la actual.
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
    </div>
  );
};

export default SmtpAccountsSection;
