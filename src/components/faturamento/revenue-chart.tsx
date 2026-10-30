
'use client';

import * as React from 'react';
import { AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import type { Revenue } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { Skeleton } from '../ui/skeleton';

interface RevenueChartProps {
    revenues: Revenue[];
}

const chartConfig = {
    revenue: {
        label: "Faturamento",
        color: "hsl(var(--primary))",
    },
};

export default function RevenueChart({ revenues }: RevenueChartProps) {
    const chartData = React.useMemo(() => {
        // Sort revenues by date ascending
        const sortedRevenues = [...revenues].sort((a, b) => (a.date as Date).getTime() - (b.date as Date).getTime());
        return sortedRevenues.map(r => ({
            date: format(r.date as Date, 'yyyy-MM-dd'),
            revenue: r.amount
        }));
    }, [revenues]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Flutuação do Faturamento</CardTitle>
                <CardDescription>
                    Acompanhe a variação do faturamento diário para o mês selecionado.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {chartData.length === 0 ? (
                    <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                        Nenhum dado de faturamento para exibir o gráfico.
                    </div>
                ) : (
                    <ChartContainer config={chartConfig} className="h-[250px] w-full">
                        <ResponsiveContainer>
                            <AreaChart
                                data={chartData}
                                margin={{
                                    top: 10,
                                    right: 30,
                                    left: 0,
                                    bottom: 0,
                                }}
                            >
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                                <XAxis
                                    dataKey="date"
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={8}
                                    tickFormatter={(value) => format(new Date(value), "dd", { locale: ptBR })}
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
                                                <span className="font-bold">{format(new Date(item.payload.date), 'PPP', { locale: ptBR })}</span>
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Faturamento:</span>
                                                    <span className="font-bold text-primary">{formatCurrency(Number(value))}</span>
                                                </div>
                                            </div>
                                        )}
                                        hideLabel
                                        hideIndicator
                                    />}
                                />
                                <Area type="monotone" dataKey="revenue" stroke="var(--color-revenue)" fillOpacity={1} fill="url(#colorRevenue)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                )}
            </CardContent>
        </Card>
    );
}
