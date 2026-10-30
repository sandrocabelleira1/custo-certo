
'use client';

import * as React from 'react';
import { Line, LineChart, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Info } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Ingredient } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useStore } from '../auth/store-provider';
import { Tooltip as UiTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

export default function PriceChart() {
  const { currentStore } = useStore();
  const [ingredients, setIngredients] = React.useState<Ingredient[]>([]);
  const [selectedIngredientId, setSelectedIngredientId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!currentStore) return;
    const q = query(
      collection(db, 'ingredients'),
      orderBy('name', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const ingredientsData: Ingredient[] = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            ingredientsData.push({ ...data, id: doc.id } as Ingredient);
        });
        
        setIngredients(ingredientsData);
        if (!selectedIngredientId || !ingredientsData.some(i => i.id === selectedIngredientId)) {
           setSelectedIngredientId(ingredientsData.length > 0 ? ingredientsData[0].id : null);
        }
    });

    return () => unsubscribe();
  }, [currentStore, selectedIngredientId]);

  const selectedIngredient = React.useMemo(() => {
    return ingredients.find(ing => ing.id === selectedIngredientId);
  }, [ingredients, selectedIngredientId]);


  const chartData = selectedIngredient?.priceHistory.map(item => ({
    date: (item.date as any).toDate ? (item.date as any).toDate() : item.date,
    cost: item.cost,
  })) || [];

  const chartConfig = {
    cost: {
      label: `Custo (R$)`,
      color: 'hsl(var(--primary))',
    },
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
            <CardTitle>Flutuação de Preços</CardTitle>
             <TooltipProvider>
                <UiTooltip>
                    <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-pointer" />
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Acompanhe a variação de custo de um insumo ao longo do tempo.</p>
                    </TooltipContent>
                </UiTooltip>
            </TooltipProvider>
        </div>
        <div className="pt-2">
            <Select onValueChange={setSelectedIngredientId} value={selectedIngredientId ?? ''} disabled={ingredients.length === 0}>
                <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Selecione um insumo" />
                </SelectTrigger>
                <SelectContent>
                    {ingredients.map(ing => (
                        <SelectItem key={ing.id} value={ing.id}>{ing.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => format(new Date(value), 'dd/MM', { locale: ptBR })}
                />
                <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(value) => formatCurrency(value)}
                />
                <Tooltip
                cursor={false}
                content={<ChartTooltipContent
                    formatter={(value, name, item) => (
                        <div className="flex flex-col">
                            <span>{format(new Date(item.payload.date), "PPP", { locale: ptBR })}</span>
                            <span className="font-bold text-primary">{formatCurrency(Number(value))}</span>
                        </div>
                    )}
                    labelClassName="text-sm"
                    hideIndicator
                    hideLabel
                    />}
                />
                <Line
                dataKey="cost"
                type="monotone"
                stroke="var(--color-cost)"
                strokeWidth={2}
                dot={true}
                />
            </LineChart>
            </ChartContainer>
        ) : (
             <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                {ingredients.length > 0 ? "Selecione um insumo para ver o gráfico." : "Nenhum insumo cadastrado."}
            </div>
        )}
      </CardContent>
    </Card>
  );
}
