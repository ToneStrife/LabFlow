"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ShoppingCart } from "lucide-react";

interface InventoryToolbarProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  selectedItemCount: number;
  onReorder: () => void;
}

const InventoryToolbar: React.FC<InventoryToolbarProps> = ({
  searchTerm,
  onSearchChange,
  selectedItemCount,
  onReorder,
}) => {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full sm:max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por producto, catálogo, marca o ubicación…"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-9 pl-9"
        />
      </div>
      <Button
        onClick={onReorder}
        disabled={selectedItemCount === 0}
        size="sm"
        className="w-full sm:w-auto"
      >
        <ShoppingCart className="mr-2 h-4 w-4" />
        Reordenar{selectedItemCount > 0 ? ` (${selectedItemCount})` : ""}
      </Button>
    </div>
  );
};

export default InventoryToolbar;
