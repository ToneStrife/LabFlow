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
import Users from "./pages/Users";
import Accounts from "./pages/Accounts"; // Importar la nueva página Accounts
import Inventory from "./pages/Inventory"; 
import NotFound from "./pages/NotFound";
import { SessionContextProvider, useSession } from "./components/SessionContextProvider";
import React from "react";
import Login from "./pages/Login";
import { Loader2 } from "lucide-react";
import { Profile as UserProfileType } from "@/hooks/use-profiles";

const queryClient = new QueryClient();

const PrivateRoute: React.FC<{ children: React.ReactNode; requiredRoles?: UserProfileType['role'][] }> = ({ children, requiredRoles }) => {
  const { session, profile, loading } = useSession();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin mr-2" /> Loading authentication...
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRoles && profile && !requiredRoles.includes(profile.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const AppRoutes = () => {
  const { loading } = useSession();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin mr-2" /> Loading application...
      </div>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/new-request" element={<PrivateRoute><NewRequest /></PrivateRoute>} />
        <Route path="/vendors" element={<PrivateRoute requiredRoles={["Account Manager", "Admin"]}><Vendors /></PrivateRoute>} />
        <Route path="/requests/:id" element={<PrivateRoute><RequestDetails /></PrivateRoute>} />
        <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
        <Route path="/users" element={<PrivateRoute requiredRoles={["Admin"]}><Users /></PrivateRoute>} />
        <Route path="/accounts" element={<PrivateRoute requiredRoles={["Admin"]}><Accounts /></PrivateRoute>} /> {/* Ruta actualizada */}
        <Route path="/inventory" element={<PrivateRoute requiredRoles={["Account Manager", "Admin"]}><Inventory /></PrivateRoute>} />
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