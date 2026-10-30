
'use client';

import * as React from 'react';
import { collection, doc, onSnapshot, query, where, Timestamp, updateDoc, setDoc, getDocs } from 'firebase/firestore';
import { Pencil } from 'lucide-react';
import { startOfMonth, endOfMonth, subMonths } from 'date-fns';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import type { Purchase, Revenue } from '@/lib/types';
import { useStore } from '../auth/store-provider';


export default function SpendingGoal() {
  const { toast } = useToast();
  const { currentStore } = useStore();
  const [spendingGoal, setSpendingGoal] = React.useState(0);
  const [monthlySpending, setMonthlySpending] = React.useState(0);
  const [progress, setProgress] = React.useState(0);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [newGoal, setNewGoal] = React.useState(0);
  const [suggestedGoal, setSuggestedGoal] = React.useState(0);

  // Fetch previous month's revenue to suggest a goal
  React.useEffect(() => {
    if (!currentStore) return;
    const fetchPreviousMonthRevenue = async () => {
        const now = new Date();
        const prevMonth = subMonths(now, 1);
        const start = startOfMonth(prevMonth);
        const end = endOfMonth(prevMonth);

        const qRevenues = query(
            collection(db, 'revenues'),
            where('storeId', '==', currentStore.id),
            where('date', '>=', Timestamp.fromDate(start)),
            where('date', '<=', Timestamp.fromDate(end))
        );
        
        const querySnapshot = await getDocs(qRevenues);
        let totalRevenue = 0;
        querySnapshot.forEach(doc => {
            totalRevenue += (doc.data() as Revenue).amount;
        });
        
        const newSuggestedGoal = totalRevenue * 0.35;
        setSuggestedGoal(newSuggestedGoal);
    };

    fetchPreviousMonthRevenue();
  }, [currentStore]);

  React.useEffect(() => {
    if (!currentStore) return;
    
    // We create a unique settings doc ID for each store
    const settingsDocId = `appSettings_${currentStore.id}`;
    const settingsRef = doc(db, 'settings', settingsDocId);
    
    const unsubscribeSettings = onSnapshot(settingsRef, (doc) => {
      if (doc.exists()) {
        const goal = doc.data().monthlySpendingGoal || 0;
        setSpendingGoal(goal);
        setNewGoal(goal);
      } else {
        const initialGoal = suggestedGoal > 0 ? suggestedGoal : 5000;
        setDoc(settingsRef, { monthlySpendingGoal: initialGoal, storeId: currentStore.id });
        setSpendingGoal(initialGoal);
        setNewGoal(initialGoal);
      }
    });

    // Listener for monthly purchases for the current store
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);

    const qPurchases = query(
        collection(db, 'purchases'),
        where('storeId', '==', currentStore.id),
        where('purchaseDate', '>=', Timestamp.fromDate(start)),
        where('purchaseDate', '<=', Timestamp.fromDate(end))
    );
    
    const unsubscribePurchases = onSnapshot(qPurchases, (snapshot) => {
      let total = 0;
      snapshot.forEach(doc => {
        total += (doc.data() as Purchase).totalAmount;
      });
      setMonthlySpending(total);
    });

    return () => {
        unsubscribeSettings();
        unsubscribePurchases();
    };
  }, [currentStore, suggestedGoal]);

  React.useEffect(() => {
    if (spendingGoal > 0) {
      const percentage = (monthlySpending / spendingGoal) * 100;
      setProgress(percentage > 100 ? 100 : percentage);
    } else {
      setProgress(0);
    }
  }, [monthlySpending, spendingGoal]);
  
  React.useEffect(() => {
    if (isDialogOpen) {
      setNewGoal(suggestedGoal > 0 ? Number(suggestedGoal.toFixed(0)) : spendingGoal);
    }
  }, [isDialogOpen, suggestedGoal, spendingGoal]);

  const handleSaveGoal = async () => {
    if (!currentStore) {
        toast({ title: "Erro", description: "Nenhuma loja selecionada.", variant: "destructive" });
        return;
    }
    if (newGoal < 0) {
        toast({
            title: "Valor inválido",
            description: "A meta de gastos não pode ser negativa.",
            variant: "destructive"
        });
        return;
    }

    const settingsDocId = `appSettings_${currentStore.id}`;
    const settingsRef = doc(db, 'settings', settingsDocId);

    try {
        await setDoc(settingsRef, { monthlySpendingGoal: newGoal, storeId: currentStore.id }, { merge: true });
        toast({
            title: "Meta atualizada!",
            description: `Sua nova meta de gastos é ${formatCurrency(newGoal)}.`
        });
        setIsDialogOpen(false);
    } catch (error) {
        console.error("Error updating spending goal: ", error);
        toast({
            title: "Erro ao atualizar",
            description: "Não foi possível salvar a nova meta. Tente novamente.",
            variant: "destructive"
        });
    }
  };


  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
            <div className="grid gap-1">
                 <CardTitle>Meta de Gastos Mensal</CardTitle>
                <CardDescription>
                Acompanhe seus gastos em relação à meta definida para o mês.
                </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" size="icon">
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Editar Meta</span>
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                    <DialogTitle>Editar Meta de Gastos</DialogTitle>
                    <DialogDescription>
                        Defina qual será o seu teto de gastos para o mês atual. Sugestão: 35% do faturamento do mês anterior ({formatCurrency(suggestedGoal)}).
                    </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="goal" className="text-right">
                        Meta (R$)
                        </Label>
                        <Input
                            id="goal"
                            type="number"
                            value={newGoal}
                            onChange={(e) => setNewGoal(Number(e.target.value))}
                            className="col-span-3"
                        />
                    </div>
                    </div>
                    <DialogFooter>
                    <Button onClick={handleSaveGoal}>Salvar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Progress value={progress} className="h-4" />
        <div className="flex justify-between text-sm">
          <span className="font-medium">
            Gasto Atual: <span className="text-primary">{formatCurrency(monthlySpending)}</span>
          </span>
          <span className="text-muted-foreground">
            Meta: {formatCurrency(spendingGoal)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
