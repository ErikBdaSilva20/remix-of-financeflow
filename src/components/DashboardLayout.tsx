import { Button } from '@/components/ui/button';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { useToast } from '@/hooks/use-toast';
import { useAppDataPrefetch } from '@/hooks/useAppDataPrefetch';
import { SearchResult, useGlobalSearch } from '@/hooks/useGlobalSearch';
import { useAuth } from '@/lib/auth';
import { LogOut } from 'lucide-react';
import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { FinancialSidebar } from './FinancialSidebar';
import { ParticleBackground } from './ParticleBackground';

export function DashboardLayout() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  useAppDataPrefetch();

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: 'Saída realizada com sucesso',
      description: 'Você foi desconectado do FinanceFlow.',
    });
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background relative overflow-x-hidden">
        <ParticleBackground />
        <FinancialSidebar />

        <div className="flex-1 flex flex-col min-w-0 relative z-10">
          {/* Header */}
          <header className="h-16 border-b border-border bg-card flex items-center justify-between px-3 sm:px-6 sticky top-0 z-50 overflow-visible">
            <div className="flex items-center gap-4 min-w-0">
              <SidebarTrigger className="lg:hidden flex-shrink-0" />
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              {/* Logout Button */}
              <Button variant="outline" onClick={handleSignOut} className="gap-2">
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">{user?.name ?? 'Usuário'}</span>
              </Button>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-3 sm:p-6 bg-transparent overflow-x-hidden relative z-0">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
