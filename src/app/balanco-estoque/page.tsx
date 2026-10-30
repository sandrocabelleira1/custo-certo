'use client';

import * as React from 'react';
import { collection, onSnapshot, query, orderBy, runTransaction, doc, Timestamp, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Ingredient, IngredientCategory } from '@/lib/types';
import PageHeader from '@/components/page-header';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { ArrowDown, ArrowUp, Download, Package } from 'lucide-react';
import { useStore } from '@/components/auth/store-provider';
import { useAuth } from '@/components/auth/auth-provider';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

type CountedStock = {
  [ingredientId: string]: number | undefined;
};

type GroupedIngredients = {
    [key in IngredientCategory]?: Ingredient[];
};

const categoryOrder: IngredientCategory[] = ['Alimentos', 'Bebidas', 'Descartáveis', 'Limpeza'];


export default function BalancoEstoquePage() {
  const { toast } = useToast();
  const { currentStore } = useStore();
  const { user, appUser } = useAuth();
  const [allIngredients, setAllIngredients] = React.useState<Ingredient[]>([]);
  const [groupedIngredients, setGroupedIngredients] = React.useState<GroupedIngredients>({});
  const [countedStock, setCountedStock] = React.useState<CountedStock>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!currentStore) return;
    
    const q = query(
        collection(db, 'ingredients'), 
        where('storeId', '==', currentStore.id),
        orderBy('name', 'asc')
    );
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const ingredientsData: Ingredient[] = [];
      querySnapshot.forEach((doc) => {
        ingredientsData.push({
          id: doc.id,
          ...doc.data(),
        } as Ingredient);
      });
      setAllIngredients(ingredientsData);
      
      const grouped = ingredientsData.reduce((acc, ingredient) => {
          const category = ingredient.category;
          if (!acc[category]) {
              acc[category] = [];
          }
          acc[category]!.push(ingredient);
          return acc;
      }, {} as GroupedIngredients);

      setGroupedIngredients(grouped);

    });

    return () => unsubscribe();
  }, [currentStore]);
  

  const handleCountChange = (ingredientId: string, value: string) => {
    const quantity = value === '' ? undefined : parseFloat(value);
    setCountedStock((prev) => ({
      ...prev,
      [ingredientId]: quantity,
    }));
  };

  const totalCountedValue = React.useMemo(() => {
    if (!currentStore) return 0;
    return allIngredients.reduce((total, ing) => {
      const counted = countedStock[ing.id];
      if (counted !== undefined) {
        return total + (counted * ing.currentCostPerUnit);
      }
      const systemStock = ing.stockQuantity || 0;
      return total + (systemStock * ing.currentCostPerUnit);
    }, 0)
  }, [allIngredients, countedStock, currentStore]);

  const handleSaveBalance = async () => {
    if (!currentStore) {
      toast({ title: "Erro", description: "Nenhuma loja selecionada.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);

    const hasCountedItems = Object.values(countedStock).some(val => val !== undefined);


    if (!hasCountedItems) {
        toast({
            title: 'Nenhuma contagem realizada',
            description: 'Por favor, insira a quantidade contada para pelo menos um item.',
            variant: 'destructive'
        });
        setIsSubmitting(false);
        return;
    }

    try {
       await runTransaction(db, async (transaction) => {
        const userName = appUser?.displayName || user?.displayName || 'Usuário';

        for (const ing of allIngredients) {
            const counted = countedStock[ing.id];
            const systemStock = ing.stockQuantity || 0;

            if (counted !== undefined && counted !== systemStock) {
                const difference = counted - systemStock;
                const adjustmentType = difference > 0 ? 'entrada' : 'saida';

                const adj = {
                    adjustmentDate: Timestamp.now(),
                    ingredientId: ing.id,
                    ingredientName: ing.name,
                    ingredientUnit: ing.unit,
                    quantity: Math.abs(difference),
                    reason: `Acerto de inventário`,
                    type: adjustmentType,
                    storeId: currentStore.id,
                    userName: userName,
                };
                const adjustmentRef = doc(collection(db, 'stockAdjustments'));
                transaction.set(adjustmentRef, adj);

                const ingredientRef = doc(db, 'ingredients', ing.id);
                transaction.update(ingredientRef, { stockQuantity: counted });
            }
        }
      });


      toast({
        title: 'Balanço Salvo!',
        description: `O estoque desta loja foi atualizado com sucesso.`,
      });
      setCountedStock({});

    } catch (error) {
      console.error("Erro ao salvar balanço: ", error);
      toast({
        title: 'Erro ao salvar!',
        description: 'Não foi possível salvar o balanço de estoque. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDifference = (ingredient: Ingredient) => {
    const counted = countedStock[ingredient.id];
    if (counted === undefined) return null;
    const difference = counted - (ingredient.stockQuantity || 0);
    return difference;
  }

  const handleDownloadPdf = () => {
    if (!currentStore) return;
    const doc = new jsPDF();
    const tableColumn = ["Insumo", "Estoque Sistema", "Estoque Contado", "Diferença", "Valor (R$)"];
    const tableRows: any[] = [];

    doc.setFontSize(18);
    doc.text(`Balanço de Estoque - ${currentStore?.name}`, 14, 22);
    doc.setFontSize(11);
    doc.text(`Data: ${format(new Date(), 'dd/MM/yyyy')}`, 14, 30);
    

    allIngredients.forEach(ing => {
      const systemStock = ing.stockQuantity || 0;
      const counted = countedStock[ing.id] ?? systemStock;
      const difference = counted - systemStock;
      const value = counted * ing.currentCostPerUnit;

      const ingredientData = [
        ing.name,
        systemStock.toFixed(3),
        counted.toFixed(3),
        difference.toFixed(3),
        formatCurrency(value)
      ];
      tableRows.push(ingredientData);
    });

    (doc as any).autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 35,
        headStyles: { fillColor: [80, 200, 120] }, // Deep Emerald
        didDrawPage: function (data: any) {
            // Footer
            let str = `Página ${doc.internal.pages.length - 1}`;
            doc.setFontSize(10);
            const pageSize = doc.internal.pageSize;
            const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
            doc.text(str, data.settings.margin.left, pageHeight - 10);
        }
    });

    // Add total value at the end
    const finalY = (doc as any).lastAutoTable.finalY;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Valor Total do Estoque Contado:', 14, finalY + 10);
    doc.text(formatCurrency(totalCountedValue), 150, finalY + 10);

    doc.save(`balanco_estoque_${format(new Date(), 'yyyy-MM-dd')}.pdf`);

    toast({
        title: 'Download Iniciado!',
        description: 'Seu relatório em PDF do balanço de estoque está sendo gerado.'
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Balanço de Estoque"
        description="Realize a contagem física do seu estoque e ajuste as quantidades no sistema."
      />

      <Card>
        <CardHeader>
          <CardTitle>Contagem de Insumos - {currentStore?.name}</CardTitle>
          <CardDescription>
            Preencha a coluna 'Estoque Contado' com a quantidade física de cada item. Itens não preenchidos manterão o estoque do sistema no cálculo do valor total.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" defaultValue={categoryOrder} className="w-full">
            {categoryOrder.map(category => {
              const ingredients = groupedIngredients[category];
              if (!ingredients || ingredients.length === 0) return null;

              return (
                <AccordionItem value={category} key={category}>
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                        <Package className="h-5 w-5 text-muted-foreground" />
                        <span className="text-lg font-medium">{category}</span>
                        <Badge variant="secondary">{ingredients.length}</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Insumo</TableHead>
                            <TableHead>Unidade</TableHead>
                            <TableHead className="text-center">Estoque no Sistema</TableHead>
                            <TableHead className="w-[200px] text-center">Estoque Contado</TableHead>
                            <TableHead className="text-center">Diferença</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {ingredients.map((ing) => {
                            const difference = getDifference(ing);
                            const systemStock = ing.stockQuantity || 0;
                            return (
                                <TableRow key={ing.id}>
                                <TableCell className="font-medium">{ing.name}</TableCell>
                                <TableCell>{ing.unit}</TableCell>
                                <TableCell className="text-center font-semibold">{systemStock.toFixed(3)}</TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    placeholder="0.000"
                                    step="0.001"
                                    className="text-center"
                                    value={countedStock[ing.id] ?? ''}
                                    onChange={(e) => handleCountChange(ing.id, e.target.value)}
                                  />
                                </TableCell>
                                <TableCell className="text-center">
                                    {difference !== null && difference !== 0 && (
                                        <Badge variant={difference < 0 ? 'destructive' : 'default'} className="gap-1">
                                            {difference > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                                            {Math.abs(difference).toFixed(3)}
                                        </Badge>
                                    )}
                                     {difference === 0 && (
                                        <Badge variant='secondary' className="gap-1">
                                            OK
                                        </Badge>
                                    )}
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                  </AccordionContent>
                </AccordionItem>
              )
            })}
          </Accordion>
        </CardContent>
        <CardFooter className="flex-col items-stretch gap-4 border-t pt-6">
            <div className="rounded-lg border p-4 flex justify-between items-center">
                <span className="text-lg font-semibold">Valor Total do Estoque Contado ({currentStore?.name}):</span>
                <span className="text-2xl font-bold text-primary">{formatCurrency(totalCountedValue)}</span>
            </div>
            <div className="flex justify-between items-center gap-4">
                <Button onClick={handleDownloadPdf} variant="secondary">
                  <Download className="mr-2 h-4 w-4" />
                  Baixar PDF
                </Button>
                <div className="flex justify-end gap-4">
                    <Button onClick={handleSaveBalance} disabled={isSubmitting} size="lg">
                        {isSubmitting ? 'Salvando...' : 'Salvar e Ajustar Estoque'}
                    </Button>
                </div>
            </div>
        </CardFooter>
      </Card>
    </div>
  );
}
