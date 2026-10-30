
"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { collection, query, where, Timestamp, getDocs, doc, onSnapshot } from 'firebase/firestore';
import { startOfMonth, endOfMonth, format, subMonths } from 'date-fns';
import { ptBR } from "date-fns/locale";

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { db } from "@/lib/firebase";
import { Badge } from "../ui/badge";
import { formatCurrency } from "@/lib/utils";
import { useStore } from "../auth/store-provider"
import type { MonthlyClosing } from "@/lib/types";

const cmvFormSchema = z.object({
  month: z.string().min(1, "Selecione um mês."),
  initialStockValue: z.coerce.number().min(0, "O valor deve ser positivo."),
  finalStockValue: z.coerce.number().min(0, "O valor deve ser positivo."),
  // Campos calculados
  totalPurchases: z.number(),
  totalRevenue: z.number(),
  cmvValue: z.number(),
  cmvPercentage: z.number(),
});

export type CmvFormValues = z.infer<typeof cmvFormSchema>;

interface CmvFormProps {
    onSubmit: (data: CmvFormValues) => Promise<void>;
    initialData: MonthlyClosing | null;
    onCancelEdit: () => void;
}

export function CmvForm({ onSubmit, initialData, onCancelEdit }: CmvFormProps) {
    const { currentStore } = useStore();
    const [selectedMonth, setSelectedMonth] = React.useState<Date>(initialData ? new Date(initialData.month + '-02') : subMonths(new Date(), 1));
    const [isLoading, setIsLoading] = React.useState(false);
    const isEditing = !!initialData;

    const form = useForm<CmvFormValues>({
        resolver: zodResolver(cmvFormSchema),
        defaultValues: initialData ? {
            ...initialData,
             month: initialData.month,
        } : {
            month: format(selectedMonth, 'yyyy-MM'),
            initialStockValue: 0,
            finalStockValue: 0,
            totalPurchases: 0,
            totalRevenue: 0,
            cmvValue: 0,
            cmvPercentage: 0,
        },
    });

    const watchedInitialStock = form.watch('initialStockValue');
    const watchedFinalStock = form.watch('finalStockValue');
    const watchedPurchases = form.watch('totalPurchases');
    const watchedRevenue = form.watch('totalRevenue');

    React.useEffect(() => {
        if (isEditing && initialData) {
            // Populate form with existing data when editing
            form.setValue('month', initialData.month);
            form.setValue('initialStockValue', initialData.initialStockValue);
            form.setValue('finalStockValue', initialData.finalStockValue);
            form.setValue('totalPurchases', initialData.totalPurchases);
            form.setValue('totalRevenue', initialData.totalRevenue);
            return;
        }

        const monthId = format(selectedMonth, 'yyyy-MM');
        form.setValue('month', monthId);
        
        const fetchData = async () => {
            if (!currentStore) return;
            setIsLoading(true);
            const start = startOfMonth(selectedMonth);
            const end = endOfMonth(selectedMonth);

            const purchasesQuery = query(collection(db, 'purchases'), 
                where('storeId', '==', currentStore.id),
                where('purchaseDate', '>=', Timestamp.fromDate(start)),
                where('purchaseDate', '<=', Timestamp.fromDate(end))
            );
            const purchasesSnap = await getDocs(purchasesQuery);
            const totalPurchases = purchasesSnap.docs.reduce((sum, doc) => sum + doc.data().totalAmount, 0);
            form.setValue('totalPurchases', totalPurchases);

            const revenuesQuery = query(collection(db, 'revenues'),
                where('storeId', '==', currentStore.id),
                where('date', '>=', Timestamp.fromDate(start)),
                where('date', '<=', Timestamp.fromDate(end))
            );
            const revenuesSnap = await getDocs(revenuesQuery);
            const totalRevenue = revenuesSnap.docs.reduce((sum, doc) => sum + doc.data().amount, 0);
            form.setValue('totalRevenue', totalRevenue);

            // Reset stock values when month changes
            form.setValue('initialStockValue', 0);
            form.setValue('finalStockValue', 0);

            setIsLoading(false);
        };

        fetchData();

    }, [selectedMonth, form, currentStore, isEditing, initialData]);
    
     React.useEffect(() => {
        const cmvValue = watchedInitialStock + watchedPurchases - watchedFinalStock;
        const cmvPercentage = watchedRevenue > 0 ? (cmvValue / watchedRevenue) * 100 : 0;
        form.setValue('cmvValue', cmvValue);
        form.setValue('cmvPercentage', cmvPercentage);
    }, [watchedInitialStock, watchedFinalStock, watchedPurchases, watchedRevenue, form]);


    async function onFormSubmit(data: CmvFormValues) {
        await onSubmit(data);
        if (!isEditing) {
            form.reset({
                month: format(new Date(), 'yyyy-MM'),
                initialStockValue: 0,
                finalStockValue: 0,
                totalPurchases: 0,
                totalRevenue: 0,
                cmvValue: 0,
                cmvPercentage: 0,
            });
        }
    }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onFormSubmit)}>
        <Card>
            <CardHeader>
                <CardTitle>{isEditing ? 'Editar Fechamento' : 'Novo Fechamento Mensal'}</CardTitle>
                <CardDescription>
                    {isEditing ? `Editando o fechamento de ${format(new Date(initialData.month + '-02'), "MMMM 'de' yyyy", { locale: ptBR })}.` : 'Insira os valores de estoque para calcular o CMV do mês.'}
                </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
                
                <FormField
                    control={form.control}
                    name="month"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Mês de Referência</FormLabel>
                            <FormControl>
                                <Input
                                    type="month"
                                    value={field.value}
                                    onChange={(e) => {
                                        field.onChange(e.target.value);
                                        setSelectedMonth(new Date(e.target.value + '-02'));
                                    }}
                                    disabled={isEditing}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="initialStockValue"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Estoque Inicial (R$)</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="0,00" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="finalStockValue"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Estoque Final (R$)</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="0,00" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />

                <Separator />
                
                <div className="space-y-4 rounded-lg border p-4">
                     <h3 className="text-lg font-medium">Cálculos do Período</h3>
                     {isLoading ? (
                        <p>Carregando dados do mês...</p>
                     ) : (
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Total de Compras</span>
                                <span className="font-semibold">{formatCurrency(form.getValues('totalPurchases'))}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Total de Faturamento</span>
                                <span className="font-semibold">{formatCurrency(form.getValues('totalRevenue'))}</span>
                            </div>
                             <div className="flex justify-between items-center pt-2 border-t">
                                <span className="text-muted-foreground">CMV (Custo)</span>
                                <span className="font-bold text-lg">{formatCurrency(form.getValues('cmvValue'))}</span>
                            </div>
                             <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">CMV (%)</span>
                                <Badge variant={(form.getValues('cmvPercentage') || 0) > 35 ? "destructive" : "default"} className="text-lg">{(form.getValues('cmvPercentage') || 0).toFixed(2)}%</Badge>
                            </div>
                        </div>
                     )}
                </div>

            </CardContent>
            <CardFooter className="flex justify-end border-t pt-6 gap-2">
                {isEditing && (
                    <Button type="button" variant="ghost" onClick={onCancelEdit}>Cancelar</Button>
                )}
                <Button type="submit" disabled={form.formState.isSubmitting || isLoading}>
                    {form.formState.isSubmitting ? 'Salvando...' : (isEditing ? 'Salvar Alterações' : 'Salvar Fechamento')}
                </Button>
            </CardFooter>
        </Card>
      </form>
    </Form>
  )
}
