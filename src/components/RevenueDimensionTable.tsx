import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface DimensionData {
  dimension: string;
  amount: number;
  percentage: number;
}

interface RevenueDimensionTableProps {
  productData: DimensionData[];
  regionData: DimensionData[];
  channelData: DimensionData[];
  formatCurrency: (amount: number) => string;
  onDimensionClick?: (dimension: string, dimensionType: 'product' | 'region' | 'channel') => void;
}

export function RevenueDimensionTable({
  productData,
  regionData,
  channelData,
  formatCurrency,
  onDimensionClick,
}: RevenueDimensionTableProps) {
  const renderTable = (data: DimensionData[], dimensionType: 'product' | 'region' | 'channel') => {
    if (!data || data.length === 0) {
      return (
        <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
          Sem dados disponíveis
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Dimensão</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-right">% Participação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, index) => (
              <TableRow
                key={index}
                className={onDimensionClick ? 'cursor-pointer hover:bg-muted-50' : ''}
                onClick={() => onDimensionClick && onDimensionClick(row.dimension, dimensionType)}
              >
                <TableCell className="font-medium">{row.dimension || 'Não especificado'}</TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(row.amount)}
                </TableCell>
                <TableCell className="text-right">{row.percentage.toFixed(1)}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Receita por Dimensão</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="product" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="product">Produto</TabsTrigger>
            <TabsTrigger value="region">Região</TabsTrigger>
            <TabsTrigger value="channel">Canal</TabsTrigger>
          </TabsList>
          <TabsContent value="product" className="mt-4">
            {renderTable(productData, 'product')}
          </TabsContent>
          <TabsContent value="region" className="mt-4">
            {renderTable(regionData, 'region')}
          </TabsContent>
          <TabsContent value="channel" className="mt-4">
            {renderTable(channelData, 'channel')}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
