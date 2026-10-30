
'use client';

import * as React from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { format, startOfDay, subMonths, startOfYear, endOfToday, eachDayOfInterval, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { collection, query, where, Timestamp, onSnapshot } from 'firebase/firestore';
import { CandlestickChart, Info } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { db } from '@/lib/firebase';
import type { Purchase, Revenue } from '@/lib/types';
import { useStore } from '../auth/store-provider';
import { Skeleton } from '../ui/skeleton';
import { formatCurrency } from '@/lib/utils';
import { Button } from '../ui/button';
import { Tooltip as UiTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

interface DailyData {
    date: string;
    revenue: number;
    cost: number;
}

const chartConfig = {
    revenue: {
        label: "Faturamento",
        color: "hsl(var(--chart-6))",
    },
    cost: {
        label: "Custo",
        color: "hsl(var(--chart-7))",
    }
};

export default function TradeChart() {
    const { currentStore } = useStore();
    const [data, setData] = React.useState<{ cumulative: DailyData[], daily: DailyData[] }>({ cumulative: [], daily: []});
    const [isLoading, setIsLoading] = React.useState(true);
    const [chartType, setChartType] = React.useState<'area' | 'bar'>('area');

    React.useEffect(() => {
        if (!currentStore) return;

        setIsLoading(true);

        const now = new Date();
        const startDate = startOfMonth(now);
        const endDate = endOfToday();

        const qRevenues = query(
            collection(db, 'revenues'),
            where('storeId', '==', currentStore.id),
            where('date', '>=', Timestamp.fromDate(startDate)),
            where('date', '<=', Timestamp.fromDate(endDate))
        );

        const qPurchases = query(
            collection(db, 'purchases'),
            where('storeId', '==', currentStore.id),
            where('purchaseDate', '>=', Timestamp.fromDate(startDate)),
            where('purchaseDate', '<=', Timestamp.fromDate(endDate))
        );

        let revenuesByDay: { [key: string]: number } = {};
        let costsByDay: { [key: string]: number } = {};

        const updateData = () => {
            const allDaysInRange = eachDayOfInterval({ start: startDate, end: endDate });
            let cumulativeCost = 0;
            let cumulativeRevenue = 0;
            const dailyData: DailyData[] = [];
            const cumulativeData: DailyData[] = [];
            
            allDaysInRange.forEach(dayDate => {
                const dayString = format(dayDate, 'yyyy-MM-dd');
                const dailyCost = costsByDay[dayString] || 0;
                const dailyRevenue = revenuesByDay[dayString] || 0;

                if (dailyCost > 0 || dailyRevenue > 0) {
                    dailyData.push({ date: dayString, revenue: dailyRevenue, cost: dailyCost });
                }

                cumulativeCost += dailyCost;
                cumulativeRevenue += dailyRevenue;
                cumulativeData.push({ date: dayString, revenue: cumulativeRevenue, cost: cumulativeCost });
            });
            setData({ daily: dailyData, cumulative: cumulativeData });
        };

        const unsubRevenues = onSnapshot(qRevenues, (snapshot) => {
            revenuesByDay = {};
            snapshot.forEach(doc => {
                const revenue = doc.data() as Revenue;
                const day = format((revenue.date as Timestamp).toDate(), 'yyyy-MM-dd');
                revenuesByDay[day] = (revenuesByDay[day] || 0) + revenue.amount;
            });
            updateData();
            setIsLoading(false);
        });

        const unsubPurchases = onSnapshot(qPurchases, (snapshot) => {
            costsByDay = {};
            snapshot.forEach(doc => {
                const purchase = doc.data() as Purchase;
                const day = format((purchase.purchaseDate as unknown as Timestamp).toDate(), 'yyyy-MM-dd');
                costsByDay[day] = (costsByDay[day] || 0) + purchase.totalAmount;
            });
            updateData();
            setIsLoading(false);
        });

        return () => {
            unsubRevenues();
            unsubPurchases();
        };
    }, [currentStore]);


    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                        <CardTitle>Análise de Trade</CardTitle>
                        <TooltipProvider>
                            <UiTooltip>
                                <TooltipTrigger asChild>
                                    <Info className="h-4 w-4 text-muted-foreground cursor-pointer" />
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Acompanhe a evolução do custo vs faturamento {chartType === 'area' ? 'acumulado' : 'diário'} no mês.</p>
                                </TooltipContent>
                            </UiTooltip>
                        </TooltipProvider>
                    </div>
                     <TooltipProvider>
                        <UiTooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setChartType(prev => prev === 'area' ? 'bar' : 'area')}
                                >
                                    <CandlestickChart className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Alternar visualização (Diário/Acumulado)</p>
                            </TooltipContent>
                        </UiTooltip>
                    </TooltipProvider>
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <Skeleton className="w-full h-[350px]" />
                ) : data.cumulative.length === 0 ? (
                    <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                        Nenhum dado encontrado para o período.
                    </div>
                ) : (
                    <ChartContainer config={chartConfig} className="h-[350px] w-full">
                         {chartType === 'area' ? (
                            <ResponsiveContainer>
                                <AreaChart
                                    data={data.cumulative}
                                    margin={{ top: 10, right: 30, left: 20, bottom: 0 }}
                                >
                                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                                    <XAxis
                                        dataKey="date"
                                        tickLine={false}
                                        axisLine={false}
                                        tickMargin={8}
                                        tickFormatter={(value) => format(new Date(value + 'T00:00:00'), "dd/MM", { locale: ptBR })}
                                    />
                                    <YAxis
                                        tickLine={false}
                                        axisLine={false}
                                        tickMargin={8}
                                        tickFormatter={(value) => formatCurrency(Number(value))}
                                    />
                                    <Tooltip
                                        cursor={true}
                                        content={<ChartTooltipContent
                                            formatter={(value, name, item) => (
                                                <div className="flex flex-col gap-1 text-sm">
                                                    <span className="font-bold">{format(new Date(item.payload.date + 'T00:00:00'), 'PPP', { locale: ptBR })}</span>
                                                    <div className="flex justify-between">
                                                        <span className="text-muted-foreground">Faturamento Acum.:</span>
                                                        <span className="font-bold" style={{color: 'hsl(var(--chart-6))'}}>{formatCurrency(item.payload.revenue)}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-muted-foreground">Custo Acum.:</span>
                                                        <span className="font-bold" style={{color: 'hsl(var(--chart-7))'}}>{formatCurrency(item.payload.cost)}</span>
                                                    </div>
                                                </div>
                                            )}
                                            hideLabel
                                            hideIndicator
                                        />}
                                    />
                                    <Area type="monotone" dataKey="revenue" strokeWidth={2} stroke="var(--color-revenue)" fillOpacity={0.1} fill="var(--color-revenue)" />
                                    <Area type="monotone" dataKey="cost" strokeWidth={2} stroke="var(--color-cost)" fillOpacity={0.1} fill="var(--color-cost)" />
                                </AreaChart>
                            </ResponsiveContainer>
                         ) : (
                             <ResponsiveContainer>
                                 <BarChart data={data.daily} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                                    <XAxis
                                        dataKey="date"
                                        tickLine={false}
                                        axisLine={false}
                                        tickMargin={8}
                                        tickFormatter={(value) => format(new Date(value + 'T00:00:00'), "dd/MM", { locale: ptBR })}
                                    />
                                     <YAxis
                                        tickLine={false}
                                        axisLine={false}
                                        tickMargin={8}
                                        tickFormatter={(value) => formatCurrency(Number(value))}
                                    />
                                     <Tooltip
                                        cursor={true}
                                        content={<ChartTooltipContent
                                            formatter={(value, name, item) => (
                                                <div className="flex flex-col gap-1 text-sm">
                                                    <span className="font-bold">{format(new Date(item.payload.date + 'T00:00:00'), 'PPP', { locale: ptBR })}</span>
                                                    <div className="flex justify-between">
                                                        <span className="text-muted-foreground">Faturamento:</span>
                                                        <span className="font-bold" style={{color: 'hsl(var(--chart-6))'}}>{formatCurrency(item.payload.revenue)}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-muted-foreground">Custo:</span>
                                                        <span className="font-bold" style={{color: 'hsl(var(--chart-7))'}}>{formatCurrency(item.payload.cost)}</span>
                                                    </div>
                                                </div>
                                            )}
                                            hideLabel
                                            hideIndicator
                                        />}
                                    />
                                    <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="cost" fill="var(--color-cost)" radius={[4, 4, 0, 0]} />
                                 </BarChart>
                             </ResponsiveContainer>
                         )}
                    </ChartContainer>
                )}
            </CardContent>
        </Card>
    );
}
