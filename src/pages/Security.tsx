import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Lock, Eye, Key, AlertTriangle, CheckCircle } from "lucide-react";
import { FilterHeader, FilterState } from "@/components/FilterHeader";
import { FilterSegmentsSettings } from "@/components/FilterSegmentsSettings";

const Security = () => {
  const [filters, setFilters] = useState<FilterState>({
    dateRange: {},
    currency: 'USD'
  });
  const securityFeatures = [
    {
      icon: Shield,
      title: "Criptografia de Ponta a Ponta",
      description: "Todos os seus dados financeiros são criptografados em trânsito e em repouso",
      status: "active",
    },
    {
      icon: Lock,
      title: "Autenticação de Dois Fatores",
      description: "Camada adicional de segurança para o acesso à sua conta",
      status: "active",
    },
    {
      icon: Eye,
      title: "Controles de Privacidade",
      description: "Controle quem pode acessar suas informações financeiras",
      status: "active",
    },
    {
      icon: Key,
      title: "Segurança de API",
      description: "Gerenciamento seguro de chaves de API para serviços conectados",
      status: "active",
    },
  ];

  const securityStats = [
    { label: "Pontuação de Segurança", value: "95%", status: "good" },
    { label: "Última Verificação", value: "há 2 horas", status: "good" },
    { label: "Vulnerabilidades", value: "0", status: "good" },
    { label: "Apps Conectados", value: "3", status: "warning" },
  ];

  return (
    <div className="space-y-0">
      <FilterHeader 
        filters={filters}
        onFiltersChange={setFilters}
        showFxCurrency={false}
      />
      
      <div className="space-y-6 p-4">
      <div>
        <h1 className="text-3xl tracking-tight">Segurança</h1>
        <p className="text-muted-foreground">
          Monitore e gerencie as configurações de segurança da sua conta
        </p>
      </div>

      {/* Security Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {securityStats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.label}
              </CardTitle>
              {stat.status === "good" ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Security Features */}
      <Card>
        <CardHeader>
          <CardTitle>Recursos de Segurança</CardTitle>
          <CardDescription>
            Sua conta está protegida por estas medidas de segurança
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            {securityFeatures.map((feature) => (
              <div key={feature.title} className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg">
                    <feature.icon className="w-5 h-5 text-green-600" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm text-foreground">
                      {feature.title}
                    </h3>
                    <Badge variant="secondary" className="text-xs">
                      Ativo
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filter Segments Settings */}
      <FilterSegmentsSettings />

      {/* Recent Security Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Atividade de Segurança Recente</CardTitle>
          <CardDescription>
            Últimos eventos de segurança e atividade de login
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                  Login bem-sucedido a partir de um novo dispositivo
                </p>
                <p className="text-sm text-muted-foreground">
                  MacBook Pro • há 2 horas
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                  Senha alterada com sucesso
                </p>
                <p className="text-sm text-muted-foreground">
                  Ontem às 15:45
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                  Autenticação de dois fatores ativada
                </p>
                <p className="text-sm text-muted-foreground">
                  há 3 dias
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
};

export default Security;