'use client';

import * as React from 'react';
import { Pie, PieChart, ResponsiveContainer, Tooltip, Legend, Cell } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { collection, query, onSnapshot, where, Timestamp, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Purchase, Ingredient, IngredientCategory } from '@/lib/types';
import { useStore } from '../auth/store-provider';
import { formatCurrency } from '@/lib/utils';
import { Skeleton } from '../ui/skeleton';

interface ReportProps {
  startDate?: Date;
  endDate?: Date;
}

interface ChartData {
  category: IngredientCategory;
  value: number;
  fill: string;
}

const COLORS: Record<IngredientCategory, string> = {
    Alimentos: 'hsl(var(--chart-1))',
    Bebidas: 'hsl(var(--chart-2))',
    Descartáveis: 'hsl(var(--chart-3))',
    Limpeza: 'hsl(var(--chart-4))',
};

export default function CategoryCostChart({ startDate, endDate }: ReportProps) {
  const { currentStore } = useStore();
  const [chartData, setChartData] = React.useState<ChartData[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (!currentStore) return;
    setIsLoading(true);
    
    const fetchReportData = async () => {
        try {
            // 1. Fetch all ingredients first to ensure we have category data
            const ingredientsQuery = query(collection(db, 'ingredients'));
            const ingredientSnap = await getDocs(ingredientsQuery);
            const ingredients: Record<string, Ingredient> = {};
            ingredientSnap.forEach(doc => {
                ingredients[doc.id] = { ...doc.data(), id: doc.id } as Ingredient;
            });

            // 2. Fetch purchases for the current store and period
            let purchasesQuery = query(collection(db, 'purchases'), where('storeId', '==', currentStore.id));
            if (startDate || endDate) {
                const start = startDate ? Timestamp.fromDate(startDate) : null;
                const end = endDate ? Timestamp.fromDate(endDate) : null;
                if (start && end) {
                    purchasesQuery = query(purchasesQuery, where('purchaseDate', '>=', start), where('purchaseDate', '<=', end));
                } else if (start) {
                    purchasesQuery = query(purchasesQuery, where('purchaseDate', '>=', start));
                } else if (end) {
                    purchasesQuery = query(purchasesQuery, where('purchaseDate', '<=', end));
                }
            }
            
            const purchaseSnap = await getDocs(purchasesQuery);
            const purchases = purchaseSnap.docs.map(doc => doc.data() as Purchase);

            // 3. Process data now that we have everything
            const spendingByCategory = purchases.flatMap(p => p.items).reduce((acc, item) => {
                const ingredient = ingredients[item.ingredientId];
                if (ingredient) {
                    const category = ingredient.category;
                    acc[category] = (acc[category] || 0) + item.totalPrice;
                }
                return acc;
            }, {} as Record<IngredientCategory, number>);
            
            const formattedData = Object.entries(spendingByCategory).map(([category, value]) => ({
                category: category as IngredientCategory,
                value: value,
                fill: COLORS[category as IngredientCategory]
            }));
            
            setChartData(formattedData);

        } catch (error) {
            console.error("Error fetching data for category chart: ", error);
        } finally {
            setIsLoading(false);
        }
    }
    
    fetchReportData();
    
  }, [startDate, endDate, currentStore]);

  const totalValue = React.useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.value, 0);
  }, [chartData]);

  const chartConfig = {
      value: { label: 'Valor (R$)'},
      ...Object.fromEntries(chartData.map(d => [d.category, { label: d.category, color: d.fill}]))
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Relatório de Custo por Categoria</CardTitle>
        <CardDescription>
          Distribuição dos gastos com insumos por categoria no período selecionado.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
            <Skeleton className="w-full h-[400px]" />
        ) : chartData.length === 0 ? (
            <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                Nenhuma compra encontrada no período para gerar o gráfico.
            </div>
        ) : (
             <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                    <Tooltip
                        cursor={false}
                        content={<ChartTooltipContent
                            hideLabel
                            formatter={(value, name, item) => {
                                const percentage = totalValue > 0 ? (Number(value) / totalValue * 100).toFixed(2) : 0;
                                return (
                                    <div className="flex flex-col gap-1">
                                        <div className="font-bold" style={{color: item.payload.fill}}>
                                            {item.payload.category}
                                        </div>
                                        <div>
                                            Valor: <span className="font-bold">{formatCurrency(Number(value))}</span> ({percentage}%)
                                        </div>
                                    </div>
                                )
                            }}
                        />}
                    />
                    <Pie
                        data={chartData}
                        dataKey="value"
                        nameKey="category"
                        cx="50%"
                        cy="50%"
                        outerRadius={'80%'}
                        innerRadius={'60%'}
                        labelLine={false}
                        label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
                           const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                           const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                           const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                            return (
                                <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-xs font-bold">
                                    {`${(percent * 100).toFixed(0)}%`}
                                </text>
                            );
                        }}
                    >
                         {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                    </Pie>
                    <Legend content={<ChartTooltipContent hideIndicator />} />
                    </PieChart>
                </ResponsiveContainer>
             </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
