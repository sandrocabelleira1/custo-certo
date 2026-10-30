'use client';

import * as React from 'react';
import { Pie, PieChart, ResponsiveContainer, Tooltip, Legend, Cell } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { collection, query, where, Timestamp, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Purchase } from '@/lib/types';
import { useStore } from '../auth/store-provider';
import { formatCurrency } from '@/lib/utils';
import { Skeleton } from '../ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

interface ReportProps {
  startDate?: Date;
  endDate?: Date;
}

interface ChartData {
  name: string;
  value: number;
  fill: string;
}

const COLORS: Record<string, string> = {
    'Boleto': 'hsl(var(--chart-1))',
    'Cartão de Crédito': 'hsl(var(--chart-2))',
    'PIX': 'hsl(var(--chart-3))',
    'Dinheiro': 'hsl(var(--chart-4))',
};

export default function PaymentMethodReport({ startDate, endDate }: ReportProps) {
  const { currentStore } = useStore();
  const [chartData, setChartData] = React.useState<ChartData[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (!currentStore) return;
    setIsLoading(true);
    
    const fetchReportData = async () => {
        try {
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

            const spendingByMethod = purchases.reduce((acc, p) => {
                const method = p.paymentMethod || 'Outros';
                acc[method] = (acc[method] || 0) + p.totalAmount;
                return acc;
            }, {} as Record<string, number>);
            
            const formattedData = Object.entries(spendingByMethod).map(([name, value]) => ({
                name,
                value,
                fill: COLORS[name] || 'hsl(var(--muted))'
            })).sort((a, b) => b.value - a.value);
            
            setChartData(formattedData);

        } catch (error) {
            console.error("Error fetching data for payment method chart: ", error);
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
      ...Object.fromEntries(chartData.map(d => [d.name, { label: d.name, color: d.fill}]))
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gastos por Forma de Pagamento</CardTitle>
        <CardDescription>
          Distribuição dos valores pagos aos fornecedores de acordo com a modalidade financeira.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
            <Skeleton className="w-full h-[400px]" />
        ) : chartData.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground border border-dashed rounded-lg">
                Nenhuma compra encontrada no período selecionado.
            </div>
        ) : (
            <div className="grid md:grid-cols-2 gap-8 items-center">
                <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                        <Tooltip
                            cursor={false}
                            content={<ChartTooltipContent
                                hideLabel
                                formatter={(value, name, item) => {
                                    const percentage = totalValue > 0 ? (Number(value) / totalValue * 100).toFixed(1) : 0;
                                    return (
                                        <div className="flex flex-col gap-1">
                                            <div className="font-bold" style={{color: item.payload.fill}}>
                                                {item.payload.name}
                                            </div>
                                            <div>
                                                Total: <span className="font-bold">{formatCurrency(Number(value))}</span> ({percentage}%)
                                            </div>
                                        </div>
                                    )
                                }}
                            />}
                        />
                        <Pie
                            data={chartData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={'80%'}
                            innerRadius={'60%'}
                            labelLine={false}
                            label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                        >
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                        </Pie>
                        <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </ChartContainer>

                <div className="space-y-4">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Forma de Pagamento</TableHead>
                                <TableHead className="text-right">Valor Total</TableHead>
                                <TableHead className="text-right">%</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {chartData.map((item) => (
                                <TableRow key={item.name}>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.fill }}></div>
                                            {item.name}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right font-semibold">
                                        {formatCurrency(item.value)}
                                    </TableCell>
                                    <TableCell className="text-right text-muted-foreground text-xs">
                                        {((item.value / totalValue) * 100).toFixed(1)}%
                                    </TableCell>
                                </TableRow>
                            ))}
                            <TableRow className="bg-muted/50 hover:bg-muted/50 font-bold">
                                <TableCell>TOTAL GERAL</TableCell>
                                <TableCell className="text-right text-primary">
                                    {formatCurrency(totalValue)}
                                </TableCell>
                                <TableCell className="text-right">100%</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
