"use client";

import React from "react";
import { usePendingItems } from "@/hooks/use-pending-items";
import { useRequests } from "@/hooks/use-requests";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, PackageSearch, Receipt } from "lucide-react";
import { Link } from "react-router-dom";
import ReceiveItemsDialog from "@/components/ReceiveItemsDialog";
import { SupabaseRequest } from "@/data/types";

const PendingItemsList: React.FC = () => {
  const { data: pendingItems, isLoading, error } = usePendingItems();
  const { data: requests } = useRequests();
  const [requestToReceive, setRequestToReceive] = React.useState<SupabaseRequest | null>(null);

  const openReceive = (requestId: string) => {
    const request = requests?.find((r) => r.id === requestId);
    if (!request?.items?.length) return;
    setRequestToReceive(request);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Calculando artículos pendientes...
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 p-4">Error: {error.message}</div>;
  }

  const groupedByRequest = React.useMemo(() => {
    const groups = new Map<string, typeof pendingItems>();
    pendingItems?.forEach((item) => {
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
  }, [pendingItems]);

  return (
    <>
      <Card className="shadow-md border-orange-200">
        <CardHeader className="bg-orange-50/50">
          <CardTitle className="text-lg flex items-center text-orange-800">
            <PackageSearch className="mr-2 h-5 w-5" /> Artículos Pendientes de Recibir
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Mobile: card list with receive CTA */}
          <div className="md:hidden divide-y">
            {groupedByRequest.length === 0 ? (
              <p className="p-6 text-center text-muted-foreground">
                ¡Todo al día! No hay artículos pendientes de recibir.
              </p>
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

          {/* Desktop table */}
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
                {pendingItems?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      ¡Todo al día! No hay artículos pendientes de recibir.
                    </TableCell>
                  </TableRow>
                ) : (
                  pendingItems?.map((item) => (
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
                      <TableCell className="text-center text-green-600">{item.quantityReceived}</TableCell>
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

      {requestToReceive?.items && (
        <ReceiveItemsDialog
          isOpen={!!requestToReceive}
          onOpenChange={(open) => {
            if (!open) setRequestToReceive(null);
          }}
          requestId={requestToReceive.id}
          requestItems={requestToReceive.items}
        />
      )}
    </>
  );
};

export default PendingItemsList;
