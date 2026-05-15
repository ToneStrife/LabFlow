"use client";

import React from "react";
import { useNavigate } from "react-router-dom";
import RequestList from "@/components/RequestList";
import PendingItemsList from "@/components/PendingItemsList";
import PendingInvoicesList from "@/components/PendingInvoicesList"; // Importar la nueva lista
import { Button } from "@/components/ui/button";
import { 
  PlusCircle, 
  Loader2, 
  FileSearch,
  FileText,
  CreditCard,
  Truck,
  ListTodo,
  LayoutDashboard,
  Receipt
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useRequests } from "@/hooks/use-requests";
import { usePendingItems } from "@/hooks/use-pending-items";
import { usePendingInvoices } from "@/hooks/use-pending-invoices"; // Nuevo hook
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSession } from "@/components/SessionContextProvider";

// Componente de Tarjeta de Resumen Ultra-Compacta
interface SummaryCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  colorClass: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ title, value, icon, colorClass }) => (
  <Card className="shadow-sm border-none bg-slate-50/50">
    <CardContent className="p-3 flex items-center gap-3">
      <div className={cn("p-2 rounded-lg bg-white shadow-sm", colorClass)}>
        {React.cloneElement(icon as React.ReactElement, { className: "h-4 w-4" })}
      </div>
      <div>
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-tight leading-none mb-1">{title}</p>
        <p className="text-xl font-bold leading-none">{value}</p>
      </div>
    </CardContent>
  </Card>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const { profile } = useSession();
  const isAdmin = profile?.role === 'Admin';
  
  const { data: requests, isLoading: isLoadingRequests, error } = useRequests();
  const { data: pendingItems, isLoading: isLoadingPending } = usePendingItems();
  const { data: pendingInvoices, isLoading: isLoadingInvoices } = usePendingInvoices();

  const allRequests = requests || [];
  const allPendingItems = pendingItems || [];
  const allPendingInvoices = pendingInvoices || [];

  // Métricas simplificadas
  const metrics = {
    pending: allRequests.filter(req => req.status === "Pending").length,
    quote: allRequests.filter(req => req.status === "Quote Requested").length,
    po: allRequests.filter(req => req.status === "PO Requested").length,
    deliveryOrders: allRequests.filter(req => req.status === "Ordered").length,
    deliveryItems: allPendingItems.length,
    uninvoicedItems: allPendingInvoices.length,
  };

  if (isLoadingRequests || isLoadingPending || isLoadingInvoices) {
    return (
      <div className="container mx-auto py-8 flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin mr-2 text-primary" /> Cargando...
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 text-red-600">
        Error: {error.message}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Panel de Control</h1>
          <p className="text-sm text-muted-foreground">Resumen de actividad del laboratorio.</p>
        </div>
        <Button onClick={() => navigate("/new-request")} size="sm" className="h-9">
          <PlusCircle className="mr-2 h-4 w-4" /> Nueva Solicitud
        </Button>
      </div>
      
      {/* Mini Dash Compacto */}
      <div className={cn("grid gap-3", isAdmin ? "grid-cols-2 md:grid-cols-5" : "grid-cols-2 md:grid-cols-4")}>
        <SummaryCard 
          title="Por Aprobar" 
          value={metrics.pending} 
          icon={<FileSearch className="text-orange-500" />} 
          colorClass="text-orange-500"
        />
        <SummaryCard 
          title="Presupuestos" 
          value={metrics.quote} 
          icon={<FileText className="text-blue-500" />} 
          colorClass="text-blue-500"
        />
        <SummaryCard 
          title="PO Pendientes" 
          value={metrics.po} 
          icon={<CreditCard className="text-red-500" />} 
          colorClass="text-red-500"
        />
        <SummaryCard 
          title="Art. / Pedidos" 
          value={`${metrics.deliveryItems} / ${metrics.deliveryOrders}`} 
          icon={<Truck className="text-emerald-500" />} 
          colorClass="text-emerald-500"
        />
        {isAdmin && (
            <SummaryCard 
                title="Sin Facturar" 
                value={metrics.uninvoicedItems} 
                icon={<Receipt className="text-purple-600" />} 
                colorClass="text-purple-600"
            />
        )}
      </div>

      <Tabs defaultValue="pending-items" className="w-full">
        <TabsList className="mb-4 bg-transparent border-b rounded-none w-full justify-start h-auto p-0 gap-6 overflow-x-auto">
          <TabsTrigger 
            value="pending-items" 
            className="data-[state=active]:border-primary data-[state=active]:bg-transparent border-b-2 border-transparent rounded-none px-0 pb-2 shadow-none"
          >
            <ListTodo className="h-4 w-4 mr-2" /> Artículos Pendientes
          </TabsTrigger>
          
          {isAdmin && (
            <TabsTrigger 
              value="pending-invoices" 
              className="data-[state=active]:border-primary data-[state=active]:bg-transparent border-b-2 border-transparent rounded-none px-0 pb-2 shadow-none"
            >
              <Receipt className="h-4 w-4 mr-2" /> Sin Factura
            </TabsTrigger>
          )}

          <TabsTrigger 
            value="all-requests" 
            className="data-[state=active]:border-primary data-[state=active]:bg-transparent border-b-2 border-transparent rounded-none px-0 pb-2 shadow-none"
          >
            <LayoutDashboard className="h-4 w-4 mr-2" /> Historial
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="pending-items" className="mt-0 border-none p-0">
          <PendingItemsList />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="pending-invoices" className="mt-0 border-none p-0">
            <PendingInvoicesList />
          </TabsContent>
        )}
        
        <TabsContent value="all-requests" className="mt-0 border-none p-0">
          <RequestList />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Dashboard;