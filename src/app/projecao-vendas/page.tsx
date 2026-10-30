
'use client';

import * as React from 'react';
import { collection, query, where, Timestamp, onSnapshot, doc, getDocs, setDoc } from 'firebase/firestore';
import { startOfMonth, endOfMonth, subMonths, differenceInDays, endOfToday, format, getWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { LineChart, DollarSign, Target, ShoppingCart, CalendarDays, Pencil } from 'lucide-react';

import { db } from '@/lib/firebase';
import type { AppSettings, Revenue, Purchase } from '@/lib/types';
import { useStore } from '@/components/auth/store-provider';
import PageHeader from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { generateSalesProjection } from '@/ai/flows/generate-sales-projection-flow';
import type { DailyGoal } from '@/ai/flows/generate-sales-projection-flow';
import { DailyGoalCard } from '@/components/projecao-vendas/daily-goal-card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';


const TARGET_CMV_FALLBACK = 0.35; // 35% - Usado apenas como fallback se a meta não estiver definida

export default function ProjecaoVendasPage() {
    const { currentStore } = useStore();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = React.useState(true);
    const [stats, setStats] = React.useState({
        currentMonthCost: 0,
        currentMonthRevenue: 0,
        previousMonthRevenue: 0,
    });
    const [spendingGoal, setSpendingGoal] = React.useState(0);
    const [revenueGoal, setRevenueGoal] = React.useState(0);
    const [dailyGoals, setDailyGoals] = React.useState<DailyGoal[]>([]);
    const [isProjecting, setIsProjecting] = React.useState(false);
    
    // State for dialogs
    const [isSpendingDialogOpen, setIsSpendingDialogOpen] = React.useState(false);
    const [isRevenueDialogOpen, setIsRevenueDialogOpen] = React.useState(false);
    const [newSpendingGoal, setNewSpendingGoal] = React.useState(0);
    const [newRevenueGoal, setNewRevenueGoal] = React.useState(0);

    React.useEffect(() => {
        if (!currentStore) return;
        setIsLoading(true);

        const settingsDocId = `appSettings_${currentStore.id}`;
        const settingsRef = doc(db, 'settings', settingsDocId);
        
        const unsubSettings = onSnapshot(settingsRef, (docSnap) => {
            if (docSnap.exists()) {
                const settings = docSnap.data() as AppSettings;
                setSpendingGoal(settings.monthlySpendingGoal || 0);
                setRevenueGoal(settings.monthlyRevenueGoal || 0);
            } else {
                 const createInitialSettings = async () => {
                     const now = new Date();
                     const startPrevMonth = startOfMonth(subMonths(now, 1));
                     const endPrevMonth = endOfMonth(subMonths(now, 1));
                     const qRevenues = query(
                        collection(db, 'revenues'),
                        where('storeId', '==', currentStore.id),
                        where('date', '>=', Timestamp.fromDate(startPrevMonth)),
                        where('date', '<=', Timestamp.fromDate(endPrevMonth))
                    );
                    const prevMonthRevenueSnap = await getDocs(qRevenues);
                    const prevMonthRevenue = prevMonthRevenueSnap.docs.reduce((sum, doc) => sum + doc.data().amount, 0);
                    const initialSpendingGoal = prevMonthRevenue > 0 ? prevMonthRevenue * TARGET_CMV_FALLBACK : 5000;
                    const initialRevenueGoal = prevMonthRevenue > 0 ? prevMonthRevenue : 15000;
                    
                    const initialSettings = { 
                        monthlySpendingGoal: initialSpendingGoal, 
                        monthlyRevenueGoal: initialRevenueGoal,
                        storeId: currentStore.id 
                    };
                    await setDoc(settingsRef, initialSettings);
                    setSpendingGoal(initialSpendingGoal);
                    setRevenueGoal(initialRevenueGoal);
                }
                createInitialSettings();
            }
        });
        
        const fetchData = async () => {
            const now = new Date();
            const startCurrentMonth = startOfMonth(now);
            const endCurrentMonth = endOfMonth(now);
            const startPrevMonth = startOfMonth(subMonths(now, 1));
            const endPrevMonth = endOfMonth(subMonths(now, 1));

            const qCurrentPurchases = query(
                collection(db, 'purchases'),
                where('storeId', '==', currentStore.id),
                where('purchaseDate', '>=', Timestamp.fromDate(startCurrentMonth)),
                where('purchaseDate', '<=', Timestamp.fromDate(endCurrentMonth))
            );
            const currentPurchasesSnap = await getDocs(qCurrentPurchases);
            const currentMonthCost = currentPurchasesSnap.docs.reduce((sum, doc) => sum + doc.data().totalAmount, 0);

            const qCurrentRevenues = query(
                collection(db, 'revenues'),
                where('storeId', '==', currentStore.id),
                where('date', '>=', Timestamp.fromDate(startCurrentMonth)),
                where('date', '<=', Timestamp.fromDate(endCurrentMonth))
            );
            const currentRevenuesSnap = await getDocs(qCurrentRevenues);
            const currentMonthRevenue = currentRevenuesSnap.docs.reduce((sum, doc) => sum + doc.data().amount, 0);

            const qPrevRevenues = query(
                collection(db, 'revenues'),
                where('storeId', '==', currentStore.id),
                where('date', '>=', Timestamp.fromDate(startPrevMonth)),
                where('date', '<=', Timestamp.fromDate(endPrevMonth))
            );
            const prevRevenuesSnap = await getDocs(qPrevRevenues);
            const previousMonthRevenue = prevRevenuesSnap.docs.reduce((sum, doc) => sum + doc.data().amount, 0);

            setStats({
                currentMonthCost,
                currentMonthRevenue,
                previousMonthRevenue
            });
            setIsLoading(false);
        };
        
        const unsubPurchases = onSnapshot(query(collection(db, 'purchases'), where('storeId', '==', currentStore.id)), fetchData);
        const unsubRevenues = onSnapshot(query(collection(db, 'revenues'), where('storeId', '==', currentStore.id)), fetchData);

        return () => {
            unsubSettings();
            unsubPurchases();
            unsubRevenues();
        };

    }, [currentStore]);
    
    const { currentMonthCost, currentMonthRevenue, previousMonthRevenue } = stats;

    const targetCMV = TARGET_CMV_FALLBACK;
        
    const remainingRevenueForGoal = Math.max(0, revenueGoal - currentMonthRevenue);

    const remainingPurchaseBudget = Math.max(0, spendingGoal - currentMonthCost);

    const currentCMV = currentMonthRevenue > 0 ? (currentMonthCost / currentMonthRevenue) : 0;
    
    const now = new Date();
    const remainingDays = Math.max(0, differenceInDays(endOfMonth(now), endOfToday()) + 1);
    
    React.useEffect(() => {
        const fetchProjection = async () => {
            if (remainingDays === 0 || remainingRevenueForGoal <= 0 || !currentStore) {
                setDailyGoals([]);
                return;
            };

            const cacheKey = `salesProjection_${currentStore.id}`;
            const cachedData = localStorage.getItem(cacheKey);

            const dependencies = {
                remainingRevenue: remainingRevenueForGoal.toFixed(2),
                remainingDays,
                storeLocation: currentStore.location || currentStore.name,
                month: format(new Date(), 'yyyy-MM'),
            };

            if (cachedData) {
                const { dependencies: cachedDeps, goals } = JSON.parse(cachedData);
                if (JSON.stringify(dependencies) === JSON.stringify(cachedDeps)) {
                    setDailyGoals(goals);
                    return; // Usa os dados do cache se as dependências não mudaram
                }
            }


            setIsProjecting(true);
            try {
                const locationForWeather = currentStore.location || currentStore.name;

                const result = await generateSalesProjection({
                    remainingDays,
                    remainingRevenue: remainingRevenueForGoal,
                    today: format(new Date(), 'yyyy-MM-dd'),
                    storeLocation: locationForWeather,
                });
                
                setDailyGoals(result.dailyGoals);

                // Salva a nova projeção e suas dependências no cache
                localStorage.setItem(cacheKey, JSON.stringify({ dependencies, goals: result.dailyGoals }));

            } catch (error) {
                console.error("Error generating sales projection:", error);
                setDailyGoals([]);
            } finally {
                setIsProjecting(false);
            }
        };

        if (!isLoading) {
            fetchProjection();
        }
    }, [remainingRevenueForGoal, remainingDays, currentStore, isLoading]);

    const goalsByWeek = React.useMemo(() => {
        return dailyGoals.reduce((acc, goal) => {
            const weekNumber = getWeek(new Date(goal.date + 'T00:00:00'), { weekStartsOn: 1 });
            if (!acc[weekNumber]) {
                acc[weekNumber] = [];
            }
            acc[weekNumber].push(goal);
            return acc;
        }, {} as Record<number, DailyGoal[]>);
    }, [dailyGoals]);


    const handleSaveGoal = async (goalType: 'spending' | 'revenue') => {
        if (!currentStore) return;
        const settingsDocId = `appSettings_${currentStore.id}`;
        const settingsRef = doc(db, 'settings', settingsDocId);
        
        let value, field, toastTitle, toastDescription;
        
        if (goalType === 'spending') {
            value = newSpendingGoal;
            field = 'monthlySpendingGoal';
            toastTitle = "Teto de Compras Atualizado!";
            toastDescription = `Seu novo limite de gastos é ${formatCurrency(value)}.`;
        } else {
            value = newRevenueGoal;
            field = 'monthlyRevenueGoal';
            toastTitle = "Meta de Faturamento Atualizada!";
            toastDescription = `Sua nova meta de faturamento é ${formatCurrency(value)}.`;
        }

        if (value < 0) {
            toast({ title: "Valor inválido", description: "O valor não pode ser negativo.", variant: "destructive" });
            return;
        }

        try {
            await setDoc(settingsRef, { [field]: value }, { merge: true });
            toast({ title: toastTitle, description: toastDescription });
            if (goalType === 'spending') setIsSpendingDialogOpen(false);
            if (goalType === 'revenue') setIsRevenueDialogOpen(false);
        } catch (error) {
            console.error("Error updating goal:", error);
            toast({ title: "Erro ao atualizar", description: "Não foi possível salvar a nova meta.", variant: "destructive" });
        }
    };


    const renderStatCard = (title: string, value: string | number, description?: string, icon?: React.ReactNode, valueClass?: string, onEdit?: () => void) => (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                {onEdit ? (
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onEdit}>
                        <Pencil className="h-4 w-4 text-muted-foreground" />
                    </Button>
                ) : icon}
            </CardHeader>
            <CardContent>
                <div className={`text-2xl font-bold ${valueClass}`}>
                    {typeof value === 'number' ? formatCurrency(value) : value}
                </div>
                {description && <p className="text-xs text-muted-foreground">{description}</p>}
            </CardContent>
        </Card>
    );

    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title="Assistente de Projeção de Vendas"
                description="Use dados históricos para projetar vendas e atingir suas metas de CMV."
            />

            <Card>
                <CardHeader>
                    <CardTitle>Análise do Mês Atual</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {isLoading ? (
                        Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)
                    ) : (
                        <>
                           {renderStatCard("Faturamento Atual", currentMonthRevenue, `Total faturado no mês.`, <DollarSign className="h-4 w-4 text-muted-foreground" />)}
                           {renderStatCard("Custo Atual (Compras)", currentMonthCost, `Total de compras no mês.`, <ShoppingCart className="h-4 w-4 text-muted-foreground" />)}
                           {renderStatCard("CMV Atual", `${(currentCMV * 100).toFixed(2)}%`, `CMV Ideal: ${(targetCMV * 100).toFixed(0)}%`, <LineChart className="h-4 w-4 text-muted-foreground" />, currentCMV > targetCMV ? 'text-destructive' : 'text-primary' )}
                           {renderStatCard("Faturamento Mês Anterior", previousMonthRevenue, 'Para referência de desempenho.', <DollarSign className="h-4 w-4 text-muted-foreground" />)}
                        </>
                    )}
                </CardContent>
            </Card>

            <Card>
                 <CardHeader>
                    <CardTitle>Metas e Orçamento</CardTitle>
                    <CardDescription>Com base nas suas metas, veja o quanto precisa faturar e o quanto ainda pode gastar.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                     {isLoading ? (
                        Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)
                    ) : (
                        <>
                             {renderStatCard("Meta de Faturamento (Mês)", revenueGoal, `Defina sua meta de faturamento mensal.`, undefined, '', () => {
                                 setNewRevenueGoal(revenueGoal);
                                 setIsRevenueDialogOpen(true);
                             })}
                             {renderStatCard("Falta Faturar", remainingRevenueForGoal, `Valor restante para atingir a meta do mês.`, <DollarSign className="h-4 w-4 text-muted-foreground" />, 'text-destructive')}
                             {renderStatCard("Teto de Compras (Mês)", spendingGoal, `Seu limite de gastos definido para o mês.`, undefined, '', () => {
                                 setNewSpendingGoal(spendingGoal);
                                 setIsSpendingDialogOpen(true);
                             })}
                             {renderStatCard("Orçamento de Compra", remainingPurchaseBudget, `Você ainda pode comprar este valor este mês.`, <ShoppingCart className="h-4 w-4 text-muted-foreground" />, remainingPurchaseBudget > 0 ? 'text-primary' : 'text-destructive')}
                        </>
                    )}
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CalendarDays className="h-5 w-5 text-primary" />
                        Projeção de Metas Diárias
                    </CardTitle>
                    <CardDescription>
                        Sugestão de metas de faturamento para os próximos dias para atingir a meta de faturamento do mês.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isProjecting ? (
                         <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                             {Array.from({ length: Math.min(remainingDays, 7) }).map((_, i) => <Skeleton key={i} className="h-36" />)}
                         </div>
                    ) : dailyGoals.length > 0 ? (
                        <div className="space-y-6">
                            {Object.entries(goalsByWeek).map(([weekNumber, goals]) => (
                                <div key={weekNumber}>
                                    <h3 className="text-lg font-semibold mb-2">
                                        Semana de {format(new Date(goals[0].date), 'dd/MM')} a {format(new Date(goals[goals.length - 1].date), 'dd/MM')}
                                    </h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                                        {goals.map(goal => (
                                            <DailyGoalCard key={goal.date} goal={goal} />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center text-muted-foreground py-8">
                            <p>Nenhuma projeção a ser exibida.</p>
                            <p className="text-sm">Isso pode acontecer se a sua meta de faturamento já foi atingida ou se não há dias restantes no mês.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
            
             <Dialog open={isSpendingDialogOpen} onOpenChange={setIsSpendingDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                    <DialogTitle>Editar Teto de Compras</DialogTitle>
                    <DialogDescription>
                        Defina qual será o seu limite de gastos com compras para o mês. Sugestão: 35% do faturamento do mês anterior ({formatCurrency(previousMonthRevenue > 0 ? previousMonthRevenue * 0.35 : 0)}).
                    </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="spending-goal" className="text-right">
                        Teto (R$)
                        </Label>
                        <Input
                            id="spending-goal"
                            type="number"
                            value={newSpendingGoal}
                            onChange={(e) => setNewSpendingGoal(Number(e.target.value))}
                            className="col-span-3"
                        />
                    </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={() => handleSaveGoal('spending')}>Salvar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isRevenueDialogOpen} onOpenChange={setIsRevenueDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                    <DialogTitle>Editar Meta de Faturamento</DialogTitle>
                    <DialogDescription>
                        Defina qual será sua meta de faturamento para o mês. Sugestão com base no mês anterior: {formatCurrency(previousMonthRevenue > 0 ? previousMonthRevenue : 0)}.
                    </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="revenue-goal" className="text-right">
                        Meta (R$)
                        </Label>
                        <Input
                            id="revenue-goal"
                            type="number"
                            value={newRevenueGoal}
                            onChange={(e) => setNewRevenueGoal(Number(e.target.value))}
                            className="col-span-3"
                        />
                    </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={() => handleSaveGoal('revenue')}>Salvar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );

    
}

    
