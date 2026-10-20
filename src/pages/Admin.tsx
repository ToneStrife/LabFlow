import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2, MapPin, DollarSign, Users, Briefcase, Shield, Mail, ScrollText, Bell, KeyRound, Server } from "lucide-react";
import PermissionsMatrix from "@/components/PermissionsMatrix";
import SmtpAccountsSection from "@/components/SmtpAccountsSection";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { pageContainerClass, mobileDialogClass } from "@/lib/layout";

import AccountManagerTable from "@/components/AccountManagerTable";
import AccountManagerForm, { AccountManagerFormValues } from "@/components/AccountManagerForm";
import { useAccountManagers, useAddAccountManager, useUpdateAccountManager, useDeleteAccountManager } from "@/hooks/use-account-managers";
import { AccountManager } from "@/data/types";

import ProjectTable from "@/components/ProjectTable";
import ProjectForm, { ProjectFormValues } from "@/components/ProjectForm";
import { useProjects, useAddProject, useUpdateProject, useDeleteProject } from "@/hooks/use-projects";
import { Project } from "@/data/types";

import UserTable from "@/components/UserTable";
import InviteUserDialog, { InviteUserFormValues } from "@/components/InviteUserDialog";
import { useAllProfiles, useInviteUser, useUpdateProfile, useDeleteProfile, useResetUserPassword } from "@/hooks/use-profiles";
import { useSession } from "@/components/SessionContextProvider";
import { Profile } from "@/data/types";
import { useCan } from "@/hooks/use-permissions";
import { PESTANAS_ADMIN, puedeAbrirPestana } from "@/lib/admin-access";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save } from "lucide-react";
import { useEmailTemplates, useUpdateEmailTemplate } from "@/hooks/use-email-templates";
import { EmailTemplate, Address } from "@/data/types";
import { Badge } from "@/components/ui/badge";

import AddressTable from "@/components/AddressTable";
import AddressForm, { AddressFormValues } from "@/components/AddressForm";
import { 
  useShippingAddresses, 
  useBillingAddresses, 
  useAddShippingAddress, 
  useUpdateShippingAddress, 
  useDeleteShippingAddress,
  useAddBillingAddress,
  useUpdateBillingAddress,
  useDeleteBillingAddress,
} from "@/hooks/use-addresses";

import EmailLogs from "@/components/EmailLogs";

import { useSendTestNotification } from "@/hooks/use-notifications";
import NotificationSenderForm from "@/components/NotificationSenderForm";

const emailTemplateFormSchema = z.object({
  template_name: z.string().min(1, { message: "El nombre de la plantilla es obligatorio." }),
  subject_template: z.string().min(1, { message: "El asunto de la plantilla es obligatorio." }),
  body_template: z.string().min(1, { message: "El cuerpo de la plantilla es obligatorio." }),
});
type EmailTemplateFormValues = z.infer<typeof emailTemplateFormSchema>;

const availablePlaceholders = [
  "{{request.id}}", "{{request.status}}", "{{request.notes}}", "{{request.quote_url}}",
  "{{request.po_number}}", "{{request.po_url}}", "{{request.slip_url}}", "{{request.project_codes}}",
  "{{project.investigador}}", "{{project.entidad}}", "{{project.entidad_cif}}",
  "{{requester.full_name}}",
  "{{requester.email}}", "{{vendor.name}}", "{{vendor.contact_person}}", "{{vendor.email}}",
  "{{account_manager.full_name}}", "{{account_manager.first_name}}", "{{account_manager.email}}",
  "{{items_list}}", "{{cta_button}}",
  "{{message}}", "{{actor.full_name}}", "{{order.itemName}}", "{{order.id}}",
  "{{shipping_address}}", "{{billing_address}}",
];

const templateNameMap: Record<string, string> = {
  'Quote Request': 'Solicitud de presupuesto',
  'PO Request': 'Solicitud de PO (Cómprame)',
  'Order Confirmation': 'Confirmación de Pedido',
};

