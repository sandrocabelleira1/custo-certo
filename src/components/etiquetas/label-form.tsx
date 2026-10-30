'use client';

import * as React from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { DatePicker } from "@/components/ui/datepicker";
import { Input } from "@/components/ui/input";
import type { Recipe, Ingredient } from "@/lib/types";
import { format } from 'date-fns';
import { useStore } from '../auth/store-provider';
import { useAuth } from '../auth/auth-provider';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Checkbox } from '../ui/checkbox';

const labelFormSchema = z.object({
  productName: z.string().min(1, "O nome do produto é obrigatório."),
  fabricationDate: z.date({ required_error: "A data de fabricação é obrigatória." }),
  validityDays: z.coerce.number().int().min(1, "A validade deve ser de pelo menos 1 dia."),
  quantity: z.coerce.number().int().min(1, "A quantidade deve ser de pelo menos 1."),
  lote: z.string().min(1, "O lote é obrigatório."),
  fabricante: z.string().min(1, "O fabricante é obrigatório."),
  responsavel: z.string().min(1, "O responsável é obrigatório."),
  productState: z.enum(['Resfriado', 'Congelado'], {
    required_error: "Selecione se o produto é resfriado ou congelado.",
  }),
  labelFormat: z.enum(['default', 'simple'], {
    required_error: "Selecione o formato da etiqueta.",
  }),
  originalValidityDate: z.string().optional(),
  healthSeal: z.string().optional(),
  displayQuantity: z.string().optional(),
  marcaDeOrigem: z.string().optional(),
  // Campo que será preenchido automaticamente
  ingredientsList: z.array(z.string()).optional(),
  includeNutritionalInfo: z.boolean().default(false),
  allergens: z.array(z.string()).optional(),
  nutritionalInfo: z.string().optional(),
});

export type LabelFormValues = z.infer<typeof labelFormSchema>;

interface LabelFormProps {
  options: ComboboxOption[];
  allItems: (Recipe | Ingredient)[];
  onGenerate: (data: LabelFormValues) => void;
}

export function LabelForm({ options, allItems, onGenerate }: LabelFormProps) {
  const { currentStore } = useStore();
  const { user } = useAuth();
  
  const form = useForm<LabelFormValues>({
    resolver: zodResolver(labelFormSchema),
    defaultValues: {
      productName: "",
      fabricationDate: new Date(),
      validityDays: 3, // Default to 3 for 'Resfriado'
      quantity: 1,
      lote: format(new Date(), 'yyyyMMdd'),
      fabricante: currentStore?.name || "Custo Certo Gastronomia",
      responsavel: user?.displayName || "Administrador",
      productState: 'Resfriado',
      labelFormat: 'default',
      originalValidityDate: "",
      healthSeal: "",
      displayQuantity: "",
      marcaDeOrigem: "",
      ingredientsList: [],
      includeNutritionalInfo: false,
    },
  });
  
  const selectedProductValue = form.watch("productName");
  const fabricationDate = form.watch("fabricationDate");
  const productState = form.watch("productState");

  const selectedItem = React.useMemo(() => {
    return allItems.find(item => {
        const uniqueId = `${(item as any).type}__${item.id}`;
        return uniqueId === selectedProductValue;
    });
  }, [selectedProductValue, allItems]);

  const canShowNutritionalInfoOption = React.useMemo(() => {
    if (selectedItem && 'ingredientsList' in selectedItem) {
        const recipe = selectedItem as Recipe;
        return !!(recipe.nutritionalInfo || (recipe.allergens && recipe.allergens.length > 0));
    }
    return false;
  }, [selectedItem]);


  React.useEffect(() => {
    form.setValue('lote', `#${format(fabricationDate, 'yyyyMMdd')}`);
  }, [fabricationDate, form]);

  React.useEffect(() => {
    if (currentStore) {
        form.setValue('fabricante', currentStore.name);
    }
  }, [currentStore, form]);
  
  React.useEffect(() => {
    if (user?.displayName) {
        form.setValue('responsavel', user.displayName);
    }
  }, [user, form]);

  React.useEffect(() => {
    if (productState === 'Resfriado') {
        form.setValue('validityDays', 3);
    } else if (productState === 'Congelado') {
        form.setValue('validityDays', 30);
    }
  }, [productState, form]);
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onGenerate)}>
        <Card>
          <CardHeader>
            <CardTitle>Gerar Etiqueta</CardTitle>
            <CardDescription>
              Selecione uma receita ou digite um nome de produto e preencha as informações para gerar a etiqueta.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <FormField
              control={form.control}
              name="productName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Produto ou Receita</FormLabel>
                   <Combobox
                      options={options}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Selecione ou digite um nome"
                      searchPlaceholder="Buscar item..."
                      emptyText="Nenhum item encontrado."
                    />
                  <FormMessage />
                </FormItem>
              )}
            />
            {canShowNutritionalInfoOption && (
                <FormField
                    control={form.control}
                    name="includeNutritionalInfo"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                                <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                                <FormLabel>
                                    Incluir Informações Nutricionais e Alergênicos
                                </FormLabel>
                            </div>
                        </FormItem>
                    )}
                />
            )}
             <FormField
              control={form.control}
              name="labelFormat"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Formato da Etiqueta</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="flex space-x-4"
                    >
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="default" />
                        </FormControl>
                        <FormLabel className="font-normal">Padrão (8cm x 3cm)</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="simple" />
                        </FormControl>
                        <FormLabel className="font-normal">Simples (6cm x 4cm)</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="productState"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Estado do Produto</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="flex space-x-4"
                    >
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="Resfriado" />
                        </FormControl>
                        <FormLabel className="font-normal">Resfriado</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="Congelado" />
                        </FormControl>
                        <FormLabel className="font-normal">Congelado</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
                 <FormField
                    control={form.control}
                    name="fabricationDate"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Data de Fabricação</FormLabel>
                        <DatePicker date={field.value} setDate={field.onChange} />
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                <FormField
                control={form.control}
                name="validityDays"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Validade (dias)</FormLabel>
                    <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                    />
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
             <div className="grid grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Qtd. Etiquetas</FormLabel>
                    <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                    />
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="lote"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Lote</FormLabel>
                    <Input {...field} />
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
            <FormField
              control={form.control}
              name="fabricante"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Marca/Fabricante</FormLabel>
                  <Input {...field} />
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="responsavel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Responsável</FormLabel>
                  <Input {...field} />
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Card>
                <CardHeader className="p-4">
                    <CardTitle className="text-base">Informações Opcionais</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 grid grid-cols-1 gap-4">
                     <FormField
                        control={form.control}
                        name="originalValidityDate"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Validade Original (opcional)</FormLabel>
                            <Input {...field} placeholder="Digite a data de validade" />
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    <FormField
                    control={form.control}
                    name="healthSeal"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Selo de Registro Sanitário (opcional)</FormLabel>
                        <Input {...field} placeholder="Nº do selo, SIF, etc." />
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="displayQuantity"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Quantidade (Ex: 500g, 1 un)</FormLabel>
                        <Input {...field} placeholder="Digite a quantidade para exibir" />
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="marcaDeOrigem"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Marca de Origem (opcional)</FormLabel>
                        <Input {...field} placeholder="Digite a marca de origem" />
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </CardContent>
            </Card>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={!selectedProductValue}>Gerar Etiqueta</Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}
