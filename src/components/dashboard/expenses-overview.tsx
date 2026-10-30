
'use client';

import * as React from 'react';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { startOfMonth, endOfMonth, isSameMonth } from 'date-fns';
import { useStore } from '../auth/store-provider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { formatCurrency } from '@/lib/utils';
import { WalletCards, PieChart as PieIcon, TrendingUp } from 'lucide-react';
import { Progress } from '../ui/progress';
import { Skeleton } from '../ui/skeleton';
import type { Expense } from '@/lib/types';

export default function ExpensesOverview() {
    const { currentStore } = useStore();
    const [totalExpenses, setTotalExpenses] = React.useState(0);
    const [expensesByCategory, setExpensesByCategory] = React.useState<{ category: string, amount: number, percentage: number }[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
        if (!currentStore) return;
        setIsLoading(true);

        const now = new Date();

        // Busca todas as despesas da loja e filtra no cliente para suportar campos legados e novos
        const q = query(
            collection(db, 'expenses'),
            where('storeId', '==', currentStore.id)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => {
                const d = doc.data();
                const parseDate = (val: any) => {
                    if (val instanceof Timestamp) return val.toDate();
                    if (val && typeof val === 'object' && 'seconds' in val) return new Timestamp(val.seconds, val.nanoseconds).toDate();
                    return val ? new Date(val) : new Date();
                };
                
                return {
                    ...d,
                    expenseDate: parseDate(d.expenseDate || d.date)
                } as Expense;
            });

            // Filtra pelo mês atual no cliente
            const monthExpenses = data.filter(e => isSameMonth(e.expenseDate as Date, now));
            const total = monthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
            
            const categoryMap = monthExpenses.reduce((acc, exp) => {
                acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
                return acc;
            }, {} as Record<string, number>);

            const formatted = Object.entries(categoryMap)
                .map(([category, amount]) => ({
                    category,
                    amount,
                    percentage: total > 0 ? (amount / total) * 100 : 0
                }))
                .sort((a, b) => b.amount - a.amount);

            setTotalExpenses(total);
            setExpensesByCategory(formatted);
            setIsLoading(false);
        }, (error) => {
            console.error("Erro ao carregar despesas para o dashboard:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [currentStore]);

    if (isLoading) {
        return (
            <div className="grid md:grid-cols-2 gap-6">
                <Skeleton className="h-[200px] w-full" />
                <Skeleton className="h-[200px] w-full" />
            </div>
        );
    }

    return (
        <div className="grid md:grid-cols-3 gap-6">
            {/* Card Total Geral */}
            <Card className="md:col-span-1">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Total Despesas Gerais</CardTitle>
                    <WalletCards className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold text-primary">{formatCurrency(totalExpenses)}</div>
                    <p className="text-xs text-muted-foreground mt-2">
                        Somatório de todos os gastos operacionais (não-compras) do mês atual nesta unidade.
                    </p>
                    <div className="mt-6 p-3 bg-muted/30 rounded-lg border border-dashed flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-500" />
                        <span className="text-xs font-medium">Controle de Fluxo de Caixa</span>
                    </div>
                </CardContent>
            </Card>

            {/* Card Detalhamento por Categoria */}
            <Card className="md:col-span-2">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="grid gap-1">
                            <CardTitle>Gastos por Categoria</CardTitle>
                            <CardDescription>Distribuição proporcional das despesas operacionais no mês.</CardDescription>
                        </div>
                        <PieIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                </CardHeader>
                <CardContent>
                    {expensesByCategory.length > 0 ? (
                        <div className="space-y-4">
                            {expensesByCategory.slice(0, 4).map((item, idx) => (
                                <div key={idx} className="space-y-1.5">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-semibold">{item.category}</span>
                                        <span className="text-muted-foreground font-medium">
                                            {formatCurrency(item.amount)} ({item.percentage.toFixed(1)}%)
                                        </span>
                                    </div>
                                    <Progress value={item.percentage} className="h-1.5" />
                                </div>
                            ))}
                            {expensesByCategory.length > 4 && (
                                <p className="text-[10px] text-center text-muted-foreground italic pt-2">
                                    + {expensesByCategory.length - 4} outras categorias lançadas
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="h-[100px] flex items-center justify-center text-muted-foreground text-sm border border-dashed rounded-lg">
                            Nenhuma despesa lançada este mês.
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
