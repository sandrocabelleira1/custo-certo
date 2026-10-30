'use client';

import * as React from 'react';
import { collection, onSnapshot, query, where, orderBy, doc, runTransaction, Timestamp, increment, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Ingredient, StockAdjustment, Recipe } from '@/lib/types';
import PageHeader from "@/components/page-header";
import { ProductionForm } from "@/components/producao/production-form";
import { useToast } from '@/hooks/use-toast';
import { useStore } from '@/components/auth/store-provider';
import { useAuth } from '@/components/auth/auth-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Hammer, User, Layers, Info, Tags, CheckCircle2 } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';

type ProducedItem = {
    id: string;
    name: string;
    displayQuantity: string;
    lote: string;
};

export default function ProducaoPage() {
    const { toast } = useToast();
    const { user, appUser } = useAuth();
    const { currentStore } = useStore();
    const [ingredients, setIngredients] = React.useState<Ingredient[]>([]);
    const [recipes, setRecipes] = React.useState<Recipe[]>([]);
    const [productionHistory, setProductionHistory] = React.useState<StockAdjustment[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = React.useState(true);
    
    // Sucesso da produção
    const [showSuccessDialog, setShowSuccessSuccessDialog] = React.useState(false);
    const [lastProducedItems, setLastProducedItems] = React.useState<ProducedItem[]>([]);

    React.useEffect(() => {
        if (!currentStore) return;

        // Insumos
        const qIng = query(
            collection(db, 'ingredients'),
            where('storeId', '==', currentStore.id),
            orderBy('name', 'asc')
        );
        const unsubscribeIng = onSnapshot(qIng, (snapshot) => {
            setIngredients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ingredient)));
        });

        // Receitas (Fichas Técnicas)
        const qRecipes = query(
            collection(db, 'recipes'),
            where('storeId', '==', currentStore.id),
            orderBy('name', 'asc')
        );
        const unsubscribeRecipes = onSnapshot(qRecipes, (snapshot) => {
            setRecipes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Recipe)));
        });

        // Histórico
        const qHistory = query(
            collection(db, 'stockAdjustments'),
            where('storeId', '==', currentStore.id),
            orderBy('adjustmentDate', 'desc'),
            limit(150)
        );
        
        setIsLoadingHistory(true);
        const unsubscribeHistory = onSnapshot(qHistory, (snapshot) => {
            const data = snapshot.docs
                .map(doc => {
                    const d = doc.data();
                    return {
                        id: doc.id,
                        ...d,
                        adjustmentDate: d.adjustmentDate?.toDate ? d.adjustmentDate.toDate() : new Date(d.adjustmentDate)
                    } as StockAdjustment;
                })
                .filter(adj => adj.reason && adj.reason.startsWith('Produção:'));
            
            setProductionHistory(data);
            setIsLoadingHistory(false);
        }, (error) => {
            console.error("Erro ao carregar histórico de produção:", error);
            setIsLoadingHistory(false);
        });

        return () => {
            unsubscribeIng();
            unsubscribeRecipes();
            unsubscribeHistory();
        };
    }, [currentStore]);

    const handleProcessProduction = async (data: any) => {
        if (!currentStore || !user) {
            toast({ title: "Erro", description: "Sessão ou Loja inválida.", variant: "destructive" });
            return;
        }

        try {
            const batchId = `PROD_${Date.now()}`;
            const userName = appUser?.displayName || user.displayName || 'Usuário';
            
            await runTransaction(db, async (transaction) => {
                // MODO 1: Desmembramento (1 -> N)
                if (data.mode === 'dismantling') {
                    const sourceIngredient = ingredients.find(i => i.id === data.sourceIngredientId);
                    if (!sourceIngredient) throw new Error("Insumo de origem não encontrado.");

                    const sourceRef = doc(db, 'ingredients', data.sourceIngredientId);
                    transaction.update(sourceRef, { stockQuantity: increment(-data.sourceQuantity) });

                    const sourceAdjRef = doc(collection(db, 'stockAdjustments'));
                    transaction.set(sourceAdjRef, {
                        adjustmentDate: Timestamp.now(),
                        ingredientId: data.sourceIngredientId,
                        ingredientName: sourceIngredient.name,
                        ingredientUnit: sourceIngredient.unit,
                        quantity: data.sourceQuantity,
                        reason: `Produção: Saída para desmembramento`,
                        batchId: batchId,
                        type: 'saida',
                        storeId: currentStore.id,
                        userName: userName,
                    });

                    data.results.forEach((result: any) => {
                        const resultIng = ingredients.find(i => i.id === result.ingredientId);
                        if (!resultIng) return;

                        const resultRef = doc(db, 'ingredients', result.ingredientId);
                        transaction.update(resultRef, { stockQuantity: increment(result.quantity) });

                        const resultAdjRef = doc(collection(db, 'stockAdjustments'));
                        transaction.set(resultAdjRef, {
                            adjustmentDate: Timestamp.now(),
                            ingredientId: result.ingredientId,
                            ingredientName: resultIng.name,
                            ingredientUnit: resultIng.unit,
                            quantity: result.quantity,
                            reason: `Produção: Entrada por desmembramento de ${sourceIngredient.name}`,
                            batchId: batchId,
                            type: 'entrada',
                            storeId: currentStore.id,
                            userName: userName,
                        });
                    });
                } 
                // MODO 2: Receita (N -> 1)
                else if (data.mode === 'recipe') {
                    const recipe = recipes.find(r => r.id === data.recipeId);
                    const targetIngredient = ingredients.find(i => i.id === data.targetIngredientId);
                    if (!recipe || !targetIngredient) throw new Error("Receita ou Insumo de destino não encontrados.");

                    // 1. Saída de todos os ingredientes da receita
                    for (const item of data.ingredientsToDeduct) {
                        const ing = ingredients.find(i => i.id === item.ingredientId);
                        if (!ing) continue;

                        const ingRef = doc(db, 'ingredients', item.ingredientId);
                        transaction.update(ingRef, { stockQuantity: increment(-item.quantity) });

                        const adjRef = doc(collection(db, 'stockAdjustments'));
                        transaction.set(adjRef, {
                            adjustmentDate: Timestamp.now(),
                            ingredientId: item.ingredientId,
                            ingredientName: ing.name,
                            ingredientUnit: ing.unit,
                            quantity: item.quantity,
                            reason: `Produção: Consumo para receita "${recipe.name}"`,
                            batchId: batchId,
                            type: 'saida',
                            storeId: currentStore.id,
                            userName: userName,
                        });
                    }

                    // 2. Entrada do produto produzido
                    const targetRef = doc(db, 'ingredients', data.targetIngredientId);
                    transaction.update(targetRef, { stockQuantity: increment(data.producedQuantity) });

                    const targetAdjRef = doc(collection(db, 'stockAdjustments'));
                    transaction.set(targetAdjRef, {
                        adjustmentDate: Timestamp.now(),
                        ingredientId: data.targetIngredientId,
                        ingredientName: targetIngredient.name,
                        ingredientUnit: targetIngredient.unit,
                        quantity: data.producedQuantity,
                        reason: `Produção: Entrada via Ficha Técnica "${recipe.name}"`,
                        batchId: batchId,
                        type: 'entrada',
                        storeId: currentStore.id,
                        userName: userName,
                    });
                }
            });

            // Prepara itens para o diálogo de etiquetas
            let producedItems: ProducedItem[] = [];
            if (data.mode === 'dismantling') {
                producedItems = data.results.map((r: any) => {
                    const ing = ingredients.find(i => i.id === r.ingredientId);
                    return {
                        id: r.ingredientId,
                        name: ing?.name || 'Desconhecido',
                        displayQuantity: r.displayQuantity || `${r.quantity} un`,
                        lote: batchId
                    };
                });
            } else {
                const ing = ingredients.find(i => i.id === data.targetIngredientId);
                producedItems = [{
                    id: data.targetIngredientId,
                    name: ing?.name || 'Produção',
                    displayQuantity: `${data.producedQuantity} ${data.producedUnit}`,
                    lote: batchId
                }];
            }

            setLastProducedItems(producedItems);
            setShowSuccessSuccessDialog(true);

            toast({
                title: "Produção Registrada!",
                description: `A transformação foi processada e o estoque atualizado.`,
            });

        } catch (error: any) {
            console.error("Erro na produção:", error);
            toast({
                title: "Erro ao processar",
                description: error.message || "Ocorreu um erro ao salvar a produção.",
                variant: "destructive"
            });
        }
    };

    const handleGenerateLabel = (item: ProducedItem) => {
        const fabricationDate = new Date();
        const expirationDate = addDays(fabricationDate, 3); // Default 3 dias
        const fabricante = currentStore?.name || "Custo Certo";
        const responsavel = appUser?.displayName || user?.displayName || "Responsável";

        const labelHtml = `
            <div style="width: 288px; font-family: sans-serif; font-size: 10px; border: 1px solid black; padding: 10px;">
                <div style="text-align: center; font-weight: bold; font-size: 14px;">${item.name.toUpperCase()}</div>
                <div style="text-align: center; font-weight: bold; margin-bottom: 5px;">RESFRIADO</div>
                <hr style="border: 0; border-top: 1px solid black;"/>
                <div style="display: grid; grid-template-columns: auto 1fr; gap: 2px 5px;">
                    <b>MANIPULAÇÃO:</b> <span>${format(fabricationDate, 'dd/MM/yyyy HH:mm')}</span>
                    <b>VALIDADE:</b> <span>${format(expirationDate, 'dd/MM/yyyy HH:mm')}</span>
                    <b>LOTE:</b> <span>${item.lote}</span>
                    <b>QUANTIDADE:</b> <span>${item.displayQuantity}</span>
                    <b>FABRICANTE:</b> <span>${fabricante}</span>
                    <b>RESPONSÁVEL:</b> <span>${responsavel}</span>
                </div>
                <hr style="border: 0; border-top: 1px solid black;"/>
                <div style="text-align: center; font-weight: bold; margin-top: 5px;">CUSTO CERTO XANGRI-LÁ</div>
            </div>
        `;

        const printWindow = window.open('', '_blank', 'width=400,height=400');
        if (printWindow) {
            printWindow.document.write(`<html><body style="margin:0; padding: 10px;">${labelHtml}</body></html>`);
            printWindow.document.close();
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 500);
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title="Produção e Desmembramento"
                description={`Gerenciamento de transformações para: ${currentStore?.name}`}
            />

            <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                    <ProductionForm 
                        ingredients={ingredients} 
                        recipes={recipes}
                        onSubmit={handleProcessProduction}
                    />
                </div>
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Hammer className="h-5 w-5 text-primary" />
                                Histórico de Produção - {currentStore?.name}
                            </CardTitle>
                            <CardDescription>Movimentações de transformação detalhadas por lote e responsável.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[100px]">Data</TableHead>
                                        <TableHead>Insumo</TableHead>
                                        <TableHead className="w-[80px]">Tipo</TableHead>
                                        <TableHead className="text-right">Qtd.</TableHead>
                                        <TableHead><div className="flex items-center gap-1"><Info className="h-3 w-3"/> Motivo</div></TableHead>
                                        <TableHead><div className="flex items-center gap-1"><Layers className="h-3 w-3"/> Lote</div></TableHead>
                                        <TableHead><div className="flex items-center gap-1"><User className="h-3 w-3"/> Responsável</div></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoadingHistory ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center py-10">Carregando histórico...</TableCell>
                                        </TableRow>
                                    ) : productionHistory.length > 0 ? (
                                        productionHistory.map((adj) => (
                                            <TableRow key={adj.id}>
                                                <TableCell className="text-[10px]">
                                                    {format(adj.adjustmentDate, 'dd/MM HH:mm', { locale: ptBR })}
                                                </TableCell>
                                                <TableCell className="font-medium text-xs">{adj.ingredientName}</TableCell>
                                                <TableCell>
                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${adj.type === 'saida' ? 'bg-destructive/10 text-destructive' : 'bg-green-100 text-green-700'}`}>
                                                        {adj.type === 'saida' ? 'Saída' : 'Entrada'}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-xs">
                                                    {adj.quantity.toFixed(3)} {adj.ingredientUnit}
                                                </TableCell>
                                                <TableCell className="text-[10px] truncate max-w-[120px]">
                                                    {adj.reason.replace('Produção: ', '')}
                                                </TableCell>
                                                <TableCell className="text-[10px] font-mono text-muted-foreground">
                                                    {adj.batchId || '-'}
                                                </TableCell>
                                                <TableCell className="text-[10px] text-muted-foreground">
                                                    {adj.userName || '-'}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                                                Nenhuma produção encontrada nesta loja.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Diálogo de Sucesso e Etiquetas */}
            <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessSuccessDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <div className="flex items-center gap-2 text-green-600 mb-2">
                            <CheckCircle2 className="h-6 w-6" />
                            <DialogTitle>Produção Finalizada!</DialogTitle>
                        </div>
                        <DialogDescription>
                            Os estoques foram atualizados. Deseja imprimir as etiquetas de manipulação para os produtos gerados?
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 my-4">
                        {lastProducedItems.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                                <div className="grid gap-0.5">
                                    <span className="text-sm font-semibold">{item.name}</span>
                                    <span className="text-xs text-muted-foreground">{item.displayQuantity}</span>
                                </div>
                                <Button size="sm" variant="outline" onClick={() => handleGenerateLabel(item)}>
                                    <Tags className="mr-2 h-4 w-4" />
                                    Etiqueta
                                </Button>
                            </div>
                        ))}
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setShowSuccessSuccessDialog(false)} variant="secondary" className="w-full">
                            Concluir sem Imprimir
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
