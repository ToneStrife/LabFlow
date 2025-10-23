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
import { SessionContextProvider } from "./components/SessionContextProvider"; // Import the new SessionContextProvider

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SessionContextProvider> {/* Wrap the entire app with SessionContextProvider */}
          <Routes>
            <Route path="/login" element={<Login />} /> {/* New route for login */}
            <Route path="/" element={<Layout><Dashboard /></Layout>} />
            <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
            <Route path="/new-request" element={<Layout><NewRequest /></Layout>} />
            <Route path="/vendors" element={<Layout><Vendors /></Layout>} />
            <Route path="/requests/:id" element={<Layout><RequestDetails /></Layout>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </SessionContextProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;