
'use client';

import * as React from 'react';
import { Line, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { format, startOfDay, subMonths, startOfYear, endOfToday, eachDayOfInterval, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { collection, query, where, Timestamp, onSnapshot } from 'firebase/firestore';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { db } from '@/lib/firebase';
import type { Purchase, Revenue } from '@/lib/types';
import { useStore } from '../auth/store-provider';
import { Skeleton } from '../ui/skeleton';

interface DailyData {
    date: string;
    revenue: number;
    cost: number;
    cmv: number;
}

const chartConfig = {
    cmv: {
        label: "CMV (%)",
        color: "hsl(var(--primary))",
    },
};

export default function CmvChart() {
    const { currentStore } = useStore();
    const [data, setData] = React.useState<DailyData[]>([]);
    const [period, setPeriod] = React.useState('currentMonth');
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
        if (!currentStore) return;

        setIsLoading(true);

        const now = new Date();
        let startDate: Date;
        const endDate = endOfToday();

        switch (period) {
            case 'last3Months':
                startDate = startOfDay(subMonths(now, 3));
                break;
            case 'last6Months':
                startDate = startOfDay(subMonths(now, 6));
                break;
            case 'currentYear':
                startDate = startOfYear(now);
                break;
            case 'currentMonth':
            default:
                startDate = startOfMonth(now);
                break;
        }

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

        const unsubRevenues = onSnapshot(qRevenues, (revenueSnapshot) => {
            const revenuesByDay: { [key: string]: number } = {};
            revenueSnapshot.forEach(doc => {
                const revenue = doc.data() as Revenue;
                const day = format((revenue.date as Timestamp).toDate(), 'yyyy-MM-dd');
                revenuesByDay[day] = (revenuesByDay[day] || 0) + revenue.amount;
            });

            const unsubPurchases = onSnapshot(qPurchases, (purchaseSnapshot) => {
                const costsByDay: { [key: string]: number } = {};
                purchaseSnapshot.forEach(doc => {
                    const purchase = doc.data() as Purchase;
                    const day = format((purchase.purchaseDate as unknown as Timestamp).toDate(), 'yyyy-MM-dd');
                    costsByDay[day] = (costsByDay[day] || 0) + purchase.totalAmount;
                });
                
                const allDaysInRange = eachDayOfInterval({ start: startDate, end: endDate });
                
                let cumulativeCost = 0;
                let cumulativeRevenue = 0;
                
                const processedData: DailyData[] = allDaysInRange.map(dayDate => {
                    const dayString = format(dayDate, 'yyyy-MM-dd');
                    
                    cumulativeCost += costsByDay[dayString] || 0;
                    cumulativeRevenue += revenuesByDay[dayString] || 0;

                    const cmv = cumulativeRevenue > 0 ? (cumulativeCost / cumulativeRevenue) * 100 : 0;
                    
                    return {
                        date: dayString,
                        revenue: cumulativeRevenue,
                        cost: cumulativeCost,
                        cmv: isNaN(cmv) || !isFinite(cmv) ? 0 : cmv
                    };
                });

                setData(processedData);
                setIsLoading(false);
            }, (error) => {
                console.error("Error fetching purchases for CMV chart:", error);
                setIsLoading(false);
            });

            return () => unsubPurchases();
        }, (error) => {
            console.error("Error fetching revenues for CMV chart:", error);
            setIsLoading(false);
        });

        return () => unsubRevenues();
    }, [currentStore, period]);


    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>Curva de CMV Acumulado</CardTitle>
                        <CardDescription>
                            Acompanhe a variação do Custo de Mercadoria Vendida (CMV) acumulado ao longo do tempo.
                        </CardDescription>
                    </div>
                     <Tabs defaultValue={period} onValueChange={setPeriod} className="w-auto">
                        <TabsList>
                            <TabsTrigger value="currentMonth">Este Mês</TabsTrigger>
                            <TabsTrigger value="last3Months">3 Meses</TabsTrigger>
                            <TabsTrigger value="last6Months">6 Meses</TabsTrigger>
                            <TabsTrigger value="currentYear">Ano</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <Skeleton className="w-full h-[350px]" />
                ) : data.length === 0 ? (
                    <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                        Nenhum dado encontrado para o período selecionado.
                    </div>
                ) : (
                    <ChartContainer config={chartConfig} className="h-[350px] w-full">
                        <ResponsiveContainer>
                            <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                                <CartesianGrid vertical={false} />
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
                                    tickFormatter={(value) => `${value.toFixed(0)}%`}
                                    domain={[0, 'dataMax + 10']}
                                />
                                <Tooltip
                                    cursor={false}
                                    content={<ChartTooltipContent
                                        formatter={(value, name, item) => (
                                            <div className="flex flex-col gap-1 text-sm">
                                                <span className="font-bold">{format(new Date(item.payload.date + 'T00:00:00'), 'PPP', { locale: ptBR })}</span>
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">CMV Acumulado:</span> 
                                                    <span className="font-bold text-primary">{Number(value).toFixed(2)}%</span>
                                                </div>
                                            </div>
                                        )}
                                        hideLabel
                                        hideIndicator
                                        />}
                                />
                                <Line
                                    dataKey="cmv"
                                    type="monotone"
                                    stroke="var(--color-cmv)"
                                    strokeWidth={2}
                                    dot={false}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                )}
            </CardContent>
        </Card>
    );
}
