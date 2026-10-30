
'use client';

import * as React from 'react';
import { collection, onSnapshot, query, where, Timestamp, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Ingredient, StockAdjustment, Purchase, IngredientCategory } from '@/lib/types';
import PageHeader from '@/components/page-header';
import { useStore } from '@/components/auth/store-provider';
import { startOfWeek, endOfWeek, subWeeks, startOfDay, endOfDay, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, ShoppingCart, Package } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

type ConsumedItem = { name: string; unit: string; totalConsumed: number; totalCost: number; category: IngredientCategory };

type ItemsByCategory = {
  [key in IngredientCategory]?: ConsumedItem[];
};

interface ConsumptionData {
  period: { start: Date; end: Date };
  itemsByCategory: ItemsByCategory;
  totalWeekCost: number;
}


type GroupedIngredients = {
    [key in IngredientCategory]?: Ingredient[];
};

const categoryOrder: IngredientCategory[] = ['Alimentos', 'Bebidas', 'Descartáveis', 'Limpeza'];


export default function AssistenteComprasPage() {
  const { currentStore } = useStore();
  const [groupedLowStockIngredients, setGroupedLowStockIngredients] = React.useState<GroupedIngredients>({});
  const [consumptionHistory, setConsumptionHistory] = React.useState<ConsumptionData[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isLoadingConsumption, setIsLoadingConsumption] = React.useState(true);
  const [totalLowStockCount, setTotalLowStockCount] = React.useState(0);


  React.useEffect(() => {
    if (!currentStore) return;
    setIsLoading(true);

    // Filtra ingredientes APENAS da loja atual
    const qIngredients = query(
        collection(db, 'ingredients'), 
        where('storeId', '==', currentStore.id)
    );
    
    const unsubscribeIngredients = onSnapshot(qIngredients, (snapshot) => {
      const allIngredients = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ingredient));
      
      const lowStock = allIngredients.filter(ing => {
        const stock = ing.stockQuantity || 0; // Usando estoque individual por loja
        
        if (stock <= 0) return false;

        switch (ing.unit) {
            case 'kg':
            case 'L':
                return stock <= 2;
            case 'un':
                return stock <= 10;
            case 'g':
            case 'ml':
                return stock <= 500;
            default:
                return false;
        }
      });
      
      setTotalLowStockCount(lowStock.length);

      const grouped = lowStock.reduce((acc, ingredient) => {
          const category = ingredient.category;
          if (!acc[category]) {
              acc[category] = [];
          }
          acc[category]!.push(ingredient);
          return acc;
      }, {} as GroupedIngredients);

      setGroupedLowStockIngredients(grouped);
      setIsLoading(false);
    });

    return () => {
      unsubscribeIngredients();
    };
  }, [currentStore]);
  
   React.useEffect(() => {
    if (!currentStore) return;

    setIsLoadingConsumption(true);

    const getCostAtDate = (ingredient: Ingredient, date: Date) => {
        if (!ingredient.priceHistory || ingredient.priceHistory.length === 0) {
            return ingredient.currentCostPerUnit; 
        }
        const sortedHistory = ingredient.priceHistory
            .map(h => ({ ...h, date: (h.date as Timestamp).toDate() }))
            .sort((a, b) => b.date.getTime() - a.date.getTime());
        
        const priceAtOrBeforeDate = sortedHistory.find(h => h.date.getTime() <= date.getTime());

        return priceAtOrBeforeDate ? priceAtOrBeforeDate.cost : ingredient.currentCostPerUnit;
    }

    const calculateConsumptionForWeek = async (weekOffset: number, allIngredients: Ingredient[]) => {
      const today = new Date();
      const targetWeekStart = startOfWeek(subWeeks(today, weekOffset), { weekStartsOn: 1 });
      const targetWeekEnd = endOfDay(endOfWeek(subWeeks(today, weekOffset), { weekStartsOn: 1 }));

      // Usando collection normal com filtro de storeId para garantir isolamento
      const adjustmentsQuery = query(
        collection(db, 'stockAdjustments'),
        where('storeId', '==', currentStore.id),
        where('type', '==', 'saida'),
        where('adjustmentDate', '>=', Timestamp.fromDate(targetWeekStart)),
        where('adjustmentDate', '<=', Timestamp.fromDate(targetWeekEnd))
      );
      const adjustmentsSnapshot = await getDocs(adjustmentsQuery);
      
      const consumptionMap = new Map<string, ConsumedItem>();
      
      for (const doc of adjustmentsSnapshot.docs) {
          const adj = { ...doc.data(), id: doc.id, adjustmentDate: (doc.data().adjustmentDate as Timestamp).toDate() } as StockAdjustment;
          
          if (adj.reason.startsWith('Transferência')) continue;

          const ingredient = allIngredients.find(ing => ing.id === adj.ingredientId);
          if (!ingredient) continue;

          const existing = consumptionMap.get(adj.ingredientId) || {
              name: ingredient.name,
              unit: ingredient.unit,
              totalConsumed: 0,
              totalCost: 0,
              category: ingredient.category,
          };
          
          const costOnDate = getCostAtDate(ingredient, adj.adjustmentDate);
          
          existing.totalConsumed += adj.quantity;
          existing.totalCost += adj.quantity * costOnDate;
          
          consumptionMap.set(adj.ingredientId, existing);
      }
      
      const consumptionArray = Array.from(consumptionMap.values()).sort((a, b) => b.totalCost - a.totalCost);
      const totalWeekCost = consumptionArray.reduce((acc, item) => acc + item.totalCost, 0);

      const itemsByCategory = consumptionArray.reduce((acc, item) => {
          const category = item.category;
          if (!acc[category]) {
              acc[category] = [];
          }
          acc[category]!.push(item);
          return acc;
      }, {} as ItemsByCategory);

      return {
          period: { start: targetWeekStart, end: targetWeekEnd },
          itemsByCategory: itemsByCategory,
          totalWeekCost: totalWeekCost,
      };
    };

    const fetchAllWeeksConsumption = async () => {
        try {
            // Garante que buscamos apenas ingredientes da loja atual
            const ingredientsQuery = query(
                collection(db, 'ingredients'), 
                where('storeId', '==', currentStore.id)
            );
            const ingredientsSnapshot = await getDocs(ingredientsQuery);
            const allIngredients = ingredientsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ingredient));

            const history: ConsumptionData[] = [];
            for (let i = 1; i <= 4; i++) { // Busca últimas 4 semanas
                const weeklyData = await calculateConsumptionForWeek(i, allIngredients);
                if (Object.keys(weeklyData.itemsByCategory).length > 0) {
                  history.push(weeklyData);
                }
            }
            setConsumptionHistory(history);
        } catch (error) {
            console.error("Error calculating weekly consumption history: ", error);
        } finally {
            setIsLoadingConsumption(false);
        }
    }

    fetchAllWeeksConsumption();

  }, [currentStore]);


  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Assistente de Compras"
        description={`Sugestões de reposição para: ${currentStore?.name}`}
      />
      <div className="grid md:grid-cols-2 gap-8 items-start">
        {/* Card de Estoque Baixo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Insumos com Estoque Baixo ({totalLowStockCount})
            </CardTitle>
            <CardDescription>
              Itens que atingiram o nível mínimo de estoque (2 para kg/L, 10 para un, 500 para g/ml).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
                <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </div>
            ) : totalLowStockCount === 0 ? (
                 <div className="text-center h-24 flex items-center justify-center text-muted-foreground">
                    Nenhum item com estoque baixo nesta unidade.
                </div>
            ) : (
                <Accordion type="multiple" defaultValue={categoryOrder.filter(c => groupedLowStockIngredients[c])} className="w-full">
                    {categoryOrder.map(category => {
                        const ingredients = groupedLowStockIngredients[category];
                        if (!ingredients || ingredients.length === 0) return null;
                        
                        return (
                             <AccordionItem value={category} key={category}>
                                <AccordionTrigger>
                                    <div className="flex items-center gap-2">
                                        <Package className="h-5 w-5 text-muted-foreground" />
                                        <span className="text-base font-medium">{category}</span>
                                        <Badge variant="destructive">{ingredients.length}</Badge>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                            <TableHead>Insumo</TableHead>
                                            <TableHead className="text-right">Estoque Atual</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {ingredients.map(ing => (
                                                <TableRow key={ing.id}>
                                                <TableCell className="font-medium">{ing.name}</TableCell>
                                                <TableCell className="text-right">
                                                    <Badge variant="destructive">
                                                    {(ing.stockQuantity || 0).toFixed(3)} {ing.unit}
                                                    </Badge>
                                                </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </AccordionContent>
                             </AccordionItem>
                        )
                    })}
                </Accordion>
            )}
          </CardContent>
        </Card>

        {/* Card de Consumo Semanal */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              Consumo Semanal - {currentStore?.name}
            </CardTitle>
            <CardDescription>
               Análise do consumo de insumos das últimas 4 semanas nesta unidade.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingConsumption ? (
                <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </div>
            ) : (
                <Accordion type="single" collapsible className="w-full">
                    {consumptionHistory.length > 0 ? (
                        consumptionHistory.map((weekData, index) => (
                           <AccordionItem value={`item-${index}`} key={index}>
                                <AccordionTrigger>
                                    <div className="flex justify-between w-full pr-4">
                                        <span>
                                            Semana de {format(weekData.period.start, 'dd/MM')} a {format(weekData.period.end, 'dd/MM/yy')}
                                        </span>
                                        <span className="font-bold text-primary">{formatCurrency(weekData.totalWeekCost)}</span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                     <Accordion type="multiple" className="w-full space-y-2">
                                        {categoryOrder.map(category => {
                                            const items = weekData.itemsByCategory[category];
                                            if (!items || items.length === 0) return null;

                                            return (
                                                <AccordionItem value={category} key={category} className="border-none">
                                                    <AccordionTrigger className="py-2 px-3 bg-muted/50 rounded-md hover:no-underline">
                                                        <div className="flex items-center gap-2">
                                                            <Package className="h-5 w-5 text-muted-foreground" />
                                                            <span className="text-base font-medium">{category}</span>
                                                            <Badge variant="secondary">{items.length}</Badge>
                                                        </div>
                                                    </AccordionTrigger>
                                                    <AccordionContent className="pt-2">
                                                         <Table>
                                                            <TableHeader>
                                                                <TableRow>
                                                                <TableHead>Insumo</TableHead>
                                                                <TableHead className="text-right">Consumido</TableHead>
                                                                <TableHead className="text-right">Custo</TableHead>
                                                                </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                                {items.map(item => (
                                                                    <TableRow key={item.category + item.name}>
                                                                        <TableCell className="font-medium">{item.name}</TableCell>
                                                                        <TableCell className="text-right font-semibold">
                                                                            {item.totalConsumed.toFixed(3)} {item.unit}
                                                                        </TableCell>
                                                                        <TableCell className="text-right font-semibold">
                                                                            {formatCurrency(item.totalCost)}
                                                                        </TableCell>
                                                                    </TableRow>
                                                                ))}
                                                            </TableBody>
                                                        </Table>
                                                    </AccordionContent>
                                                </AccordionItem>
                                            )
                                        })}
                                    </Accordion>
                                </AccordionContent>
                           </AccordionItem>
                        ))
                    ) : (
                        <div className="text-center h-24 flex items-center justify-center text-muted-foreground">
                            Nenhum consumo registrado nesta loja nas últimas 4 semanas.
                        </div>
                    )}
                </Accordion>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
