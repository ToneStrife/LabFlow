"use client";

import React from "react";

const Dashboard = () => {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      <p className="text-lg text-muted-foreground">
        Welcome to your Lab Order Management Dashboard.
      </p>
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Placeholder for order status cards */}
        <div className="bg-card p-6 rounded-lg shadow-sm border">
          <h2 className="text-xl font-semibold mb-2">Pending Requests</h2>
          <p className="text-3xl font-bold">0</p>
        </div>
        <div className="bg-card p-6 rounded-lg shadow-sm border">
          <h2 className="text-xl font-semibold mb-2">Ordered Items</h2>
          <p className="text-3xl font-bold">0</p>
        </div>
        <div className="bg-card p-6 rounded-lg shadow-sm border">
          <h2 className="text-xl font-semibold mb-2">Received Items</h2>
          <p className="text-3xl font-bold">0</p>
        </div>
      </div>
      {/* More dashboard content will go here */}
    </div>
  );
};

export default Dashboard;