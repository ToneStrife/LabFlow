"use client";

import React from "react";
import { useNavigate } from "react-router-dom";
import RequestList from "@/components/RequestList";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2, Clock, Package, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRequests } from "@/hooks/use-requests";
import { cn } from "@/lib/utils";

// Componente de Tarjeta de Resumen Compacta
interface SummaryCardProps {
  title: string;
  count: number;
  icon: React.ReactNode;
  colorClass: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ title, count, icon, colorClass }) => (
  <Card className="shadow-lg transition-all duration-300 hover:shadow-xl border-l-4" style={{ borderColor: `var(--${colorClass})` }}>
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
  const { data: requests, isLoading, error } = useRequests();

  const allRequests = requests || [];

  // Calculate dynamic counts based on fetched requests
  const pendingRequestsCount = allRequests.filter(req => req.status === "Pending").length;
  const orderedItemsCount = allRequests
    .filter(req => req.status === "Ordered")
    .reduce((total, req) => total + (req.items?.length || 0), 0);
  const receivedItemsCount = allRequests
    .filter(req => req.status === "Received")
    .reduce((total, req) => total + (req.items?.length || 0), 0);

  if (isLoading) {
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
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <h1 className="text-3xl font-bold">Panel de Control</h1>
        <div className="flex space-x-2">
          {/* Botón de prueba de notificación eliminado */}
          <Button onClick={() => navigate("/new-request")}>
            <PlusCircle className="mr-2 h-4 w-4" /> Nueva Solicitud
          </Button>
        </div>
      </div>
      
      {/* Summary Cards: Usar grid-cols-3 en todas las vistas para máxima compacidad */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <SummaryCard 
          title="Pendientes" 
          count={pendingRequestsCount} 
          icon={<Clock className="text-orange-500" />} 
          colorClass="orange-500" 
        />
        <SummaryCard 
          title="Pedidos" 
          count={orderedItemsCount} 
          icon={<Package className="text-primary" />} 
          colorClass="primary" 
        />
        <SummaryCard 
          title="Recibidos" 
          count={receivedItemsCount} 
          icon={<CheckCircle className="text-green-600" />} 
          colorClass="green-600" 
        />
      </div>

      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">Solicitudes Recientes</h2>
        <RequestList />
      </div>
    </div>
  );
};

export default Dashboard;