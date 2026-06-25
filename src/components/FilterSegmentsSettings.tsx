import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, X, Briefcase, Building2, Package, Globe } from "lucide-react";
import { useFilterSegments, SegmentType } from "@/hooks/useFilterSegments";
import { Skeleton } from "@/components/ui/skeleton";

const segmentIcons = {
  project: Briefcase,
  department: Building2,
  product: Package,
  region: Globe,
};

const segmentLabels = {
  project: "Projetos",
  department: "Departamentos",
  product: "Produtos",
  region: "Regiões",
};

const segmentSingularPt = {
  project: "projeto",
  department: "departamento",
  product: "produto",
  region: "região",
};

export function FilterSegmentsSettings() {
  const [activeTab, setActiveTab] = useState<SegmentType>("project");
  const [newValue, setNewValue] = useState("");
  
  const { segments, isLoading, createSegment, deleteSegment, isCreating, isDeleting } = useFilterSegments(activeTab);

  const handleAdd = () => {
    if (newValue.trim()) {
      createSegment({
        segment_type: activeTab,
        segment_value: newValue.trim(),
        is_active: true,
      });
      setNewValue("");
    }
  };

  const handleDelete = (id: string) => {
    deleteSegment(id);
  };

  const SegmentList = ({ type }: { type: SegmentType }) => {
    const typeSegments = segments.filter(s => s.segment_type === type);
    
    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder={`Adicionar novo ${segmentSingularPt[type]}...`}
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            disabled={isCreating}
          />
          <Button onClick={handleAdd} disabled={isCreating || !newValue.trim()}>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {isLoading ? (
            Array(3).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-8 w-24" />
            ))
          ) : typeSegments.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              Nenhum {segmentLabels[type].toLowerCase()} adicionado ainda. Adicione o seu primeiro acima.
            </p>
          ) : (
            typeSegments.map((segment) => (
              <Badge key={segment.id} variant="secondary" className="px-3 py-1.5 gap-2">
                {segment.segment_value}
                <button
                  onClick={() => handleDelete(segment.id)}
                  disabled={isDeleting}
                  className="hover:bg-destructive-20 rounded-full p-0.5 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Segmentos de Filtro</CardTitle>
        <CardDescription>
          Gerencie as opções disponíveis para filtros em todos os painéis. Adicione projetos, departamentos, produtos e regiões personalizados.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as SegmentType)}>
          <TabsList className="grid w-full grid-cols-4">
            {(Object.keys(segmentLabels) as SegmentType[]).map((type) => {
              const Icon = segmentIcons[type];
              return (
                <TabsTrigger key={type} value={type} className="gap-2">
                  <Icon className="w-4 h-4" />
                  {segmentLabels[type]}
                </TabsTrigger>
              );
            })}
          </TabsList>
          
          {(Object.keys(segmentLabels) as SegmentType[]).map((type) => (
            <TabsContent key={type} value={type} className="space-y-4 mt-4">
              <SegmentList type={type} />
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
