
'use client';

import * as React from 'react';
import { collection, query, onSnapshot, Timestamp, doc, where, setDoc, getDocs, writeBatch } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { format, startOfMonth, endOfMonth, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { WalletCards, Trash2, FileText, Loader2, TrendingUp, PieChart as PieIcon } from 'lucide-react';

import PageHeader from "@/components/page-header";
import { ExpenseForm, type ExpenseFormValues } from "@/components/despesas/expense-form";
import { db, storage } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import type { Expense } from '@/lib/types';
import { useStore } from '@/components/auth/store-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export default function DespesasPage() {
    const { toast } = useToast();
    const { currentStore } = useStore();
    const [expenses, setExpenses] = React.useState<Expense[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);

    // Summary states
    const [monthTotal, setTotalMonth] = React.useState(0);
    const [categoryRanking, setCategoryRanking] = React.useState<{ name: string, value: number }[]>([]);

    React.useEffect(() => {
        if (!currentStore) return;

        setIsLoading(true);

        // Busca todas as despesas da loja para garantir compatibilidade com campos antigos e novos
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

                // Suporte a expenseDate (novo) ou date (antigo)
                return {
                    id: doc.id,
                    ...d,
                    expenseDate: parseDate(d.expenseDate || d.date),
                    dueDate: d.dueDate ? parseDate(d.dueDate) : undefined
                } as Expense;
            });

            // Ordena localmente para garantir consistência independente do campo no Firestore
            const sortedData = data.sort((a, b) => (b.expenseDate as Date).getTime() - (a.expenseDate as Date).getTime());

            setExpenses(sortedData);
            
            const now = new Date();
            const monthExpenses = sortedData.filter(e => isSameMonth(e.expenseDate as Date, now));

            const total = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
            setTotalMonth(total);

            const catMap = monthExpenses.reduce((acc, e) => {
                acc[e.category] = (acc[e.category] || 0) + e.amount;
                return acc;
            }, {} as Record<string, number>);

            const ranking = Object.entries(catMap)
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 3);
            
            setCategoryRanking(ranking);
            setIsLoading(false);
        }, (error: any) => {
            console.error("Erro ao carregar despesas:", error);
            if (error.code === 'permission-denied') {
                errorEmitter.emit('permission-error', new FirestorePermissionError({
                    path: 'expenses',
                    operation: 'list',
                }));
            }
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [currentStore]);

    const handleAddExpense = async (data: ExpenseFormValues) => {
        if (!currentStore) return;

        try {
            let invoiceUrl = '';
            let invoiceFileType = '';

            if (data.invoiceFile instanceof File) {
                const file = data.invoiceFile;
                const fileName = `expense_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
                const storageRef = ref(storage, `expenses/${currentStore.id}/${fileName}`);
                const snapshot = await uploadBytes(storageRef, file);
                invoiceUrl = await getDownloadURL(snapshot.ref);
                invoiceFileType = file.type;
            }

            const expenseRef = doc(collection(db, 'expenses'));
            const payableAccountRef = doc(collection(db, 'payableAccounts'));

            const expenseData = {
                description: data.description,
                category: data.category,
                amount: data.amount,
                expenseDate: Timestamp.fromDate(data.expenseDate),
                dueDate: (!data.isDueDateOpen && data.dueDate) ? Timestamp.fromDate(data.dueDate) : null,
                paymentMethod: data.paymentMethod,
                status: data.status,
                storeId: currentStore.id,
                invoiceUrl: invoiceUrl || '',
                invoiceFileType: invoiceFileType || ''
            };

            const payableData = {
                expenseId: expenseRef.id,
                supplierName: data.category,
                description: data.description,
                amount: data.amount,
                dueDate: (!data.isDueDateOpen && data.dueDate) ? Timestamp.fromDate(data.dueDate) : null,
                status: data.status === 'Pago' ? 'Pago' : 'Pendente',
                storeId: currentStore.id,
                ...(data.status === 'Pago' && data.dueDate && { paymentDate: Timestamp.fromDate(data.dueDate) })
            };

            setDoc(expenseRef, expenseData).catch(async (err) => {
                if (err.code === 'permission-denied') {
                    errorEmitter.emit('permission-error', new FirestorePermissionError({
                        path: expenseRef.path,
                        operation: 'create',
                        requestResourceData: expenseData,
                    }));
                }
            });

            setDoc(payableAccountRef, payableData).catch(async (err) => {
                if (err.code === 'permission-denied') {
                    errorEmitter.emit('permission-error', new FirestorePermissionError({
                        path: payableAccountRef.path,
                        operation: 'create',
                        requestResourceData: payableData,
                    }));
                }
            });

            toast({
                title: "Despesa Registrada!",
                description: "O gasto foi salvo e aparecerá no histórico instantaneamente.",
            });

        } catch (error: any) {
            console.error("Erro no processo de salvamento:", error);
            toast({
                title: "Erro ao processar",
                description: "Não foi possível completar o lançamento. Verifique os dados.",
                variant: "destructive"
            });
        }
    };

    const handleDeleteExpense = async (expense: Expense) => {
        if (!currentStore) return;
        
        try {
            const qPayable = query(
                collection(db, 'payableAccounts'),
                where('expenseId', '==', expense.id),
                where('storeId', '==', currentStore.id)
            );
            const payableSnap = await getDocs(qPayable);
            const batch = writeBatch(db);
            batch.delete(doc(db, 'expenses', expense.id));
            payableSnap.forEach(d => batch.delete(d.ref));
            await batch.commit();

            toast({
                title: "Despesa Excluída",
                description: "O registro e a conta associada foram removidos."
            });
        } catch (error: any) {
             console.error("Erro ao excluir despesa:", error);
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title="Gastos e Despesas"
                description={`Controle de despesas gerais para: ${currentStore?.name}`}
            />

            <Tabs defaultValue="lista">
                <TabsList>
                    <TabsTrigger value="novo">Lançar Novo Gasto</TabsTrigger>
                    <TabsTrigger value="lista">Histórico e Resumo</TabsTrigger>
                </TabsList>

                <TabsContent value="novo" className="mt-4">
                    <ExpenseForm onSubmit={handleAddExpense} />
                </TabsContent>

                <TabsContent value="lista" className="mt-4 space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium uppercase text-muted-foreground tracking-wider">Total este Mês</CardTitle>
                                <TrendingUp className="h-4 w-4 text-primary" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatCurrency(monthTotal)}</div>
                                <p className="text-xs text-muted-foreground mt-1">Soma de todos os gastos desta unidade</p>
                            </CardContent>
                        </Card>
                        {categoryRanking.map((cat, idx) => (
                             <Card key={idx}>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium uppercase text-muted-foreground tracking-wider">Top {idx + 1}: {cat.name}</CardTitle>
                                    <PieIcon className="h-4 w-4 text-primary" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{formatCurrency(cat.value)}</div>
                                    <p className="text-xs text-muted-foreground mt-1">{((cat.value / (monthTotal || 1)) * 100).toFixed(1)}% do total</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <WalletCards className="h-5 w-5 text-primary" />
                                Movimentações Financeiras
                            </CardTitle>
                            <CardDescription>Lista detalhada de todos os gastos registrados nesta unidade.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Data Gasto</TableHead>
                                        <TableHead>Descrição</TableHead>
                                        <TableHead>Categoria</TableHead>
                                        <TableHead>Vencimento</TableHead>
                                        <TableHead className="text-right">Valor</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-center">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow><TableCell colSpan={7} className="text-center py-10"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                                    ) : expenses.length > 0 ? (
                                        expenses.map(expense => (
                                            <TableRow key={expense.id}>
                                                <TableCell className="text-xs">{format(expense.expenseDate as Date, 'dd/MM/yyyy')}</TableCell>
                                                <TableCell className="font-medium">
                                                    <div className="flex items-center gap-2">
                                                        {expense.description}
                                                        {expense.invoiceUrl && (
                                                            <a href={expense.invoiceUrl} target="_blank" rel="noopener noreferrer" title="Ver Comprovante">
                                                                <FileText className="h-4 w-4 text-blue-500 cursor-pointer hover:text-blue-700" />
                                                            </a>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell><Badge variant="outline">{expense.category}</Badge></TableCell>
                                                <TableCell className="text-xs">
                                                    {expense.dueDate ? format(expense.dueDate as Date, 'dd/MM/yyyy') : <span className="italic text-muted-foreground">Em aberto</span>}
                                                </TableCell>
                                                <TableCell className="text-right font-bold text-primary">{formatCurrency(expense.amount)}</TableCell>
                                                <TableCell>
                                                    <Badge variant={expense.status === 'Pago' ? 'default' : 'destructive'}>
                                                        {expense.status === 'Pago' ? 'Pago' : 'Pendente'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10">
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Excluir Despesa?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    Isso removerá permanentemente o registro de <span className="font-bold">{expense.description}</span> e a conta a pagar vinculada.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleDeleteExpense(expense)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Nenhuma despesa lançada nesta loja.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
