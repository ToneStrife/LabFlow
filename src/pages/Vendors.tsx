"use client";

import React from "react";
import VendorTable from "@/components/VendorTable"; // Import the new VendorTable component
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

const Vendors = () => {
  const handleAddVendor = () => {
    console.log("Add new vendor clicked");
    // Implement logic to open a form for adding a new vendor
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Vendor Directory</h1>
        <Button onClick={handleAddVendor}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Vendor
        </Button>
      </div>
      <p className="text-lg text-muted-foreground mb-8">
        This page allows account managers to view and manage vendor information.
      </p>
      <VendorTable />
    </div>
  );
};

export default Vendors;