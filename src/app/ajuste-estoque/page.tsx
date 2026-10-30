'use client';

import * as React from 'react';
import { collection, onSnapshot, query, orderBy, Timestamp, doc, runTransaction, where, getDocs, increment } from 'firebase/firestore';
import { History } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

import PageHeader from "@/components/page-header";
import { StockAdjustmentForm, type StockAdjustmentFormValues } from "@/components/ajuste-estoque/stock-adjustment-form";
import { db } from '@/lib/firebase';
import type { Ingredient, StockAdjustment, Store } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useStore } from '@/components/auth/store-provider';
import { useAuth } from '@/components/auth/auth-provider';


export default function AjusteEstoquePage() {
    const { toast } = useToast();
    const { user, appUser } = useAuth();
    const { currentStore } = useStore();
    const [ingredients, setIngredients] = React.useState<Ingredient[]>([]);
    const [adjustments, setAdjustments] = React.useState<StockAdjustment[]>([]);
    const [allStores, setAllStores] = React.useState<Store[]>([]);

    React.useEffect(() => {
        if (!currentStore) return;
        
        const qIngredients = query(
            collection(db, 'ingredients'), 
            where('storeId', '==', currentStore.id),
            orderBy('name', 'asc')
        );
        const unsubscribeIngredients = onSnapshot(qIngredients, (querySnapshot) => {
            const data: Ingredient[] = [];
            querySnapshot.forEach((doc) => {
                data.push({ id: doc.id, ...doc.data() } as Ingredient);
            });
            setIngredients(data);
        });

        const qAdjustments = query(
            collection(db, 'stockAdjustments'), 
            where('storeId', '==', currentStore.id), 
            orderBy('adjustmentDate', 'desc')
        );
        const unsubscribeAdjustments = onSnapshot(qAdjustments, (querySnapshot) => {
            const data: StockAdjustment[] = [];
            querySnapshot.forEach((doc) => {
                const adjData = doc.data();
                data.push({ 
                    id: doc.id, 
                    ...adjData,
                    adjustmentDate: (adjData.adjustmentDate as Timestamp).toDate()
                } as StockAdjustment);
            });
            setAdjustments(data);
        });
        
        const qStores = query(collection(db, 'stores'));
        const unsubscribeStores = onSnapshot(qStores, (querySnapshot) => {
            const storesData: Store[] = [];
            querySnapshot.forEach((doc) => {
                storesData.push({ id: doc.id, ...doc.data() } as Store);
            });
            setAllStores(storesData);
        });


        return () => {
            unsubscribeIngredients();
            unsubscribeAdjustments();
            unsubscribeStores();
        };
    }, [currentStore]);
    
    const handleDownloadReceipt = (adjustment: StockAdjustmentFormValues, originStore: Store, destinationStore: Store, ingredient: Ingredient) => {
        const doc = new jsPDF();
        
        doc.setFontSize(18);
        doc.text('Comprovante de Transferência de Estoque', 14, 22);
        doc.setFontSize(11);
        doc.text(`Data: ${format(adjustment.adjustmentDate, 'dd/MM/yyyy')}`, 14, 30);
        doc.text(`Loja de Origem: ${originStore.name}`, 14, 36);
        doc.text(`Loja de Destino: ${destinationStore.name}`, 14, 42);

        (doc as any).autoTable({
            startY: 50,
            head: [['Insumo', 'Quantidade', 'Unidade']],
            body: [[ingredient.name, adjustment.quantity, ingredient.unit]],
            headStyles: { fillColor: [220, 38, 38] }, // Red
        });

        const finalY = (doc as any).lastAutoTable.finalY;
        doc.setFontSize(10);

        // Signature for who released
        doc.text('_________________________', 14, finalY + 20);
        doc.text('Liberado por', 14, finalY + 25);
        doc.text(`(${originStore.name})`, 14, finalY + 30);

        // Signature for who received
        doc.text('_________________________', 110, finalY + 20);
        doc.text('Recebido por', 110, finalY + 25);
        doc.text(`(${destinationStore.name})`, 110, finalY + 30);
        
        doc.save(`transferencia_${ingredient.name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
         toast({
            title: "Download Iniciado!",
            description: 'O comprovante de transferência está sendo gerado.'
        });
    }


    const handleAddAdjustment = async (data: StockAdjustmentFormValues) => {
        if (!currentStore) {
            toast({ title: "Erro", description: "Nenhuma loja selecionada.", variant: "destructive" });
            return;
        }
        if (!user) {
            toast({ title: "Erro", description: "Usuário não autenticado.", variant: "destructive" });
            return;
        }

        const ingredient = ingredients.find(i => i.id === data.ingredientId);
        if (!ingredient) {
            toast({ title: "Erro", description: "Insumo não encontrado.", variant: "destructive" });
            return;
        }

        try {
            let destinationStore: Store | undefined;
            let originStore: Store | undefined;
            
            await runTransaction(db, async (transaction) => {
                const ingredientRef = doc(db, "ingredients", data.ingredientId);
                const quantityChange = data.type === 'saida' ? -data.quantity : data.quantity;

                // For transfers, we need to update two DIFFERENT ingredient docs (one for each store)
                if (data.reason === 'Transferência de Loja') {
                    if (!data.destinationStoreId) throw new Error("Loja de destino não selecionada.");
                    destinationStore = allStores.find(s => s.id === data.destinationStoreId);
                    if (!destinationStore) throw new Error("Loja de destino não encontrada.");

                    // Find the corresponding ingredient in the destination store by name
                    const destIngQuery = query(
                        collection(db, 'ingredients'), 
                        where('storeId', '==', data.destinationStoreId),
                        where('name', '==', ingredient.name)
                    );
                    const destIngSnap = await getDocs(destIngQuery);
                    
                    if (destIngSnap.empty) {
                        throw new Error(`Insumo "${ingredient.name}" não encontrado na loja de destino.`);
                    }
                    
                    const destIngRef = destIngSnap.docs[0].ref;
                    
                    // Decrease stock from current store doc
                    transaction.update(ingredientRef, { stockQuantity: increment(-data.quantity) });
                    // Increase stock in destination store doc
                    transaction.update(destIngRef, { stockQuantity: increment(data.quantity) });
                
                } else {
                     // For regular adjustments, just update the current store's ingredient doc
                     transaction.update(ingredientRef, { stockQuantity: increment(quantityChange) });
                }
                
                let reasonText = data.reason;
                 if (data.reason === 'Transferência de Loja') {
                    reasonText = `Transferência para ${destinationStore!.name}`;
                } else if (data.reason === 'Recebimento de outra loja') {
                    if (!data.originStoreId) throw new Error("Loja de origem não selecionada.");
                    originStore = allStores.find(s => s.id === data.originStoreId);
                    if (!originStore) throw new Error("Loja de origem não encontrada.");
                    reasonText = `Recebimento de ${originStore.name}`;
                } else if (data.reason === 'Outro') {
                    reasonText = data.otherReason ?? 'Outro';
                }

                const adjustmentData = {
                    adjustmentDate: Timestamp.fromDate(data.adjustmentDate),
                    ingredientId: data.ingredientId,
                    ingredientName: ingredient.name,
                    ingredientUnit: ingredient.unit,
                    quantity: data.quantity,
                    reason: reasonText,
                    type: data.type,
                    storeId: currentStore.id,
                    userName: appUser?.displayName || user.displayName || 'Usuário',
                };

                const adjustmentRef = doc(collection(db, 'stockAdjustments'));
                transaction.set(adjustmentRef, adjustmentData);
            });

            toast({
                title: "Ajuste Registrado!",
                description: `O estoque de "${ingredient.name}" foi atualizado com sucesso nesta unidade.`,
            });
            
            if (data.reason === 'Transferência de Loja' && destinationStore) {
                handleDownloadReceipt(data, currentStore, destinationStore, ingredient);
            }

        } catch (error: any) {
            console.error("Erro ao registrar ajuste: ", error);
            toast({
                title: "Erro ao salvar!",
                description: error.message || "Não foi possível registrar o ajuste de estoque. Tente novamente.",
                variant: "destructive"
            });
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title="Saída de Estoque"
                description="Registre as saídas manuais de insumos do seu estoque."
            />
            <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                    <StockAdjustmentForm 
                        onAddAdjustment={handleAddAdjustment} 
                        ingredients={ingredients} 
                        stores={allStores}
                    />
                </div>
                <div className="lg:col-span-2">
                     <Card>
                        <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                           <History className="h-5 w-5 text-primary" />
                            Histórico de Lançamentos
                        </CardTitle>
                        <CardDescription>
                            Lista das últimas movimentações de estoque desta loja.
                        </CardDescription>
                        </CardHeader>
                        <CardContent>
                        <Table>
                            <TableHeader>
                            <TableRow>
                                <TableHead>Data</TableHead>
                                <TableHead>Insumo</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead className="text-center">Quantidade</TableHead>
                                <TableHead>Motivo</TableHead>
                                <TableHead>Usuário</TableHead>
                            </TableRow>
                            </TableHeader>
                            <TableBody>
                            {adjustments.map((adj) => (
                                <TableRow key={adj.id}>
                                <TableCell>{format(adj.adjustmentDate, 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                                <TableCell className="font-medium">{adj.ingredientName}</TableCell>
                                <TableCell>
                                    <span className={`font-semibold ${adj.type === 'saida' ? 'text-destructive' : 'text-green-600'}`}>
                                        {adj.type === 'saida' ? 'Saída' : 'Entrada'}
                                    </span>
                                </TableCell>
                                <TableCell className="text-center">{adj.quantity} {adj.ingredientUnit}</TableCell>
                                <TableCell>{adj.reason}</TableCell>
                                <TableCell className="text-xs text-muted-foreground">{adj.userName}</TableCell>
                                </TableRow>
                            ))}
                            </TableBody>
                        </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
