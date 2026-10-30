
"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useFieldArray, useForm } from "react-hook-form"
import { z } from "zod"
import { PlusCircle, Trash2, ArrowRight, Scale, BookType, LayoutGrid, Calculator } from "lucide-react"

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
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import type { Ingredient, Recipe } from "@/lib/types"
import { Combobox } from "../ui/combobox"
import { Separator } from "../ui/separator"
import { Badge } from "../ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { useToast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RadioGroup, RadioGroupItem } from "../ui/radio-group"

// Schema para desmembramento (1 -> N)
const dismantlingResultSchema = z.object({
  ingredientId: z.string().min(1, "Selecione o produto gerado."),
  quantity: z.coerce.number().min(0.001, "A quantidade deve ser positiva."),
  unit: z.enum(['kg', 'g', 'L', 'ml', 'un'], {
    required_error: "Selecione a unidade.",
  }),
})

// Schema unificado
const productionFormSchema = z.object({
  mode: z.enum(['dismantling', 'recipe']),
  // Campos Dismantling
  sourceIngredientId: z.string().optional(),
  sourceQuantity: z.coerce.number().optional(),
  sourceUnit: z.enum(['kg', 'g', 'L', 'ml', 'un']).optional(),
  results: z.array(dismantlingResultSchema).optional(),
  // Campos Recipe
  recipeId: z.string().optional(),
  recipeCalcMode: z.enum(['total', 'batches']).optional(),
  batches: z.coerce.number().optional(),
  producedQuantity: z.coerce.number().optional(),
  producedUnit: z.enum(['kg', 'g', 'L', 'ml', 'un']).optional(),
  targetIngredientId: z.string().optional(),
}).superRefine((data, ctx) => {
    if (data.mode === 'dismantling') {
        if (!data.sourceIngredientId) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Obrigatório", path: ["sourceIngredientId"] });
        if (!data.sourceQuantity || data.sourceQuantity <= 0) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Positiva", path: ["sourceQuantity"] });
        if (!data.results || data.results.length === 0) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Mínimo 1", path: ["results"] });
    } else {
        if (!data.recipeId) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Obrigatório", path: ["recipeId"] });
        if (data.recipeCalcMode === 'total') {
            if (!data.producedQuantity || data.producedQuantity <= 0) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Positiva", path: ["producedQuantity"] });
        } else {
            if (!data.batches || data.batches <= 0) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Mínimo 1", path: ["batches"] });
        }
        if (!data.targetIngredientId) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Obrigatório", path: ["targetIngredientId"] });
    }
});

export type ProductionFormValues = z.infer<typeof productionFormSchema>

interface ProductionFormProps {
  ingredients: Ingredient[];
  recipes: Recipe[];
  onSubmit: (data: any) => Promise<void>;
}

const unitOptions = [
    { value: 'kg', label: 'kg' },
    { value: 'g', label: 'g' },
    { value: 'L', label: 'L' },
    { value: 'ml', label: 'ml' },
    { value: 'un', label: 'un' },
];

function convertToBase(value: number, fromUnit: string): number {
    if (fromUnit === 'g' || fromUnit === 'ml') return value / 1000;
    return value;
}

function convertFromBase(value: number, toUnit: string): number {
    if (toUnit === 'g' || toUnit === 'ml') return value * 1000;
    return value;
}

