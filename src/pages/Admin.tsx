"use client";

import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2, MapPin, DollarSign, Users, Briefcase, Shield, Mail } from "lucide-react"; // Añadir iconos para pestañas
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

// Account Managers imports
import AccountManagerTable from "@/components/AccountManagerTable";
import AccountManagerForm, { AccountManagerFormValues } from "@/components/AccountManagerForm";
import { useAccountManagers, useAddAccountManager, useUpdateAccountManager, useDeleteAccountManager } from "@/hooks/use-account-managers";
import { AccountManager } from "@/data/types";

// Projects imports
import ProjectTable from "@/components/ProjectTable";
import ProjectForm, { ProjectFormValues } from "@/components/ProjectForm";
import { useProjects, useAddProject, useUpdateProject, useDeleteProject } from "@/hooks/use-projects";
import { Project } from "@/data/types";

// Users imports
import UserTable from "@/components/UserTable";
import InviteUserDialog, { InviteUserFormValues } from "@/components/InviteUserDialog";
import { useAllProfiles, useInviteUser, useUpdateProfile, useDeleteProfile, Profile } from "@/hooks/use-profiles";
import { useSession } from "@/components/SessionContextProvider";

// Email Templates imports
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

// Address imports
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


// --- Email Template Form Schema and Placeholders ---
const emailTemplateFormSchema = z.object({
  template_name: z.string().min(1, { message: "El nombre de la plantilla es obligatorio." }),
  subject_template: z.string().min(1, { message: "El asunto de la plantilla es obligatorio." }),
  body_template: z.string().min(1, { message: "El cuerpo de la plantilla es obligatorio." }),
});
type EmailTemplateFormValues = z.infer<typeof emailTemplateFormSchema>;

const availablePlaceholders = [
  "{{request.id}}", "{{request.status}}", "{{request.notes}}", "{{request.quote_url}}",
  "{{request.po_number}}", "{{request.po_url}}", "{{request.slip_url}}", "{{requester.full_name}}",
  "{{requester.email}}", "{{vendor.name}}", "{{vendor.contact_person}}", "{{vendor.email}}",
  "{{account_manager.full_name}}", "{{account_manager.email}}", "{{items_list}}", "{{cta_button}}",
  "{{message}}", "{{actor.full_name}}", "{{order.itemName}}", "{{order.id}}",
  "{{shipping_address}}", "{{billing_address}}", // Nuevos placeholders de dirección
];

