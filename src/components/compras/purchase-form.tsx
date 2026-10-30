
"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useFieldArray, useForm, type FieldErrors } from "react-hook-form"
import { z } from "zod"
import { PlusCircle, Trash2, Camera, Upload } from "lucide-react"

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
import { DatePicker } from "@/components/ui/datepicker"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "../ui/separator"
import type { Ingredient, Supplier } from "@/lib/types"
import { RadioGroup, RadioGroupItem } from "../ui/radio-group"
import { Combobox } from "../ui/combobox"
import { formatCurrency } from "@/lib/utils"
import { BarcodeScanner } from "./barcode-scanner"

const purchaseItemSchema = z.object({
  ingredientId: z.string().min(1, "Selecione um produto."),
  quantity: z.coerce.number({ required_error: "A quantidade é obrigatória." }).min(0.001, "Quantidade deve ser positiva."),
  totalPrice: z.coerce.number({ required_error: "O preço total é obrigatório." }).min(0.01, "Preço total deve ser positivo."),
  unitPrice: z.number(), 
})

const installmentSchema = z.object({
    amount: z.coerce.number({ required_error: "O valor da parcela é obrigatório." }).min(0.01, "O valor da parcela deve ser positivo."),
    dueDate: z.date({ required_error: "A data de vencimento é obrigatória."}),
    barcode: z.string().optional(),
});


export const purchaseFormSchema = z.object({
  supplierName: z.string().min(1, "O nome do fornecedor é obrigatório."),
  invoiceNumber: z.string().optional(),
  purchaseDate: z.date({
    required_error: "A data da compra é obrigatória.",
  }),
  items: z.array(purchaseItemSchema).min(1, "Adicione pelo menos um item à compra."),
  paymentMethod: z.enum(["Boleto", "Cartão de Crédito", "PIX", "Dinheiro"], {
    required_error: "Selecione uma forma de pagamento"
  }),
  pixStatus: z.enum(["pago", "agendado"]).optional(),
  pixDueDate: z.date().optional(),
  installments: z.array(installmentSchema).optional(),
  invoiceFile: z.any().optional(),
}).superRefine((data, ctx) => {
    if (data.paymentMethod === 'Boleto') {
        if (!data.installments || data.installments.length === 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Adicione pelo menos uma parcela para pagamento com boleto.",
                path: ["installments"],
            });
            return;
        }

        const totalAmount = data.items.reduce((acc, item) => acc + (Number(item.totalPrice) || 0), 0);
        const totalInstallments = data.installments.reduce((acc, inst) => acc + (Number(inst.amount) || 0), 0);

        if (Math.abs(totalAmount - totalInstallments) >= 0.01) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "A soma das parcelas deve ser igual ao valor total da compra.",
                path: ["installments"],
            });
        }
    }
    
    if (data.paymentMethod === 'PIX') {
        if (!data.pixStatus) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Selecione se o PIX foi pago ou agendado.",
                path: ["pixStatus"],
            });
        }
        if (data.pixStatus === 'agendado' && !data.pixDueDate) {
             ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "A data de agendamento do PIX é obrigatória.",
                path: ["pixDueDate"],
            });
        }
    }
});

export type PurchaseFormValues = z.infer<typeof purchaseFormSchema>

interface PurchaseFormProps {
    onAddPurchase: (data: PurchaseFormValues) => Promise<void>;
    ingredients: Ingredient[];
    suppliers: Supplier[];
}

export function PurchaseForm({ onAddPurchase, ingredients, suppliers }: PurchaseFormProps) {
  const [scannerIndex, setScannerIndex] = React.useState<number | null>(null);

  const form = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseFormSchema),
    defaultValues: {
      supplierName: "",
      invoiceNumber: "",
      purchaseDate: new Date(),
      items: [{ ingredientId: "", quantity: "" as any, totalPrice: "" as any, unitPrice: 0 }],
      paymentMethod: "Boleto",
      pixStatus: 'pago',
      installments: [{ amount: "" as any, dueDate: new Date(), barcode: "" }],
      invoiceFile: undefined,
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  })
  
  const { fields: installmentFields, append: appendInstallment, remove: removeInstallment } = useFieldArray({
      control: form.control,
      name: "installments",
  });
  
  const paymentMethod = form.watch('paymentMethod');
  const pixStatus = form.watch('pixStatus');
  const items = form.watch('items');

  const totalAmount = React.useMemo(() => {
    return items.reduce((acc, item) => acc + (Number(item.totalPrice) || 0), 0);
  }, [items]);
  
  const watchedInstallments = form.watch('installments');
  const totalInstallmentsAmount = React.useMemo(() => {
     if (!watchedInstallments) return 0;
     return watchedInstallments.reduce((acc, inst) => acc + (Number(inst.amount) || 0), 0);
  }, [watchedInstallments]);


  const getUnitPrice = (index: number) => {
    const item = items[index];
    if (!item) return 0;
    const quantity = Number(item.quantity) || 0;
    const totalPrice = Number(item.totalPrice) || 0;
    if (quantity > 0 && totalPrice > 0) {
      return totalPrice / quantity;
    }
    return 0;
  };
  
   React.useEffect(() => {
    if (paymentMethod === 'Boleto' && totalAmount > 0) {
      const installments = form.getValues('installments');
      if (installments?.length === 1 && !installments[0].amount) {
        form.setValue('installments.0.amount', totalAmount, { shouldValidate: true });
      }
    } else if (paymentMethod !== 'Boleto') {
        form.setValue('installments', []);
    }

    if (paymentMethod === 'PIX') {
        form.trigger('pixStatus');
    }

  }, [totalAmount, paymentMethod, form]);


  async function onSubmit(data: PurchaseFormValues) {
    const finalData = {
        ...data,
        items: data.items.map(item => ({
            ...item,
            unitPrice: (Number(item.totalPrice) || 0) / (Number(item.quantity) || 1)
        }))
    };
    await onAddPurchase(finalData);
    form.reset({
      supplierName: "",
      invoiceNumber: "",
      purchaseDate: new Date(),
      items: [{ ingredientId: "", quantity: "" as any, totalPrice: "" as any, unitPrice: 0 }],
      paymentMethod: "Boleto",
      pixStatus: 'pago',
      pixDueDate: undefined,
      installments: [{ amount: "" as any, dueDate: new Date(), barcode: "" }],
      invoiceFile: undefined,
    });
  }

  const onError = (errors: FieldErrors<PurchaseFormValues>) => {
    console.error("Form validation failed:", JSON.stringify(errors, null, 2));
  };


  const ingredientOptions = React.useMemo(() => 
    ingredients.map(ing => ({
        value: ing.id,
        label: `${ing.name} (${ing.unit})`
    })), [ingredients]);
    
  const supplierOptions = React.useMemo(() =>
    suppliers.map(sup => ({
        value: sup.name,
        label: sup.name
    })), [suppliers]);

  const handleBarcodeScanned = (barcode: string) => {
    if (scannerIndex !== null) {
      form.setValue(`installments.${scannerIndex}.barcode`, barcode);
      setScannerIndex(null); 
    }
  };


  return (
    <>
    {scannerIndex !== null && (
        <BarcodeScanner 
            open={scannerIndex !== null}
            onOpenChange={(isOpen) => !isOpen && setScannerIndex(null)}
            onBarcodeScanned={handleBarcodeScanned}
        />
    )}
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit, onError)}>
        <Card>
            <CardHeader>
                <CardTitle>Detalhes da Compra</CardTitle>
                <CardDescription>Preencha as informações da nota fiscal e dos produtos adquiridos.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
                <div className="grid md:grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="supplierName"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Fornecedor</FormLabel>
                        <FormControl>
                             <Combobox
                                options={supplierOptions}
                                value={field.value}
                                onChange={(value) => {
                                    form.setValue('supplierName', value, { shouldValidate: true })
                                }}
                                placeholder="Selecione ou digite"
                                searchPlaceholder="Buscar fornecedor..."
                                emptyText="Nenhum fornecedor encontrado."
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="invoiceNumber"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Número da Nota</FormLabel>
                        <FormControl>
                        <Input placeholder="Ex: NF-12345" {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="invoiceFile"
                    render={({ field: { value, onChange, ...fieldProps } }) => (
                        <FormItem>
                            <FormLabel>Anexar Nota Fiscal (Foto ou PDF)</FormLabel>
                            <FormControl>
                                <Input 
                                    type="file" 
                                    accept="image/*,application/pdf" 
                                    onChange={(e) => onChange(e.target.files?.[0])}
                                    className="cursor-pointer"
                                    {...fieldProps} 
                                />
                            </FormControl>
                            <FormDescription>Anexo opcional para arquivamento digital.</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="purchaseDate"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Data da Compra</FormLabel>
                        <FormControl>
                           <DatePicker date={field.value} setDate={field.onChange} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="paymentMethod"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Forma de Pagamento</FormLabel>
                            <FormControl>
                                <RadioGroup
                                    onValueChange={field.onChange}
                                    value={field.value}
                                    className="flex items-center space-x-4 pt-2"
                                >
                                    <FormItem className="flex items-center space-x-2 space-y-0">
                                        <FormControl>
                                            <RadioGroupItem value="Boleto" />
                                        </FormControl>
                                        <FormLabel className="font-normal">Boleto</FormLabel>
                                    </FormItem>
                                    <FormItem className="flex items-center space-x-2 space-y-0">
                                        <FormControl>
                                            <RadioGroupItem value="Cartão de Crédito" />
                                        </FormControl>
                                        <FormLabel className="font-normal">Cartão</FormLabel>
                                    </FormItem>
                                    <FormItem className="flex items-center space-x-2 space-y-0">
                                        <FormControl>
                                            <RadioGroupItem value="PIX" />
                                        </FormControl>
                                        <FormLabel className="font-normal">PIX</FormLabel>
                                    </FormItem>
                                    <FormItem className="flex items-center space-x-2 space-y-0">
                                        <FormControl>
                                            <RadioGroupItem value="Dinheiro" />
                                        </FormControl>
                                        <FormLabel className="font-normal">Dinheiro</FormLabel>
                                    </FormItem>
                                </RadioGroup>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                </div>
                 
                 {paymentMethod === 'PIX' && (
                    <div className="grid md:grid-cols-2 gap-4 items-end pl-2 border-l-2">
                         <FormField
                            control={form.control}
                            name="pixStatus"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Status do PIX</FormLabel>
                                    <FormControl>
                                        <RadioGroup
                                            onValueChange={field.onChange}
                                            value={field.value}
                                            className="flex items-center space-x-4 pt-2"
                                        >
                                            <FormItem className="flex items-center space-x-2 space-y-0">
                                                <FormControl><RadioGroupItem value="pago" /></FormControl>
                                                <FormLabel className="font-normal">Pago</FormLabel>
                                            </FormItem>
                                            <FormItem className="flex items-center space-x-2 space-y-0">
                                                <FormControl><RadioGroupItem value="agendado" /></FormControl>
                                                <FormLabel className="font-normal">Agendado</FormLabel>
                                            </FormItem>
                                        </RadioGroup>
                                    </FormControl>
                                     <FormMessage />
                                </FormItem>
                            )}
                        />
                        {pixStatus === 'agendado' && (
                             <FormField
                                control={form.control}
                                name="pixDueDate"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Data de Pagamento</FormLabel>
                                    <FormControl>
                                        <DatePicker date={field.value} setDate={field.onChange} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                        )}
                    </div>
                 )}

                 {paymentMethod === 'Boleto' && (
                    <>
                        <Separator />
                        <div>
                            <h3 className="text-lg font-medium mb-4">Parcelas do Boleto</h3>
                            <div className="space-y-4">
                                {installmentFields.map((field, index) => (
                                    <div key={field.id} className="grid grid-cols-1 md:grid-cols-10 gap-2 items-start p-3 rounded-lg border">
                                        <FormField
                                            control={form.control}
                                            name={`installments.${index}.amount`}
                                            render={({ field }) => (
                                                <FormItem className="md:col-span-3">
                                                    {index === 0 && <FormLabel>Valor da Parcela</FormLabel>}
                                                    <Input
                                                        type="number"
                                                        placeholder="0,00"
                                                        {...field}
                                                        value={field.value ?? ''}
                                                    />
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name={`installments.${index}.dueDate`}
                                            render={({ field }) => (
                                                <FormItem className="md:col-span-3">
                                                    {index === 0 && <FormLabel>Vencimento</FormLabel>}
                                                    <DatePicker date={field.value} setDate={field.onChange} />
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name={`installments.${index}.barcode`}
                                            render={({ field }) => (
                                                <FormItem className="md:col-span-3">
                                                    {index === 0 && <FormLabel>Cód. Barras (Opcional)</FormLabel>}
                                                    <div className="flex items-center gap-2">
                                                        <Input placeholder="Digite ou escaneie o código" {...field} value={field.value ?? ''} />
                                                        <Button type="button" variant="outline" size="icon" onClick={() => setScannerIndex(index)}>
                                                            <Camera className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <div className="md:col-span-1 flex items-end h-full">
                                            <Button type="button" variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => removeInstallment(index)} disabled={installmentFields.length <= 1}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                                <Button type="button" variant="outline" size="sm" onClick={() => appendInstallment({ amount: "" as any, dueDate: new Date(), barcode: "" })}>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Adicionar Parcela
                                </Button>
                                {form.formState.errors.installments && (
                                     <p className="text-sm font-medium text-destructive">{form.formState.errors.installments.message}</p>
                                )}
                            </div>
                        </div>
                    </>
                 )}


                <Separator />

                <div>
                    <h3 className="text-lg font-medium mb-4">Itens da Compra</h3>
                    <div className="space-y-4">
                    {fields.map((field, index) => (
                        <div key={field.id} className="grid grid-cols-1 md:grid-cols-10 gap-2 items-start p-3 rounded-lg border">
                            <FormField
                                control={form.control}
                                name={`items.${index}.ingredientId`}
                                render={({ field }) => (
                                <FormItem className="md:col-span-4">
                                     {index === 0 && <FormLabel>Produto</FormLabel>}
                                     <Combobox 
                                        options={ingredientOptions}
                                        value={field.value}
                                        onChange={field.onChange}
                                        placeholder="Selecione o item"
                                        searchPlaceholder="Busque um insumo..."
                                        emptyText="Nenhum insumo encontrado."
                                     />
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name={`items.${index}.quantity`}
                                render={({ field }) => (
                                <FormItem className="md:col-span-2">
                                     {index === 0 && <FormLabel>Quantidade</FormLabel>}
                                    <FormControl>
                                    <Input
                                        type="number"
                                        placeholder="0"
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
                                name={`items.${index}.totalPrice`}
                                render={({ field }) => (
                                <FormItem className="md:col-span-2">
                                     {index === 0 && <FormLabel>Valor Total (R$)</FormLabel>}
                                    <FormControl>
                                        <Input
                                            type="number"
                                            placeholder="0,00"
                                            {...field}
                                            value={field.value ?? ''}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                             <div className="md:col-span-1">
                                {index === 0 && <FormLabel>Valor Unit.</FormLabel>}
                                <Input 
                                    disabled 
                                    value={formatCurrency(getUnitPrice(index) || 0)} 
                                    className="disabled:opacity-100 disabled:cursor-default"
                                />
                            </div>
                            <div className="md:col-span-1 flex items-end h-full">
                                <Button type="button" variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => remove(index)} disabled={fields.length <= 1}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => append({ ingredientId: "", quantity: "" as any, totalPrice: "" as any, unitPrice: 0 })}
                    >
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Adicionar Item
                    </Button>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="flex justify-between items-center border-t pt-6">
                <div className="text-lg font-semibold">
                    Valor Total da Compra: <span className="text-primary">{formatCurrency(totalAmount)}</span>
                </div>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? 'Salvando...' : 'Salvar Compra'}
                </Button>
            </CardFooter>
        </Card>
      </form>
    </Form>
    </>
  )
}
