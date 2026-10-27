import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Mail, Phone, Trash2, UserRound } from "lucide-react";
import { Vendor } from "@/data/types";
import { correoPedidoProveedor, correoPresupuestoProveedor } from "@/lib/vendors";

interface VendorTableProps {
  vendors: Vendor[];
  onEdit: (vendor: Vendor) => void;
  onDelete: (vendorId: string) => void;
  canManage?: boolean;
  emptyMessage?: string;
}

const VendorTable: React.FC<VendorTableProps> = ({
  vendors,
  onEdit,
  onDelete,
  canManage = true,
  emptyMessage = "No se encontraron proveedores.",
}) => {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="pl-4">Proveedor</TableHead>
            <TableHead className="hidden md:table-cell">Contacto</TableHead>
            <TableHead>Correos</TableHead>
            <TableHead className="hidden lg:table-cell">Marcas</TableHead>
            {canManage && <TableHead className="pr-4 text-right">Acciones</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {vendors.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={canManage ? 5 : 4}
                className="h-28 text-center text-muted-foreground"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            vendors.map((vendor) => {
              const emailPpto = correoPresupuestoProveedor(vendor);
              const emailPedido = correoPedidoProveedor(vendor);
              const mismoEmail =
                emailPpto &&
                emailPedido &&
                emailPpto.toLowerCase() === emailPedido.toLowerCase();

              return (
                <TableRow key={vendor.id} className="align-top">
                  <TableCell className="pl-4">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium leading-tight">{vendor.name}</p>
                        {vendor.scope === "lab" ? (
                          <Badge variant="outline" className="text-[10px]">Solo lab</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">Global</Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground md:hidden">
                        {vendor.contact_person && (
                          <span className="inline-flex items-center gap-1">
                            <UserRound className="h-3 w-3" />
                            {vendor.contact_person}
                          </span>
                        )}
                        {vendor.phone && (
                          <span className="inline-flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {vendor.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="space-y-1 text-sm">
                      <p>{vendor.contact_person || "—"}</p>
                      {vendor.phone ? (
                        <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {vendor.phone}
                        </p>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1.5 text-sm">
                      {mismoEmail || (emailPpto && !emailPedido) || (!emailPpto && emailPedido) ? (
                        <a
                          href={`mailto:${emailPpto || emailPedido}`}
                          className="inline-flex max-w-full items-center gap-1.5 text-primary hover:underline"
                        >
                          <Mail className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{emailPpto || emailPedido}</span>
                        </a>
                      ) : (
                        <>
                          {emailPpto ? (
                            <div className="min-w-0">
                              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                Presupuesto
                              </p>
                              <a
                                href={`mailto:${emailPpto}`}
                                className="inline-flex max-w-full items-center gap-1 truncate text-primary hover:underline"
                              >
                                <Mail className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{emailPpto}</span>
                              </a>
                            </div>
                          ) : null}
                          {emailPedido ? (
                            <div className="min-w-0">
                              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                Pedidos
                              </p>
                              <a
                                href={`mailto:${emailPedido}`}
                                className="inline-flex max-w-full items-center gap-1 truncate text-primary hover:underline"
                              >
                                <Mail className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{emailPedido}</span>
                              </a>
                            </div>
                          ) : null}
                          {!emailPpto && !emailPedido ? (
                            <span className="text-muted-foreground">—</span>
                          ) : null}
                        </>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {vendor.brands && vendor.brands.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {vendor.brands.slice(0, 4).map((brand) => (
                          <Badge key={brand} variant="secondary" className="font-normal">
                            {brand}
                          </Badge>
                        ))}
                        {vendor.brands.length > 4 ? (
                          <Badge variant="outline" className="font-normal">
                            +{vendor.brands.length - 4}
                          </Badge>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  {canManage && (
                    <TableCell className="pr-4 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(vendor)}
                        className="mr-1"
                        title="Editar proveedor"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(vendor.id)}
                        title="Eliminar proveedor"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default VendorTable;
