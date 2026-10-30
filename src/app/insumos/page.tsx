
'use client';

import * as React from 'react';
import { PlusCircle, Trash2, Pencil, Package, Copy, Loader2 } from "lucide-react";
import { collection, onSnapshot, addDoc, query, where, doc, deleteDoc, updateDoc, orderBy, getDocs, writeBatch } from 'firebase/firestore';

import PageHeader from "@/components/page-header";
import { Button } from "@/components/ui/button";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { IngredientForm, type IngredientFormValues } from '@/components/insumos/ingredient-form';
import { db } from '@/lib/firebase';
import type { Ingredient, IngredientCategory, Store } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import { useStore } from '@/components/auth/store-provider';
import { Badge } from '@/components/ui/badge';

type GroupedIngredients = {
    [key in IngredientCategory]?: Ingredient[];
};

const categoryOrder: IngredientCategory[] = ['Alimentos', 'Bebidas', 'Descartáveis', 'Limpeza'];


export default function InsumosPage() {
  const { toast } = useToast();
  const { currentStore } = useStore();
  const [groupedIngredients, setGroupedIngredients] = React.useState<GroupedIngredients>({});
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [editingIngredient, setEditingIngredient] = React.useState<Ingredient | null>(null);
  
  // Import from store states
  const [allStores, setAllStores] = React.useState<Store[]>([]);
  const [isImportDialogOpen, setIsImportDialogOpen] = React.useState(false);
  const [sourceStoreId, setSourceStoreId] = React.useState<string>("");
  const [isImporting, setIsImporting] = React.useState(false);

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
      
      const grouped = ingredientsData.reduce((acc, ingredient) => {
          const category = ingredient.category;
          if (!acc[category]) {
              acc[category] = [];
          }
          acc[category]!.push(ingredient);
          return acc;
      }, {} as GroupedIngredients);

      setGroupedIngredients(grouped);
    }, (error) => {
        console.error("Error fetching ingredients:", error);
    });

    const qStores = query(collection(db, 'stores'), orderBy('name', 'asc'));
    const unsubscribeStores = onSnapshot(qStores, (snapshot) => {
        const storesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Store));
        setAllStores(storesData);
    });

    return () => {
        unsubscribe();
        unsubscribeStores();
    };
  }, [currentStore]);

  React.useEffect(() => {
    if (!isSheetOpen) {
      setEditingIngredient(null);
    }
  }, [isSheetOpen]);

  const handleFormSubmit = async (data: IngredientFormValues) => {
    if (editingIngredient) {
        await handleUpdateIngredient(editingIngredient.id, data);
    } else {
        await handleAddIngredient(data);
    }
  };

  const handleAddIngredient = async (data: IngredientFormValues) => {
    if (!currentStore) {
        toast({ title: "Erro", description: "Nenhuma loja selecionada.", variant: "destructive" });
        return;
    }

    try {
      await addDoc(collection(db, 'ingredients'), {
        name: data.name,
        unit: data.unit,
        category: data.category,
        currentCostPerUnit: data.currentCostPerUnit,
        averageCostPerUnit: data.currentCostPerUnit,
        priceHistory: data.currentCostPerUnit > 0 ? [{ date: new Date(), cost: data.currentCostPerUnit }] : [],
        stockQuantity: data.stockQuantity || 0,
        storeId: currentStore.id,
      });

      toast({
        title: "Insumo Adicionado!",
        description: `O insumo "${data.name}" foi salvo com sucesso.`,
      });
      handleCloseSheet();
    } catch (error) {
      console.error("Error adding document: ", error);
      toast({
        title: "Erro ao salvar!",
        description: "Não foi possível salvar o insumo. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateIngredient = async (id: string, data: IngredientFormValues) => {
      const ingredientRef = doc(db, 'ingredients', id);
      try {
        await updateDoc(ingredientRef, {
            name: data.name,
            unit: data.unit,
            category: data.category,
            currentCostPerUnit: data.currentCostPerUnit,
        });
        toast({
            title: "Insumo Atualizado!",
            description: "Os dados do insumo foram atualizados.",
        });
        handleCloseSheet();
      } catch (error) {
         console.error("Error updating document: ", error);
          toast({
            title: "Erro ao atualizar!",
            description: "Não foi possível atualizar o insumo.",
            variant: "destructive",
          });
      }
  };

  const handleDeleteIngredient = async (ingredientId: string) => {
    try {
      await deleteDoc(doc(db, 'ingredients', ingredientId));
      toast({
        title: 'Insumo Excluído!',
        description: 'O insumo foi removido com sucesso do seu catálogo.',
      });
    } catch (error) {
      console.error('Error deleting ingredient: ', error);
      toast({
        title: 'Erro ao excluir!',
        description: 'Não foi possível remover o insumo. Verifique se ele não está sendo usado em alguma ficha técnica.',
        variant: 'destructive',
      });
    }
  };
  
  const handleEditClick = (ingredient: Ingredient) => {
    setEditingIngredient(ingredient);
    setIsSheetOpen(true);
  };
  
  const handleAddNewClick = () => {
    setEditingIngredient(null);
    setIsSheetOpen(true);
  }

  const handleCloseSheet = () => {
    setIsSheetOpen(false);
    setEditingIngredient(null);
  };

  const handleImportIngredients = async () => {
    if (!currentStore || !sourceStoreId) return;
    
    setIsImporting(true);
    try {
        const sourceQuery = query(collection(db, 'ingredients'), where('storeId', '==', sourceStoreId));
        const sourceSnap = await getDocs(sourceQuery);
        
        const destQuery = query(collection(db, 'ingredients'), where('storeId', '==', currentStore.id));
        const destSnap = await getDocs(destQuery);
        const existingNames = new Set(destSnap.docs.map(doc => doc.data().name.toLowerCase()));

        const batch = writeBatch(db);
        let count = 0;

        sourceSnap.forEach((docSnap) => {
            const data = docSnap.data() as Ingredient;
            // Se o insumo não existe na loja atual, adiciona
            if (!existingNames.has(data.name.toLowerCase())) {
                const newRef = doc(collection(db, 'ingredients'));
                batch.set(newRef, {
                    name: data.name,
                    unit: data.unit,
                    category: data.category,
                    currentCostPerUnit: data.currentCostPerUnit,
                    averageCostPerUnit: data.currentCostPerUnit,
                    priceHistory: data.currentCostPerUnit > 0 ? [{ date: new Date(), cost: data.currentCostPerUnit }] : [],
                    stockQuantity: 0,
                    storeId: currentStore.id,
                });
                count++;
            }
        });

        if (count > 0) {
            await batch.commit();
            toast({
                title: "Importação Concluída!",
                description: `${count} novos insumos foram importados para a loja "${currentStore.name}".`,
            });
        } else {
            toast({
                title: "Nenhum insumo novo",
                description: "Todos os insumos da loja selecionada já existem nesta unidade.",
            });
        }
        setIsImportDialogOpen(false);
        setSourceStoreId("");
    } catch (error) {
        console.error("Error importing ingredients:", error);
        toast({
            title: "Erro ao importar",
            description: "Não foi possível completar a cópia dos insumos.",
            variant: "destructive"
        });
    } finally {
        setIsImporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Insumos"
        description="Gerencie seus ingredientes, custos e unidades de medida."
      >
        <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
                <Copy className="mr-2 h-4 w-4" />
                Importar de Outra Loja
            </Button>
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
                <Button onClick={handleAddNewClick}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Novo Insumo
                </Button>
            </SheetTrigger>
            <SheetContent>
                <SheetHeader>
                <SheetTitle>{editingIngredient ? 'Editar Insumo' : 'Adicionar Novo Insumo'}</SheetTitle>
                <SheetDescription>
                    {editingIngredient ? 'Altere os detalhes do seu insumo.' : 'Preencha os detalhes do novo ingrediente que será usado nas suas receitas.'}
                </SheetDescription>
                </SheetHeader>
                <div className="py-4">
                <IngredientForm 
                    key={editingIngredient?.id ?? 'new'}
                    onSubmit={handleFormSubmit} 
                    initialData={editingIngredient}
                />
                </div>
            </SheetContent>
            </Sheet>
        </div>
      </PageHeader>

      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Importar Insumos</DialogTitle>
                <DialogDescription>
                    Selecione uma loja de origem para copiar o catálogo de insumos para a loja atual ({currentStore?.name}). Apenas itens que ainda não existem aqui serão adicionados.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <Select value={sourceStoreId} onValueChange={setSourceStoreId}>
                    <SelectTrigger>
                        <SelectValue placeholder="Selecione a loja de origem" />
                    </SelectTrigger>
                    <SelectContent>
                        {allStores
                            .filter(s => s.id !== currentStore?.id)
                            .map(store => (
                                <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>
                            ))
                        }
                    </SelectContent>
                </Select>
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={() => setIsImportDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleImportIngredients} disabled={!sourceStoreId || isImporting}>
                    {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Copy className="mr-2 h-4 w-4" />}
                    Confirmar Importação
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Insumos</CardTitle>
          <CardDescription>
            Aqui estão todos os insumos cadastrados para a loja <span className='font-bold text-primary'>{currentStore?.name}</span>. O estoque e os custos são independentes de outras unidades.
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
                                            <TableHead>Nome do Insumo</TableHead>
                                            <TableHead>Estoque Atual</TableHead>
                                            <TableHead>Unidade</TableHead>
                                            <TableHead className="text-right">Custo Atual</TableHead>
                                            <TableHead className="text-right">Valor em Estoque (R$)</TableHead>
                                            <TableHead className="text-center w-[100px]">Ações</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                    {ingredients.map((ingredient) => {
                                        const stock = ingredient.stockQuantity || 0;
                                        return (
                                        <TableRow key={ingredient.id}>
                                        <TableCell className="font-medium">{ingredient.name}</TableCell>
                                        <TableCell className="font-semibold">{stock.toFixed(3)}</TableCell>
                                        <TableCell>{ingredient.unit}</TableCell>
                                        <TableCell className="text-right font-semibold">
                                            {formatCurrency(ingredient.currentCostPerUnit)}
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-primary">
                                            {formatCurrency(stock * ingredient.currentCostPerUnit)}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex justify-center items-center">
                                                <Button variant="ghost" size="icon" onClick={() => handleEditClick(ingredient)}>
                                                    <Pencil className="h-4 w-4" />
                                                    <span className="sr-only">Editar Insumo</span>
                                                </Button>
                                                <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10">
                                                    <Trash2 className="h-4 w-4" />
                                                    <span className="sr-only">Excluir Insumo</span>
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                    <AlertDialogTitle>Você tem certeza absoluta?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Essa ação não pode ser desfeita. Isso excluirá permanentemente o insumo <span className="font-bold">{ingredient.name}</span> desta loja.
                                                    </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDeleteIngredient(ingredient.id)}>
                                                        Excluir
                                                    </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </TableCell>
                                        </TableRow>
                                    )})}
                                    </TableBody>
                                </Table>
                            </AccordionContent>
                        </AccordionItem>
                    );
                })}
            </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