const AdminPage = () => {
  const { data: accountManagers, isLoading: isLoadingManagers, error: managersError } = useAccountManagers();
  const addAccountManagerMutation = useAddAccountManager();
  const updateAccountManagerMutation = useUpdateAccountManager();
  const deleteAccountManagerMutation = useDeleteAccountManager();
  const [isAddManagerDialogOpen, setIsAddManagerDialogOpen] = React.useState(false);
  const [isEditManagerDialogOpen, setIsEditManagerDialogOpen] = React.useState(false);
  const [editingManager, setEditingManager] = React.useState<AccountManager | undefined>(undefined);

  const { data: projects, isLoading: isLoadingProjects, error: projectsError } = useProjects();
  const addProjectMutation = useAddProject();
  const updateProjectMutation = useUpdateProject();
  const deleteProjectMutation = useDeleteProject();
  const [isAddProjectDialogOpen, setIsAddProjectDialogOpen] = React.useState(false);
  const [isEditProjectDialogOpen, setIsEditProjectDialogOpen] = React.useState(false);
  const [editingProject, setEditingProject] = React.useState<Project | undefined>(undefined);

  const { profile: currentUserProfile, loading: sessionLoading } = useSession();
  const { data: allProfiles, isLoading: isLoadingUsers, error: usersError } = useAllProfiles();
  const inviteUserMutation = useInviteUser();
  const updateProfileMutation = useUpdateProfile();
  const deleteProfileMutation = useDeleteProfile();
  const resetUserPasswordMutation = useResetUserPassword();
  const [isInviteUserDialogOpen, setIsInviteUserDialogOpen] = React.useState(false);

  const { data: templates, isLoading: isLoadingTemplates, error: templatesError } = useEmailTemplates();
  const updateTemplateMutation = useUpdateEmailTemplate();
  const [selectedTemplateId, setSelectedTemplateId] = React.useState<string | undefined>(undefined);
  const [currentTemplate, setCurrentTemplate] = React.useState<EmailTemplate | undefined>(undefined);
  const emailTemplateForm = useForm<EmailTemplateFormValues>({
    resolver: zodResolver(emailTemplateFormSchema),
    defaultValues: { template_name: "", subject_template: "", body_template: "" },
  });

  const { data: shippingAddresses, isLoading: isLoadingShipping } = useShippingAddresses();
  const { data: billingAddresses, isLoading: isLoadingBilling } = useBillingAddresses();
  const addShippingMutation = useAddShippingAddress();
  const updateShippingMutation = useUpdateShippingAddress();
  const deleteShippingMutation = useDeleteShippingAddress();
  const addBillingMutation = useAddBillingAddress();
  const updateBillingMutation = useUpdateBillingAddress();
  const deleteBillingMutation = useDeleteBillingAddress();

  const [isAddAddressDialogOpen, setIsAddAddressDialogOpen] = React.useState(false);
  const [isEditAddressDialogOpen, setIsEditAddressDialogOpen] = React.useState(false);
  const [editingAddress, setEditingAddress] = React.useState<Address | undefined>(undefined);
  const [currentAddressType, setCurrentAddressType] = React.useState<'shipping' | 'billing'>('shipping');
  
  const sendTestNotificationMutation = useSendTestNotification();
  const { can, cargandoPermisos } = useCan();
  const pestanasVisibles = PESTANAS_ADMIN.filter((pestana) => puedeAbrirPestana(can, pestana));
  const [pestanaElegida, setPestanaElegida] = React.useState<string | null>(null);
  const pestanaActiva = pestanasVisibles.some((pestana) => pestana.value === pestanaElegida)
    ? pestanaElegida!
    : pestanasVisibles[0]?.value ?? "users";
  const puedeVer = (value: string) => pestanasVisibles.some((pestana) => pestana.value === value);

  const handleAddManager = async (data: AccountManagerFormValues) => {
    await addAccountManagerMutation.mutateAsync(data);
    setIsAddManagerDialogOpen(false);
  };
  const handleEditManager = async (id: string, data: AccountManagerFormValues) => {
    await updateAccountManagerMutation.mutateAsync({ id, data });
    setIsEditManagerDialogOpen(false);
  };
  const handleDeleteManager = async (id: string) => await deleteAccountManagerMutation.mutateAsync(id);
  const openEditManagerDialog = (manager: AccountManager) => {
    setEditingManager(manager);
    setIsEditManagerDialogOpen(true);
  };

  const handleAddProject = async (data: ProjectFormValues) => {
    await addProjectMutation.mutateAsync(data);
    setIsAddProjectDialogOpen(false);
  };
  const handleEditProject = async (id: string, data: ProjectFormValues) => {
    await updateProjectMutation.mutateAsync({ id, data });
    setIsEditProjectDialogOpen(false);
  };
  const handleDeleteProject = async (id: string) => await deleteProjectMutation.mutateAsync(id);
  const openEditProjectDialog = (project: Project) => {
    setEditingProject(project);
    setIsEditProjectDialogOpen(true);
  };

  const handleInviteUser = async (data: InviteUserFormValues) => {
    // Asegurar que los campos opcionales sean null si son undefined o cadena vacía
    const dataToSend = {
        email: data.email,
        first_name: data.first_name || undefined,
        last_name: data.last_name || undefined,
    };
    await inviteUserMutation.mutateAsync(dataToSend);
    setIsInviteUserDialogOpen(false);
  };
  const handleUpdateUserRole = async (userId: string, newRole: Profile['role']) => {
    if (currentUserProfile?.id === userId) {
      toast.error("No puedes cambiar tu propio rol.");
      return;
    }
    await updateProfileMutation.mutateAsync({ id: userId, data: { role: newRole } });
  };
  const handleUpdateUserDefaultSede = async (userId: string, sedeId: string | null) => {
    await updateProfileMutation.mutateAsync({ id: userId, data: { default_sede_id: sedeId } });
  };
  const handleDeleteUser = async (userId: string) => {
    if (currentUserProfile?.id === userId) {
      toast.error("No puedes eliminar tu propia cuenta.");
      return;
    }
    await deleteProfileMutation.mutateAsync(userId);
  };
  const handleResetUserPassword = async (userId: string) => {
    await resetUserPasswordMutation.mutateAsync(userId);
  };

  const handleAddAddress = async (data: AddressFormValues) => {
    if (currentAddressType === 'shipping') {
      await addShippingMutation.mutateAsync(data);
    } else {
      await addBillingMutation.mutateAsync(data);
    }
    setIsAddAddressDialogOpen(false);
  };

  const handleEditAddress = async (id: string, data: AddressFormValues) => {
    if (currentAddressType === 'shipping') {
      await updateShippingMutation.mutateAsync({ id, data });
    } else {
      await updateBillingMutation.mutateAsync({ id, data });
    }
    setIsEditAddressDialogOpen(false);
    setEditingAddress(undefined);
  };

  const handleDeleteAddress = async (id: string) => {
    if (currentAddressType === 'shipping') {
      await deleteShippingMutation.mutateAsync(id);
    } else {
      await deleteBillingMutation.mutateAsync(id);
    }
  };

  const openAddAddressDialog = (type: 'shipping' | 'billing') => {
    setCurrentAddressType(type);
    setIsAddAddressDialogOpen(true);
  };

  const openEditAddressDialog = (address: Address, type: 'shipping' | 'billing') => {
    setCurrentAddressType(type);
    setEditingAddress(address);
    setIsEditAddressDialogOpen(true);
  };

  React.useEffect(() => {
    if (templates && templates.length > 0 && !selectedTemplateId) {
      setSelectedTemplateId(templates[0].id);
    }
  }, [templates, selectedTemplateId]);

  React.useEffect(() => {
    if (selectedTemplateId && templates) {
      const template = templates.find(t => t.id === selectedTemplateId);
      setCurrentTemplate(template);
      if (template) {
        emailTemplateForm.reset({
          template_name: template.template_name,
          subject_template: template.subject_template,
          body_template: template.body_template,
        });
      }
    }
  }, [selectedTemplateId, templates, emailTemplateForm]);

  const handleTemplateChange = (id: string) => setSelectedTemplateId(id);
  const onTemplateSubmit = async (data: EmailTemplateFormValues) => {
    if (!currentTemplate) return;
    await updateTemplateMutation.mutateAsync({ id: currentTemplate.id, data });
  };
  
  const handleSendTestNotification = async () => {
    await sendTestNotificationMutation.mutateAsync();
  };

  const isLoading = isLoadingManagers || isLoadingProjects || isLoadingUsers || isLoadingTemplates || sessionLoading || isLoadingShipping || isLoadingBilling || cargandoPermisos;
  const error = managersError || projectsError || usersError || templatesError;

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin mr-2" /> Cargando Panel de Administración...
      </div>
    );
  }

  if (error) {
    return <div className="p-4 sm:p-6 text-red-600 dark:text-red-400">Error: {error.message}</div>;
  }

  return (
    <div className="p-4 sm:p-6 max-w-full mx-auto">
      <h1 className="text-3xl font-bold mb-6">Panel de Administración</h1>
      <p className="text-lg text-muted-foreground mb-8">
        Solo ves las secciones que puedes modificar. No hace falta el rol de administrador.
        El correo de cada persona se guarda en el menú Correo.
      </p>

      {pestanasVisibles.length === 0 ? (
        <p className="text-muted-foreground">No tienes secciones de administración asignadas.</p>
      ) : (
      <Tabs value={pestanaActiva} onValueChange={setPestanaElegida} className="w-full">
        {/* Tabs List: Use flex-wrap and overflow-x-auto for responsiveness */}
        <TabsList className="flex flex-wrap h-auto p-1 bg-muted/50 border rounded-lg overflow-x-auto w-full justify-start">
          {puedeVer("users") && (
          <TabsTrigger value="users" className="flex items-center gap-2 px-4 py-2">
            <Shield className="h-4 w-4" /> Usuarios
          </TabsTrigger>
          )}
          {puedeVer("account-managers") && (
          <TabsTrigger value="account-managers" className="flex items-center gap-2 px-4 py-2">
            <Users className="h-4 w-4" /> Gerentes de Cuenta
          </TabsTrigger>
          )}
          {puedeVer("projects") && (
          <TabsTrigger value="projects" className="flex items-center gap-2 px-4 py-2">
            <Briefcase className="h-4 w-4" /> Proyectos
          </TabsTrigger>
          )}
          {puedeVer("addresses") && (
          <TabsTrigger value="addresses" className="flex items-center gap-2 px-4 py-2">
            <MapPin className="h-4 w-4" /> Direcciones
          </TabsTrigger>
          )}
          {puedeVer("email-templates") && (
          <TabsTrigger value="email-templates" className="flex items-center gap-2 px-4 py-2">
            <Mail className="h-4 w-4" /> Plantillas de Email
          </TabsTrigger>
          )}
          {puedeVer("smtp-accounts") && (
          <TabsTrigger value="smtp-accounts" className="flex items-center gap-2 px-4 py-2">
            <Server className="h-4 w-4" /> Cuentas SMTP
          </TabsTrigger>
          )}
          {puedeVer("email-logs") && (
          <TabsTrigger value="email-logs" className="flex items-center gap-2 px-4 py-2">
            <ScrollText className="h-4 w-4" /> Registros de Email
          </TabsTrigger>
          )}
          {puedeVer("notifications") && (
          <TabsTrigger value="notifications" className="flex items-center gap-2 px-4 py-2">
            <Bell className="h-4 w-4" /> Notificaciones
          </TabsTrigger>
          )}
          {puedeVer("permissions") && (
          <TabsTrigger value="permissions" className="flex items-center gap-2 px-4 py-2">
            <KeyRound className="h-4 w-4" /> Permisos
          </TabsTrigger>
          )}
        </TabsList>

        {/* Permisos */}
        {puedeVer("permissions") && (
        <TabsContent value="permissions" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Permisos</CardTitle>
            </CardHeader>
            <CardContent>
              <PermissionsMatrix />
            </CardContent>
          </Card>
        </TabsContent>
        )}

        {/* Users Tab */}
        {puedeVer("users") && (
        <TabsContent value="users" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2 space-y-0 py-4">
              <CardTitle className="text-lg">Usuarios</CardTitle>
              <Dialog open={isInviteUserDialogOpen} onOpenChange={setIsInviteUserDialogOpen}>
                <DialogTrigger asChild><Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Invitar</Button></DialogTrigger>
                <DialogContent className={cn(mobileDialogClass, "sm:max-w-[425px]")}>
                  <DialogHeader><DialogTitle>Invitar Nuevo Usuario</DialogTitle></DialogHeader>
                  <InviteUserDialog onSubmit={handleInviteUser} onCancel={() => setIsInviteUserDialogOpen(false)} isSubmitting={inviteUserMutation.isPending} />
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <UserTable
                users={allProfiles || []}
                onRoleChange={handleUpdateUserRole}
                onDefaultSedeChange={handleUpdateUserDefaultSede}
                onDelete={handleDeleteUser}
                onResetPassword={handleResetUserPassword}
                currentUserId={currentUserProfile?.id}
                isUpdatingRole={updateProfileMutation.isPending}
                isUpdatingDefaultSede={updateProfileMutation.isPending}
                isDeletingUser={deleteProfileMutation.isPending}
                isResettingPassword={resetUserPasswordMutation.isPending}
              />
            </CardContent>
          </Card>
          <Dialog open={isEditAddressDialogOpen} onOpenChange={setIsEditAddressDialogOpen}>
            <DialogContent className={cn(mobileDialogClass, "sm:max-w-[425px]")}>
              <DialogHeader><DialogTitle>Editar Dirección</DialogTitle></DialogHeader>
              {editingAddress && (
                <AddressForm
                  initialData={editingAddress}
                  onSubmit={(data) => handleEditAddress(editingAddress.id, data)}
                  onCancel={() => setIsEditAddressDialogOpen(false)}
                  isSubmitting={updateShippingMutation.isPending || updateBillingMutation.isPending}
                  showSede={currentAddressType === 'shipping'}
                />
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>
        )}

        {/* Account Managers Tab */}
        {puedeVer("account-managers") && (
        <TabsContent value="account-managers" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-xl">Gerentes de Cuenta</CardTitle>
              <Dialog open={isAddManagerDialogOpen} onOpenChange={setIsAddManagerDialogOpen}>
                <DialogTrigger asChild><Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Añadir Nuevo Gerente</Button></DialogTrigger>
                <DialogContent className={cn(mobileDialogClass, "sm:max-w-[425px]")}>
                  <DialogHeader><DialogTitle>Añadir Nuevo Gerente de Cuenta</DialogTitle></DialogHeader>
                  <AccountManagerForm onSubmit={handleAddManager} onCancel={() => setIsAddManagerDialogOpen(false)} isSubmitting={addAccountManagerMutation.isPending} />
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <AccountManagerTable managers={accountManagers || []} onEdit={openEditManagerDialog} onDelete={handleDeleteManager} />
            </CardContent>
          </Card>
          <Dialog open={isEditManagerDialogOpen} onOpenChange={setIsEditManagerDialogOpen}>
            <DialogContent className={cn(mobileDialogClass, "sm:max-w-[425px]")}>
              <DialogHeader><DialogTitle>Editar Gerente de Cuenta</DialogTitle></DialogHeader>
              {editingManager && <AccountManagerForm initialData={editingManager} onSubmit={(data) => handleEditManager(editingManager.id, data)} onCancel={() => setIsEditManagerDialogOpen(false)} isSubmitting={updateAccountManagerMutation.isPending} />}
            </DialogContent>
          </Dialog>
        </TabsContent>
        )}

        {/* Projects Tab */}
        {puedeVer("projects") && (
        <TabsContent value="projects" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-xl">Proyectos</CardTitle>
              <Dialog open={isAddProjectDialogOpen} onOpenChange={setIsAddProjectDialogOpen}>
                <DialogTrigger asChild><Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Añadir Nuevo Proyecto</Button></DialogTrigger>
                <DialogContent className={cn(mobileDialogClass, "sm:max-w-[480px]")}>
                  <DialogHeader><DialogTitle>Añadir Nuevo Proyecto</DialogTitle></DialogHeader>
                  <ProjectForm
                    profiles={allProfiles || []}
                    onSubmit={handleAddProject}
                    onCancel={() => setIsAddProjectDialogOpen(false)}
                    isSubmitting={addProjectMutation.isPending}
                  />
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <ProjectTable
                projects={projects || []}
                profiles={allProfiles || []}
                onEdit={openEditProjectDialog}
                onDelete={handleDeleteProject}
              />
            </CardContent>
          </Card>
          <Dialog open={isEditProjectDialogOpen} onOpenChange={setIsEditProjectDialogOpen}>
            <DialogContent className={cn(mobileDialogClass, "sm:max-w-[480px]")}>
              <DialogHeader><DialogTitle>Editar Proyecto</DialogTitle></DialogHeader>
              {editingProject && (
                <ProjectForm
                  initialData={editingProject}
                  profiles={allProfiles || []}
                  onSubmit={(data) => handleEditProject(editingProject.id, data)}
                  onCancel={() => setIsEditProjectDialogOpen(false)}
                  isSubmitting={updateProjectMutation.isPending}
                />
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>
        )}

        {/* Addresses Tab */}
        {puedeVer("addresses") && (
        <TabsContent value="addresses" className="mt-6 space-y-8">
          {/* Shipping Addresses */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-xl flex items-center"><MapPin className="mr-2 h-5 w-5" /> Direcciones de Envío</CardTitle>
              <Button size="sm" onClick={() => openAddAddressDialog('shipping')}><PlusCircle className="mr-2 h-4 w-4" /> Añadir Dirección de Envío</Button>
            </CardHeader>
            <CardContent>
              <AddressTable 
                addresses={shippingAddresses || []} 
                onEdit={(addr) => openEditAddressDialog(addr, 'shipping')} 
                onDelete={deleteShippingMutation.mutateAsync}
                showSede
              />
            </CardContent>
          </Card>

          {/* Billing Addresses */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-xl flex items-center"><DollarSign className="mr-2 h-5 w-5" /> Direcciones de Facturación</CardTitle>
              <Button size="sm" onClick={() => openAddAddressDialog('billing')}><PlusCircle className="mr-2 h-4 w-4" /> Añadir Dirección de Facturación</Button>
            </CardHeader>
            <CardContent>
              <AddressTable 
                addresses={billingAddresses || []} 
                onEdit={(addr) => openEditAddressDialog(addr, 'billing')} 
                onDelete={deleteBillingMutation.mutateAsync} 
              />
            </CardContent>
          </Card>
        </TabsContent>
        )}

        {/* Email Templates Tab */}
        {puedeVer("email-templates") && (
        <TabsContent value="email-templates" className="mt-6">
          <Card>
            <CardHeader><CardTitle className="text-xl">Plantillas de Correo Electrónico</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <Select value={selectedTemplateId} onValueChange={handleTemplateChange}>
                <SelectTrigger className="w-full md:w-[300px]"><SelectValue placeholder="Selecciona una plantilla" /></SelectTrigger>
                <SelectContent>
                  {templates?.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {templateNameMap[t.template_name] || t.template_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {currentTemplate && (
                <Form {...emailTemplateForm}>
                  <form onSubmit={emailTemplateForm.handleSubmit(onTemplateSubmit)} className="space-y-4">
                    <FormField control={emailTemplateForm.control} name="template_name" render={({ field }) => <FormItem><FormLabel>Nombre de la Plantilla</FormLabel><FormControl><Input {...field} disabled={updateTemplateMutation.isPending} /></FormControl><FormMessage /></FormItem>} />
                    <FormField control={emailTemplateForm.control} name="subject_template" render={({ field }) => <FormItem><FormLabel>Asunto</FormLabel><FormControl><Input {...field} disabled={updateTemplateMutation.isPending} /></FormControl><FormMessage /></FormItem>} />
                    <FormField control={emailTemplateForm.control} name="body_template" render={({ field }) => <FormItem><FormLabel>Cuerpo del Correo</FormLabel><FormControl><Textarea rows={18} {...field} disabled={updateTemplateMutation.isPending} /></FormControl><FormMessage /></FormItem>} />
                    <div className="space-y-2">
                      <FormLabel>Marcadores de Posición Disponibles</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Si el cuerpo sigue siendo el texto antiguo («Nos gustaría solicitar un presupuesto…»),
                        aplica la migración{" "}
                        <code className="text-xs">20261016160000_quote_po_templates_niceto_reapply.sql</code>{" "}
                        en Supabase o pega aquí el modelo Niceto y guarda. Al enviar, la app ya sustituye
                        ese texto antiguo automáticamente.
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Solicitud de presupuesto: usa <code className="text-xs">{"{{vendor.name}}"}</code>,{" "}
                        <code className="text-xs">{"{{items_list}}"}</code> (PRODUCTO | REF | CANT),{" "}
                        <code className="text-xs">{"{{project.investigador}}"}</code>,{" "}
                        <code className="text-xs">{"{{request.project_codes}}"}</code>,{" "}
                        <code className="text-xs">{"{{project.entidad}}"}</code>,{" "}
                        <code className="text-xs">{"{{project.entidad_cif}}"}</code>,{" "}
                        <code className="text-xs">{"{{shipping_address}}"}</code> y{" "}
                        <code className="text-xs">{"{{actor.full_name}}"}</code>.
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Cómprame (PO Request): saludo con{" "}
                        <code className="text-xs">{"{{account_manager.first_name}}"}</code>, datos de{" "}
                        <code className="text-xs">{"{{project.investigador}}"}</code>,{" "}
                        <code className="text-xs">{"{{request.project_codes}}"}</code>,{" "}
                        <code className="text-xs">{"{{project.entidad}}"}</code>, listado{" "}
                        <code className="text-xs">{"{{items_list}}"}</code> y firma con{" "}
                        <code className="text-xs">{"{{actor.full_name}}"}</code>.
                      </p>
                      <div className="flex flex-wrap gap-2">{availablePlaceholders.map((p) => <Badge key={p} variant="secondary" className="font-mono text-xs">{p}</Badge>)}</div>
                    </div>
                    <div className="flex justify-end pt-4">
                      <Button type="submit" disabled={updateTemplateMutation.isPending}>
                        {updateTemplateMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...</> : <><Save className="mr-2 h-4 w-4" /> Guardar Plantilla</>}
                      </Button>
                    </div>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        )}

        {/* Cuentas SMTP Tab */}
        {puedeVer("smtp-accounts") && (
        <TabsContent value="smtp-accounts" className="mt-6">
          <SmtpAccountsSection adminMode />
        </TabsContent>
        )}

        {/* Email Logs Tab */}
        {puedeVer("email-logs") && (
        <TabsContent value="email-logs" className="mt-6">
          <EmailLogs />
        </TabsContent>
        )}
        
        {/* Notifications Tab (NEW) */}
        {puedeVer("notifications") && (
        <TabsContent value="notifications" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Enviar Notificación Push Dirigida</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <NotificationSenderForm />
              <p className="text-sm text-red-500 dark:text-red-400">
                Nota: Si no recibes la notificación, verifica que las claves `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL` y `FIREBASE_PROJECT_ID` estén configuradas correctamente en los secretos de Supabase y que hayas aceptado los permisos de notificación en tu navegador.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        )}
      </Tabs>
      )}

      {/* Edit/Add Address Dialog */}
      <Dialog open={isAddAddressDialogOpen || isEditAddressDialogOpen} onOpenChange={isEditAddressDialogOpen ? setIsEditAddressDialogOpen : setIsAddAddressDialogOpen}>
        <DialogContent className={cn(mobileDialogClass, "sm:max-w-[425px]")}>
          <DialogHeader>
            <DialogTitle>{editingAddress ? "Editar Dirección" : `Añadir Nueva Dirección de ${currentAddressType === 'shipping' ? 'Envío' : 'Facturación'}`}</DialogTitle>
          </DialogHeader>
          <AddressForm 
            initialData={editingAddress} 
            onSubmit={editingAddress ? (data) => handleEditAddress(editingAddress.id, data) : handleAddAddress} 
            onCancel={() => {
              setIsAddAddressDialogOpen(false);
              setIsEditAddressDialogOpen(false);
              setEditingAddress(undefined);
            }} 
            isSubmitting={
              (editingAddress ? (currentAddressType === 'shipping' ? updateShippingMutation.isPending : updateBillingMutation.isPending) : (currentAddressType === 'shipping' ? addShippingMutation.isPending : addBillingMutation.isPending))
            }
            showSede={currentAddressType === 'shipping'}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPage;