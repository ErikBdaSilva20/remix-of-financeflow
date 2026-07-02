import { CircleDollarSign, FileText, LayoutDashboard } from '@/components/icons';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { HandCoins, Users, Wallet } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';

const mainNavItems = [
  {
    title: 'Visão Geral',
    url: '/',
    icon: LayoutDashboard,
  },
  {
    title: 'Receita & Despesas',
    url: '/revenue',
    icon: Wallet,
  },
  {
    title: 'Rentabilidade & Fluxo de Caixa',
    url: '/profitability',
    icon: CircleDollarSign,
  },
  {
    title: 'Contas a Receber & a Pagar',
    url: '/receivables',
    icon: HandCoins,
  },
  {
    title: 'Clientes',
    url: '/customers',
    icon: Users,
  },
  {
    title: 'Relatórios e Exportação',
    url: '/reports',
    icon: FileText,
  },
];

export function FinancialSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const collapsed = state === 'collapsed';

  const isActive = (path: string) => {
    if (path === '/') return currentPath === '/';
    return currentPath.startsWith(path);
  };

  const getNavClasses = (path: string) => {
    const active = isActive(path);
    return `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${active ? 'bg-primary-light text-primary' : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}`;
  };

  const getIconClasses = (path: string) => {
    const active = isActive(path);
    return `w-5 h-5 flex-shrink-0 ${active ? 'text-primary' : 'text-muted-foreground'}`;
  };

  return (
    <Sidebar
      className={`${collapsed ? 'w-16' : 'w-64'} border-r border-sidebar-border bg-sidebar transition-all duration-300`}
    >
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
            <LayoutDashboard className="w-5 h-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div>
              <h2 className="text-sidebar-foreground">FinanceFlow</h2>
              <p className="text-xs text-muted-foreground">Painel Financeiro</p>
            </div>
          )}
        </div>
      </div>

      <SidebarContent className="px-4 py-6">
        <SidebarGroup>
          <SidebarGroupLabel
            className={`text-xs font-medium text-muted-foreground mb-3 ${collapsed ? 'hidden' : ''}`}
          >
            NAVEGAÇÃO PRINCIPAL
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavClasses(item.url)}>
                      <item.icon className={getIconClasses(item.url)} />
                      {!collapsed && <span className="font-medium">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
