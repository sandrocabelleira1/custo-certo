
'use client';

import * as React from 'react';
import { collection, onSnapshot, addDoc, query, orderBy, Timestamp, where, doc, setDoc, deleteDoc } from 'firebase/firestore';

import PageHeader from "@/components/page-header";
import { CmvForm, type CmvFormValues } from "@/components/analise-cmv/cmv-form";
import { CmvHistory } from "@/components/analise-cmv/cmv-history";
import { db } from '@/lib/firebase';
import type { MonthlyClosing } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useStore } from '@/components/auth/store-provider';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AnaliseCmvPage() {
    const { toast } = useToast();
    const { currentStore } = useStore();
    const [monthlyClosings, setMonthlyClosings] = React.useState<MonthlyClosing[]>([]);
    const [editingClosing, setEditingClosing] = React.useState<MonthlyClosing | null>(null);

    React.useEffect(() => {
        if (!currentStore) return;

        const q = query(collection(db, 'monthlyClosings'), where('storeId', '==', currentStore.id), orderBy('month', 'desc'));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const closingsData: MonthlyClosing[] = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                closingsData.push({ 
                    id: doc.id,
                     ...data,
                } as MonthlyClosing);
            });
            setMonthlyClosings(closingsData);
        });

        return () => unsubscribe();
    }, [currentStore]);


    const handleFormSubmit = async (data: CmvFormValues) => {
        if (!currentStore) {
            toast({ title: "Erro", description: "Nenhuma loja selecionada.", variant: "destructive" });
            return;
        }
        
        const monthId = editingClosing?.month || data.month;
        const closingId = editingClosing?.id || `${currentStore.id}_${monthId}`;
        const closingRef = doc(db, 'monthlyClosings', closingId);

        const closingData = {
            month: monthId,
            initialStockValue: data.initialStockValue,
            finalStockValue: data.finalStockValue,
            totalPurchases: data.totalPurchases,
            totalRevenue: data.totalRevenue,
            cmvValue: data.cmvValue,
            cmvPercentage: data.cmvPercentage,
            createdAt: editingClosing?.createdAt || Timestamp.now(),
            storeId: currentStore.id,
        };

        try {
            await setDoc(closingRef, closingData, { merge: true });
            toast({
                title: `Fechamento ${editingClosing ? 'Atualizado' : 'Salvo'}!`,
                description: `O fechamento do mês ${format(new Date(monthId + '-02'), 'MMMM/yyyy', {locale: ptBR})} foi salvo.`,
            });
            setEditingClosing(null);
        } catch (error) {
            console.error("Error adding/updating document: ", error);
            toast({
                title: "Erro ao salvar!",
                description: "Não foi possível salvar o fechamento. Tente novamente.",
                variant: "destructive"
            });
        }
    };
    
    const handleEditClosing = (closing: MonthlyClosing) => {
        setEditingClosing(closing);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDeleteClosing = async (closingId: string) => {
        try {
            await deleteDoc(doc(db, 'monthlyClosings', closingId));
            toast({
                title: 'Fechamento Excluído!',
                description: 'O registro de fechamento mensal foi removido com sucesso.',
            });
        } catch (error) {
            console.error("Error deleting document: ", error);
            toast({
                title: "Erro ao excluir!",
                description: "Não foi possível remover o fechamento. Tente novamente.",
                variant: "destructive"
            });
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title="Análise de CMV"
                description="Calcule o CMV (Custo de Mercadoria Vendida) real com base no seu estoque."
            />
            <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                    <CmvForm 
                        key={editingClosing?.id ?? 'new'}
                        onSubmit={handleFormSubmit}
                        initialData={editingClosing} 
                        onCancelEdit={() => setEditingClosing(null)}
                    />
                </div>
                <div className="lg:col-span-2">
                    <CmvHistory 
                        closings={monthlyClosings} 
                        onEdit={handleEditClosing}
                        onDelete={handleDeleteClosing}
                    />
                </div>
            </div>
        </div>
    )
}
