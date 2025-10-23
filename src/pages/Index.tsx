"use client";

import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Index = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-100px)] text-center p-4">
      <h1 className="text-5xl font-bold mb-4">Welcome to Lab Orders</h1>
      <p className="text-xl text-muted-foreground mb-8">
        Your centralized platform for managing lab product requests and vendors.
      </p>
      <Link to="/dashboard">
        <Button size="lg">Go to Dashboard</Button>
      </Link>
    </div>
  );
};

export default Index;