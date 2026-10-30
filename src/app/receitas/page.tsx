
'use client';

import * as React from 'react';
import { PlusCircle, MoreHorizontal, Download, Copy, Loader2, Search } from "lucide-react";
import { collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, query, writeBatch, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';

import PageHeader from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { RecipeCard } from "@/components/receitas/recipe-card";
import { RecipeForm, type RecipeFormValues } from "@/components/receitas/recipe-form";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { db } from '@/lib/firebase';
import type { Recipe, Ingredient, RecipeCategory, Store } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import { useStore } from '@/components/auth/store-provider';
import { Skeleton } from '@/components/ui/skeleton';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

const recipeCategories: (RecipeCategory | 'Todos')[] = ['Todos', 'Lanches', 'Porções', 'Pratos', 'Bebidas', 'Sobremesas', 'Receitas'];
const categoryOptions: RecipeCategory[] = ['Lanches', 'Porções', 'Pratos', 'Bebidas', 'Sobremesas', 'Receitas'];


export default function ReceitasPage() {
  const { toast } = useToast();
  const { currentStore } = useStore();
  const [recipes, setRecipes] = React.useState<Recipe[]>([]);
  const [ingredients, setIngredients] = React.useState<Ingredient[]>([]);
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [editingRecipe, setEditingRecipe] = React.useState<Recipe | null>(null);
  const [activeTab, setActiveTab] = React.useState<RecipeCategory | 'Todos'>('Todos');
  const [selectedRecipes, setSelectedRecipes] = React.useState<string[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Import states
  const [allStores, setAllStores] = React.useState<Store[]>([]);
  const [isImportDialogOpen, setIsImportDialogOpen] = React.useState(false);
  const [sourceStoreId, setSourceStoreId] = React.useState<string>("");
  const [isImporting, setIsImporting] = React.useState(false);


  React.useEffect(() => {
    if (!currentStore) return;
    setIsLoading(true);

    const qRecipes = query(
        collection(db, 'recipes'),
        where('storeId', '==', currentStore.id),
        orderBy('name', 'asc')
    );
    const unsubscribeRecipes = onSnapshot(qRecipes, (querySnapshot) => {
      const recipesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Recipe));
      setRecipes(recipesData);
      setIsLoading(false);
    }, (error: any) => {
      console.error("Error fetching recipes:", error);
      if (error.code === 'permission-denied') {
          const permissionError = new FirestorePermissionError({
            path: 'recipes',
            operation: 'list',
          } satisfies SecurityRuleContext);
          errorEmitter.emit('permission-error', permissionError);
      }
      setIsLoading(false);
    });

    const qIngredients = query(
        collection(db, 'ingredients'),
        where('storeId', '==', currentStore.id),
        orderBy('name', 'asc')
    );
    const unsubscribeIngredients = onSnapshot(qIngredients, (querySnapshot) => {
        const ingredientsData = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Ingredient));
        setIngredients(ingredientsData);
    }, (error) => {
        console.error("Error fetching ingredients for recipes:", error);
    });

    const qStores = query(collection(db, 'stores'), orderBy('name', 'asc'));
    const unsubscribeStores = onSnapshot(qStores, (snapshot) => {
        const storesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Store));
        setAllStores(storesData);
    });

    return () => {
        unsubscribeRecipes();
        unsubscribeIngredients();
        unsubscribeStores();
    };
  }, [currentStore]);
  
  const filteredRecipes = React.useMemo(() => {
    if (activeTab === 'Todos') {
      return recipes;
    }
    return recipes.filter(recipe => recipe.category === activeTab);
  }, [recipes, activeTab]);


  const calculateRecipeCosts = (data: RecipeFormValues, ingredients: Ingredient[]) => {
      const productionCost = data.ingredientsList.reduce((acc, item) => {
          const ingredient = ingredients.find(ing => ing.id === item.ingredientId);
          if (!ingredient) return acc;
          const quantity = Number(item.quantity) || 0;
          return acc + (quantity * (ingredient.currentCostPerUnit || 0));
      }, 0);

      const sellingPrice = data.sellingPrice ?? 0;
      const productCMV = (productionCost > 0 && sellingPrice > 0)
          ? (productionCost / sellingPrice) * 100
          : 0;
      
      return { productionCost, productCMV };
  }

  const handleFormSubmit = async (data: RecipeFormValues) => {
    if (!currentStore) return;

    const { productionCost, productCMV } = calculateRecipeCosts(data, ingredients);
    
    const recipeData = {
        name: data.name,
        description: data.description || "",
        category: data.category,
        ingredientsList: data.ingredientsList,
        sellingPrice: data.sellingPrice || 0,
        productionCost: productionCost,
        productCMV: productCMV,
        allergens: data.allergens || [],
        nutritionalInfo: data.nutritionalInfo || "",
        yield: data.yield || 1,
        yieldUnit: data.yieldUnit || 'kg',
        storeId: currentStore.id,
    };

    if (editingRecipe) {
        const recipeRef = doc(db, 'recipes', editingRecipe.id);
        updateDoc(recipeRef, recipeData as any)
            .then(() => {
                toast({
                    title: "Ficha Técnica Atualizada!",
                    description: `A receita "${data.name}" foi atualizada com sucesso.`,
                });
                handleCloseSheet();
            })
            .catch(async (serverError) => {
                if (serverError.code === 'permission-denied') {
                    const permissionError = new FirestorePermissionError({
                        path: recipeRef.path,
                        operation: 'update',
                        requestResourceData: recipeData,
                    } satisfies SecurityRuleContext);
                    errorEmitter.emit('permission-error', permissionError);
                }
            });
    } else {
        const recipesRef = collection(db, 'recipes');
        addDoc(recipesRef, recipeData as any)
            .then(() => {
                toast({
                    title: "Ficha Técnica Salva!",
                    description: `A receita "${data.name}" foi salva com sucesso.`,
                });
                handleCloseSheet();
            })
            .catch(async (serverError) => {
                if (serverError.code === 'permission-denied') {
                    const permissionError = new FirestorePermissionError({
                        path: 'recipes',
                        operation: 'create',
                        requestResourceData: recipeData,
                    } satisfies SecurityRuleContext);
                    errorEmitter.emit('permission-error', permissionError);
                }
            });
    }
  };

  const handleImportRecipes = async () => {
    if (!currentStore || !sourceStoreId) return;
    
    setIsImporting(true);
    try {
        const batch = writeBatch(db);
        let count = 0;

        const sourceIngQuery = query(collection(db, 'ingredients'), where('storeId', '==', sourceStoreId));
        const sourceIngSnap = await getDocs(sourceIngQuery);
        const sourceIngredients = sourceIngSnap.docs.map(d => ({ id: d.id, ...d.data() } as Ingredient));

        const destIngredients = [...ingredients]; 
        const destIngByName = new Map(destIngredients.map(i => [i.name.toLowerCase(), i]));

        const sourceRecipesQuery = query(collection(db, 'recipes'), where('storeId', '==', sourceStoreId));
        const sourceRecipesSnap = await getDocs(sourceRecipesQuery);
        
        const existingRecipeNames = new Set(recipes.map(r => r.name.toLowerCase()));

        for (const docSnap of sourceRecipesSnap.docs) {
            const data = docSnap.data() as Recipe;
            
            if (!existingRecipeNames.has(data.name.toLowerCase())) {
                const newIngredientsList = [];
                let canImportRecipe = true;

                for (const item of data.ingredientsList) {
                    const sourceIng = sourceIngredients.find(i => i.id === item.ingredientId);
                    if (!sourceIng) {
                        canImportRecipe = false;
                        break;
                    }

                    let destIng = destIngByName.get(sourceIng.name.toLowerCase());
                    
                    if (!destIng) {
                        const newIngRef = doc(collection(db, 'ingredients'));
                        const newIngData = {
                            name: sourceIng.name,
                            unit: sourceIng.unit,
                            category: sourceIng.category,
                            currentCostPerUnit: sourceIng.currentCostPerUnit || 0,
                            averageCostPerUnit: sourceIng.currentCostPerUnit || 0,
                            priceHistory: (sourceIng.currentCostPerUnit || 0) > 0 ? [{ date: Timestamp.now(), cost: sourceIng.currentCostPerUnit }] : [],
                            stockQuantity: 0,
                            storeId: currentStore.id,
                        };
                        batch.set(newIngRef, newIngData);
                        
                        destIng = { ...newIngData, id: newIngRef.id } as Ingredient;
                        destIngByName.set(sourceIng.name.toLowerCase(), destIng);
                    }

                    newIngredientsList.push({
                        ingredientId: destIng.id,
                        quantity: item.quantity
                    });
                }

                if (canImportRecipe) {
                    const newRecipeRef = doc(collection(db, 'recipes'));
                    batch.set(newRecipeRef, {
                        ...data,
                        ingredientsList: newIngredientsList,
                        storeId: currentStore.id,
                    });
                    count++;
                }
            }
        }

        if (count > 0) {
            await batch.commit();
            toast({
                title: "Importação Concluída!",
                description: `${count} fichas técnicas foram copiadas para "${currentStore.name}". Insumos faltantes também foram gerados.`,
            });
        } else {
            toast({
                title: "Nenhum item novo",
                description: "Todas as fichas técnicas da loja selecionada já existem nesta unidade.",
            });
        }
        setIsImportDialogOpen(false);
        setSourceStoreId("");
    } catch (error) {
        console.error("Error importing recipes:", error);
        toast({
            title: "Erro ao importar",
            description: "Não foi possível completar a cópia dos dados.",
            variant: "destructive"
        });
    } finally {
        setIsImporting(false);
    }
  };

  const handleEditClick = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setIsSheetOpen(true);
  };
  
  const handleCopyClick = async (recipe: Recipe) => {
    const newRecipeData = {
      ...recipe,
      name: `${recipe.name} (Cópia)`,
    };
    delete (newRecipeData as any).id;

    addDoc(collection(db, 'recipes'), newRecipeData)
        .then(() => {
            toast({
                title: "Ficha Técnica Copiada!",
                description: `A receita "${recipe.name}" foi copiada com sucesso.`,
            });
        })
        .catch(async (serverError: any) => {
            if (serverError.code === 'permission-denied') {
                const permissionError = new FirestorePermissionError({
                    path: 'recipes',
                    operation: 'create',
                    requestResourceData: newRecipeData,
                } satisfies SecurityRuleContext);
                errorEmitter.emit('permission-error', permissionError);
            }
        });
  }

  const handleDeleteClick = async (recipeId: string) => {
    const recipeRef = doc(db, 'recipes', recipeId);
    deleteDoc(recipeRef)
        .then(() => {
            toast({
                title: 'Receita Excluída!',
                description: 'A ficha técnica foi removida com sucesso.',
            });
        })
        .catch(async (serverError: any) => {
            if (serverError.code === 'permission-denied') {
                const permissionError = new FirestorePermissionError({
                    path: recipeRef.path,
                    operation: 'delete',
                } satisfies SecurityRuleContext);
                errorEmitter.emit('permission-error', permissionError);
            }
        });
  };

  const handleMoveCategory = async (newCategory: RecipeCategory) => {
    if (selectedRecipes.length === 0) return;

    const batch = writeBatch(db);
    selectedRecipes.forEach(recipeId => {
        const recipeRef = doc(db, "recipes", recipeId);
        batch.update(recipeRef, { category: newCategory });
    });

    try {
        await batch.commit();
        toast({
            title: "Receitas Movidas!",
            description: `${selectedRecipes.length} receita(s) foram movidas para a categoria "${newCategory}".`
        });
        setSelectedRecipes([]);
    } catch (error) {
        console.error("Error moving recipes: ", error);
        toast({
            title: "Erro ao mover!",
            description: "Não foi possível mover as receitas. Tente novamente.",
            variant: "destructive",
        });
    }
  };

  const handleAddNewClick = () => {
    setEditingRecipe(null);
    setIsSheetOpen(true);
  };

  const handleCloseSheet = () => {
    setIsSheetOpen(false);
    setEditingRecipe(null);
  }
  
  const handleSelectRecipe = (recipeId: string, isSelected: boolean) => {
    setSelectedRecipes(prev => 
      isSelected ? [...prev, recipeId] : prev.filter(id => id !== recipeId)
    );
  };

  const generateSummaryPdf = (recipesToExport: Recipe[], title: string, filename: string) => {
    const doc = new jsPDF();
    const tableColumn = ["Produto", "Custo Produção", "Preço Venda", "CMV (%)"];
    const tableRows: any[] = [];

    doc.setFontSize(18);
    doc.text(title, 14, 22);
    doc.setFontSize(11);
    doc.text(`Data de Emissão: ${format(new Date(), 'dd/MM/yyyy')}`, 14, 30);
    
    recipesToExport.forEach(recipe => {
        const recipeData = [
            recipe.name,
            formatCurrency(recipe.productionCost || 0),
            recipe.sellingPrice && recipe.sellingPrice > 0 ? formatCurrency(recipe.sellingPrice) : 'N/A',
            recipe.productCMV && recipe.productCMV > 0 ? `${recipe.productCMV.toFixed(2)}%` : 'N/A'
        ];
        tableRows.push(recipeData);
    });

    (doc as any).autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 35,
        headStyles: { fillColor: [80, 200, 120] },
    });

    doc.save(filename);

    toast({
      title: "Download Iniciado!",
      description: `O arquivo ${filename} está sendo gerado.`
    });
  };

  const handleDownloadSummaryPdf = () => {
    generateSummaryPdf(recipes, "Resumo de Todas as Fichas Técnicas", `resumo_total_fichas_tecnicas_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const handleDownloadCategorySummaryPdf = () => {
    if (activeTab === 'Todos' || filteredRecipes.length === 0) return;
    const title = `Resumo da Categoria: ${activeTab}`;
    const filename = `resumo_${activeTab.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    generateSummaryPdf(filteredRecipes, title, filename);
  };

  const handleExportJson = () => {
    if (recipes.length === 0) {
      toast({
        title: "Nenhuma receita para exportar",
        variant: "destructive",
      });
      return;
    }
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(recipes, null, 2)
    )}`;
    const link = document.createElement("a");
    link.href = jsonString;
    link.download = "fichas-tecnicas.json";
    link.click();
    toast({
      title: "Exportação Iniciada!",
      description: "O arquivo fichas-tecnicas.json está sendo baixado.",
    });
  };


  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Fichas Técnicas"
        description="Crie e gerencie as fichas técnicas dos seus pratos."
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
            <Copy className="mr-2 h-4 w-4" />
            Importar de Outra Loja
          </Button>
          {selectedRecipes.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                 <Button variant="outline">
                    Ações ({selectedRecipes.length}) <MoreHorizontal className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Mover para</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {categoryOptions.map(cat => (
                    <DropdownMenuItem key={cat} onSelect={() => handleMoveCategory(cat)}>
                        {cat}
                    </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
           {activeTab !== 'Todos' && (
             <Button variant="outline" onClick={handleDownloadCategorySummaryPdf} disabled={filteredRecipes.length === 0}>
                <Download className="mr-2 h-4 w-4" />
                Baixar Resumo da Categoria
            </Button>
           )}
           <Button variant="outline" onClick={handleDownloadSummaryPdf} disabled={recipes.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Baixar Resumo Geral
          </Button>
          <Button variant="outline" onClick={handleExportJson} disabled={recipes.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Exportar JSON
          </Button>
          <Button onClick={handleAddNewClick}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Nova Ficha Técnica
          </Button>
        </div>
      </PageHeader>

      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Importar Fichas Técnicas</DialogTitle>
                <DialogDescription>
                    Selecione uma loja de origem para copiar as fichas técnicas para a loja atual ({currentStore?.name}). Insumos inexistentes serão criados automaticamente.
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
                <Button onClick={handleImportRecipes} disabled={!sourceStoreId || isImporting}>
                    {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Copy className="mr-2 h-4 w-4" />}
                    Confirmar Importação
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Sheet open={isSheetOpen} onOpenChange={handleCloseSheet}>
          <SheetContent className="sm:max-w-2xl w-full overflow-y-auto">
            <SheetHeader>
              <SheetTitle>{editingRecipe ? 'Editar Ficha Técnica' : 'Criar Nova Ficha Técnica'}</SheetTitle>
              <SheetDescription>
                {editingRecipe ? 'Altere os dados da sua receita.' : 'Adicione os ingredientes e defina o preço de venda para calcular automaticamente os custos e o CMV.'}
              </SheetDescription>
            </SheetHeader>
            <div className="py-4">
              <RecipeForm 
                key={editingRecipe?.id ?? 'new'}
                onSubmit={handleFormSubmit} 
                ingredients={ingredients}
                initialData={editingRecipe}
              />
            </div>
          </SheetContent>
        </Sheet>
        
      <Tabs value={activeTab} onValueChange={(value) => {
          setActiveTab(value as any);
          setSelectedRecipes([]);
      }}>
        <TabsList className="mb-4">
          {recipeCategories.map(category => (
            <TabsTrigger key={category} value={category}>{category}</TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={activeTab}>
            {isLoading ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    <Skeleton className="h-48 w-full" />
                    <Skeleton className="h-48 w-full" />
                    <Skeleton className="h-48 w-full" />
                </div>
            ) : filteredRecipes.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {filteredRecipes.map((recipe) => (
                    <RecipeCard 
                        key={recipe.id} 
                        recipe={recipe} 
                        ingredients={ingredients}
                        onEdit={() => handleEditClick(recipe)}
                        onCopy={() => handleCopyClick(recipe)}
                        onDelete={() => handleDeleteClick(recipe.id)}
                        isSelected={selectedRecipes.includes(recipe.id)}
                        onSelectChange={(isSelected) => handleSelectRecipe(recipe.id, isSelected)}
                    />
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center border rounded-lg bg-muted/10">
                    <Search className="h-10 w-10 text-muted-foreground mb-4" />
                    <p className="text-lg font-medium">Nenhuma ficha técnica encontrada</p>
                    <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                        {activeTab === 'Todos' 
                            ? "Ainda não existem fichas técnicas cadastradas para esta unidade." 
                            : `Nenhuma receita cadastrada na categoria "${activeTab}" para esta loja.`}
                    </p>
                    {activeTab === 'Todos' && (
                        <Button onClick={handleAddNewClick} variant="outline" className="mt-4">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Criar a Primeira Ficha
                        </Button>
                    )}
                </div>
            )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
