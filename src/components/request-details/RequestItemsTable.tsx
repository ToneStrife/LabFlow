"use client";

import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { SupabaseRequestItem } from "@/data/types";

interface RequestItemsTableProps {
  items: SupabaseRequestItem[] | null;
}

const RequestItemsTable: React.FC<RequestItemsTableProps> = ({ items }) => {
  if (!items || items.length === 0) {
    return (
      <div className="text-muted-foreground text-center py-4">
        No items found for this request.
      </div>
    );
  }

  return (
    <>
      <Separator />
      <h2 className="text-xl font-semibold mb-4">Requested Items</h2>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product Name</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Catalog #</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Unit Price</TableHead>
              <TableHead>Format</TableHead>
              <TableHead>Link</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.product_name}</TableCell>
                <TableCell>{item.brand || "N/A"}</TableCell>
                <TableCell>{item.catalog_number || "N/A"}</TableCell>
                <TableCell>{item.quantity}</TableCell>
                <TableCell>{item.unit_price ? `$${Number(item.unit_price).toFixed(2)}` : "N/A"}</TableCell>
                <TableCell>{item.format || "N/A"}</TableCell>
                <TableCell>
                  {item.link ? (
                    <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                      View Product
                    </a>
                  ) : (
                    "N/A"
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
};

export default RequestItemsTable;