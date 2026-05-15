"use client";

import React from "react";
import { usePendingInvoices } from "@/hooks/use-pending-invoices";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CreditCard, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const PendingInvoicesList: React.FC = () => {
  const { data: pendingInvoices, isLoading, error } = usePendingInvoices();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Buscando artículos sin factura...
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 p-4">Error: {error.message}</div>;
  }

  return (
    <Card className="shadow-md border-blue-200">
      <CardHeader className="bg-blue-50/50">
        <CardTitle className="text-lg flex items-center text-blue-800">
          <CreditCard className="mr-2 h-5 w-5" /> Artículos Pendientes de Facturar
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
                <TableHead className="text-center">Facturado</TableHead>
                <TableHead className="text-right">Faltan</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingInvoices?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    ¡Excelente! Todos los artículos pedidos están correctamente facturados.
                  </TableCell>
                </TableRow>
              ) : (
                pendingInvoices?.map((item) => (
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
                    <TableCell className="text-center text-blue-600">{item.quantityInvoiced}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className="font-bold border-blue-300 text-blue-700 bg-blue-50">
                        {item.quantityPending}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Link to={`/requests/${item.requestId}`} title="Ver Solicitud y Registrar Factura">
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

export default PendingInvoicesList;