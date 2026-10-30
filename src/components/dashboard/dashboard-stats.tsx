
'use client';

import * as React from 'react';
import { collection, query, getDocs, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, subMonths, startOfYear } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import { useStore } from '../auth/store-provider';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';

interface PeriodStats {
  cost: number;
  revenue: number;
  cmv: number;
}

interface AllStats {
  yesterday: PeriodStats;
  lastMonth: PeriodStats;
  thisMonth: PeriodStats;
  thisYear: PeriodStats;
}

const generateTrendData = () => {
    return Array.from({ length: 7 }, (_, i) => ({
        day: i,
        value: Math.random() * 15 + 25
    }));
}

const StatCard = ({ title, stats }: { title: string; stats: PeriodStats }) => {
    const cmvColor = stats.cmv > 35 ? 'text-destructive' : 'text-primary';
    const trendData = React.useMemo(() => generateTrendData(), []);

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">{title}</CardTitle>
                <Badge variant="outline">CMV</Badge>
            </CardHeader>
            <CardContent className="flex items-end justify-between gap-4">
                <div className="flex-shrink-0">
                    <div className={`text-4xl font-bold ${cmvColor}`}>
                        {stats.revenue > 0 ? stats.cmv.toFixed(2) : '0.00'}%
                    </div>
                    <div className="text-xs text-muted-foreground mt-2 space-y-1">
                        <p>Custo: {formatCurrency(stats.cost)}</p>
                        <p>Faturamento: {formatCurrency(stats.revenue)}</p>
                    </div>
                </div>
                 <div className="w-24 h-12 flex-shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trendData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                             <defs>
                                <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <Area 
                                type="monotone" 
                                dataKey="value" 
                                stroke="hsl(var(--primary))" 
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorTrend)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
};

export default function DashboardStats() {
    const { currentStore } = useStore();
    const [stats, setStats] = React.useState<AllStats | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    
    React.useEffect(() => {
        if (!currentStore) return;
        setIsLoading(true);

        const now = new Date();
        const dateRanges = {
            yesterday: { start: startOfDay(subDays(now, 1)), end: endOfDay(subDays(now, 1)) },
            lastMonth: { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) },
            thisMonth: { start: startOfMonth(now), end: endOfMonth(now) },
            thisYear: { start: startOfYear(now), end: now },
        };
        
        const fetchDataForPeriod = async (period: keyof typeof dateRanges): Promise<PeriodStats> => {
            const { start, end } = dateRanges[period];
            
            const qPurchases = query(
                collection(db, 'purchases'),
                where('storeId', '==', currentStore.id),
                where('purchaseDate', '>=', Timestamp.fromDate(start)),
                where('purchaseDate', '<=', Timestamp.fromDate(end))
            );

            const qRevenues = query(
                collection(db, 'revenues'),
                where('storeId', '==', currentStore.id),
                where('date', '>=', Timestamp.fromDate(start)),
                where('date', '<=', Timestamp.fromDate(end))
            );

            const [purchasesSnap, revenuesSnap] = await Promise.all([
                getDocs(qPurchases),
                getDocs(qRevenues)
            ]);

            const totalCost = purchasesSnap.docs.reduce((acc, doc) => acc + (doc.data().totalAmount || 0), 0);
            const totalRevenue = revenuesSnap.docs.reduce((acc, doc) => acc + (doc.data().amount || 0), 0);
            const cmv = totalRevenue > 0 ? (totalCost / totalRevenue) * 100 : 0;

            return { cost: totalCost, revenue: totalRevenue, cmv };
        };

        const fetchAllData = async () => {
            try {
                const [yesterday, lastMonth, thisMonth, thisYear] = await Promise.all([
                    fetchDataForPeriod('yesterday'),
                    fetchDataForPeriod('lastMonth'),
                    fetchDataForPeriod('thisMonth'),
                    fetchDataForPeriod('thisYear'),
                ]);
                setStats({ yesterday, lastMonth, thisMonth, thisYear });
            } catch (error) {
                console.error("Erro ao buscar estatísticas:", error);
            } finally {
                setIsLoading(false);
            }
        };

       fetchAllData();

    }, [currentStore]);
    
    if (isLoading || !stats) {
        return (
             <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Skeleton className="h-[126px]" />
                <Skeleton className="h-[126px]" />
                <Skeleton className="h-[126px]" />
                <Skeleton className="h-[126px]" />
            </div>
        )
    }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Ontem" stats={stats.yesterday} />
        <StatCard title="Mês Anterior" stats={stats.lastMonth} />
        <StatCard title="Este Mês" stats={stats.thisMonth} />
        <StatCard title="Este Ano" stats={stats.thisYear} />
    </div>
  );
}
