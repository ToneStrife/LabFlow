"use client";

import React from "react";
import { useNavigate } from "react-router-dom";
import RequestList from "@/components/RequestList";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2 } from "lucide-react";
import { useRequests } from "@/hooks/use-requests";

const Dashboard = () => {
  const navigate = useNavigate();
  const { data: requests, isLoading, error } = useRequests();

  const allRequests = requests || [];

  // Calculate dynamic counts based on fetched requests
  const pendingRequestsCount = allRequests.filter(req => req.status === "Pending").length;
  const orderedItemsCount = allRequests
    .filter(req => req.status === "Ordered")
    .reduce((total, req) => total + (req.items?.length || 0), 0);
  const receivedItemsCount = allRequests
    .filter(req => req.status === "Received")
    .reduce((total, req) => total + (req.items?.length || 0), 0);

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin mr-2" /> Loading Dashboard...
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 text-red-600">
        Error loading dashboard data: {error.message}
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      <p className="text-lg text-muted-foreground">
        Welcome to your Lab Order Management Dashboard.
      </p>
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Dynamic order status cards */}
        <div className="bg-card p-6 rounded-lg shadow-sm border">
          <h2 className="text-xl font-semibold mb-2">Pending Requests</h2>
          <p className="text-3xl font-bold">{pendingRequestsCount}</p>
        </div>
        <div className="bg-card p-6 rounded-lg shadow-sm border">
          <h2 className="text-xl font-semibold mb-2">Ordered Items</h2>
          <p className="text-3xl font-bold">{orderedItemsCount}</p>
        </div>
        <div className="bg-card p-6 rounded-lg shadow-sm border">
          <h2 className="text-xl font-semibold mb-2">Received Items</h2>
          <p className="text-3xl font-bold">{receivedItemsCount}</p>
        </div>
      </div>

      <div className="mt-12">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Recent Requests</h2>
          <Button onClick={() => navigate("/new-request")}>
            <PlusCircle className="mr-2 h-4 w-4" /> New Request
          </Button>
        </div>
        <RequestList />
      </div>
    </div>
  );
};

export default Dashboard;