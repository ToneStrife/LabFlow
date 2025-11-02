import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import NewRequest from "./pages/NewRequest";
import Vendors from "./pages/Vendors";
import RequestDetails from "./pages/RequestDetails";
import Profile from "./pages/Profile";
import AdminPage from "./pages/Admin"; // Importar la nueva página de Admin
import Inventory from "./pages/Inventory"; 
import Expenditures from "./pages/Expenditures"; // Importar la nueva página de Gastos
import NotFound from "./pages/NotFound";
import { SessionContextProvider, useSession } from "./components/SessionContextProvider";
import React from "react";
import Login from "./pages/Login";
import { Loader2 } from "lucide-react";
import { Profile as UserProfileType } from "@/data/types"; // Corrected import
import FirebaseInitializer from "./components/FirebaseInitializer"; // Importar el inicializador

const queryClient = new QueryClient();

const PrivateRoute: React.FC<{ children: React.ReactNode; requiredRoles?: UserProfileType['role'][] }> = ({ children, requiredRoles }) => {
  const { session, profile, loading } = useSession();

  if (loading) {
    // Si el contexto está cargando (incluyendo la carga inicial de sesión/perfil)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin mr-2" /> Loading authentication...
      </div>
    );
  }

  if (!session) {
    // Si no hay sesión, redirigir a login
    return <Navigate to="/login" replace />;
  }
  
  // CRÍTICO: Si hay sesión pero el perfil aún no se ha cargado (lo cual debería ser raro si SessionContextProvider funciona bien, pero es un buen fallback)
  if (session && !profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin mr-2" /> Loading user profile...
      </div>
    );
  }

  // Si se requieren roles y el perfil existe, verificar el rol
  if (requiredRoles && profile && !requiredRoles.includes(profile.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const AppRoutes = () => {
  const { loading } = useSession();

  if (loading) {
    // Si el contexto está cargando, mostramos un loader global antes de renderizar el Layout
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
        <Route path="/admin" element={<PrivateRoute requiredRoles={["Admin"]}><AdminPage /></PrivateRoute>} /> {/* Nueva Ruta de Admin */}
        <Route path="/inventory" element={<PrivateRoute requiredRoles={["Account Manager", "Admin"]}><Inventory /></PrivateRoute>} />
        <Route path="/expenditures" element={<PrivateRoute requiredRoles={["Account Manager", "Admin"]}><Expenditures /></PrivateRoute>} /> {/* Nueva Ruta de Gastos */}
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
      <HashRouter future={{ v7_relativeSplatPath: true }}>
        <SessionContextProvider>
          <FirebaseInitializer /> {/* Inicializar Firebase aquí */}
          <AppRoutes />
        </SessionContextProvider>
      </HashRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;