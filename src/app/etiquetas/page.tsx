
'use client';

import * as React from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';

import PageHeader from "@/components/page-header";
import { LabelForm, type LabelFormValues } from "@/components/etiquetas/label-form";
import LabelPreview from "@/components/etiquetas/label-preview";
import { db } from '@/lib/firebase';
import type { Recipe, Ingredient } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import type { ComboboxOption } from '@/components/ui/combobox';
import { useStore } from '@/components/auth/store-provider';

export default function EtiquetasPage() {
    const { toast } = useToast();
    const { currentStore } = useStore();
    const [labelOptions, setLabelOptions] = React.useState<ComboboxOption[]>([]);
    const [allItems, setAllItems] = React.useState<(Recipe | Ingredient)[]>([]);
    const [generatedLabel, setGeneratedLabel] = React.useState<LabelFormValues | null>(null);

    React.useEffect(() => {
        if (!currentStore) return;

        // Query for base recipes of the CURRENT store
        const qRecipes = query(
            collection(db, 'recipes'), 
            where('storeId', '==', currentStore.id),
            where('category', '==', 'Receitas')
        );
        
        const unsubscribeRecipes = onSnapshot(qRecipes, (recipeSnapshot) => {
            const recipesData = recipeSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'recipe' } as Recipe & {type: string}));

            // Query for food ingredients of the CURRENT store
            const qIngredients = query(
                collection(db, 'ingredients'), 
                where('storeId', '==', currentStore.id),
                where('category', '==', 'Alimentos')
            );
            
            const unsubscribeIngredients = onSnapshot(qIngredients, (ingredientSnapshot) => {
                const ingredientsData = ingredientSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'ingredient' } as Ingredient & {type: string}));

                const combinedItems = [...recipesData, ...ingredientsData];
                setAllItems(combinedItems);

                const options = combinedItems.map(item => ({
                    value: `${(item as any).type}__${item.id}`,
                    label: item.name,
                })).sort((a, b) => a.label.localeCompare(b.label));
                
                setLabelOptions(options);
            });

            return () => unsubscribeIngredients();
        });

        return () => {
            unsubscribeRecipes();
        };
    }, [currentStore]);

    const handleGenerateLabel = (data: LabelFormValues) => {
        const selectedItem = allItems.find(item => {
            const uniqueId = `${(item as any).type}__${item.id}`;
            return uniqueId === data.productName;
        });
        
        const finalData: LabelFormValues = {
            ...data,
            productName: selectedItem ? selectedItem.name : data.productName,
        };

        const isRecipe = selectedItem && 'ingredientsList' in selectedItem;
        const recipe = isRecipe ? (selectedItem as Recipe) : null;
        
        if (recipe) {
          finalData.ingredientsList = recipe.ingredientsList.map((item: any) => {
            const ingredient = allItems.find(i => i.id === item.ingredientId && 'unit' in i) as Ingredient;
            return ingredient?.name || item.ingredientId;
          });
        }
        

        if (data.includeNutritionalInfo && recipe) {
            finalData.allergens = Array.isArray(recipe.allergens) ? recipe.allergens : [];
            finalData.nutritionalInfo = recipe.nutritionalInfo;
        }
        
        setGeneratedLabel(finalData);
        toast({
            title: "Etiqueta Gerada!",
            description: "A pré-visualização da sua etiqueta está pronta.",
        });
    };

    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title="Gerador de Etiquetas"
                description={`Crie etiquetas para a loja: ${currentStore?.name}`}
            />
            <div className="grid md:grid-cols-2 gap-8 items-start">
                <div>
                    <LabelForm
                        options={labelOptions}
                        onGenerate={handleGenerateLabel}
                        allItems={allItems}
                    />
                </div>
                <div>
                    {generatedLabel && (
                        <LabelPreview
                            data={generatedLabel}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
