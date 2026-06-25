import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Zap, 
  TrendingUp, 
  PieChart, 
  Calculator, 
  FileBarChart, 
  Bell,
  Smartphone,
  Shield,
  CloudUpload,
  Brain,
  Layers,
  Target
} from "lucide-react";

const Features = () => {
  const features = [
    {
      icon: TrendingUp,
      title: "Análise Avançada",
      description: "Obtenha insights profundos sobre seu desempenho financeiro com análises baseadas em IA",
      status: "available",
      category: "Análise"
    },
    {
      icon: PieChart,
      title: "Painéis Interativos",
      description: "Painéis personalizáveis com visualização de dados em tempo real",
      status: "available",
      category: "Visualização"
    },
    {
      icon: Calculator,
      title: "Projeções Financeiras",
      description: "Preveja tendências futuras e planeje sua estratégia financeira",
      status: "coming-soon",
      category: "Planejamento"
    },
    {
      icon: FileBarChart,
      title: "Relatórios Automatizados",
      description: "Gere relatórios financeiros abrangentes automaticamente",
      status: "available",
      category: "Relatórios"
    },
    {
      icon: Bell,
      title: "Notificações Inteligentes",
      description: "Receba alertas de eventos financeiros importantes e metas",
      status: "beta",
      category: "Alertas"
    },
    {
      icon: Smartphone,
      title: "Aplicativo Móvel",
      description: "Acesse seus dados financeiros de qualquer lugar com nosso aplicativo móvel",
      status: "coming-soon",
      category: "Móvel"
    },
    {
      icon: Shield,
      title: "Segurança de Nível Bancário",
      description: "Segurança de nível corporativo para proteger seus dados financeiros confidenciais",
      status: "available",
      category: "Segurança"
    },
    {
      icon: CloudUpload,
      title: "Backup em Nuvem",
      description: "Backup automático e sincronização em todos os seus dispositivos",
      status: "available",
      category: "Armazenamento"
    },
    {
      icon: Brain,
      title: "Insights de IA",
      description: "Algoritmos de aprendizado de máquina para identificar padrões e oportunidades",
      status: "beta",
      category: "IA"
    },
    {
      icon: Layers,
      title: "Suporte Multi-Moedas",
      description: "Gerencie múltiplas moedas com taxas de câmbio em tempo real",
      status: "coming-soon",
      category: "Internacional"
    },
    {
      icon: Target,
      title: "Acompanhamento de Metas",
      description: "Defina e acompanhe suas metas financeiras com monitoramento de progresso",
      status: "available",
      category: "Planejamento"
    },
    {
      icon: Zap,
      title: "Integração de API",
      description: "Conecte-se com mais de 500 instituições e serviços financeiros",
      status: "available",
      category: "Integração"
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "available":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Disponível</Badge>;
      case "beta":
        return <Badge className="bg-primary-light text-primary hover:bg-primary-light">Beta</Badge>;
      case "coming-soon":
        return <Badge className="bg-muted text-muted-foreground hover:bg-muted">Em breve</Badge>;
      default:
        return null;
    }
  };

  const categories = [...new Set(features.map(f => f.category))];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl tracking-tight">Recursos</h1>
        <p className="text-muted-foreground">
          Descubra todos os recursos poderosos que tornam o FinanceFlow a melhor escolha para sua gestão financeira
        </p>
      </div>

      {/* Feature Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Recursos</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{features.length}</div>
            <p className="text-xs text-muted-foreground">
              Em {categories.length} categorias
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Disponíveis Agora</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {features.filter(f => f.status === "available").length}
            </div>
            <p className="text-xs text-muted-foreground">
              Pronto para uso
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Desenvolvimento</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {features.filter(f => f.status === "coming-soon" || f.status === "beta").length}
            </div>
            <p className="text-xs text-muted-foreground">
              Em breve
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Features Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <Card key={feature.title} className="transition-all duration-200 hover:shadow-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-10 h-10 bg-primary-light rounded-lg">
                    <feature.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                    <p className="text-xs text-muted-foreground">{feature.category}</p>
                  </div>
                </div>
                {getStatusBadge(feature.status)}
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="mb-4">
                {feature.description}
              </CardDescription>
              <Button 
                variant={feature.status === "available" ? "default" : "outline"} 
                size="sm"
                disabled={feature.status === "coming-soon"}
                className="w-full"
              >
                {feature.status === "available" ? "Usar Agora" : 
                 feature.status === "beta" ? "Testar Beta" : "Em Breve"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Feature Request */}
      <Card>
        <CardHeader>
          <CardTitle>Solicitar um Recurso</CardTitle>
          <CardDescription>
            Tem uma ideia de recurso novo? Gostaríamos muito de ouvir você!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4">
            <Button>Enviar Solicitação de Recurso</Button>
            <Button variant="outline">Participar do Programa Beta</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Features;