
"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Ingredient, IngredientCategory } from "@/lib/types"

const ingredientFormSchema = z.object({
  name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres."),
  unit: z.enum(['kg', 'g', 'L', 'ml', 'un'], {
    required_error: "A unidade de medida é obrigatória.",
  }),
  category: z.enum(['Alimentos', 'Bebidas', 'Descartáveis', 'Limpeza'], {
    required_error: "A categoria é obrigatória.",
  }),
  currentCostPerUnit: z.coerce.number().min(0.01, "O custo deve ser um valor positivo."),
  stockQuantity: z.coerce.number().min(0, "O estoque inicial não pode ser negativo.").default(0),
})

export type IngredientFormValues = z.infer<typeof ingredientFormSchema>

interface IngredientFormProps {
    onSubmit: (data: IngredientFormValues) => Promise<void>;
    initialData?: Ingredient | null;
}

export function IngredientForm({ onSubmit, initialData }: IngredientFormProps) {
  const form = useForm<IngredientFormValues>({
    resolver: zodResolver(ingredientFormSchema),
    defaultValues: initialData ? {
      name: initialData.name,
      unit: initialData.unit,
      category: initialData.category,
      currentCostPerUnit: initialData.currentCostPerUnit,
      stockQuantity: 0, // Estoque inicial é sempre 0 no form, pois é por loja
    } : {
      name: "",
      unit: undefined,
      category: undefined,
      currentCostPerUnit: undefined,
      stockQuantity: undefined,
    },
  })
  
  React.useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name,
        unit: initialData.unit,
        category: initialData.category,
        currentCostPerUnit: initialData.currentCostPerUnit,
        stockQuantity: 0, // Não preenchemos o estoque aqui
      });
    } else {
      form.reset({
        name: "",
        unit: undefined,
        category: undefined,
        currentCostPerUnit: undefined,
        stockQuantity: undefined,
      });
    }
  }, [initialData, form]);

  async function handleSubmit(data: IngredientFormValues) {
    await onSubmit(data);
    if (!initialData) {
      form.reset();
    }
  }
  
  const categories: { value: IngredientCategory, label: string }[] = [
    { value: 'Alimentos', label: 'Alimentos' },
    { value: 'Bebidas', label: 'Bebidas' },
    { value: 'Descartáveis', label: 'Descartáveis' },
    { value: 'Limpeza', label: 'Limpeza' },
  ];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do Insumo</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Tomate Italiano" {...field} />
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
                        {categories.map(cat => (
                           <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="unit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Unidade de Medida</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                        <SelectTrigger>
                        <SelectValue placeholder="Selecione a unidade" />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        <SelectItem value="kg">Quilograma (kg)</SelectItem>
                        <SelectItem value="g">Grama (g)</SelectItem>
                        <SelectItem value="L">Litro (L)</SelectItem>
                        <SelectItem value="ml">Mililitro (ml)</SelectItem>
                        <SelectItem value="un">Unidade (un)</SelectItem>
                    </SelectContent>
                </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="currentCostPerUnit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Custo Unitário Atual (R$)</FormLabel>
              <FormControl>
                <Input
                    type="number"
                    placeholder="0,00"
                    step="0.01"
                    {...field}
                    onChange={(e) => {
                        const value = e.target.value;
                        field.onChange(value === '' ? undefined : parseFloat(value));
                    }}
                    value={field.value ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="stockQuantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Estoque Inicial (para a loja atual)</FormLabel>
              <FormControl>
                 <Input
                    type="number"
                    step="0.001"
                    {...field}
                    onChange={(e) => {
                        const value = e.target.value;
                        field.onChange(value === '' ? undefined : parseFloat(value));
                    }}
                     value={field.value ?? ''}
                />
              </FormControl>
               <FormDescription>
                A quantidade inicial deste insumo na loja atual. Se deixado em branco, será 0.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
             {form.formState.isSubmitting ? 'Salvando...' : 'Salvar Insumo'}
        </Button>
      </form>
    </Form>
  )
}
