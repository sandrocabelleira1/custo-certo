
"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useFieldArray, useForm } from "react-hook-form"
import { z } from "zod"
import { PlusCircle, Trash2, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Separator } from "../ui/separator"
import { Textarea } from "../ui/textarea"
import { Badge } from "../ui/badge"
import type { Ingredient, Recipe, RecipeCategory } from "@/lib/types"
import { Combobox } from "../ui/combobox"
import { formatCurrency } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { analyzeRecipe } from "@/ai/flows/analyze-recipe-flow"
import { useToast } from "@/hooks/use-toast"

const recipeItemSchema = z.object({
  ingredientId: z.string().min(1, "Selecione um insumo."),
  quantity: z.coerce.number().min(0.001, "Quantidade deve ser positiva."),
})

const recipeFormSchema = z.object({
  name: z.string().min(3, "O nome da receita deve ter pelo menos 3 caracteres.").default(""),
  description: z.string().optional().default(""),
  category: z.enum(['Lanches', 'Porções', 'Pratos', 'Bebidas', 'Sobremesas', 'Receitas'], {
    required_error: "A categoria é obrigatória.",
  }),
  sellingPrice: z.coerce.number().optional(),
  ingredientsList: z.array(recipeItemSchema).min(1, "Adicione pelo menos um ingrediente."),
  allergens: z.array(z.string()).optional(),
  nutritionalInfo: z.string().optional(),
  yield: z.coerce.number().min(0.001, "O rendimento deve ser maior que zero.").default(1),
  yieldUnit: z.enum(['kg', 'g', 'L', 'ml', 'un'], {
    required_error: "A unidade de rendimento é obrigatória.",
  }).default('kg'),
}).refine(data => {
    if (data.category !== 'Receitas') {
        return !!data.sellingPrice && data.sellingPrice > 0;
    }
    return true;
}, {
    message: "O preço de venda é obrigatório para esta categoria.",
    path: ["sellingPrice"],
});

export type RecipeFormValues = z.infer<typeof recipeFormSchema>

interface RecipeFormProps {
    onSubmit: (data: RecipeFormValues) => Promise<void>;
    ingredients: Ingredient[];
    initialData?: Recipe | null;
}

const recipeCategories: { value: RecipeCategory, label: string }[] = [
    { value: 'Lanches', label: 'Lanches' },
    { value: 'Porções', label: 'Porções' },
    { value: 'Pratos', label: 'Pratos' },
    { value: 'Bebidas', label: 'Bebidas' },
    { value: 'Sobremesas', label: 'Sobremesas' },
    { value: 'Receitas', label: 'Receitas (Bases)' },
];


