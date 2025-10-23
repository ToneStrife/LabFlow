"use client";

import React from "react";
import RequestForm from "@/components/RequestForm"; // Import the new form component

const NewRequest = () => {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Create New Request</h1>
      <p className="text-lg text-muted-foreground mb-8">
        Fill out the form below to submit a new lab product request. You can add multiple items to a single request.
      </p>
      <RequestForm />
    </div>
  );
};

export default NewRequest;