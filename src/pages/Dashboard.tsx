"use client";

import React from "react";
import { useNavigate } from "react-router-dom";
import RequestList from "@/components/RequestList";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2, Clock, Package, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRequests } from "@/hooks/use-requests";

// Componente de Tarjeta de Resumen Compacta
interface SummaryCardProps {
  title: string;
  count: number;
  icon: React.ReactNode;
  color: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ title, count, icon, color }) => (
  <Card className="shadow-sm transition-shadow hover:shadow-md">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3">
      <CardTitle className="text-xs font-medium text-muted-foreground">{title}</CardTitle>
      <div className={`h-4 w-4 text-${color}`}>{icon}</div>
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
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Panel de Control</h1>
      <p className="text-lg text-muted-foreground mb-8">
        Bienvenido a tu Panel de Gestión de Pedidos de Laboratorio.
      </p>
      
      {/* Redesigned Summary Cards (Smaller) */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <SummaryCard 
          title="Solicitudes Pendientes" 
          count={pendingRequestsCount} 
          icon={<Clock />} 
          color="orange-500" 
        />
        <SummaryCard 
          title="Artículos Pedidos" 
          count={orderedItemsCount} 
          icon={<Package />} 
          color="blue-500" 
        />
        <SummaryCard 
          title="Artículos Recibidos" 
          count={receivedItemsCount} 
          icon={<CheckCircle />} 
          color="green-500" 
        />
      </div>

      <div className="mt-12">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Solicitudes Recientes</h2>
          <Button onClick={() => navigate("/new-request")}>
            <PlusCircle className="mr-2 h-4 w-4" /> Nueva Solicitud
          </Button>
        </div>
        <RequestList />
      </div>
    </div>
  );
};

export default Dashboard;