// --- Main Admin Page Component ---
const AdminPage = () => {
  // --- Hooks for Account Managers ---
  const { data: accountManagers, isLoading: isLoadingManagers, error: managersError } = useAccountManagers();
  const addAccountManagerMutation = useAddAccountManager();
  const updateAccountManagerMutation = useUpdateAccountManager();
  const deleteAccountManagerMutation = useDeleteAccountManager();
  const [isAddManagerDialogOpen, setIsAddManagerDialogOpen] = React.useState(false);
  const [isEditManagerDialogOpen, setIsEditManagerDialogOpen] = React.useState(false);
  const [editingManager, setEditingManager] = React.useState<AccountManager | undefined>(undefined);

  // --- Hooks for Projects ---
  const { data: projects, isLoading: isLoadingProjects, error: projectsError } = useProjects();
  const addProjectMutation = useAddProject();
  const updateProjectMutation = useUpdateProject();
  const deleteProjectMutation = useDeleteProject();
  const [isAddProjectDialogOpen, setIsAddProjectDialogOpen] = React.useState(false);
  const [isEditProjectDialogOpen, setIsEditProjectDialogOpen] = React.useState(false);
  const [editingProject, setEditingProject] = React.useState<Project | undefined>(undefined);

  // --- Hooks for Users ---
  const { profile: currentUserProfile, loading: sessionLoading } = useSession();
  const { data: allProfiles, isLoading: isLoadingUsers, error: usersError } = useAllProfiles();
  const inviteUserMutation = useInviteUser();
  const updateProfileMutation = useUpdateProfile();
  const deleteProfileMutation = useDeleteProfile();
  const [isInviteUserDialogOpen, setIsInviteUserDialogOpen] = React.useState(false);

  // --- Hooks for Email Templates ---
  const { data: templates, isLoading: isLoadingTemplates, error: templatesError } = useEmailTemplates();
  const updateTemplateMutation = useUpdateEmailTemplate();
  const [selectedTemplateId, setSelectedTemplateId] = React.useState<string | undefined>(undefined);
  const [currentTemplate, setCurrentTemplate] = React.useState<EmailTemplate | undefined>(undefined);
  const emailTemplateForm = useForm<EmailTemplateFormValues>({
    resolver: zodResolver(emailTemplateFormSchema),
    defaultValues: { template_name: "", subject_template: "", body_template: "" },
  });

  // --- Hooks for Addresses ---
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

  // --- Handlers for Account Managers ---
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

  // --- Handlers for Projects ---
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

  // --- Handlers for Users ---
  const handleInviteUser = async (data: InviteUserFormValues) => {
    await inviteUserMutation.mutateAsync(data);
    setIsInviteUserDialogOpen(false);
  };
  const handleUpdateUserRole = async (userId: string, newRole: Profile['role']) => {
    if (currentUserProfile?.id === userId) {
      toast.error("Cannot change your own role.");
      return;
    }
    await updateProfileMutation.mutateAsync({ id: userId, data: { role: newRole } });
  };
  const handleDeleteUser = async (userId: string) => {
    if (currentUserProfile?.id === userId) {
      toast.error("Cannot delete your own account.");
      return;
    }
    await deleteProfileMutation.mutateAsync(userId);
  };

  // --- Handlers for Addresses ---
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


  // --- Handlers and Effects for Email Templates ---
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

  // --- Loading and Error States ---
  const isLoading = isLoadingManagers || isLoadingProjects || isLoadingUsers || isLoadingTemplates || sessionLoading || isLoadingShipping || isLoadingBilling;
  const error = managersError || projectsError || usersError || templatesError;

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin mr-2" /> Loading Admin Panel...
      </div>
    );
  }

  if (error) {
    return <div className="container mx-auto py-8 text-red-600">Error: {error.message}</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Admin Panel</h1>
      <p className="text-lg text-muted-foreground mb-8">
        Manage account managers, projects, users, addresses, and email templates.
      </p>

      <Tabs defaultValue="users" className="w-full">
        {/* Tabs List: Use flex-wrap and overflow-x-auto for responsiveness */}
        <TabsList className="flex flex-wrap h-auto p-1 bg-muted/50 border rounded-lg overflow-x-auto w-full justify-start">
          <TabsTrigger value="users" className="flex items-center gap-2 px-4 py-2">
            <Shield className="h-4 w-4" /> Users
          </TabsTrigger>
          <TabsTrigger value="account-managers" className="flex items-center gap-2 px-4 py-2">
            <Users className="h-4 w-4" /> Account Managers
          </TabsTrigger>
          <TabsTrigger value="projects" className="flex items-center gap-2 px-4 py-2">
            <Briefcase className="h-4 w-4" /> Projects
          </TabsTrigger>
          <TabsTrigger value="addresses" className="flex items-center gap-2 px-4 py-2">
            <MapPin className="h-4 w-4" /> Addresses
          </TabsTrigger>
          <TabsTrigger value="email-templates" className="flex items-center gap-2 px-4 py-2">
            <Mail className="h-4 w-4" /> Templates
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-xl">User Management</CardTitle>
              <Dialog open={isInviteUserDialogOpen} onOpenChange={setIsInviteUserDialogOpen}>
                <DialogTrigger asChild><Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Invite New User</Button></DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader><DialogTitle>Invite New User</DialogTitle></DialogHeader>
                  <InviteUserDialog onSubmit={handleInviteUser} onCancel={() => setIsInviteUserDialogOpen(false)} isSubmitting={inviteUserMutation.isPending} />
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <UserTable users={allProfiles || []} onRoleChange={handleUpdateUserRole} onDelete={handleDeleteUser} currentUserId={currentUserProfile?.id} isUpdatingRole={updateProfileMutation.isPending} isDeletingUser={deleteProfileMutation.isPending} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Account Managers Tab */}
        <TabsContent value="account-managers" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-xl">Account Managers</CardTitle>
              <Dialog open={isAddManagerDialogOpen} onOpenChange={setIsAddManagerDialogOpen}>
                <DialogTrigger asChild><Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Add New Manager</Button></DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader><DialogTitle>Add New Account Manager</DialogTitle></DialogHeader>
                  <AccountManagerForm onSubmit={handleAddManager} onCancel={() => setIsAddManagerDialogOpen(false)} isSubmitting={addAccountManagerMutation.isPending} />
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <AccountManagerTable managers={accountManagers || []} onEdit={openEditManagerDialog} onDelete={handleDeleteManager} />
            </CardContent>
          </Card>
          <Dialog open={isEditManagerDialogOpen} onOpenChange={setIsEditManagerDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader><DialogTitle>Edit Account Manager</DialogTitle></DialogHeader>
              {editingManager && <AccountManagerForm initialData={editingManager} onSubmit={(data) => handleEditManager(editingManager.id, data)} onCancel={() => setIsEditManagerDialogOpen(false)} isSubmitting={updateAccountManagerMutation.isPending} />}
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Projects Tab */}
        <TabsContent value="projects" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-xl">Projects</CardTitle>
              <Dialog open={isAddProjectDialogOpen} onOpenChange={setIsAddProjectDialogOpen}>
                <DialogTrigger asChild><Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Add New Project</Button></DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader><DialogTitle>Add New Project</DialogTitle></DialogHeader>
                  <ProjectForm onSubmit={handleAddProject} onCancel={() => setIsAddProjectDialogOpen(false)} isSubmitting={addProjectMutation.isPending} />
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <ProjectTable projects={projects || []} onEdit={openEditProjectDialog} onDelete={handleDeleteProject} />
            </CardContent>
          </Card>
          <Dialog open={isEditProjectDialogOpen} onOpenChange={setIsEditProjectDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader><DialogTitle>Edit Project</DialogTitle></DialogHeader>
              {editingProject && <ProjectForm initialData={editingProject} onSubmit={(data) => handleEditProject(editingProject.id, data)} onCancel={() => setIsEditProjectDialogOpen(false)} isSubmitting={updateProjectMutation.isPending} />}
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Addresses Tab */}
        <TabsContent value="addresses" className="mt-6 space-y-8">
          {/* Shipping Addresses */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-xl flex items-center"><MapPin className="mr-2 h-5 w-5" /> Shipping Addresses</CardTitle>
              <Button size="sm" onClick={() => openAddAddressDialog('shipping')}><PlusCircle className="mr-2 h-4 w-4" /> Add Shipping Address</Button>
            </CardHeader>
            <CardContent>
              <AddressTable 
                addresses={shippingAddresses || []} 
                onEdit={(addr) => openEditAddressDialog(addr, 'shipping')} 
                onDelete={deleteShippingMutation.mutateAsync} 
              />
            </CardContent>
          </Card>

          {/* Billing Addresses */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-xl flex items-center"><DollarSign className="mr-2 h-5 w-5" /> Billing Addresses</CardTitle>
              <Button size="sm" onClick={() => openAddAddressDialog('billing')}><PlusCircle className="mr-2 h-4 w-4" /> Add Billing Address</Button>
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

        {/* Email Templates Tab */}
        <TabsContent value="email-templates" className="mt-6">
          <Card>
            <CardHeader><CardTitle className="text-xl">Email Templates</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <Select value={selectedTemplateId} onValueChange={handleTemplateChange}>
                <SelectTrigger className="w-full md:w-[300px]"><SelectValue placeholder="Select a template" /></SelectTrigger>
                <SelectContent>{templates?.map((t) => <SelectItem key={t.id} value={t.id}>{t.template_name}</SelectItem>)}</SelectContent>
              </Select>
              {currentTemplate && (
                <Form {...emailTemplateForm}>
                  <form onSubmit={emailTemplateForm.handleSubmit(onTemplateSubmit)} className="space-y-4">
                    <FormField control={emailTemplateForm.control} name="template_name" render={({ field }) => <FormItem><FormLabel>Template Name</FormLabel><FormControl><Input {...field} disabled={updateTemplateMutation.isPending} /></FormControl><FormMessage /></FormItem>} />
                    <FormField control={emailTemplateForm.control} name="subject_template" render={({ field }) => <FormItem><FormLabel>Subject</FormLabel><FormControl><Input {...field} disabled={updateTemplateMutation.isPending} /></FormControl><FormMessage /></FormItem>} />
                    <FormField control={emailTemplateForm.control} name="body_template" render={({ field }) => <FormItem><FormLabel>Email Body</FormLabel><FormControl><Textarea rows={10} {...field} disabled={updateTemplateMutation.isPending} /></FormControl><FormMessage /></FormItem>} />
                    <div className="space-y-2">
                      <FormLabel>Available Placeholders</FormLabel>
                      <div className="flex flex-wrap gap-2">{availablePlaceholders.map((p) => <Badge key={p} variant="secondary" className="font-mono text-xs">{p}</Badge>)}</div>
                    </div>
                    <div className="flex justify-end pt-4">
                      <Button type="submit" disabled={updateTemplateMutation.isPending}>
                        {updateTemplateMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : <><Save className="mr-2 h-4 w-4" /> Save Template</>}
                      </Button>
                    </div>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit/Add Address Dialog */}
      <Dialog open={isAddAddressDialogOpen || isEditAddressDialogOpen} onOpenChange={isEditAddressDialogOpen ? setIsEditAddressDialogOpen : setIsAddAddressDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingAddress ? "Edit Address" : `Add New ${currentAddressType === 'shipping' ? 'Shipping' : 'Billing'} Address`}</DialogTitle>
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
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPage;