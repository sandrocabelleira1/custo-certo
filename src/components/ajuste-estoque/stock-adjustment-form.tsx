
"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

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
import { DatePicker } from "@/components/ui/datepicker"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import type { Ingredient, Store } from "@/lib/types"
import { Combobox } from "../ui/combobox"
import { RadioGroup, RadioGroupItem } from "../ui/radio-group"
import { Textarea } from "../ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { useStore } from "../auth/store-provider"

const stockAdjustmentSchema = z.object({
  adjustmentDate: z.date({
    required_error: "A data do ajuste é obrigatória.",
  }),
  ingredientId: z.string().min(1, "Selecione um insumo."),
  quantity: z.coerce.number().min(0.001, "A quantidade deve ser positiva."),
  reason: z.string().min(1, "O motivo é obrigatório."),
  otherReason: z.string().optional(),
  type: z.enum(["entrada", "saida"], {
    required_error: "Selecione o tipo de ajuste"
  }),
  destinationStoreId: z.string().optional(),
  originStoreId: z.string().optional(),
}).refine(data => {
    if (data.reason === 'Outro') {
        return !!data.otherReason && data.otherReason.length >= 3;
    }
    return true;
}, {
    message: "Por favor, especifique o motivo.",
    path: ["otherReason"],
}).refine(data => {
    if (data.reason === 'Transferência de Loja') {
        return !!data.destinationStoreId;
    }
    return true;
}, {
    message: "Selecione a loja de destino.",
    path: ["destinationStoreId"],
}).refine(data => {
    if (data.reason === 'Recebimento de outra loja') {
        return !!data.originStoreId;
    }
    return true;
}, {
    message: "Selecione a loja de origem.",
    path: ["originStoreId"],
});


export type StockAdjustmentFormValues = z.infer<typeof stockAdjustmentSchema>

interface StockAdjustmentFormProps {
  onAddAdjustment: (data: StockAdjustmentFormValues) => Promise<void>;
  ingredients: Ingredient[];
  stores: Store[];
}


export function StockAdjustmentForm({ onAddAdjustment, ingredients, stores }: StockAdjustmentFormProps) {
  const { currentStore } = useStore();
  const form = useForm<StockAdjustmentFormValues>({
    resolver: zodResolver(stockAdjustmentSchema),
    defaultValues: {
      adjustmentDate: new Date(),
      ingredientId: "",
      quantity: "" as any,
      reason: "",
      otherReason: "",
      type: "saida",
      destinationStoreId: undefined,
      originStoreId: undefined,
    },
  })
  
  const watchedReason = form.watch("reason");

  React.useEffect(() => {
    if (watchedReason === 'Transferência de Loja') {
        form.setValue('type', 'saida');
    } else if (watchedReason === 'Recebimento de outra loja') {
        form.setValue('type', 'entrada');
    }
  }, [watchedReason, form]);

  async function onSubmit(data: StockAdjustmentFormValues) {
    await onAddAdjustment(data);
    form.reset({
        adjustmentDate: new Date(),
        ingredientId: "",
        quantity: "" as any,
        reason: "",
        otherReason: "",
        type: "saida",
        destinationStoreId: undefined,
        originStoreId: undefined,
    });
  }

  const ingredientOptions = React.useMemo(() => 
    ingredients.map(ing => ({
        value: ing.id,
        label: `${ing.name} (${ing.unit})`
    })), [ingredients]);
    
  const reasonOptions = [
    "Uso para produção",
    "Perda por validade",
    "Avaria",
    "Consumo interno",
    "Transferência de Loja",
    "Recebimento de outra loja",
    "Outro"
  ];

  const storeOptions = React.useMemo(() =>
    stores
        .filter(store => store.id !== currentStore?.id)
        .map(store => ({
            value: store.id,
            label: store.name,
        })), [stores, currentStore]);

  const isTransfer = watchedReason === 'Transferência de Loja';
  const isReception = watchedReason === 'Recebimento de outra loja';
  const disableTypeSelection = isTransfer || isReception;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
            <CardHeader>
                <CardTitle>Lançar Saída</CardTitle>
                <CardDescription>Registre uma movimentação no estoque.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
                <div className="grid grid-cols-1 gap-4">
                     <FormField
                        control={form.control}
                        name="type"
                        render={({ field }) => (
                            <FormItem className="space-y-3">
                                <FormLabel>Tipo de Ajuste</FormLabel>
                                <FormControl>
                                    <RadioGroup
                                    onValueChange={field.onChange}
                                    value={field.value}
                                    className="flex space-x-4"
                                    disabled={disableTypeSelection}
                                    >
                                    <FormItem className="flex items-center space-x-2 space-y-0">
                                        <FormControl>
                                        <RadioGroupItem value="saida" />
                                        </FormControl>
                                        <FormLabel className="font-normal">Saída</FormLabel>
                                    </FormItem>
                                    <FormItem className="flex items-center space-x-2 space-y-0">
                                        <FormControl>
                                        <RadioGroupItem value="entrada" />
                                        </FormControl>
                                        <FormLabel className="font-normal">Entrada</FormLabel>
                                    </FormItem>
                                    </RadioGroup>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="adjustmentDate"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Data da Movimentação</FormLabel>
                            <FormControl>
                            <DatePicker date={field.value} setDate={field.onChange} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="ingredientId"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Insumo</FormLabel>
                            <FormControl>
                                <Combobox 
                                    options={ingredientOptions}
                                    value={field.value}
                                    onChange={field.onChange}
                                    placeholder="Selecione um insumo"
                                    searchPlaceholder="Busque um insumo..."
                                    emptyText="Nenhum insumo encontrado."
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="quantity"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Quantidade</FormLabel>
                            <FormControl>
                            <Input
                                type="number"
                                placeholder="0.00"
                                step="0.001"
                                {...field}
                                value={field.value ?? ''}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="reason"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Motivo</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione o motivo da movimentação" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {reasonOptions.map(option => (
                                            <SelectItem key={option} value={option}>{option}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                     {watchedReason === 'Outro' && (
                        <FormField
                            control={form.control}
                            name="otherReason"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Especifique o Motivo</FormLabel>
                                <FormControl>
                                    <Textarea placeholder="Descreva o motivo..." {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    )}
                    {isTransfer && (
                         <FormField
                            control={form.control}
                            name="destinationStoreId"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Loja de Destino</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione a loja que receberá" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {storeOptions.map(option => (
                                            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    )}
                    {isReception && (
                         <FormField
                            control={form.control}
                            name="originStoreId"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Loja de Origem</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione a loja de origem" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {storeOptions.map(option => (
                                            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    )}
                </div>
            </CardContent>
            <CardFooter className="flex justify-end border-t pt-6">
                <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? 'Registrando...' : 'Registrar Movimentação'}
                </Button>
            </CardFooter>
        </Card>
      </form>
    </Form>
  )
}
