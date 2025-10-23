"use client";

import React from "react";

const Vendors = () => {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Vendor Directory</h1>
      <p className="text-lg text-muted-foreground">
        This page will allow account managers to view and manage vendor information.
      </p>
      {/* Table or list of vendors will be added here */}
      <div className="mt-8 p-6 bg-card rounded-lg shadow-sm border">
        <h2 className="text-xl font-semibold mb-4">Vendor List</h2>
        <p className="text-muted-foreground">A table displaying vendor names, contact info, and associated requests will be here.</p>
      </div>
    </div>
  );
};

export default Vendors;