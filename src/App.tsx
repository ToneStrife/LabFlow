import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";

import { SessionContextProvider, useSession } from "./components/SessionContextProvider";
import React from "react";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import { Loader2 } from "lucide-react";
import { useCan } from "@/hooks/use-permissions";

import { ReceiveWizardProvider } from "./components/ReceiveWizardProvider";

// Estas paginas arrastran las librerias pesadas (graficas, editor de texto
// enriquecido, tablas de administracion). Cargarlas solo cuando se visitan
// evita meterlas en el paquete inicial.
// Firebase solo sirve para las notificaciones push, que no hacen falta para
// pintar la primera pantalla.
const FirebaseInitializer = React.lazy(() => import("./components/FirebaseInitializer"));

const NewRequest = React.lazy(() => import("./pages/NewRequest"));
const Vendors = React.lazy(() => import("./pages/Vendors"));
const RequestDetails = React.lazy(() => import("./pages/RequestDetails"));
const Profile = React.lazy(() => import("./pages/Profile"));
const AdminPage = React.lazy(() => import("./pages/Admin"));
const Inventory = React.lazy(() => import("./pages/Inventory"));
const Expenditures = React.lazy(() => import("./pages/Expenditures"));
const Documentos = React.lazy(() => import("./pages/Documentos"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Al volver a la pestaña, react-query recarga por defecto todas las
      // consultas activas. En una pantalla con un formulario abierto eso se
      // nota como un parpadeo y como listas que se reordenan bajo el cursor.
      // Los datos se siguen refrescando al navegar y despues de cada cambio.
      refetchOnWindowFocus: false,
    },
  },
});

const PrivateRoute: React.FC<{ children: React.ReactNode; requiredPermission?: string }> = ({ children, requiredPermission }) => {
  const { session, profile, loading } = useSession();
  const { can, cargandoPermisos } = useCan();

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

  if (session && !profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin mr-2" /> Loading user profile...
      </div>
    );
  }

  // Sin esperar a los permisos echariamos de la pantalla a quien si puede
  // entrar, solo porque la respuesta todavia no ha llegado.
  if (requiredPermission && cargandoPermisos) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin mr-2" /> Comprobando permisos...
      </div>
    );
  }

  if (requiredPermission && !can(requiredPermission)) {
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
      <React.Suspense
        fallback={
          <div className="flex items-center justify-center py-24 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" /> Cargando página...
          </div>
        }
      >
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/new-request" element={<PrivateRoute><NewRequest /></PrivateRoute>} />
        <Route path="/vendors" element={<PrivateRoute requiredPermission="vendors.view"><Vendors /></PrivateRoute>} />
        <Route path="/requests/:id" element={<PrivateRoute><RequestDetails /></PrivateRoute>} />
        <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
        <Route path="/admin" element={<PrivateRoute requiredPermission="users.manage"><AdminPage /></PrivateRoute>} />
        <Route path="/inventory" element={<PrivateRoute requiredPermission="inventory.view"><Inventory /></PrivateRoute>} />
        <Route path="/expenditures" element={<PrivateRoute requiredPermission="expenditures.view"><Expenditures /></PrivateRoute>} />
        <Route path="/documents" element={<PrivateRoute requiredPermission="documents.view"><Documentos /></PrivateRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      </React.Suspense>
    </Layout>
  );
};

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <HashRouter future={{ v7_relativeSplatPath: true }}>
        <SessionContextProvider>
          <React.Suspense fallback={null}>
            <FirebaseInitializer />
          </React.Suspense>
          <ReceiveWizardProvider>
            <AppRoutes />
          </ReceiveWizardProvider>
        </SessionContextProvider>
      </HashRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ThemeProvider>
);

export default App;