export function RecipeForm({ onSubmit, ingredients, initialData }: RecipeFormProps) {
  const { toast } = useToast();
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const form = useForm<RecipeFormValues>({
    resolver: zodResolver(recipeFormSchema),
    defaultValues: initialData ? {
      name: initialData.name,
      description: initialData.description || "",
      category: initialData.category,
      sellingPrice: initialData.sellingPrice || 0,
      ingredientsList: initialData.ingredientsList,
      allergens: initialData.allergens || [],
      nutritionalInfo: initialData.nutritionalInfo || "",
      yield: initialData.yield || 1,
      yieldUnit: (initialData.yieldUnit as any) || 'kg',
    } : {
      name: "",
      description: "",
      category: undefined,
      sellingPrice: 0,
      ingredientsList: [{ ingredientId: "", quantity: 0 }],
      allergens: [],
      nutritionalInfo: "",
      yield: 1,
      yieldUnit: 'kg',
    },
  })

  React.useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name,
        description: initialData.description || "",
        category: initialData.category,
        sellingPrice: initialData.sellingPrice || 0,
        ingredientsList: initialData.ingredientsList,
        allergens: initialData.allergens || [],
        nutritionalInfo: initialData.nutritionalInfo || "",
        yield: initialData.yield || 1,
        yieldUnit: (initialData.yieldUnit as any) || 'kg',
      });
    }
  }, [initialData, form]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "ingredientsList",
  })
  
  const watchedIngredients = form.watch('ingredientsList');
  const watchedSellingPrice = form.watch('sellingPrice');
  const watchedCategory = form.watch('category');

  const productionCost = React.useMemo(() => watchedIngredients.reduce((acc, item) => {
    const ingredient = ingredients.find(ing => ing.id === item.ingredientId);
    if (!ingredient) return acc;
    const quantity = Number(item.quantity) || 0;
    return acc + (quantity * ingredient.currentCostPerUnit);
  }, 0), [watchedIngredients, ingredients])

  const productCMV = React.useMemo(() => (productionCost > 0 && watchedSellingPrice && watchedSellingPrice > 0) 
    ? (productionCost / watchedSellingPrice) * 100
    : 0, [productionCost, watchedSellingPrice]);

  async function handleSubmit(data: RecipeFormValues) {
    await onSubmit(data);
  }

  const getIngredientCost = (index: number) => {
    const item = watchedIngredients[index];
    if (!item || !item.ingredientId) return 0;
    const ingredient = ingredients.find(ing => ing.id === item.ingredientId);
    if (!ingredient) return 0;
    const quantity = Number(item.quantity) || 0;
    return quantity * ingredient.currentCostPerUnit;
  };
  
  const handleAnalyzeRecipe = async () => {
    const ingredientIds = form.getValues('ingredientsList').map(item => item.ingredientId);
    const ingredientNames = ingredientIds
      .map(id => ingredients.find(ing => ing.id === id)?.name)
      .filter((name): name is string => !!name);

    if (ingredientNames.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Sem ingredientes',
        description: 'Adicione ingredientes à receita antes de analisar.',
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await analyzeRecipe({ ingredients: ingredientNames });
      form.setValue('allergens', result.allergens);
      form.setValue('nutritionalInfo', result.nutritionalInfo);
      toast({
        title: 'Análise Concluída!',
        description: 'Alergênicos e informações nutricionais foram preenchidos.',
      });
    } catch (error) {
      console.error('Erro ao analisar receita:', error);
      toast({
        variant: 'destructive',
        title: 'Erro na Análise',
        description: 'Não foi possível analisar a receita. Tente novamente.',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };


  const ingredientOptions = React.useMemo(() => 
    [...ingredients]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(ing => ({
        value: ing.id,
        label: `${ing.name} (${ing.unit})`
    })), [ingredients]);


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        <div className="grid md:grid-cols-2 gap-4">
            <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Nome da Receita</FormLabel>
                    <FormControl>
                        <Input placeholder="Ex: Macarrão Carbonara" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Categoria</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                <SelectValue placeholder="Selecione a categoria" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {recipeCategories.map(cat => (
                                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    <FormMessage />
                    </FormItem>
                )}
            />
        </div>
        
        <div className="grid md:grid-cols-3 gap-4 border p-4 rounded-lg bg-muted/20">
            <FormField
                control={form.control}
                name="yield"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Rendimento da Receita</FormLabel>
                    <FormControl>
                        <Input
                            type="number"
                            step="0.001"
                            {...field}
                            value={field.value ?? ''}
                            />
                    </FormControl>
                    <FormDescription>Quanto este lote rende?</FormDescription>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="yieldUnit"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Unidade de Rendimento</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                <SelectValue placeholder="Unidade" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="kg">kg</SelectItem>
                                <SelectItem value="g">g</SelectItem>
                                <SelectItem value="L">L</SelectItem>
                                <SelectItem value="ml">ml</SelectItem>
                                <SelectItem value="un">un</SelectItem>
                            </SelectContent>
                        </Select>
                    <FormMessage />
                    </FormItem>
                )}
            />
            {watchedCategory !== 'Receitas' && (
                <FormField
                    control={form.control}
                    name="sellingPrice"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Preço de Venda (R$)</FormLabel>
                        <FormControl>
                            <Input
                                type="number"
                                placeholder="0,00"
                                step="0.01"
                                {...field}
                                value={field.value ?? ''}
                                />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            )}
        </div>

         <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Descrição</FormLabel>
                <FormControl>
                    <Textarea placeholder="Descreva o prato, modo de preparo, etc." {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
        />
        
        <Separator />

        <div>
            <h3 className="text-lg font-medium mb-4">Ingredientes da Receita</h3>
            <FormDescription className="mb-4">Adicione os ingredientes necessários para produzir o rendimento informado acima.</FormDescription>
            <div className="space-y-4">
            {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-1 md:grid-cols-8 gap-2 items-start">
                    <FormField
                        control={form.control}
                        name={`ingredientsList.${index}.ingredientId`}
                        render={({ field }) => (
                        <FormItem className="md:col-span-4">
                            <FormLabel className={index > 0 ? 'sr-only' : ''}>Produto</FormLabel>
                            <Combobox 
                                options={ingredientOptions}
                                value={field.value}
                                onChange={field.onChange}
                                placeholder="Selecione o insumo"
                                searchPlaceholder="Busque um insumo..."
                                emptyText="Nenhum insumo encontrado."
                             />
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name={`ingredientsList.${index}.quantity`}
                        render={({ field }) => (
                        <FormItem className="md:col-span-1">
                            <FormLabel className={index > 0 ? 'sr-only' : ''}>Qtd.</FormLabel>
                            <FormControl>
                            <Input
                                type="number"
                                placeholder="0"
                                step="0.001"
                                {...field}
                                value={field.value ?? ''}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                     <FormItem className="md:col-span-2">
                        <FormLabel className={index > 0 ? 'sr-only' : ''}>Custo (R$)</FormLabel>
                        <FormControl>
                            <Input
                                type="text"
                                disabled
                                value={formatCurrency(getIngredientCost(index))}
                                className="disabled:opacity-100 disabled:cursor-default"
                            />
                        </FormControl>
                    </FormItem>
                    <div className="md:col-span-1 flex items-end h-full pt-1.5">
                        <Button type="button" variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 h-10 w-10" onClick={() => remove(index)} disabled={fields.length <= 1}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            ))}
            <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => append({ ingredientId: "", quantity: 0 })}
            >
                <PlusCircle className="mr-2 h-4 w-4" />
                Adicionar Ingrediente
            </Button>
            </div>
        </div>
        
        <Separator />
        
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium">Informações Adicionais</h3>
                    <p className="text-sm text-muted-foreground">Use a IA para preencher automaticamente os alergênicos e a tabela nutricional.</p>
                </div>
                <Button type="button" onClick={handleAnalyzeRecipe} disabled={isAnalyzing}>
                    <Sparkles className="mr-2 h-4 w-4" />
                    {isAnalyzing ? 'Analisando...' : 'Analisar com IA'}
                </Button>
            </div>
             <FormField
                control={form.control}
                name="allergens"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Alergênicos</FormLabel>
                    <FormControl>
                        <Input placeholder="Ex: Contém glúten, Contém lactose..." {...field} value={Array.isArray(field.value) ? field.value.join(', ') : ''} onChange={(e) => field.onChange(e.target.value.split(',').map(s => s.trim()))} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
             <FormField
                control={form.control}
                name="nutritionalInfo"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Informação Nutricional</FormLabel>
                    <FormControl>
                        <Textarea placeholder="Ex: Calorias: 350kcal, Proteínas: 15g..." {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
        </div>


        <Separator />

        <div className="space-y-4 rounded-lg border p-4">
            <h3 className="text-lg font-medium">Cálculos Automáticos</h3>
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Custo de Produção (Total do Lote)</span>
                    <span className="font-bold text-lg">{formatCurrency(productionCost)}</span>
                </div>
                {watchedCategory !== 'Receitas' && (
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">CMV do Produto</span>
                        <Badge variant={productCMV > 35 ? "destructive" : productCMV > 0 ? "default" : "secondary"} className="text-lg">
                            {productCMV.toFixed(2)}%
                        </Badge>
                    </div>
                )}
            </div>
        </div>

        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
             {form.formState.isSubmitting ? 'Salvando...' : 'Salvar Ficha Técnica'}
        </Button>
      </form>
    </Form>
  )
}
