import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { FinancialSidebar } from "./FinancialSidebar";
import { NotificationPopover } from "./NotificationPopover";
import { SearchResults } from "./SearchResults";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState, useRef } from "react";
import { useGlobalSearch, SearchResult } from "@/hooks/useGlobalSearch";
import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { ParticleBackground } from "./ParticleBackground";
import { useAppDataPrefetch } from "@/hooks/useAppDataPrefetch";

export function DashboardLayout() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const { results, isLoading } = useGlobalSearch(searchQuery);
  useAppDataPrefetch();

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setShowResults(value.trim().length >= 2);
  };

  const handleResultClick = (result: SearchResult) => {
    setShowResults(false);
    setSearchQuery("");

    // Navigate based on result type with specific item IDs
    switch (result.type) {
      case 'invoice':
        navigate(`/receivables?invoiceId=${result.id}`);
        break;
      case 'payment':
        navigate(`/receivables?paymentId=${result.id}`);
        break;
      case 'customer':
        navigate(`/receivables?customerId=${result.id}`);
        break;
      case 'contact':
        // Navigate to overview with contact highlighted
        toast({
          title: "Contato Encontrado",
          description: `${result.title} - ${result.subtitle}`,
        });
        navigate('/');
        break;
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Saída realizada com sucesso",
      description: "Você foi desconectado do FinanceFlow.",
    });
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background relative">
        <ParticleBackground />
        <FinancialSidebar />
        
        <div className="flex-1 flex flex-col overflow-visible relative z-10">
          {/* Header */}
          <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 sticky top-0 z-50 overflow-visible">
            <div className="flex items-center gap-4 flex-1 overflow-visible relative">
              <SidebarTrigger className="lg:hidden" />
              
              {/* Search Bar */}
              <div className="relative flex-1 max-w-2xl z-50" ref={searchRef}>
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 z-10" />
                <Input
                  placeholder="Pesquise por transações, contas e qualquer coisa financeira"
                  className="pl-10 bg-muted-50 border-none"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onFocus={() => searchQuery.trim().length >= 2 && setShowResults(true)}
                />
                {showResults && (
                  <SearchResults results={results} onResultClick={handleResultClick} />
                )}
                {isLoading && searchQuery.trim().length >= 2 && (
                  <div className="absolute top-full left-0 right-0 mt-2 p-4 bg-card rounded-md shadow-2xl z-[9999] border border-border">
                    <p className="text-sm text-muted-foreground text-center">Pesquisando...</p>
                  </div>
                )}
              </div>
              
            </div>
            
            <div className="flex items-center gap-3">
              {/* Notification Bell */}
              <NotificationPopover />

              {/* Logout Button */}
              <Button
                variant="outline"
                onClick={handleSignOut}
                className="gap-2"
                title={user?.email}
              >
                <LogOut className="w-4 h-4" />
                {user?.name ?? user?.email ?? 'Sair'}
              </Button>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-6 bg-transparent overflow-auto relative z-0">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}