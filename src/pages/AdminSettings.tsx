"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2, Save } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

// Projects
import ProjectTable from "@/components/ProjectTable";
import ProjectForm, { ProjectFormValues } from "@/components/ProjectForm";
import { useProjects, useAddProject, useUpdateProject, useDeleteProject } from "@/hooks/use-projects";
import { Project } from "@/data/types";

// Account Managers
import AccountManagerTable from "@/components/AccountManagerTable";
import AccountManagerForm, { AccountManagerFormValues } from "@/components/AccountManagerForm";
import { useAccountManagers, useAddAccountManager, useUpdateAccountManager, useDeleteAccountManager } from "@/hooks/use-account-managers";
import { AccountManager } from "@/data/types";

// Shipping Addresses
import ShippingAddressTable from "@/components/ShippingAddressTable";
import ShippingAddressForm from "@/components/ShippingAddressForm";
import { useShippingAddresses, useAddShippingAddress, useUpdateShippingAddress, useDeleteShippingAddress, ShippingAddressFormData } from "@/hooks/use-shipping-addresses";
import { ShippingAddress } from "@/data/types";

// Billing Addresses
import BillingAddressTable from "@/components/BillingAddressTable";
import BillingAddressForm from "@/components/BillingAddressForm";
import { useBillingAddresses, useAddBillingAddress, useUpdateBillingAddress, useDeleteBillingAddress, BillingAddressFormData } from "@/hooks/use-billing-addresses";
import { BillingAddress } from "@/data/types";

// Users
import UserTable from "@/components/UserTable";
import InviteUserDialog, { InviteUserFormValues } from "@/components/InviteUserDialog";
import { useAllProfiles, useInviteUser, useUpdateProfile, useDeleteProfile, Profile } from "@/hooks/use-profiles";
import { useSession } from "@/components/SessionContextProvider";

// Email Templates
import { useEmailTemplates, useUpdateEmailTemplate } from "@/hooks/use-email-templates";
import { EmailTemplate } from "@/data/types";

const AdminSettings = () => {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Admin Settings</h1>
      <p className="text-lg text-muted-foreground mb-8">
        Manage core entities and settings for your application.
      </p>
      <Tabs defaultValue="projects" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="account-managers">Account Managers</TabsTrigger>
          <TabsTrigger value="shipping-addresses">Shipping</TabsTrigger>
          <TabsTrigger value="billing-addresses">Billing</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>
        <TabsContent value="projects"><ProjectsTab /></TabsContent>
        <TabsContent value="account-managers"><AccountManagersTab /></TabsContent>
        <TabsContent value="shipping-addresses"><ShippingAddressesTab /></TabsContent>
        <TabsContent value="billing-addresses"><BillingAddressesTab /></TabsContent>
        <TabsContent value="users"><UsersTab /></TabsContent>
        <TabsContent value="templates"><EmailTemplatesTab /></TabsContent>
      </Tabs>
    </div>
  );
};

