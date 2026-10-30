
'use client';

import * as React from 'react';
import { collection, addDoc, query, onSnapshot, Timestamp, orderBy, doc, getDoc, updateDoc, writeBatch, deleteDoc, where, getDocs, runTransaction, increment } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

import PageHeader from "@/components/page-header";
import { PurchaseForm, type PurchaseFormValues } from "@/components/compras/purchase-form";
import { db, storage } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import type { Purchase, Ingredient, Supplier, PayableAccount } from '@/lib/types';
import { PurchaseHistory } from "@/components/compras/purchase-history";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useStore } from '@/components/auth/store-provider';
import { DatePicker } from '@/components/ui/datepicker';
import { Button } from '@/components/ui/button';
import { subMonths } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ComprasPage() {
    const { toast } = useToast();
    const { currentStore } = useStore();
    const [allPurchases, setAllPurchases] = React.useState<Purchase[]>([]);
    const [filteredPurchases, setFilteredPurchases] = React.useState<Purchase[]>([]);
    const [ingredients, setIngredients] = React.useState<Ingredient[]>([]);
    const [suppliers, setSuppliers] = React.useState<Supplier[]>([]);

    // Filter states
    const [startDate, setStartDate] = React.useState<Date | undefined>(subMonths(new Date(), 1));
    const [endDate, setEndDate] = React.useState<Date | undefined>(new Date());
    const [paymentMethodFilter, setPaymentMethodFilter] = React.useState<string>('Todos');

     React.useEffect(() => {
        if (!currentStore) return;
        // Listener para Compras
        const qPurchases = query(collection(db, 'purchases'), where('storeId', '==', currentStore.id), orderBy('purchaseDate', 'desc'));
        const unsubscribePurchases = onSnapshot(qPurchases, (querySnapshot) => {
            const purchasesData: Purchase[] = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                purchasesData.push({ 
                    id: doc.id, 
                    ...data,
                    purchaseDate: (data.purchaseDate as Timestamp).toDate(),
                    installments: data.installments?.map((inst: any) => ({
                        ...inst,
                        dueDate: (inst.dueDate as Timestamp).toDate()
                    })) || []
                 } as Purchase);
            });
            setAllPurchases(purchasesData);
        });

        const qIngredients = query(collection(db, 'ingredients'), orderBy('name', 'asc'));
        const unsubscribeIngredients = onSnapshot(qIngredients, (querySnapshot) => {
            const ingredientsData: Ingredient[] = [];
            querySnapshot.forEach((doc) => {
                ingredientsData.push({ id: doc.id, ...doc.data() } as Ingredient);
            });
            setIngredients(ingredientsData);
        });

        const qSuppliers = query(collection(db, 'suppliers'), where('storeId', '==', currentStore.id), orderBy('name', 'asc'));
        const unsubscribeSuppliers = onSnapshot(qSuppliers, (querySnapshot) => {
            const suppliersData: Supplier[] = [];
            querySnapshot.forEach((doc) => {
                suppliersData.push({ id: doc.id, ...doc.data() } as Supplier);
            });
            setSuppliers(suppliersData);
        });


        return () => {
            unsubscribePurchases();
            unsubscribeIngredients();
            unsubscribeSuppliers();
        };
    }, [currentStore]);

    React.useEffect(() => {
        let filtered = allPurchases;

        // Filter by date
        filtered = filtered.filter(purchase => {
            const purchaseDate = purchase.purchaseDate;
            if (startDate && purchaseDate < startDate) {
                return false;
            }
            if (endDate) {
                const endOfDay = new Date(endDate);
                endOfDay.setHours(23, 59, 59, 999);
                if (purchaseDate > endOfDay) {
                    return false;
                }
            }
            return true;
        });

        // Filter by payment method
        if (paymentMethodFilter !== 'Todos') {
            filtered = filtered.filter(purchase => purchase.paymentMethod === paymentMethodFilter);
        }

        setFilteredPurchases(filtered);
    }, [allPurchases, startDate, endDate, paymentMethodFilter]);

    const handleAddPurchase = async (data: PurchaseFormValues) => {
        if (!currentStore) {
            toast({ title: "Erro", description: "Nenhuma loja selecionada.", variant: "destructive" });
            return;
        }

        try {
            let invoiceUrl = '';
            let invoiceFileType = '';

            // 1. Upload do arquivo ANTES da transação com tratamento de erro específico
            if (data.invoiceFile instanceof File) {
                try {
                    const file = data.invoiceFile;
                    const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
                    const storageRef = ref(storage, `invoices/${currentStore.id}/${fileName}`);
                    const snapshot = await uploadBytes(storageRef, file);
                    invoiceUrl = await getDownloadURL(snapshot.ref);
                    invoiceFileType = file.type;
                } catch (uploadError) {
                    console.error("Erro no upload do anexo:", uploadError);
                    toast({
                        title: "Erro no Anexo",
                        description: "Não foi possível enviar o arquivo da nota fiscal, mas tentaremos salvar os dados da compra.",
                        variant: "destructive"
                    });
                }
            }

            // 2. Busca o fornecedor ANTES
            const supplierName = data.supplierName.trim();
            const suppliersQuery = query(
                collection(db, 'suppliers'), 
                where('name', '==', supplierName), 
                where('storeId', '==', currentStore.id)
            );
            const existingSuppliersSnapshot = await getDocs(suppliersQuery);
            const existingSupplierId = !existingSuppliersSnapshot.empty ? existingSuppliersSnapshot.docs[0].id : null;

            // 3. Executa a transação atômica
            await runTransaction(db, async (transaction) => {
                let supplierId = existingSupplierId;
                
                if (!supplierId) {
                    const newSupplierRef = doc(collection(db, 'suppliers'));
                    transaction.set(newSupplierRef, { name: supplierName, contactInfo: 'N/A', storeId: currentStore.id });
                    supplierId = newSupplierRef.id;
                }

                const ingredientRefs = data.items.map(item => doc(db, "ingredients", item.ingredientId));
                const ingredientSnaps = await Promise.all(ingredientRefs.map(ref => transaction.get(ref)));
                
                const itemsWithDetails = data.items.map((item, index) => {
                    const ingredientSnap = ingredientSnaps[index];
                    const ingredientData = ingredientSnap.exists() ? ingredientSnap.data() as Ingredient : null;
                    const unitPrice = item.quantity > 0 ? item.totalPrice / item.quantity : 0;
                    return {
                        ...item,
                        productName: ingredientData?.name || 'Desconhecido',
                        unit: ingredientData?.unit || 'un',
                        unitPrice: unitPrice,
                    }
                });

                const totalAmount = itemsWithDetails.reduce((acc, item) => acc + item.totalPrice, 0);

                const purchaseData: Omit<Purchase, 'id'> = {
                    supplierId: supplierId,
                    supplierName: supplierName,
                    invoiceNumber: data.invoiceNumber || "",
                    purchaseDate: data.purchaseDate,
                    items: itemsWithDetails,
                    totalAmount: totalAmount,
                    paymentMethod: data.paymentMethod,
                    storeId: currentStore.id,
                    invoiceUrl,
                    invoiceFileType,
                    ...(data.paymentMethod === 'Boleto' && {
                        installments: data.installments?.map(inst => ({
                            ...inst,
                            dueDate: Timestamp.fromDate(inst.dueDate)
                        }))
                    }),
                    ...(data.paymentMethod === 'PIX' && {
                        pixStatus: data.pixStatus,
                        pixDueDate: data.pixDueDate ? Timestamp.fromDate(data.pixDueDate) : undefined,
                    })
                };

                const purchaseRef = doc(collection(db, 'purchases'));
                transaction.set(purchaseRef, {
                    ...purchaseData,
                    purchaseDate: Timestamp.fromDate(purchaseData.purchaseDate)
                });

                if (data.paymentMethod === 'Boleto' && data.installments) {
                    data.installments.forEach((installment, index) => {
                        const payableAccountRef = doc(collection(db, 'payableAccounts'));
                        const payableAccountData: Omit<PayableAccount, 'id'> = {
                            purchaseId: purchaseRef.id,
                            supplierName: supplierName,
                            description: `Compra NF: ${data.invoiceNumber || 'N/A'} - Parcela ${index + 1}/${data.installments?.length}`,
                            amount: installment.amount,
                            dueDate: Timestamp.fromDate(installment.dueDate),
                            status: 'Pendente',
                            boletoBarcode: installment.barcode,
                            storeId: currentStore.id,
                        };
                        transaction.set(payableAccountRef, payableAccountData);
                    });
                } else if (data.paymentMethod === 'PIX' && data.pixStatus === 'agendado' && data.pixDueDate) {
                    const payableAccountRef = doc(collection(db, 'payableAccounts'));
                    const payableAccountData: Omit<PayableAccount, 'id'> = {
                        purchaseId: purchaseRef.id,
                        supplierName: supplierName,
                        description: `Compra NF: ${data.invoiceNumber || 'N/A'} - PIX Agendado`,
                        amount: totalAmount,
                        dueDate: Timestamp.fromDate(data.pixDueDate),
                        status: 'Pendente',
                        storeId: currentStore.id,
                    };
                    transaction.set(payableAccountRef, payableAccountData);

                } else { // Dinheiro, Cartão ou PIX Pago
                     const payableAccountRef = doc(collection(db, 'payableAccounts'));
                     const isPaid = data.paymentMethod === 'Cartão de Crédito' || data.paymentMethod === 'Dinheiro' || (data.paymentMethod === 'PIX' && data.pixStatus === 'pago');
                     const payableAccountData: Omit<PayableAccount, 'id'> = {
                        purchaseId: purchaseRef.id,
                        supplierName: supplierName,
                        description: `Compra NF: ${data.invoiceNumber || 'N/A'}`,
                        amount: totalAmount,
                        dueDate: Timestamp.fromDate(data.purchaseDate),
                        status: isPaid ? 'Pago' : 'Pendente',
                        ...(isPaid && { paymentDate: Timestamp.fromDate(data.purchaseDate) }),
                        storeId: currentStore.id,
                    };
                    transaction.set(payableAccountRef, payableAccountData);
                }
                
                for (let i = 0; i < itemsWithDetails.length; i++) {
                    const item = itemsWithDetails[i];
                    const ingredientSnap = ingredientSnaps[i];
                    const ingredientRef = ingredientRefs[i];

                    if (ingredientSnap.exists()) {
                        const ingredientData = ingredientSnap.data() as Ingredient;
                        
                        const priceHistory = (ingredientData.priceHistory || []).map(h => ({
                            ...h,
                            date: (h.date as Timestamp).toDate()
                        }));
                        
                        const newPriceEntry = {
                            date: data.purchaseDate,
                            cost: item.unitPrice,
                        };
                        
                        const updatedPriceHistory = [...priceHistory, newPriceEntry]
                          .sort((a,b) => a.date.getTime() - b.date.getTime());
                        
                        const totalCost = updatedPriceHistory.reduce((acc, entry) => acc + entry.cost, 0);
                        const newAverageCost = totalCost / updatedPriceHistory.length;

                        transaction.update(ingredientRef, {
                            currentCostPerUnit: item.unitPrice,
                            averageCostPerUnit: newAverageCost,
                            priceHistory: updatedPriceHistory.map(h => ({
                                date: Timestamp.fromDate(h.date),
                                cost: h.cost
                            })),
                            stockQuantity: increment(item.quantity)
                        });
                    }
                }
            });

            toast({
                title: "Compra Registrada!",
                description: `A compra e os custos dos insumos foram atualizados com sucesso.`,
            });
        } catch (error) {
            console.error("Erro ao salvar compra: ", error);
            toast({
                title: "Erro ao salvar!",
                description: "Não foi possível registrar a compra. Verifique sua conexão e tente novamente.",
                variant: "destructive"
            });
        }
    };

   const handleDeletePurchase = async (purchaseId: string) => {
        if (!currentStore) return;
        try {
            await runTransaction(db, async (transaction) => {
                const purchaseRef = doc(db, 'purchases', purchaseId);
                const purchaseSnap = await transaction.get(purchaseRef);
                
                if (!purchaseSnap.exists()) {
                    throw new Error("Compra não encontrada!");
                }
                
                const purchaseData = purchaseSnap.data() as Purchase;
                const purchaseDateAsDate = (purchaseData.purchaseDate as unknown as Timestamp).toDate();

                const ingredientRefs = purchaseData.items.map(item => doc(db, 'ingredients', item.ingredientId));
                const ingredientSnaps = await Promise.all(ingredientRefs.map(ref => transaction.get(ref)));

                const payableAccountsQuery = query(collection(db, 'payableAccounts'), where('purchaseId', '==', purchaseId), where('storeId', '==', currentStore.id));
                const payableAccountsSnapshot = await getDocs(payableAccountsQuery);
                
                for (let i = 0; i < purchaseData.items.length; i++) {
                    const item = purchaseData.items[i];
                    const ingredientSnap = ingredientSnaps[i];
                    const ingredientRef = ingredientRefs[i];

                    if (ingredientSnap.exists()) {
                         const ingredientData = ingredientSnap.data() as Ingredient;
                        
                        const newStockValue = (ingredientData.stockQuantity || 0) - item.quantity;
                        
                        const purchaseTimestamp = purchaseDateAsDate.getTime();
                        
                        const newPriceHistory = (ingredientData.priceHistory || []).filter(h => {
                             const historyTimestamp = (h.date as Timestamp).toMillis();
                             return historyTimestamp !== purchaseTimestamp || Math.abs(h.cost - item.unitPrice) > 0.001;
                        });

                        let newAverageCost = 0;
                        let newCurrentCost = 0;
                        
                        if (newPriceHistory.length > 0) {
                            newCurrentCost = newPriceHistory[newPriceHistory.length - 1].cost;
                            const totalCost = newPriceHistory.reduce((acc, h) => acc + h.cost, 0);
                            newAverageCost = totalCost / newPriceHistory.length;
                        }

                        transaction.update(ingredientRef, {
                            stockQuantity: newStockValue < 0 ? 0 : newStockValue,
                            priceHistory: newPriceHistory,
                            averageCostPerUnit: newAverageCost,
                            currentCostPerUnit: newCurrentCost
                        });
                    }
                }

                payableAccountsSnapshot.forEach((doc) => {
                    transaction.delete(doc.ref);
                });

                transaction.delete(purchaseRef);
            });
            
            toast({
                title: 'Compra Excluída!',
                description: 'A compra, a conta a pagar e o estoque foram revertidos com sucesso.',
            });

        } catch (error) {
            console.error("Erro ao excluir compra: ", error);
            toast({
                title: 'Erro ao excluir!',
                description: 'Não foi possível remover a compra. Tente novamente.',
                variant: 'destructive',
            });
        }
    };


    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title="Compras"
                description="Lance novas notas de compra e gerencie o histórico para atualizar seu estoque e custos."
            />
            <Tabs defaultValue="form">
                <TabsList className="mb-4">
                    <TabsTrigger value="form">Registrar Nova Compra</TabsTrigger>
                    <TabsTrigger value="history">Histórico de Compras</TabsTrigger>
                </TabsList>
                <TabsContent value="form">
                    <PurchaseForm 
                        onAddPurchase={handleAddPurchase} 
                        ingredients={ingredients}
                        suppliers={suppliers} 
                    />
                </TabsContent>
                <TabsContent value="history">
                     <Card>
                        <CardHeader>
                            <CardTitle>Histórico de Compras</CardTitle>
                            <CardDescription>Veja suas últimas compras registradas e gerencie-as.</CardDescription>
                             <div className="flex flex-wrap items-center gap-2 pt-4">
                                <DatePicker date={startDate} setDate={setStartDate} />
                                <DatePicker date={endDate} setDate={setEndDate} />
                                <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="Forma de pagamento" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Todos">Todos</SelectItem>
                                        <SelectItem value="Boleto">Boleto</SelectItem>
                                        <SelectItem value="Cartão de Crédito">Cartão de Crédito</SelectItem>
                                        <SelectItem value="PIX">PIX</SelectItem>
                                        <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Button variant="outline" onClick={() => {
                                    setStartDate(subMonths(new Date(), 1));
                                    setEndDate(new Date());
                                    setPaymentMethodFilter('Todos');
                                }}>Limpar Filtros</Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                             <PurchaseHistory purchases={filteredPurchases} onDeletePurchase={handleDeletePurchase} />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
