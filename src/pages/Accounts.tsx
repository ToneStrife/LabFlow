"use client";

import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

// Account Managers components and hooks
import AccountManagerTable from "@/components/AccountManagerTable";
import AccountManagerForm, { AccountManagerFormValues } from "@/components/AccountManagerForm";
import { useAccountManagers, useAddAccountManager, useUpdateAccountManager, useDeleteAccountManager } from "@/hooks/use-account-managers";
import { AccountManager } from "@/data/types"; // Importar el tipo AccountManager

// Projects components and hooks
import ProjectTable from "@/components/ProjectTable";
import ProjectForm, { ProjectFormValues } from "@/components/ProjectForm";
import { useProjects, useAddProject, useUpdateProject, useDeleteProject } from "@/hooks/use-projects";
import { Project } from "@/data/types"; // Importar el tipo Project

const Accounts = () => {
  // Account Managers state and hooks
  const { data: accountManagers, isLoading: isLoadingManagers, error: managersError } = useAccountManagers();
  const addAccountManagerMutation = useAddAccountManager();
  const updateAccountManagerMutation = useUpdateAccountManager();
  const deleteAccountManagerMutation = useDeleteAccountManager();

  const [isAddManagerDialogOpen, setIsAddManagerDialogOpen] = React.useState(false);
  const [isEditManagerDialogOpen, setIsEditManagerDialogOpen] = React.useState(false);
  const [editingManager, setEditingManager] = React.useState<AccountManager | undefined>(undefined);

  // Projects state and hooks
  const { data: projects, isLoading: isLoadingProjects, error: projectsError } = useProjects();
  const addProjectMutation = useAddProject();
  const updateProjectMutation = useUpdateProject();
  const deleteProjectMutation = useDeleteProject();

  const [isAddProjectDialogOpen, setIsAddProjectDialogOpen] = React.useState(false);
  const [isEditProjectDialogOpen, setIsEditProjectDialogOpen] = React.useState(false);
  const [editingProject, setEditingProject] = React.useState<Project | undefined>(undefined);

  // --- Account Manager Handlers ---
  const handleAddManager = async (newManagerData: AccountManagerFormValues) => {
    await addAccountManagerMutation.mutateAsync(newManagerData);
    setIsAddManagerDialogOpen(false);
  };

  const handleEditManager = async (managerId: string, updatedData: AccountManagerFormValues) => {
    await updateAccountManagerMutation.mutateAsync({ id: managerId, data: updatedData });
    setIsEditManagerDialogOpen(false);
    setEditingManager(undefined);
  };

  const handleDeleteManager = async (managerId: string) => {
    await deleteAccountManagerMutation.mutateAsync(managerId);
  };

  const openEditManagerDialog = (manager: AccountManager) => {
    setEditingManager(manager);
    setIsEditManagerDialogOpen(true);
  };

  // --- Project Handlers ---
  const handleAddProject = async (newProjectData: ProjectFormValues) => {
    await addProjectMutation.mutateAsync(newProjectData);
    setIsAddProjectDialogOpen(false);
  };

  const handleEditProject = async (projectId: string, updatedData: ProjectFormValues) => {
    await updateProjectMutation.mutateAsync({ id: projectId, data: updatedData });
    setIsEditProjectDialogOpen(false);
    setEditingProject(undefined);
  };

  const handleDeleteProject = async (projectId: string) => {
    await deleteProjectMutation.mutateAsync(projectId);
  };

  const openEditProjectDialog = (project: Project) => {
    setEditingProject(project);
    setIsEditProjectDialogOpen(true);
  };

  if (isLoadingManagers || isLoadingProjects) {
    return (
      <div className="container mx-auto py-8 flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin mr-2" /> Loading Accounts...
      </div>
    );
  }

  if (managersError) {
    return (
      <div className="container mx-auto py-8 text-red-600">
        Error loading account managers: {managersError.message}
      </div>
    );
  }

  if (projectsError) {
    return (
      <div className="container mx-auto py-8 text-red-600">
        Error loading projects: {projectsError.message}
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Accounts Management</h1>
      <p className="text-lg text-muted-foreground mb-8">
        Manage your Account Managers and Projects here.
      </p>

      <Tabs defaultValue="account-managers" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="account-managers">Account Managers</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
        </TabsList>

        <TabsContent value="account-managers" className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Account Managers</h2>
            <Dialog open={isAddManagerDialogOpen} onOpenChange={setIsAddManagerDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add New Manager
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Add New Account Manager</DialogTitle>
                </DialogHeader>
                <AccountManagerForm
                  onSubmit={handleAddManager}
                  onCancel={() => setIsAddManagerDialogOpen(false)}
                  isSubmitting={addAccountManagerMutation.isPending}
                />
              </DialogContent>
            </Dialog>
          </div>
          <AccountManagerTable
            managers={accountManagers || []}
            onEdit={openEditManagerDialog}
            onDelete={handleDeleteManager}
          />

          {/* Edit Account Manager Dialog */}
          <Dialog open={isEditManagerDialogOpen} onOpenChange={setIsEditManagerDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Edit Account Manager</DialogTitle>
              </DialogHeader>
              {editingManager && (
                <AccountManagerForm
                  initialData={editingManager}
                  onSubmit={(data) => handleEditManager(editingManager.id, data)}
                  onCancel={() => setIsEditManagerDialogOpen(false)}
                  isSubmitting={updateAccountManagerMutation.isPending}
                />
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="projects" className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Projects</h2>
            <Dialog open={isAddProjectDialogOpen} onOpenChange={setIsAddProjectDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add New Project
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Add New Project</DialogTitle>
                </DialogHeader>
                <ProjectForm
                  onSubmit={handleAddProject}
                  onCancel={() => setIsAddProjectDialogOpen(false)}
                  isSubmitting={addProjectMutation.isPending}
                />
              </DialogContent>
            </Dialog>
          </div>
          <ProjectTable
            projects={projects || []}
            onEdit={openEditProjectDialog}
            onDelete={handleDeleteProject}
          />

          {/* Edit Project Dialog */}
          <Dialog open={isEditProjectDialogOpen} onOpenChange={setIsEditProjectDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Edit Project</DialogTitle>
              </DialogHeader>
              {editingProject && (
                <ProjectForm
                  initialData={editingProject}
                  onSubmit={(data) => handleEditProject(editingProject.id, data)}
                  onCancel={() => setIsEditProjectDialogOpen(false)}
                  isSubmitting={updateProjectMutation.isPending}
                />
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Accounts;