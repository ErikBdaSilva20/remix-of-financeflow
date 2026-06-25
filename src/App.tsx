import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./lib/auth";
import { AuthWrapper } from "./components/AuthWrapper";
import { DashboardLayout } from "./components/DashboardLayout";
import Overview from "./pages/Overview";
import Revenue from "./pages/Revenue";
import Expenses from "./pages/Expenses";
import Profitability from "./pages/Profitability";
import CashFlow from "./pages/CashFlow";
import Receivables from "./pages/Receivables";
import Reports from "./pages/Reports";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache "fresco" por 5 min: navegar entre páginas não re-busca tudo.
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      // Não refazer todas as requests só por focar a aba.
      refetchOnWindowFocus: false,
      // Retry inteligente: NÃO re-tentar erros 4xx do gateway (tabela vazia/
      // não provisionada, auth) — eram eles que causavam o backoff de ~7s por
      // query quando o tenant não tinha dados. Só re-tenta falhas transitórias.
      retry: (failureCount, error) => {
        const msg = error instanceof Error ? error.message : '';
        if (/→ 4\d\d:/.test(msg)) return false;
        return failureCount < 1;
      },
      retryDelay: 400,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
        <AuthWrapper>
          <Routes>
            <Route path="/" element={
              <DashboardLayout>
                <Overview />
              </DashboardLayout>
            } />
            <Route path="/revenue" element={
              <DashboardLayout>
                <Revenue />
              </DashboardLayout>
            } />
            <Route path="/expenses" element={
              <DashboardLayout>
                <Expenses />
              </DashboardLayout>
            } />
            <Route path="/profitability" element={
              <DashboardLayout>
                <Profitability />
              </DashboardLayout>
            } />
            <Route path="/cash-flow" element={
              <DashboardLayout>
                <CashFlow />
              </DashboardLayout>
            } />
            <Route path="/receivables" element={
              <DashboardLayout>
                <Receivables />
              </DashboardLayout>
            } />
            <Route path="/reports" element={
              <DashboardLayout>
                <Reports />
              </DashboardLayout>
            } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthWrapper>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
