"use client";

import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { EmailTemplate } from "@/data/types";
import { Badge } from "@/components/ui/badge";

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
  const isLoading = isLoadingManagers || isLoadingProjects || isLoadingUsers || isLoadingTemplates || sessionLoading;
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
        Manage account managers, projects, users, and email templates from one place.
      </p>

      <Tabs defaultValue="account-managers" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="account-managers">Account Managers</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="email-templates">Email Templates</TabsTrigger>
        </TabsList>

        {/* Account Managers Tab */}
        <TabsContent value="account-managers" className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Account Managers</h2>
            <Dialog open={isAddManagerDialogOpen} onOpenChange={setIsAddManagerDialogOpen}>
              <DialogTrigger asChild><Button><PlusCircle className="mr-2 h-4 w-4" /> Add New Manager</Button></DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader><DialogTitle>Add New Account Manager</DialogTitle></DialogHeader>
                <AccountManagerForm onSubmit={handleAddManager} onCancel={() => setIsAddManagerDialogOpen(false)} isSubmitting={addAccountManagerMutation.isPending} />
              </DialogContent>
            </Dialog>
          </div>
          <AccountManagerTable managers={accountManagers || []} onEdit={openEditManagerDialog} onDelete={handleDeleteManager} />
          <Dialog open={isEditManagerDialogOpen} onOpenChange={setIsEditManagerDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader><DialogTitle>Edit Account Manager</DialogTitle></DialogHeader>
              {editingManager && <AccountManagerForm initialData={editingManager} onSubmit={(data) => handleEditManager(editingManager.id, data)} onCancel={() => setIsEditManagerDialogOpen(false)} isSubmitting={updateAccountManagerMutation.isPending} />}
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Projects Tab */}
        <TabsContent value="projects" className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Projects</h2>
            <Dialog open={isAddProjectDialogOpen} onOpenChange={setIsAddProjectDialogOpen}>
              <DialogTrigger asChild><Button><PlusCircle className="mr-2 h-4 w-4" /> Add New Project</Button></DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader><DialogTitle>Add New Project</DialogTitle></DialogHeader>
                <ProjectForm onSubmit={handleAddProject} onCancel={() => setIsAddProjectDialogOpen(false)} isSubmitting={addProjectMutation.isPending} />
              </DialogContent>
            </Dialog>
          </div>
          <ProjectTable projects={projects || []} onEdit={openEditProjectDialog} onDelete={handleDeleteProject} />
          <Dialog open={isEditProjectDialogOpen} onOpenChange={setIsEditProjectDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader><DialogTitle>Edit Project</DialogTitle></DialogHeader>
              {editingProject && <ProjectForm initialData={editingProject} onSubmit={(data) => handleEditProject(editingProject.id, data)} onCancel={() => setIsEditProjectDialogOpen(false)} isSubmitting={updateProjectMutation.isPending} />}
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">User Management</h2>
            <Dialog open={isInviteUserDialogOpen} onOpenChange={setIsInviteUserDialogOpen}>
              <DialogTrigger asChild><Button><PlusCircle className="mr-2 h-4 w-4" /> Invite New User</Button></DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader><DialogTitle>Invite New User</DialogTitle></DialogHeader>
                <InviteUserDialog onSubmit={handleInviteUser} onCancel={() => setIsInviteUserDialogOpen(false)} isSubmitting={inviteUserMutation.isPending} />
              </DialogContent>
            </Dialog>
          </div>
          <UserTable users={allProfiles || []} onRoleChange={handleUpdateUserRole} onDelete={handleDeleteUser} currentUserId={currentUserProfile?.id} isUpdatingRole={updateProfileMutation.isPending} isDeletingUser={deleteProfileMutation.isPending} />
        </TabsContent>

        {/* Email Templates Tab */}
        <TabsContent value="email-templates" className="mt-6">
          <Card>
            <CardHeader><CardTitle>Select & Edit Template</CardTitle></CardHeader>
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
    </div>
  );
};

export default AdminPage;