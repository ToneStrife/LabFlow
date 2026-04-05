"use client";

import React from "react";
import { useNavigate } from "react-router-dom";
import RequestList from "@/components/RequestList";
import PendingItemsList from "@/components/PendingItemsList";
import { Button } from "@/components/ui/button";
import { 
  PlusCircle, 
  Loader2, 
  Clock, 
  Package, 
  CheckCircle, 
  ListTodo, 
  LayoutDashboard,
  FileSearch,
  FileText,
  CreditCard,
  Truck
} from "lucide-react";
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
  description?: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ title, count, icon, colorClass, description }) => (
  <Card className="shadow-sm transition-all duration-300 hover:shadow-md border-l-4" style={{ borderColor: `var(--${colorClass})` }}>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1">
      <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider truncate">{title}</CardTitle>
      <div className={cn("h-4 w-4", colorClass)}>{icon}</div>
    </CardHeader>
    <CardContent className="p-3 pt-0">
      <div className="text-2xl font-bold">{count}</div>
      {description && <p className="text-[10px] text-muted-foreground mt-1 truncate">{description}</p>}
    </CardContent>
  </Card>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const { data: requests, isLoading: isLoadingRequests, error } = useRequests();
  const { data: pendingItems, isLoading: isLoadingPending } = usePendingItems();

  const allRequests = requests || [];

  // Cálculos dinámicos por estado
  const counts = {
    pending: allRequests.filter(req => req.status === "Pending").length,
    quote: allRequests.filter(req => req.status === "Quote Requested").length,
    po: allRequests.filter(req => req.status === "PO Requested").length,
    ordered: allRequests.filter(req => req.status === "Ordered").length,
    received: allRequests.filter(req => req.status === "Received").length,
  };

  const totalPendingItemsCount = pendingItems?.reduce((sum, item) => sum + item.quantityPending, 0) || 0;

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
          <p className="text-muted-foreground">Estado operativo del laboratorio.</p>
        </div>
        <Button onClick={() => navigate("/new-request")} size="lg" className="shadow-md">
          <PlusCircle className="mr-2 h-5 w-5" /> Nueva Solicitud
        </Button>
      </div>
      
      {/* Mini Dash Superior - Métricas de Flujo */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <SummaryCard 
          title="Por Aprobar" 
          count={counts.pending} 
          icon={<FileSearch className="text-orange-500" />} 
          colorClass="orange-500"
          description="Nuevas solicitudes"
        />
        <SummaryCard 
          title="Presupuestos" 
          count={counts.quote} 
          icon={<FileText className="text-blue-500" />} 
          colorClass="blue-500"
          description="Esperando cotización"
        />
        <SummaryCard 
          title="PO (Cómprame)" 
          count={counts.po} 
          icon={<CreditCard className="text-red-600" />} 
          colorClass="red-600"
          description="Listos para pedir"
        />
        <SummaryCard 
          title="En Camino" 
          count={counts.ordered} 
          icon={<Truck className="text-indigo-600" />} 
          colorClass="indigo-600"
          description="Pedidos realizados"
        />
        <SummaryCard 
          title="Faltan Recibir" 
          count={totalPendingItemsCount} 
          icon={<Package className="text-primary" />} 
          colorClass="primary"
          description="Unidades pendientes"
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
            <p className="text-sm text-muted-foreground">Desglose de productos en pedidos activos.</p>
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