
'use client';
import * as React from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { collection, query, onSnapshot, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Purchase } from '@/lib/types';
import { Separator } from '../ui/separator';
import { Badge } from '../ui/badge';
import { formatCurrency } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { useStore } from '../auth/store-provider';

interface ReportProps {
  startDate?: Date;
  endDate?: Date;
}

interface AbcData {
  name: string;
  value: number;
  percentage: number;
  items: { id: string; name: string; totalSpent: number; }[];
}

const chartConfig = {
  value: {
    label: 'Custo Total (R$)',
  },
  'Curva A': { color: 'hsl(var(--destructive))' },
  'Curva B': { color: 'hsl(var(--primary))' },
  'Curva C': { color: 'hsl(var(--secondary))' },
};


export default function AbcChart({ startDate, endDate }: ReportProps) {
  const { currentStore } = useStore();
  const [abcData, setAbcData] = React.useState<AbcData[] | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (!currentStore) return;
    setIsLoading(true);
    let q = query(collection(db, 'purchases'), where('storeId', '==', currentStore.id));

    if (startDate || endDate) {
        const start = startDate ? Timestamp.fromDate(startDate) : null;
        const end = endDate ? Timestamp.fromDate(endDate) : null;
        if (start && end) {
            q = query(q, where('purchaseDate', '>=', start), where('purchaseDate', '<=', end));
        } else if (start) {
            q = query(q, where('purchaseDate', '>=', start));
        } else if (end) {
            q = query(q, where('purchaseDate', '<=', end));
        }
    }
    
    const unsubscribePurchases = onSnapshot(q, (purchaseSnapshot) => {
      const purchases: Purchase[] = [];
      purchaseSnapshot.forEach(doc => {
        purchases.push(doc.data() as Purchase);
      });

      const spendingByIngredient = purchases.flatMap(p => p.items).reduce((acc, item) => {
          acc[item.ingredientId] = {
              name: item.productName,
              totalSpent: (acc[item.ingredientId]?.totalSpent || 0) + item.totalPrice
          };
          return acc;
      }, {} as Record<string, { name: string; totalSpent: number }>);
      
      const sortedIngredients = Object.entries(spendingByIngredient)
          .map(([id, data]) => ({ id, ...data }))
          .sort((a, b) => b.totalSpent - a.totalSpent);
          
      const totalCost = sortedIngredients.reduce((sum, item) => sum + item.totalSpent, 0);

      const classA: AbcData = { name: 'Curva A', value: 0, percentage: 0, items: [] };
      const classB: AbcData = { name: 'Curva B', value: 0, percentage: 0, items: [] };
      const classC: AbcData = { name: 'Curva C', value: 0, percentage: 0, items: [] };
      
      if (totalCost > 0) {
        let cumulativeValue = 0;
        sortedIngredients.forEach(item => {
            cumulativeValue += item.totalSpent;
            const cumulativePercentage = (cumulativeValue / totalCost) * 100;

            if (cumulativePercentage <= 80) {
                classA.items.push(item);
                classA.value += item.totalSpent;
            } else if (cumulativePercentage <= 95) {
                classB.items.push(item);
                classB.value += item.totalSpent;
            } else {
                classC.items.push(item);
                classC.value += item.totalSpent;
            }
        });

        classA.percentage = (classA.value / totalCost) * 100;
        classB.percentage = (classB.value / totalCost) * 100;
        classC.percentage = (classC.value / totalCost) * 100;
      }

      setAbcData([classA, classB, classC]);
      setIsLoading(false);

    }, (error) => {
        console.error("Error fetching purchases for ABC chart: ", error);
        setIsLoading(false);
    });

    return () => unsubscribePurchases();
  }, [startDate, endDate, currentStore]);

  const chartData = abcData?.map(d => ({
      name: d.name,
      value: d.value,
      fill: `var(--color-${d.name})`
  })) || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Relatório de Curva ABC</CardTitle>
        <CardDescription>
          Classificação de insumos pela sua importância no custo total de compras no período.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {isLoading ? (
            <p>Carregando dados do relatório...</p>
        ) : !abcData || abcData.reduce((sum, d) => sum + d.value, 0) === 0 ? (
            <p className="text-center text-muted-foreground">Nenhuma compra encontrada no período para gerar o relatório.</p>
        ) : (
            <>
                <ChartContainer config={chartConfig} className="h-[250px] w-full">
                    <ResponsiveContainer>
                        <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 30 }}>
                            <CartesianGrid horizontal={false} />
                            <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} tickMargin={10} width={80} />
                            <XAxis dataKey="value" type="number" hide />
                            <Tooltip
                                cursor={{ fill: 'hsl(var(--muted))' }}
                                content={<ChartTooltipContent
                                    formatter={(value, name, item) => (
                                        <div className="flex flex-col gap-1">
                                            <span className="font-bold text-lg" style={{ color: `var(--color-${item.payload.name})` }}>{item.payload.name}</span>
                                            <span>Custo: <span className="font-bold">{formatCurrency(Number(value))}</span></span>
                                        </div>
                                    )}
                                    hideIndicator
                                    hideLabel
                                />}
                            />
                            <Bar dataKey="value" radius={5} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>

                <div className="space-y-6">
                    {abcData.map((curve) => (
                        <div key={curve.name}>
                            <div className="flex items-center gap-4 mb-4">
                               <div className="w-4 h-8 rounded" style={{ backgroundColor: `var(--color-${curve.name})` }}></div>
                               <div>
                                    <h3 className="text-xl font-semibold">{curve.name}</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Representa <span className="font-bold">{formatCurrency(curve.value)}</span> ({curve.percentage.toFixed(1)}% do custo total) com <span className="font-bold">{curve.items.length}</span> itens.
                                    </p>
                               </div>
                            </div>
                           <Table>
                               <TableHeader>
                                   <TableRow>
                                       <TableHead>Insumo</TableHead>
                                       <TableHead className="text-right">Valor Gasto</TableHead>
                                   </TableRow>
                               </TableHeader>
                               <TableBody>
                                   {curve.items.map(item => (
                                       <TableRow key={item.id}>
                                           <TableCell className="font-medium">{item.name}</TableCell>
                                           <TableCell className="text-right font-semibold">{formatCurrency(item.totalSpent)}</TableCell>
                                       </TableRow>
                                   ))}
                               </TableBody>
                           </Table>
                        </div>
                    ))}
                </div>
            </>
        )}
      </CardContent>
    </Card>
  );
}
