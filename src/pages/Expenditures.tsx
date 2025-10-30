"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2, DollarSign, Download } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useExpenditures, useAddExpenditure, useUpdateExpenditure, useDeleteExpenditure, ExpenditureFormValues, useUnaccountedReceivedRequests } from "@/hooks/use-expenditures";
import { useProjects } from "@/hooks/use-projects";
import ExpenditureTable from "@/components/ExpenditureTable";
import ExpenditureForm from "@/components/ExpenditureForm";
import ImportExpendituresDialog from "@/components/ImportExpendituresDialog"; // Importar el nuevo diálogo
import { Expenditure } from "@/data/types";

const Expenditures = () => {
  const { data: expenditures, isLoading: isLoadingExpenditures, error: expendituresError } = useExpenditures();
  const { data: projects, isLoading: isLoadingProjects } = useProjects();
  const { data: unaccountedRequests, isLoading: isLoadingUnaccountedRequests } = useUnaccountedReceivedRequests(); // Nuevo hook
  
  const addExpenditureMutation = useAddExpenditure();
  const updateExpenditureMutation = useUpdateExpenditure();
  const deleteExpenditureMutation = useDeleteExpenditure();

  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [editingExpenditure, setEditingExpenditure] = React.useState<Expenditure | undefined>(undefined);
  const [isImportDialogOpen, setIsImportDialogOpen] = React.useState(false); // Nuevo estado para el diálogo de importación

  const handleAddExpenditure = async (data: ExpenditureFormValues) => {
    await addExpenditureMutation.mutateAsync(data);
    setIsAddDialogOpen(false);
  };

  const handleEditExpenditure = async (id: string, data: ExpenditureFormValues) => {
    await updateExpenditureMutation.mutateAsync({ id, data });
    setIsEditDialogOpen(false);
    setEditingExpenditure(undefined);
  };

  const handleDeleteExpenditure = async (id: string) => {
    await deleteExpenditureMutation.mutateAsync(id);
  };

  const openEditDialog = (expenditure: Expenditure) => {
    setEditingExpenditure(expenditure);
    setIsEditDialogOpen(true);
  };

  const isLoading = isLoadingExpenditures || isLoadingProjects || isLoadingUnaccountedRequests;

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin mr-2" /> Cargando Gastos...
      </div>
    );
  }

  if (expendituresError) {
    return <div className="container mx-auto py-8 text-red-600">Error: {expendituresError.message}</div>;
  }
  
  // Calcular el total de gastos
  const totalSpent = expenditures?.reduce((sum, exp) => sum + exp.amount, 0) || 0;
  const unaccountedCount = unaccountedRequests?.length || 0;

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <h1 className="text-3xl font-bold">Gestión de Gastos</h1>
        <div className="flex space-x-2">
          {unaccountedCount > 0 && (
            <Button 
              variant="secondary" 
              onClick={() => setIsImportDialogOpen(true)}
              disabled={isLoadingUnaccountedRequests}
            >
              <Download className="mr-2 h-4 w-4" /> Importar ({unaccountedCount})
            </Button>
          )}
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Registrar Nuevo Gasto
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Registrar Nuevo Gasto</DialogTitle>
              </DialogHeader>
              <ExpenditureForm
                onSubmit={handleAddExpenditure}
                onCancel={() => setIsAddDialogOpen(false)}
                isSubmitting={addExpenditureMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <p className="text-lg text-muted-foreground mb-8">
        Rastrea los gastos incurridos, vinculándolos a proyectos y solicitudes específicas.
      </p>
      
      <Card className="mb-8">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Gasto Total Registrado</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">€{totalSpent.toFixed(2)}</div>
        </CardContent>
      </Card>

      <ExpenditureTable
        expenditures={expenditures || []}
        projects={projects}
        onEdit={openEditDialog}
        onDelete={handleDeleteExpenditure}
      />

      {/* Edit Expenditure Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Gasto</DialogTitle>
          </DialogHeader>
          {editingExpenditure && (
            <ExpenditureForm
              initialData={editingExpenditure}
              onSubmit={(data) => handleEditExpenditure(editingExpenditure.id, data)}
              onCancel={() => setIsEditDialogOpen(false)}
              isSubmitting={updateExpenditureMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
      
      {/* Import Expenditures Dialog */}
      {unaccountedRequests && (
        <ImportExpendituresDialog
          isOpen={isImportDialogOpen}
          onOpenChange={setIsImportDialogOpen}
          requests={unaccountedRequests}
        />
      )}
    </div>
  );
};

export default Expenditures;