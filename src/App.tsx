import { Toaster as Sonner } from '@/components/ui/sonner';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthWrapper } from './components/AuthWrapper';
import { DashboardLayout } from './components/DashboardLayout';
import { AuthProvider } from './lib/auth';
import CashFlow from './pages/CashFlow';
import Customers from './pages/Customers';
import Expenses from './pages/Expenses';
import NotFound from './pages/NotFound';
import Overview from './pages/Overview';
import Profitability from './pages/Profitability';
import Receivables from './pages/Receivables';
import Reports from './pages/Reports';
import Revenue from './pages/Revenue';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache stays fresh for 30 min: no refetch when navigating back/forward
      staleTime: 30 * 60 * 1000,
      gcTime: 60 * 60 * 1000,
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
              <Route element={<DashboardLayout />}>
                <Route path="/" element={<Overview />} />
                <Route path="/revenue" element={<Revenue />} />
                <Route path="/expenses" element={<Expenses />} />
                <Route path="/profitability" element={<Profitability />} />
                <Route path="/cash-flow" element={<CashFlow />} />
                <Route path="/receivables" element={<Receivables />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/reports" element={<Reports />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthWrapper>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
