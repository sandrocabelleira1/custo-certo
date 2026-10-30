
'use client';

import * as React from 'react';
import { collection, onSnapshot, addDoc, query, orderBy, Timestamp, where, doc, deleteDoc } from 'firebase/firestore';
import { TrendingUp, Trash2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import PageHeader from "@/components/page-header";
import { RevenueForm, type RevenueFormValues } from "@/components/faturamento/revenue-form";
import { db } from '@/lib/firebase';
import type { Revenue } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
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
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useStore } from '@/components/auth/store-provider';
import { Input } from '@/components/ui/input';
import RevenueChart from '@/components/faturamento/revenue-chart';

export default function FaturamentoPage() {
    const { toast } = useToast();
    const { currentStore } = useStore();
    const [allRevenues, setAllRevenues] = React.useState<Revenue[]>([]);
    const [filteredRevenues, setFilteredRevenues] = React.useState<Revenue[]>([]);
    const [selectedMonth, setSelectedMonth] = React.useState(format(new Date(), 'yyyy-MM'));

    React.useEffect(() => {
        if (!currentStore) return;
        const q = query(collection(db, 'revenues'), where('storeId', '==', currentStore.id), orderBy('date', 'desc'));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const revenuesData: Revenue[] = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                revenuesData.push({ 
                    id: doc.id,
                     ...data,
                    date: (data.date as Timestamp).toDate()
                } as Revenue);
            });
            setAllRevenues(revenuesData);
        });

        return () => unsubscribe();
    }, [currentStore]);
    
    React.useEffect(() => {
        const [year, month] = selectedMonth.split('-').map(Number);
        const startDate = startOfMonth(new Date(year, month - 1));
        const endDate = endOfMonth(new Date(year, month - 1));

        const filtered = allRevenues.filter(revenue => {
            const revenueDate = revenue.date as Date;
            return revenueDate >= startDate && revenueDate <= endDate;
        });
        setFilteredRevenues(filtered);

    }, [allRevenues, selectedMonth]);

    const totalFilteredRevenue = React.useMemo(() => {
        return filteredRevenues.reduce((acc, revenue) => acc + revenue.amount, 0);
    }, [filteredRevenues]);

    const handleAddRevenue = async (data: RevenueFormValues) => {
        if (!currentStore) {
            toast({ title: "Erro", description: "Nenhuma loja selecionada.", variant: "destructive" });
            return;
        }
        const revenueData = {
            date: data.date,
            description: data.description,
            amount: data.amount,
            storeId: currentStore.id,
        };

        try {
            await addDoc(collection(db, 'revenues'), revenueData);
            toast({
                title: "Faturamento Adicionado!",
                description: `A receita de ${formatCurrency(data.amount)} foi salva com sucesso.`,
            });
        } catch (error) {
            console.error("Error adding document: ", error);
            toast({
                title: "Erro ao salvar!",
                description: "Não foi possível salvar a receita. Tente novamente.",
                variant: "destructive"
            });
        }
    };
    
    const handleDeleteRevenue = async (revenueId: string) => {
        try {
            await deleteDoc(doc(db, 'revenues', revenueId));
            toast({
                title: 'Faturamento Excluído!',
                description: 'O registro de faturamento foi removido com sucesso.',
            });
        } catch (error) {
            console.error('Error deleting revenue: ', error);
            toast({
                title: 'Erro ao excluir!',
                description: 'Não foi possível remover o registro de faturamento. Tente novamente.',
                variant: 'destructive',
            });
        }
    };


    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title="Faturamento"
                description="Registre as receitas e acompanhe o desempenho do seu negócio."
            />

            <RevenueChart revenues={filteredRevenues} />

            <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                    <RevenueForm onAddRevenue={handleAddRevenue} />
                </div>
                <div className="lg:col-span-2">
                     <Card>
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <CardTitle className="flex items-center gap-2">
                                        <TrendingUp className="h-5 w-5 text-primary" />
                                        Histórico de Faturamento
                                    </CardTitle>
                                    <CardDescription>
                                        Lista das últimas receitas registradas.
                                    </CardDescription>
                                </div>
                                <Input
                                    type="month"
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(e.target.value)}
                                    className="w-[180px]"
                                />
                            </div>
                        </CardHeader>
                        <CardContent>
                        <Table>
                            <TableHeader>
                            <TableRow>
                                <TableHead>Data</TableHead>
                                <TableHead>Descrição</TableHead>
                                <TableHead className="text-right">Valor</TableHead>
                                <TableHead className="text-center w-[80px]">Ações</TableHead>
                            </TableRow>
                            </TableHeader>
                            <TableBody>
                            {filteredRevenues.map((revenue) => (
                                <TableRow key={revenue.id}>
                                <TableCell>{format(revenue.date, 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                                <TableCell className="font-medium">{revenue.description}</TableCell>
                                <TableCell className="text-right font-semibold text-primary">
                                    {formatCurrency(revenue.amount)}
                                </TableCell>
                                <TableCell className="text-center">
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10">
                                          <Trash2 className="h-4 w-4" />
                                          <span className="sr-only">Excluir</span>
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Essa ação não pode ser desfeita. Isso excluirá permanentemente o faturamento de <span className="font-bold">{formatCurrency(revenue.amount)}</span> do dia <span className="font-bold">{format(revenue.date, 'dd/MM/yyyy')}</span>.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                          <AlertDialogAction onClick={() => handleDeleteRevenue(revenue.id!)}>
                                            Excluir
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                </TableCell>
                                </TableRow>
                            ))}
                             {filteredRevenues.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                                        Nenhum faturamento encontrado para o mês selecionado.
                                    </TableCell>
                                </TableRow>
                            )}
                            </TableBody>
                        </Table>
                        </CardContent>
                        <CardFooter className="flex justify-end border-t pt-4">
                            <div className="text-lg">
                                <span className="text-muted-foreground">Total no Mês: </span>
                                <span className="font-bold text-primary">{formatCurrency(totalFilteredRevenue)}</span>
                            </div>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </div>
    )
}
