"use client";

import React from "react";
import { usePendingItems } from "@/hooks/use-pending-items";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, PackageSearch, Receipt } from "lucide-react";
import { Link } from "react-router-dom";
import { useReceiveWizard } from "@/components/ReceiveWizardProvider";
import { useSedeActiva } from "@/components/SedeContextProvider";
import { useRequests } from "@/hooks/use-requests";
import { useShippingAddresses } from "@/hooks/use-addresses";
import { filterRequestsBySede, getSedeLabel } from "@/lib/sedes";

const PendingItemsList: React.FC = () => {
  const { data: pendingItems, isLoading, error } = usePendingItems();
  const { data: requests, isLoading: isLoadingRequests } = useRequests();
  const { data: shippingAddresses, isLoading: isLoadingShipping } = useShippingAddresses();
  const { sedeActiva } = useSedeActiva();
  const { openReceive } = useReceiveWizard();

  const requestIdsForSede = React.useMemo(() => {
    const filtered = filterRequestsBySede(requests, shippingAddresses, sedeActiva);
    return new Set(filtered.map((r) => r.id));
  }, [requests, shippingAddresses, sedeActiva]);

  const itemsForSede = React.useMemo(
    () => pendingItems?.filter((item) => requestIdsForSede.has(item.requestId)) ?? [],
    [pendingItems, requestIdsForSede]
  );

  const totalSinFiltrar = pendingItems?.length ?? 0;

  const groupedByRequest = React.useMemo(() => {
    const groups = new Map<string, typeof itemsForSede>();
    itemsForSede.forEach((item) => {
      const list = groups.get(item.requestId) || [];
      list.push(item);
      groups.set(item.requestId, list);
    });
    return Array.from(groups.entries()).map(([requestId, items]) => ({
      requestId,
      requestNumber: items[0].requestNumber,
      vendorName: items[0].vendorName,
      items,
    }));
  }, [itemsForSede]);

  if (isLoading || isLoadingRequests || isLoadingShipping) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Calculando artículos pendientes...
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 dark:text-red-400 p-4">Error: {error.message}</div>;
  }

  const emptyMessage =
    sedeActiva && totalSinFiltrar > 0
      ? `No hay artículos pendientes en ${getSedeLabel(sedeActiva)}. Hay ${totalSinFiltrar} en otras sedes o sin sede asignada: cambia el selector arriba o asigna sede a las direcciones de envío.`
      : "¡Todo al día! No hay artículos pendientes de recibir.";

  return (
    <Card className="shadow-sm border-amber-200 dark:border-amber-900/70">
      <CardHeader className="bg-amber-50/70 dark:bg-amber-950/30 border-b border-amber-200/60 dark:border-amber-900/50">
        <CardTitle className="text-lg flex items-center text-amber-800 dark:text-amber-300">
          <PackageSearch className="mr-2 h-5 w-5" /> Artículos Pendientes de Recibir
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="md:hidden divide-y">
          {groupedByRequest.length === 0 ? (
            <p className="p-6 text-center text-muted-foreground text-sm">{emptyMessage}</p>
          ) : (
            groupedByRequest.map((group) => (
              <div key={group.requestId} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      to={`/requests/${group.requestId}`}
                      className="font-bold text-primary hover:underline"
                    >
                      #{group.requestNumber}
                    </Link>
                    <p className="text-sm text-muted-foreground truncate">{group.vendorName}</p>
                  </div>
                  <Button size="sm" onClick={() => openReceive(group.requestId)} className="shrink-0">
                    <Receipt className="mr-1.5 h-4 w-4" /> Recibir
                  </Button>
                </div>
                <ul className="space-y-2">
                  {group.items.map((item) => (
                    <li key={item.requestItemId} className="rounded-md border bg-card p-3">
                      <p className="font-medium text-sm leading-snug">{item.productName}</p>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">
                        {item.catalogNumber}
                      </p>
                      <div className="mt-2 flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {item.quantityReceived}/{item.quantityOrdered} recibidos
                        </span>
                        <Badge variant="destructive" className="font-bold">
                          Faltan {item.quantityPending}
                        </Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>

        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Artículo</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Solicitud</TableHead>
                <TableHead className="text-center">Pedido</TableHead>
                <TableHead className="text-center">Recibido</TableHead>
                <TableHead className="text-right">Faltan</TableHead>
                <TableHead className="text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itemsForSede.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground text-sm">
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              ) : (
                itemsForSede.map((item) => (
                  <TableRow key={item.requestItemId} className="hover:bg-muted/30">
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span>{item.productName}</span>
                        <span className="text-xs text-muted-foreground font-mono">{item.catalogNumber}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{item.vendorName}</TableCell>
                    <TableCell>
                      <Link to={`/requests/${item.requestId}`} className="text-primary hover:underline font-bold">
                        #{item.requestNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="text-center">{item.quantityOrdered}</TableCell>
                    <TableCell className="text-center text-green-600 dark:text-green-400">{item.quantityReceived}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="destructive" className="font-bold">
                        {item.quantityPending}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => openReceive(item.requestId)}>
                        <Receipt className="mr-1.5 h-4 w-4" /> Recibir
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default PendingItemsList;
