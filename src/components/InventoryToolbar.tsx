"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";

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
    <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
      <Input
        placeholder="Buscar por producto, catálogo o marca..."
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className="flex-1 max-w-full sm:max-w-md"
      />
      <Button
        onClick={onReorder}
        disabled={selectedItemCount === 0}
        className="w-full sm:w-auto"
      >
        <ShoppingCart className="mr-2 h-4 w-4" />
        Reordenar ({selectedItemCount})
      </Button>
    </div>
  );
};

export default InventoryToolbar;