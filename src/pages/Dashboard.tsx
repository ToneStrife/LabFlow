"use client";

import React from "react";
import { useNavigate } from "react-router-dom";
import RequestList from "@/components/RequestList";
import PendingItemsList from "@/components/PendingItemsList";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2, Clock, Package, CheckCircle, ListTodo, LayoutDashboard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRequests } from "@/hooks/use-requests";
import { usePendingItems } from "@/hooks/use-pending-items";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Componente de Tarjeta de Resumen Compacta
interface SummaryCardProps {
  title: string;
  count: number;
  icon: React.ReactNode;
  colorClass: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ title, count, icon, colorClass }) => (
  <Card className="shadow-sm transition-all duration-300 hover:shadow-md border-l-4" style={{ borderColor: `var(--${colorClass})` }}>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1">
      <CardTitle className="text-xs font-medium text-muted-foreground truncate">{title}</CardTitle>
      <div className={cn("h-4 w-4", colorClass)}>{icon}</div>
    </CardHeader>
    <CardContent className="p-3 pt-0">
      <div className="text-xl font-bold">{count}</div>
    </CardContent>
  </Card>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const { data: requests, isLoading: isLoadingRequests, error } = useRequests();
  const { data: pendingItems, isLoading: isLoadingPending } = usePendingItems();

  const allRequests = requests || [];

  // Cálculos dinámicos
  const pendingRequestsCount = allRequests.filter(req => req.status === "Pending").length;
  const totalPendingItemsCount = pendingItems?.reduce((sum, item) => sum + item.quantityPending, 0) || 0;
  const receivedRequestsCount = allRequests.filter(req => req.status === "Received").length;

  if (isLoadingRequests || isLoadingPending) {
    return (
      <div className="container mx-auto py-8 flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin mr-2" /> Cargando Panel de Control...
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 text-red-600">
        Error al cargar los datos del panel: {error.message}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Panel de Control</h1>
          <p className="text-muted-foreground">Resumen del estado del laboratorio y suministros.</p>
        </div>
        <Button onClick={() => navigate("/new-request")} size="lg" className="shadow-md">
          <PlusCircle className="mr-2 h-5 w-5" /> Nueva Solicitud
        </Button>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard 
          title="Solicitudes Pendientes" 
          count={pendingRequestsCount} 
          icon={<Clock className="text-orange-500" />} 
          colorClass="orange-500" 
        />
        <SummaryCard 
          title="Artículos por Recibir" 
          count={totalPendingItemsCount} 
          icon={<Package className="text-primary" />} 
          colorClass="primary" 
        />
        <SummaryCard 
          title="Solicitudes Completadas" 
          count={receivedRequestsCount} 
          icon={<CheckCircle className="text-green-600" />} 
          colorClass="green-600" 
        />
      </div>

      <Tabs defaultValue="pending-items" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="pending-items" className="flex items-center gap-2">
            <ListTodo className="h-4 w-4" /> Artículos Pendientes
          </TabsTrigger>
          <TabsTrigger value="all-requests" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" /> Todas las Solicitudes
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="pending-items" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Seguimiento de Artículos</h2>
            <p className="text-sm text-muted-foreground">Mostrando ítems de solicitudes en estado 'Pedido'.</p>
          </div>
          <PendingItemsList />
        </TabsContent>
        
        <TabsContent value="all-requests" className="space-y-4">
          <h2 className="text-xl font-bold">Historial de Solicitudes</h2>
          <RequestList />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Dashboard;