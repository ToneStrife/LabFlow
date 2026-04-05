"use client";

import React from "react";
import { usePendingItems, PendingItem } from "@/hooks/use-pending-items";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, PackageSearch, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const PendingItemsList: React.FC = () => {
  const { data: pendingItems, isLoading, error } = usePendingItems();

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

  return (
    <Card className="shadow-md border-orange-200">
      <CardHeader className="bg-orange-50/50">
        <CardTitle className="text-lg flex items-center text-orange-800">
          <PackageSearch className="mr-2 h-5 w-5" /> Artículos Pendientes de Recibir
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Artículo</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Solicitud</TableHead>
                <TableHead className="text-center">Pedido</TableHead>
                <TableHead className="text-center">Recibido</TableHead>
                <TableHead className="text-right">Faltan</TableHead>
                <TableHead className="w-[50px]"></TableHead>
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
                    <TableCell>
                      <Link to={`/requests/${item.requestId}`} title="Ir a la solicitud">
                        <ArrowRight className="h-4 w-4 text-muted-foreground hover:text-primary" />
                      </Link>
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