// Projects Tab Component
const ProjectsTab = () => {
  const { data: projects, isLoading, error } = useProjects();
  const addMutation = useAddProject();
  const updateMutation = useUpdateProject();
  const deleteMutation = useDeleteProject();
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<Project | undefined>(undefined);

  const handleSubmit = async (values: ProjectFormValues) => {
    if (editingItem) {
      await updateMutation.mutateAsync({ id: editingItem.id, data: values });
    } else {
      await addMutation.mutateAsync(values);
    }
    setIsDialogOpen(false);
    setEditingItem(undefined);
  };

  if (isLoading) return <div className="flex justify-center mt-6"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (error) return <div className="text-red-500 mt-6">Error: {error.message}</div>;

  return (
    <div className="mt-6">
      <div className="flex justify-end mb-4">
        <Button onClick={() => { setEditingItem(undefined); setIsDialogOpen(true); }}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Project
        </Button>
      </div>
      <ProjectTable projects={projects || []} onEdit={(item) => { setEditingItem(item); setIsDialogOpen(true); }} onDelete={(id) => deleteMutation.mutate(id)} />
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent><DialogHeader><DialogTitle>{editingItem ? "Edit Project" : "Add New Project"}</DialogTitle></DialogHeader>
          <ProjectForm initialData={editingItem} onSubmit={handleSubmit} onCancel={() => setIsDialogOpen(false)} isSubmitting={addMutation.isPending || updateMutation.isPending} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Account Managers Tab Component
const AccountManagersTab = () => {
  const { data: managers, isLoading, error } = useAccountManagers();
  const addMutation = useAddAccountManager();
  const updateMutation = useUpdateAccountManager();
  const deleteMutation = useDeleteAccountManager();
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<AccountManager | undefined>(undefined);

  const handleSubmit = async (values: AccountManagerFormValues) => {
    if (editingItem) {
      await updateMutation.mutateAsync({ id: editingItem.id, data: values });
    } else {
      await addMutation.mutateAsync(values);
    }
    setIsDialogOpen(false);
    setEditingItem(undefined);
  };

  if (isLoading) return <div className="flex justify-center mt-6"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (error) return <div className="text-red-500 mt-6">Error: {error.message}</div>;

  return (
    <div className="mt-6">
      <div className="flex justify-end mb-4">
        <Button onClick={() => { setEditingItem(undefined); setIsDialogOpen(true); }}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Manager
        </Button>
      </div>
      <AccountManagerTable accountManagers={managers || []} onEdit={(item) => { setEditingItem(item); setIsDialogOpen(true); }} onDelete={(id) => deleteMutation.mutate(id)} />
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent><DialogHeader><DialogTitle>{editingItem ? "Edit Manager" : "Add New Manager"}</DialogTitle></DialogHeader>
          <AccountManagerForm initialData={editingItem} onSubmit={handleSubmit} onCancel={() => setIsDialogOpen(false)} isSubmitting={addMutation.isPending || updateMutation.isPending} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Shipping Addresses Tab Component
const ShippingAddressesTab = () => {
  const { data: addresses, isLoading, error } = useShippingAddresses();
  const addMutation = useAddShippingAddress();
  const updateMutation = useUpdateShippingAddress();
  const deleteMutation = useDeleteShippingAddress();
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<ShippingAddress | undefined>(undefined);

  const handleSubmit = async (values: ShippingAddressFormData) => {
    if (editingItem) {
      await updateMutation.mutateAsync({ id: editingItem.id, data: values });
    } else {
      await addMutation.mutateAsync(values);
    }
    setIsDialogOpen(false);
    setEditingItem(undefined);
  };

  if (isLoading) return <div className="flex justify-center mt-6"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (error) return <div className="text-red-500 mt-6">Error: {error.message}</div>;

  return (
    <div className="mt-6">
      <div className="flex justify-end mb-4">
        <Button onClick={() => { setEditingItem(undefined); setIsDialogOpen(true); }}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Address
        </Button>
      </div>
      <ShippingAddressTable addresses={addresses || []} onEdit={(item) => { setEditingItem(item); setIsDialogOpen(true); }} onDelete={(id) => deleteMutation.mutate(id)} />
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent><DialogHeader><DialogTitle>{editingItem ? "Edit Address" : "Add New Address"}</DialogTitle></DialogHeader>
          <ShippingAddressForm initialData={editingItem} onSubmit={handleSubmit} onCancel={() => setIsDialogOpen(false)} isSubmitting={addMutation.isPending || updateMutation.isPending} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Billing Addresses Tab Component
const BillingAddressesTab = () => {
  const { data: addresses, isLoading, error } = useBillingAddresses();
  const addMutation = useAddBillingAddress();
  const updateMutation = useUpdateBillingAddress();
  const deleteMutation = useDeleteBillingAddress();
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<BillingAddress | undefined>(undefined);

  const handleSubmit = async (values: BillingAddressFormData) => {
    if (editingItem) {
      await updateMutation.mutateAsync({ id: editingItem.id, data: values });
    } else {
      await addMutation.mutateAsync(values);
    }
    setIsDialogOpen(false);
    setEditingItem(undefined);
  };

  if (isLoading) return <div className="flex justify-center mt-6"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (error) return <div className="text-red-500 mt-6">Error: {error.message}</div>;

  return (
    <div className="mt-6">
      <div className="flex justify-end mb-4">
        <Button onClick={() => { setEditingItem(undefined); setIsDialogOpen(true); }}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Address
        </Button>
      </div>
      <BillingAddressTable addresses={addresses || []} onEdit={(item) => { setEditingItem(item); setIsDialogOpen(true); }} onDelete={(id) => deleteMutation.mutate(id)} />
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent><DialogHeader><DialogTitle>{editingItem ? "Edit Address" : "Add New Address"}</DialogTitle></DialogHeader>
          <BillingAddressForm initialData={editingItem} onSubmit={handleSubmit} onCancel={() => setIsDialogOpen(false)} isSubmitting={addMutation.isPending || updateMutation.isPending} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Users Tab Component
const UsersTab = () => {
  const { profile: currentUserProfile, loading: sessionLoading } = useSession();
  const { data: allProfiles, isLoading, error } = useAllProfiles();
  const inviteUserMutation = useInviteUser();
  const updateProfileMutation = useUpdateProfile();
  const deleteProfileMutation = useDeleteProfile();
  const [isInviteUserDialogOpen, setIsInviteUserDialogOpen] = React.useState(false);

  const handleInviteUser = async (data: InviteUserFormValues) => {
    await inviteUserMutation.mutateAsync(data);
    setIsInviteUserDialogOpen(false);
  };

  const handleUpdateUserRole = async (userId: string, newRole: Profile['role']) => {
    if (currentUserProfile?.id === userId) {
      toast.error("Cannot change your own role.", { description: "Please ask another administrator to change your role." });
      return;
    }
    await updateProfileMutation.mutateAsync({ id: userId, data: { role: newRole } });
  };

  const handleDeleteUser = async (userId: string) => {
    if (currentUserProfile?.id === userId) {
      toast.error("Cannot delete your own account.", { description: "Please ask another administrator to delete your account." });
      return;
    }
    await deleteProfileMutation.mutateAsync(userId);
  };

  if (sessionLoading || isLoading) return <div className="flex justify-center mt-6"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (error) return <div className="text-red-500 mt-6">Error loading users: {error.message}</div>;

  return (
    <div className="mt-6">
      <div className="flex justify-end mb-4">
        <Button onClick={() => setIsInviteUserDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" /> Invite New User
        </Button>
      </div>
      <UserTable
        users={allProfiles || []}
        onRoleChange={handleUpdateUserRole}
        onDelete={handleDeleteUser}
        currentUserId={currentUserProfile?.id}
        isUpdatingRole={updateProfileMutation.isPending}
        isDeletingUser={deleteProfileMutation.isPending}
      />
      <Dialog open={isInviteUserDialogOpen} onOpenChange={setIsInviteUserDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader><DialogTitle>Invite New User</DialogTitle></DialogHeader>
          <InviteUserDialog onSubmit={handleInviteUser} onCancel={() => setIsInviteUserDialogOpen(false)} isSubmitting={inviteUserMutation.isPending} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Email Templates Tab Component
const emailTemplateFormSchema = z.object({
  template_name: z.string().min(1, { message: "El nombre de la plantilla es obligatorio." }),
  subject_template: z.string().min(1, { message: "El asunto de la plantilla es obligatorio." }),
  body_template: z.string().min(1, { message: "El cuerpo de la plantilla es obligatorio." }),
});
type EmailTemplateFormValues = z.infer<typeof emailTemplateFormSchema>;
const availablePlaceholders = ["{{request.id}}", "{{request.status}}", "{{request.notes}}", "{{request.quote_url}}", "{{request.po_number}}", "{{request.po_url}}", "{{request.slip_url}}", "{{requester.full_name}}", "{{requester.email}}", "{{vendor.name}}", "{{vendor.contact_person}}", "{{vendor.email}}", "{{account_manager.full_name}}", "{{account_manager.email}}", "{{items_list}}", "{{cta_button}}", "{{message}}", "{{actor.full_name}}", "{{order.itemName}}", "{{order.id}}"];

const EmailTemplatesTab = () => {
  const { data: templates, isLoading, error } = useEmailTemplates();
  const updateTemplateMutation = useUpdateEmailTemplate();
  const [selectedTemplateId, setSelectedTemplateId] = React.useState<string | undefined>(undefined);
  const [currentTemplate, setCurrentTemplate] = React.useState<EmailTemplate | undefined>(undefined);
  const form = useForm<EmailTemplateFormValues>({
    resolver: zodResolver(emailTemplateFormSchema),
    defaultValues: { template_name: "", subject_template: "", body_template: "" },
  });

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
        form.reset({
          template_name: template.template_name,
          subject_template: template.subject_template,
          body_template: template.body_template,
        });
      }
    }
  }, [selectedTemplateId, templates, form]);

  const onSubmit = async (data: EmailTemplateFormValues) => {
    if (!currentTemplate) {
      toast.error("No hay plantilla seleccionada para actualizar.");
      return;
    }
    await updateTemplateMutation.mutateAsync({ id: currentTemplate.id, data });
  };

  if (isLoading) return <div className="flex justify-center mt-6"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (error) return <div className="text-red-500 mt-6">Error al cargar plantillas: {error.message}</div>;

  return (
    <div className="mt-6">
      <Card>
        <CardHeader><CardTitle>Seleccionar Plantilla</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
            <SelectTrigger className="w-full md:w-[300px]"><SelectValue placeholder="Selecciona una plantilla" /></SelectTrigger>
            <SelectContent>
              {templates?.map((template) => (
                <SelectItem key={template.id} value={template.id}>{template.template_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {currentTemplate && (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="template_name" render={({ field }) => (<FormItem><FormLabel>Nombre de la Plantilla</FormLabel><FormControl><Input {...field} disabled /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="subject_template" render={({ field }) => (<FormItem><FormLabel>Asunto</FormLabel><FormControl><Input {...field} disabled={updateTemplateMutation.isPending} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="body_template" render={({ field }) => (<FormItem><FormLabel>Cuerpo del Correo</FormLabel><FormControl><Textarea rows={10} {...field} disabled={updateTemplateMutation.isPending} /></FormControl><FormMessage /></FormItem>)} />
                <div className="space-y-2">
                  <FormLabel>Placeholders Disponibles</FormLabel>
                  <div className="flex flex-wrap gap-2">
                    {availablePlaceholders.map((p) => (<Badge key={p} variant="secondary" className="font-mono text-xs">{p}</Badge>))}
                  </div>
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
    </div>
  );
};

export default AdminSettings;