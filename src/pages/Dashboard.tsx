"use client";

import React from "react";
import RequestList from "@/components/RequestList"; // Import the new RequestList component
import { mockRequests } from "@/data/mockData"; // Import mockRequests to calculate counts

const Dashboard = () => {
  // Calculate dynamic counts
  const pendingRequestsCount = mockRequests.filter(req => req.status === "Pending").length;
  const orderedItemsCount = mockRequests
    .filter(req => req.status === "Ordered")
    .reduce((total, req) => total + req.items.length, 0);
  const receivedItemsCount = mockRequests
    .filter(req => req.status === "Received")
    .reduce((total, req) => total + req.items.length, 0);

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
        <h2 className="text-2xl font-bold mb-4">Recent Requests</h2>
        <RequestList />
      </div>
    </div>
  );
};

export default Dashboard;