export function ProductionForm({ ingredients, recipes, onSubmit }: ProductionFormProps) {
  const { toast } = useToast();
  const form = useForm<ProductionFormValues>({
    resolver: zodResolver(productionFormSchema),
    defaultValues: {
      mode: 'dismantling',
      sourceIngredientId: "",
      sourceQuantity: 0,
      sourceUnit: 'kg',
      results: [{ ingredientId: "", quantity: 0, unit: 'kg' }],
      recipeId: "",
      recipeCalcMode: 'batches',
      batches: 1,
      producedQuantity: 0,
      producedUnit: 'kg',
      targetIngredientId: "",
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "results",
  })

  const watchedMode = form.watch("mode");
  const watchedSourceId = form.watch("sourceIngredientId");
  const watchedSourceQuantity = Number(form.watch("sourceQuantity")) || 0;
  const watchedSourceUnit = form.watch("sourceUnit");
  const watchedResults = form.watch("results") || [];
  
  const watchedRecipeId = form.watch("recipeId");
  const watchedCalcMode = form.watch("recipeCalcMode");
  const watchedBatches = Number(form.watch("batches")) || 1;
  const watchedProducedQuantity = Number(form.watch("producedQuantity")) || 0;

  // Atualiza unidade de origem quando o insumo muda
  React.useEffect(() => {
    if (watchedMode === 'dismantling' && watchedSourceId) {
        const ing = ingredients.find(i => i.id === watchedSourceId);
        if (ing) form.setValue("sourceUnit", ing.unit);
    }
  }, [watchedSourceId, ingredients, form, watchedMode]);

  // Atualiza unidade de receita e tenta encontrar ingrediente alvo por nome
  React.useEffect(() => {
    if (watchedMode === 'recipe' && watchedRecipeId) {
        const recipe = recipes.find(r => r.id === watchedRecipeId);
        if (recipe) {
            const targetIng = ingredients.find(i => i.name.toLowerCase() === recipe.name.toLowerCase());
            if (targetIng) {
                form.setValue("targetIngredientId", targetIng.id);
                form.setValue("producedUnit", (targetIng.unit as any));
            }
        }
    }
  }, [watchedRecipeId, recipes, ingredients, form, watchedMode]);

  // Cálculo de perdas no modo Desmembramento
  const totalProducedInSourceUnit = React.useMemo(() => {
    return watchedResults.reduce((sum, res) => {
        const qty = Number(res.quantity) || 0;
        const resUnit = res.unit;
        const qtyInBase = convertToBase(qty, resUnit);
        return sum + convertFromBase(qtyInBase, watchedSourceUnit!);
    }, 0);
  }, [watchedResults, watchedSourceUnit]);

  const loss = watchedSourceQuantity - totalProducedInSourceUnit;
  const lossPercentage = watchedSourceQuantity > 0 ? (loss / watchedSourceQuantity) * 100 : 0;

  // Cálculo de insumos necessários no modo Receita
  const currentRecipe = React.useMemo(() => recipes.find(r => r.id === watchedRecipeId), [watchedRecipeId, recipes]);

  const finalProducedQuantity = React.useMemo(() => {
    if (watchedCalcMode === 'total') return watchedProducedQuantity;
    if (currentRecipe && currentRecipe.yield) return currentRecipe.yield * watchedBatches;
    return watchedBatches; // Fallback para 1:1 se não houver rendimento
  }, [watchedCalcMode, watchedProducedQuantity, watchedBatches, currentRecipe]);

  const ingredientsToDeduct = React.useMemo(() => {
    if (watchedMode !== 'recipe' || !currentRecipe) return [];

    let multiplier = 1;
    if (watchedCalcMode === 'batches') {
        multiplier = watchedBatches;
    } else {
        // Se produzir 10kg e a receita for de 2.5kg, multiplicador é 4.
        const recipeYield = currentRecipe.yield || 1;
        multiplier = watchedProducedQuantity / recipeYield;
    }

    return currentRecipe.ingredientsList.map(item => {
        const ing = ingredients.find(i => i.id === item.ingredientId);
        return {
            ingredientId: item.ingredientId,
            name: ing?.name || '?',
            unit: ing?.unit || '',
            quantity: item.quantity * multiplier
        };
    });
  }, [watchedMode, watchedCalcMode, watchedBatches, watchedProducedQuantity, currentRecipe, ingredients]);

  const ingredientOptions = React.useMemo(() => 
    ingredients.map(ing => ({
        value: ing.id,
        label: `${ing.name} (${ing.unit})`
    })), [ingredients]);

  const recipeOptions = React.useMemo(() => 
    recipes.map(r => ({
        value: r.id,
        label: r.name
    })), [recipes]);

  async function handleFormSubmit(data: ProductionFormValues) {
    let processedData: any = { mode: data.mode };

    if (data.mode === 'dismantling') {
        processedData = {
            ...processedData,
            sourceIngredientId: data.sourceIngredientId,
            sourceQuantity: convertToBase(Number(data.sourceQuantity), data.sourceUnit!),
            results: data.results!.map(res => ({
                ingredientId: res.ingredientId,
                quantity: convertToBase(Number(res.quantity), res.unit),
                displayQuantity: `${res.quantity} ${res.unit}`
            }))
        };
    } else {
        const recipe = recipes.find(r => r.id === data.recipeId);
        processedData = {
            ...processedData,
            recipeId: data.recipeId,
            targetIngredientId: data.targetIngredientId,
            producedQuantity: convertToBase(finalProducedQuantity, data.producedUnit!),
            producedUnit: data.producedUnit,
            ingredientsToDeduct: ingredientsToDeduct.map(i => ({
                ingredientId: i.ingredientId,
                quantity: convertToBase(i.quantity, i.unit)
            }))
        };
    }

    try {
        await onSubmit(processedData);
        form.reset();
    } catch (error) {}
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <Tabs value={watchedMode} onValueChange={(val) => form.setValue("mode", val as any)}>
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="dismantling" className="gap-2">
                    <LayoutGrid className="h-4 w-4" /> Desmembramento
                </TabsTrigger>
                <TabsTrigger value="recipe" className="gap-2">
                    <BookType className="h-4 w-4" /> Via Receita
                </TabsTrigger>
            </TabsList>

            <Card className="mt-4">
                <CardHeader>
                    <CardTitle>{watchedMode === 'dismantling' ? 'Desmembramento (1 para N)' : 'Produção por Receita (N para 1)'}</CardTitle>
                    <CardDescription>
                        {watchedMode === 'dismantling' 
                            ? 'Use para fracionar um insumo bruto em porções menores.' 
                            : 'Produza um item composto baixando automaticamente seus ingredientes.'}
                    </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-6">
                    {/* MODO DESMEMBRAMENTO */}
                    <TabsContent value="dismantling" className="m-0 space-y-6">
                        <div className="space-y-4 p-4 bg-muted/30 rounded-lg border border-dashed">
                            <h3 className="text-sm font-semibold flex items-center gap-2"><Scale className="h-4 w-4" /> Origem (Bruto)</h3>
                            <div className="grid gap-4">
                                <FormField
                                    control={form.control}
                                    name="sourceIngredientId"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Insumo Utilizado</FormLabel>
                                        <Combobox options={ingredientOptions} value={field.value} onChange={field.onChange} placeholder="Selecione o insumo bruto" />
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                                <div className="grid grid-cols-3 gap-2">
                                    <FormField
                                        control={form.control}
                                        name="sourceQuantity"
                                        render={({ field }) => (
                                        <FormItem className="col-span-2">
                                            <FormLabel>Quantidade Total</FormLabel>
                                            <Input type="number" step="0.001" placeholder="0.000" {...field} />
                                            <FormMessage />
                                        </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="sourceUnit"
                                        render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Unidade</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                                <SelectContent>{unitOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                        )}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold flex items-center gap-2"><ArrowRight className="h-4 w-4 text-primary" /> Produtos Gerados</h3>
                            {fields.map((field, index) => (
                                <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start border p-3 rounded-md bg-card">
                                    <div className="md:col-span-12 lg:col-span-6">
                                        <FormField
                                            control={form.control}
                                            name={`results.${index}.ingredientId`}
                                            render={({ field: resField }) => (
                                            <FormItem>
                                                <FormLabel className={index > 0 ? "sr-only" : ""}>Produto</FormLabel>
                                                <Combobox options={ingredientOptions} value={resField.value} onChange={(val) => {
                                                    resField.onChange(val);
                                                    const ing = ingredients.find(i => i.id === val);
                                                    if (ing) form.setValue(`results.${index}.unit`, (ing.unit as any));
                                                }} placeholder="Selecione o produto" />
                                                <FormMessage />
                                            </FormItem>
                                            )}
                                        />
                                    </div>
                                    <div className="md:col-span-8 lg:col-span-3">
                                        <FormField
                                            control={form.control}
                                            name={`results.${index}.quantity`}
                                            render={({ field: qtyField }) => (
                                            <FormItem>
                                                <FormLabel className={index > 0 ? "sr-only" : ""}>Qtd. Gerada</FormLabel>
                                                <Input type="number" step="0.001" placeholder="0.000" {...qtyField} />
                                                <FormMessage />
                                            </FormItem>
                                            )}
                                        />
                                    </div>
                                    <div className="md:col-span-3 lg:col-span-2">
                                        <FormField
                                            control={form.control}
                                            name={`results.${index}.unit`}
                                            render={({ field: unitField }) => (
                                            <FormItem>
                                                <FormLabel className={index > 0 ? "sr-only" : ""}>Unidade</FormLabel>
                                                <Select onValueChange={unitField.onChange} value={unitField.value}>
                                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                                    <SelectContent>{unitOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                            )}
                                        />
                                    </div>
                                    <div className="md:col-span-1 flex items-end h-full pt-1.5 lg:pt-0">
                                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length <= 1} className="text-destructive h-10 w-10"><Trash2 className="h-4 w-4" /></Button>
                                    </div>
                                </div>
                            ))}
                            <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => append({ ingredientId: "", quantity: 0, unit: (watchedSourceUnit as any) || 'kg' })}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Produto
                            </Button>
                        </div>

                        <div className="bg-primary/5 p-4 rounded-lg space-y-2 border border-primary/10">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Total Produzido (em {watchedSourceUnit}):</span>
                                <span className="font-bold">{totalProducedInSourceUnit.toFixed(3)} {watchedSourceUnit}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">{loss >= 0 ? "Quebra / Perda estimada:" : "Ganho / Rendimento:"}</span>
                                <Badge variant={loss > 0.001 ? "destructive" : loss < -0.001 ? "default" : "secondary"}>
                                    {Math.abs(loss).toFixed(3)} {watchedSourceUnit} ({Math.abs(lossPercentage).toFixed(1)}%)
                                </Badge>
                            </div>
                        </div>
                    </TabsContent>

                    {/* MODO RECEITA */}
                    <TabsContent value="recipe" className="m-0 space-y-6">
                        <div className="grid gap-4">
                            <FormField
                                control={form.control}
                                name="recipeId"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Ficha Técnica de Referência</FormLabel>
                                    <Combobox options={recipeOptions} value={field.value} onChange={field.onChange} placeholder="Escolha a receita produzida" />
                                    {currentRecipe && (
                                        <p className="text-[10px] text-muted-foreground mt-1">
                                            Rendimento padrão desta receita: <span className="font-bold">{currentRecipe.yield || 1} {currentRecipe.yieldUnit || 'kg'}</span>
                                        </p>
                                    )}
                                    <FormMessage />
                                </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="recipeCalcMode"
                                render={({ field }) => (
                                    <FormItem className="space-y-3">
                                        <FormLabel>Calcular por:</FormLabel>
                                        <FormControl>
                                            <RadioGroup
                                                onValueChange={field.onChange}
                                                value={field.value}
                                                className="flex space-x-4"
                                            >
                                                <FormItem className="flex items-center space-x-2 space-y-0">
                                                    <FormControl><RadioGroupItem value="batches" /></FormControl>
                                                    <FormLabel className="font-normal">Número de Receitas (Lotes)</FormLabel>
                                                </FormItem>
                                                <FormItem className="flex items-center space-x-2 space-y-0">
                                                    <FormControl><RadioGroupItem value="total" /></FormControl>
                                                    <FormLabel className="font-normal">Quantidade Total</FormLabel>
                                                </FormItem>
                                            </RadioGroup>
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            
                            {watchedCalcMode === 'batches' ? (
                                <FormField
                                    control={form.control}
                                    name="batches"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Quantas vezes a receita foi feita?</FormLabel>
                                        <FormControl>
                                            <div className="flex items-center gap-2">
                                                <Input type="number" step="1" placeholder="1" {...field} />
                                                <Badge variant="outline" className="h-10 px-4">Lotes</Badge>
                                            </div>
                                        </FormControl>
                                        {currentRecipe && (
                                            <FormDescription>Total produzido será: <b>{finalProducedQuantity.toFixed(3)} {currentRecipe.yieldUnit}</b></FormDescription>
                                        )}
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                            ) : (
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="producedQuantity"
                                        render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Quantidade Total Produzida</FormLabel>
                                            <Input type="number" step="0.001" placeholder="0.000" {...field} />
                                            <FormMessage />
                                        </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="producedUnit"
                                        render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Unidade</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                                <SelectContent>{unitOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                        )}
                                    />
                                </div>
                            )}

                            <FormField
                                control={form.control}
                                name="targetIngredientId"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Insumo para Entrada de Estoque</FormLabel>
                                    <Combobox options={ingredientOptions} value={field.value} onChange={field.onChange} placeholder="Selecione onde o estoque vai subir" />
                                    <FormDescription>Escolha qual insumo receberá a entrada desta produção.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                        </div>

                        {ingredientsToDeduct.length > 0 && (
                            <div className="space-y-3">
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                    <Calculator className="h-3 w-3" /> Baixa de Insumos (-):
                                </h3>
                                <div className="border rounded-md divide-y overflow-hidden">
                                    {ingredientsToDeduct.map((item, i) => (
                                        <div key={i} className="flex justify-between items-center p-2 text-xs bg-card">
                                            <span className="font-medium">{item.name}</span>
                                            <span className="text-destructive font-mono">-{item.quantity.toFixed(3)} {item.unit}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </TabsContent>
                </CardContent>
                
                <CardFooter className="border-t pt-6">
                    <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting ? "Processando..." : "Finalizar Produção e Ajustar Estoque"}
                    </Button>
                </CardFooter>
            </Card>
        </Tabs>
      </form>
    </Form>
  )
}
