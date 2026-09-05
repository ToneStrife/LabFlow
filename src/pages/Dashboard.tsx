"use client";

import React from "react";
import RequestList from "@/components/RequestList";
import PendingItemsList from "@/components/PendingItemsList";
import PendingInvoicesList from "@/components/PendingInvoicesList";
import {
  Loader2,
  FileSearch,
  FileText,
  CreditCard,
  Truck,
  ListTodo,
  LayoutDashboard,
  Receipt,
} from "lucide-react";
import { useRequests } from "@/hooks/use-requests";
import { usePendingItems } from "@/hooks/use-pending-items";
import { usePendingInvoices } from "@/hooks/use-pending-invoices";
import { cn } from "@/lib/utils";
import { pageContainerClass } from "@/lib/layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSession } from "@/components/SessionContextProvider";
import { WorkflowStrip, type Etapa } from "@/components/dashboard/WorkflowStrip";
import { RequestStatus } from "@/data/types";
import { getFullName } from "@/hooks/use-profiles";

type Pestana = "pending-items" | "pending-invoices" | "all-requests";

const Dashboard = () => {
  const { profile } = useSession();
  const isAdmin = profile?.role === "Admin";

  const { data: requests, isLoading: isLoadingRequests, error } = useRequests();
  const { data: pendingItems, isLoading: isLoadingPending } = usePendingItems();
  const { data: pendingInvoices, isLoading: isLoadingInvoices } = usePendingInvoices();

  const [pestana, setPestana] = React.useState<Pestana>("pending-items");
  const [filtroEstado, setFiltroEstado] = React.useState<RequestStatus | "All" | "Active">("All");

  const allRequests = requests || [];
  const allPendingItems = pendingItems || [];
  const allPendingInvoices = pendingInvoices || [];

  const cuentaPorEstado = (estado: RequestStatus) =>
    allRequests.filter((req) => req.status === estado).length;

  /** Ir al historial ya filtrado por una fase concreta. */
  const verHistorialFiltrado = (estado: RequestStatus) => {
    setFiltroEstado(estado);
    setPestana("all-requests");
  };

  const etapas: Etapa[] = [
    {
      id: "pending",
      etiqueta: "Por aprobar",
      valor: cuentaPorEstado("Pending"),
      pie: "esperando decisión",
      icono: FileSearch,
      tono: "amber",
      onSelect: () => verHistorialFiltrado("Pending"),
    },
    {
      id: "quote",
      etiqueta: "Presupuestos",
      valor: cuentaPorEstado("Quote Requested"),
      pie: "cotización pedida",
      icono: FileText,
      tono: "sky",
      onSelect: () => verHistorialFiltrado("Quote Requested"),
    },
    {
      id: "po",
      etiqueta: "PO pendientes",
      valor: cuentaPorEstado("PO Requested"),
      pie: "orden por emitir",
      icono: CreditCard,
      tono: "indigo",
      onSelect: () => verHistorialFiltrado("PO Requested"),
    },
    {
      id: "ordered",
      etiqueta: "Por recibir",
      valor: `${allPendingItems.length} / ${cuentaPorEstado("Ordered")}`,
      pie: "artículos / pedidos",
      icono: Truck,
      tono: "violet",
      onSelect: () => setPestana("pending-items"),
    },
  ];

  if (isAdmin) {
    etapas.push({
      id: "uninvoiced",
      etiqueta: "Sin facturar",
      valor: allPendingInvoices.length,
      pie: "recibido, falta factura",
      icono: Receipt,
      tono: "rose",
      onSelect: () => setPestana("pending-invoices"),
    });
  }

  if (isLoadingRequests || isLoadingPending || isLoadingInvoices) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="mr-2 h-6 w-6 animate-spin text-primary" /> Cargando panel…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
        No se pudo cargar el panel: {error.message}
      </div>
    );
  }

  const nombreCorto = getFullName(profile).split(" ")[0];
  const totalPendiente = allPendingItems.length + allPendingInvoices.length;

  const claseTab = cn(
    "relative rounded-none border-b-2 border-transparent bg-transparent px-1 pb-2.5 shadow-none",
    "text-sm text-muted-foreground transition-colors",
    "data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:font-semibold",
    "whitespace-nowrap shrink-0"
  );

  return (
    <div className={pageContainerClass}>
      <div>
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {nombreCorto ? `Hola, ${nombreCorto}` : "Panel de control"}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {totalPendiente === 0
            ? "No hay nada esperándote. Todo al día."
            : `Tienes ${totalPendiente} ${totalPendiente === 1 ? "cosa" : "cosas"} esperando: pulsa una fase para ir a ella.`}
        </p>
      </div>

      <WorkflowStrip etapas={etapas} />

      <Tabs value={pestana} onValueChange={(v) => setPestana(v as Pestana)} className="w-full">
        <TabsList className="mb-4 h-auto w-full justify-start gap-5 overflow-x-auto rounded-none border-b bg-transparent p-0 flex-nowrap sm:gap-6">
          <TabsTrigger value="pending-items" className={claseTab}>
            <ListTodo className="mr-2 h-4 w-4" /> Artículos pendientes
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="pending-invoices" className={claseTab}>
              <Receipt className="mr-2 h-4 w-4" /> Sin factura
            </TabsTrigger>
          )}
          <TabsTrigger value="all-requests" className={claseTab}>
            <LayoutDashboard className="mr-2 h-4 w-4" /> Historial
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
          <RequestList estadoInicial={filtroEstado} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Dashboard;
