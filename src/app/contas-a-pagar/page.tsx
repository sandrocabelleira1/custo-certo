
'use client';

import * as React from 'react';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, Timestamp, deleteDoc, deleteField, where } from 'firebase/firestore';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle, AlertCircle, Copy, MoreHorizontal, RotateCcw, Trash2, Send, CalendarIcon, ArrowLeft, ArrowRight, Search } from 'lucide-react';

import PageHeader from "@/components/page-header";
import { db } from '@/lib/firebase';
import type { PayableAccount } from '@/lib/types';
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
import { Button, buttonVariants } from '@/components/ui/button';
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
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Calendar } from '@/components/ui/calendar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useStore } from '@/components/auth/store-provider';
import { formatCurrency } from '@/lib/utils';
import { Input } from '@/components/ui/input';


export default function ContasAPagarPage() {
    const { toast } = useToast();
    const { currentStore } = useStore();
    const [allAccounts, setAllAccounts] = React.useState<PayableAccount[]>([]);
    const [pendingAccounts, setPendingAccounts] = React.useState<PayableAccount[]>([]);
    const [launchedAccounts, setLaunchedAccounts] = React.useState<PayableAccount[]>([]);
    const [paidAccounts, setPaidAccounts] = React.useState<PayableAccount[]>([]);
    
    // Search state
    const [searchTerm, setSearchTerm] = React.useState("");

    // Calendar state
    const [currentMonth, setCurrentMonth] = React.useState(new Date());
    const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(new Date());


    React.useEffect(() => {
        if (!currentStore) return;
        const q = query(collection(db, 'payableAccounts'), where('storeId', '==', currentStore.id));

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const accountsData: PayableAccount[] = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                accountsData.push({
                    id: doc.id,
                    ...data,
                    dueDate: data.dueDate ? (data.dueDate as Timestamp).toDate() : undefined,
                    ...(data.paymentDate && { paymentDate: (data.paymentDate as Timestamp).toDate() }),
                } as PayableAccount);
            });
            setAllAccounts(accountsData);
        });

        return () => unsubscribe();
    }, [currentStore]);
    
    // Filter and group accounts
    React.useEffect(() => {
        const getSafeTime = (date?: Date) => date ? date.getTime() : Infinity;
        
        const filtered = allAccounts.filter(account => {
            const search = searchTerm.toLowerCase();
            return (
                account.supplierName.toLowerCase().includes(search) ||
                account.description.toLowerCase().includes(search)
            );
        });

        const pending = filtered
            .filter(account => account.status === 'Pendente')
            .sort((a, b) => getSafeTime(a.dueDate as Date) - getSafeTime(b.dueDate as Date));

        const launched = filtered
            .filter(account => account.status === 'Lançada')
            .sort((a, b) => getSafeTime(a.dueDate as Date) - getSafeTime(b.dueDate as Date));

        const paid = filtered
            .filter(account => account.status === 'Pago')
            .sort((a, b) => ((b.paymentDate as Date)?.getTime() || 0) - ((a.paymentDate as Date)?.getTime() || 0));
        
        setPendingAccounts(pending);
        setLaunchedAccounts(launched);
        setPaidAccounts(paid);

    }, [allAccounts, searchTerm]);

    // Calendar related calculations
    const accountsByDueDate = React.useMemo(() => {
        return allAccounts.reduce((acc, account) => {
            if (!account.dueDate) return acc;
            const dateStr = format(account.dueDate as Date, 'yyyy-MM-dd');
            if (!acc[dateStr]) {
                acc[dateStr] = [];
            }
            acc[dateStr].push(account);
            return acc;
        }, {} as Record<string, PayableAccount[]>);
    }, [allAccounts]);

    const accountsForSelectedDate = React.useMemo(() => {
        if (!selectedDate) return [];
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        return accountsByDueDate[dateStr] || [];
    }, [selectedDate, accountsByDueDate]);
    
    const totalToPayInMonth = React.useMemo(() => {
        const start = startOfMonth(currentMonth);
        const end = endOfMonth(currentMonth);
        return allAccounts
            .filter(acc => acc.dueDate && (acc.dueDate as Date) >= start && (acc.dueDate as Date) <= end)
            .reduce((sum, acc) => sum + acc.amount, 0);
    }, [allAccounts, currentMonth]);
    
    const calendarModifiers = React.useMemo(() => {
        const pending: Date[] = [];
        const launched: Date[] = [];
        const paid: Date[] = [];

        for (const account of allAccounts) {
            if (!account.dueDate) continue;
            if (account.status === 'Pendente') {
                pending.push(account.dueDate as Date);
            } else if (account.status === 'Lançada') {
                launched.push(account.dueDate as Date);
            } else if (account.status === 'Pago') {
                paid.push(account.dueDate as Date);
            }
        }
        return { pending, launched, paid };
    }, [allAccounts]);


    const paidAccountsByMonth = React.useMemo(() => {
        return paidAccounts.reduce((acc, account) => {
            if (account.paymentDate) {
                const month = format(account.paymentDate as Date, 'MMMM yyyy', { locale: ptBR });
                if (!acc[month]) {
                    acc[month] = [];
                }
                acc[month].push(account);
            }
            return acc;
        }, {} as Record<string, PayableAccount[]>);
    }, [paidAccounts]);

    const handleUpdateStatus = async (id: string, status: PayableAccount['status']) => {
        const accountRef = doc(db, 'payableAccounts', id);
        let updateData: any = { status };

        let toastTitle = '';
        let toastDescription = '';

        if (status === 'Pago') {
            updateData.paymentDate = Timestamp.now();
            toastTitle = 'Conta Paga!';
            toastDescription = 'A conta foi marcada como paga com sucesso.';
        } else if (status === 'Lançada') {
            toastTitle = 'Pagamento Lançado!';
            toastDescription = 'A conta foi marcada como lançada/agendada.';
        } else if (status === 'Pendente') {
            updateData.paymentDate = deleteField();
            toastTitle = 'Status Revertido!';
            toastDescription = 'A conta foi movida de volta para pendentes.';
        }

        try {
            await updateDoc(accountRef, updateData);
            toast({ title: toastTitle, description: toastDescription });
        } catch (error) {
            console.error("Error updating document: ", error);
            toast({
                title: "Erro ao atualizar!",
                description: "Não foi possível alterar o status da conta.",
                variant: "destructive",
            });
        }
    };
    

    const handleDeleteAccount = async (id: string) => {
        const accountRef = doc(db, 'payableAccounts', id);
        try {
            await deleteDoc(accountRef);
            toast({
                title: 'Registro Excluído!',
                description: 'A conta a pagar foi removida com sucesso do seu financeiro.',
            });
        } catch (error) {
            console.error("Error deleting document: ", error);
            toast({
                title: "Erro ao excluir!",
                description: "Não foi possível remover o registro.",
                variant: "destructive",
            });
        }
    };

    const isOverdue = (dueDate?: Date | Timestamp) => {
        if (!dueDate) return false;
        const date = dueDate instanceof Timestamp ? dueDate.toDate() : dueDate;
        return date < new Date() && new Date(date).setHours(0,0,0,0) !== new Date().setHours(0,0,0,0);
    }

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: 'Copiado!', description: 'Código de barras copiado para a área de transferência.' });
    };

    const getStatusVariant = (account: PayableAccount): "default" | "secondary" | "destructive" | "outline" => {
        switch(account.status) {
            case 'Pago':
                return 'secondary';
            case 'Lançada':
                return 'default';
            case 'Pendente':
                return isOverdue(account.dueDate) ? 'destructive' : 'outline';
            default:
                return 'outline';
        }
    }

    const getStatusText = (account: PayableAccount) => {
        if (account.status === 'Pendente' && isOverdue(account.dueDate)) {
            return 'Vencido';
        }
        return account.status;
    }

    const AccountsTable = ({ accounts, tab }: { accounts: PayableAccount[], tab: 'pendentes' | 'lancadas' | 'pagas' | 'calendario' }) => (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Descrição</TableHead>
                    {tab !== 'pagas' && <TableHead>Cód. Barras</TableHead>}
                    <TableHead>{tab === 'pagas' ? 'Data Pag.' : 'Vencimento'}</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {accounts.length > 0 ? (
                    accounts.map((account) => (
                    <TableRow key={account.id} className={tab === 'pendentes' && isOverdue(account.dueDate) ? 'bg-destructive/10' : ''}>
                        <TableCell className="font-medium">{account.supplierName}</TableCell>
                        <TableCell>{account.description}</TableCell>
                         {tab !== 'pagas' && (
                            <TableCell className="font-mono text-xs">
                                {account.boletoBarcode ? (
                                    <div className="flex items-center gap-2">
                                        <span>{account.boletoBarcode}</span>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6"
                                            onClick={() => copyToClipboard(account.boletoBarcode ?? '')}
                                        >
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ) : (
                                    <span>N/A</span>
                                )}
                            </TableCell>
                        )}
                        <TableCell>
                            {tab === 'pagas' && account.paymentDate 
                                ? format(account.paymentDate as Date, 'dd/MM/yyyy') 
                                : account.dueDate 
                                    ? format(account.dueDate as Date, 'dd/MM/yyyy') 
                                    : <span className="italic text-muted-foreground">Em aberto</span>}
                        </TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(account.amount)}</TableCell>
                        <TableCell className="text-center">
                            <Badge variant={getStatusVariant(account)}>
                                {getStatusText(account)}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                            <div className="flex justify-center gap-2">
                                {account.status === 'Pendente' && (
                                    <>
                                        <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(account.id, 'Lançada')}>
                                            <Send className="mr-2 h-4 w-4" />
                                            Lançar
                                        </Button>
                                        <Button size="sm" onClick={() => handleUpdateStatus(account.id, 'Pago')}>
                                            <CheckCircle className="mr-2 h-4 w-4" />
                                            Pagar
                                        </Button>
                                    </>
                                )}
                                {account.status === 'Lançada' && (
                                    <>
                                        <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(account.id, 'Pendente')}>
                                            <RotateCcw className="mr-2 h-4 w-4" />
                                            Reverter
                                        </Button>
                                        <Button size="sm" onClick={() => handleUpdateStatus(account.id, 'Pago')}>
                                            <CheckCircle className="mr-2 h-4 w-4" />
                                            Confirmar Pag.
                                        </Button>
                                    </>
                                )}
                                
                                {account.status !== 'Pago' ? (
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Excluir lançamento?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Esta ação removerá permanentemente o registro de <span className="font-bold">{account.supplierName}</span> no valor de <span className="font-bold">{formatCurrency(account.amount)}</span> do seu controle financeiro.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDeleteAccount(account.id)} className={buttonVariants({ variant: "destructive"})}>
                                                    Confirmar Exclusão
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                ) : (
                                    <AlertDialog>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                    <span className="sr-only">Abrir menu</span>
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <AlertDialogTrigger asChild>
                                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                                        <RotateCcw className="mr-2 h-4 w-4" />
                                                        Reverter para Lançada
                                                    </DropdownMenuItem>
                                                </AlertDialogTrigger>
                                                <AlertDialogTrigger asChild>
                                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Excluir Registro
                                                    </DropdownMenuItem>
                                                </AlertDialogTrigger>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Escolha uma ação para a conta de <span className="font-bold">{account.supplierName}</span> no valor de <span className="font-bold">{formatCurrency(account.amount)}</span>.
                                            </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleUpdateStatus(account.id, 'Lançada')} className={buttonVariants({ variant: "outline"})}>
                                                Reverter Status
                                            </AlertDialogAction>
                                            <AlertDialogAction onClick={() => handleDeleteAccount(account.id)} className={buttonVariants({ variant: "destructive"})}>
                                                Excluir Registro
                                            </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                )}
                            </div>
                        </TableCell>
                    </TableRow>
                    ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground h-24">
                           {tab === 'calendario' ? "Nenhuma conta para este dia." : "Nenhuma conta encontrada."}
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    );

    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title="Contas a Pagar"
                description="Gerencie os boletos e pagamentos pendentes."
            />
            <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <CardTitle>Controle de Pagamentos</CardTitle>
                            <CardDescription>
                                Acompanhe suas contas pendentes e o histórico de contas pagas.
                            </CardDescription>
                        </div>
                        <div className="relative w-full md:w-[300px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Filtrar por fornecedor ou descrição..."
                                className="pl-10"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="pendentes">
                        <TabsList className="mb-4">
                            <TabsTrigger value="pendentes">Pendentes</TabsTrigger>
                            <TabsTrigger value="lancadas">Lançadas</TabsTrigger>
                            <TabsTrigger value="pagas">Pagas</TabsTrigger>
                            <TabsTrigger value="calendario">Calendário</TabsTrigger>
                        </TabsList>
                        <TabsContent value="pendentes">
                            <AccountsTable accounts={pendingAccounts} tab="pendentes" />
                        </TabsContent>
                        <TabsContent value="lancadas">
                            <AccountsTable accounts={launchedAccounts} tab="lancadas" />
                        </TabsContent>
                        <TabsContent value="pagas">
                           {Object.keys(paidAccountsByMonth).length > 0 ? (
                                <Accordion type="single" collapsible className="w-full" defaultValue={Object.keys(paidAccountsByMonth)[0]}>
                                    {Object.entries(paidAccountsByMonth).map(([month, accounts]) => (
                                        <AccordionItem value={month} key={month}>
                                            <AccordionTrigger className="text-lg font-medium capitalize">{month}</AccordionTrigger>
                                            <AccordionContent>
                                                <AccountsTable accounts={accounts} tab="pagas" />
                                            </AccordionContent>
                                        </AccordionItem>
                                    ))}
                                </Accordion>
                           ) : (
                               <div className="text-center text-muted-foreground py-12">
                                   Nenhuma conta paga encontrada.
                               </div>
                           )}
                        </TabsContent>
                         <TabsContent value="calendario">
                            <div className="grid md:grid-cols-2 gap-8">
                                <div>
                                    <Calendar
                                        mode="single"
                                        selected={selectedDate}
                                        onSelect={setSelectedDate}
                                        month={currentMonth}
                                        onMonthChange={setCurrentMonth}
                                        locale={ptBR}
                                        className="rounded-md border"
                                        modifiers={calendarModifiers}
                                        modifiersClassNames={{
                                            pending: 'day-pending',
                                            launched: 'day-launched',
                                            paid: 'day-paid',
                                        }}
                                    />
                                     <div className="mt-6 pt-4 border-t">
                                        <div className="flex justify-between items-center">
                                            <span className="text-lg font-semibold">Total a Pagar no Mês:</span>
                                            <span className="text-xl font-bold text-destructive">{formatCurrency(totalToPayInMonth)}</span>
                                        </div>
                                         <p className="text-xs text-muted-foreground text-right capitalize">
                                            {format(currentMonth, 'MMMM yyyy', {locale: ptBR})}
                                        </p>
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold mb-2">
                                        {selectedDate ? `Contas de ${format(selectedDate, 'PPP', { locale: ptBR })}` : 'Selecione um dia'}
                                    </h3>
                                    <div className="space-y-4">
                                        <AccountsTable key={selectedDate?.toISOString()} accounts={accountsForSelectedDate} tab="calendario" />
                                    </div>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    )
}
