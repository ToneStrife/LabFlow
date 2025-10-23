import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import NewRequest from "./pages/NewRequest";
import Vendors from "./pages/Vendors";
import RequestDetails from "./pages/RequestDetails";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login"; // Import the new Login page
import { SessionContextProvider, useSession } from "./components/SessionContextProvider"; // Import SessionContextProvider and useSession

const queryClient = new QueryClient();

const AuthenticatedRoutes = () => {
  const { session } = useSession();

  if (!session) {
    // This case should ideally be handled by the SessionContextProvider redirect,
    // but as a fallback, we can render nothing or a loading state.
    return null; 
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/new-request" element={<NewRequest />} />
        <Route path="/vendors" element={<Vendors />} />
        <Route path="/requests/:id" element={<RequestDetails />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
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
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/*" element={<AuthenticatedRoutes />} /> {/* Catch-all for authenticated routes */}
          </Routes>
        </SessionContextProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;