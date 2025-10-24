import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import NewRequest from "./pages/NewRequest";
import Vendors from "./pages/Vendors";
import RequestDetails from "./pages/RequestDetails";
import Profile from "./pages/Profile";
import Accounts from "./pages/Accounts";
import AccountManagers from "./pages/AccountManagers"; // Import the new AccountManagers page
import NotFound from "./pages/NotFound";
import { SessionContextProvider, useSession } from "./components/SessionContextProvider";
import React from "react";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const { loading } = useSession(); // We assume a session always exists with mock data

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg">Loading application...</p>
      </div>
    );
  }

  // With mock data, we always assume a user is "logged in"
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/new-request" element={<NewRequest />} />
        <Route path="/vendors" element={<Vendors />} />
        <Route path="/requests/:id" element={<RequestDetails />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/accounts" element={<Accounts />} />
        <Route path="/account-managers" element={<AccountManagers />} /> {/* New route */}
        {/* No login route needed as we simulate logged in */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SessionContextProvider>
          <AppRoutes />
        </SessionContextProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;