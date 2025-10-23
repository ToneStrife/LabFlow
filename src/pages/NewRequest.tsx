"use client";

import React from "react";

const NewRequest = () => {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Create New Request</h1>
      <p className="text-lg text-muted-foreground">
        This page will contain a form for researchers to submit new lab product requests.
      </p>
      {/* Form for new requests will be added here */}
      <div className="mt-8 p-6 bg-card rounded-lg shadow-sm border">
        <h2 className="text-xl font-semibold mb-4">Product Details</h2>
        <p className="text-muted-foreground">Form fields for product name, catalog number, quantity, etc., will go here.</p>
      </div>
    </div>
  );
};

export default NewRequest;