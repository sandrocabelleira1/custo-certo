
"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { PlusCircle, Wallet, Calendar, Tag, Upload, Clock } from "lucide-react"

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "../ui/radio-group"
import { Checkbox } from "../ui/checkbox"
import type { ExpenseCategory } from "@/lib/types"

const expenseFormSchema = z.object({
  description: z.string().min(3, "A descrição deve ter pelo menos 3 caracteres."),
  category: z.enum(['Marketing', 'Utilidades', 'Aluguel', 'Manutenção', 'Pessoal', 'Impostos', 'Software', 'Logística e Entregas', 'Outros'], {
    required_error: "Selecione uma categoria.",
  }),
  amount: z.coerce.number().min(0.01, "O valor deve ser positivo."),
  expenseDate: z.date({
    required_error: "A data da despesa é obrigatória.",
  }),
  status: z.enum(["Pago", "Pendente"], {
    required_error: "Informe se já foi pago.",
  }),
  isDueDateOpen: z.boolean().default(false),
  dueDate: z.date().optional(),
  paymentMethod: z.enum(["Boleto", "Cartão de Crédito", "PIX", "Dinheiro"], {
    required_error: "Selecione o método de pagamento.",
  }),
  invoiceFile: z.any().optional(),
}).refine(data => {
    // Se estiver pago ou se NÃO estiver em aberto, a data é obrigatória
    if (data.status === 'Pago' || !data.isDueDateOpen) {
        return !!data.dueDate;
    }
    return true;
}, {
    message: "Informe a data de vencimento/pagamento ou marque como 'Em aberto'.",
    path: ["dueDate"],
});

export type ExpenseFormValues = z.infer<typeof expenseFormSchema>

interface ExpenseFormProps {
  onSubmit: (data: ExpenseFormValues) => Promise<void>;
}

const categories: { value: ExpenseCategory, label: string }[] = [
    { value: 'Logística e Entregas', label: 'Logística e Entregas (Entregadores)' },
    { value: 'Marketing', label: 'Marketing e Propaganda' },
    { value: 'Utilidades', label: 'Utilidades (Água, Luz, Internet)' },
    { value: 'Aluguel', label: 'Aluguel e Condomínio' },
    { value: 'Manutenção', label: 'Manutenção e Reparos' },
    { value: 'Pessoal', label: 'Pessoal (Folha, Encargos)' },
    { value: 'Impostos', label: 'Impostos e Taxas' },
    { value: 'Software', label: 'Software e Assinaturas' },
    { value: 'Outros', label: 'Outros Gastos' },
];

export function ExpenseForm({ onSubmit }: ExpenseFormProps) {
  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      description: "",
      category: undefined,
      amount: "" as any,
      expenseDate: new Date(),
      status: "Pago",
      isDueDateOpen: false,
      dueDate: new Date(),
      paymentMethod: "Dinheiro",
    },
  })

  const watchedStatus = form.watch('status');
  const watchedIsDueDateOpen = form.watch('isDueDateOpen');

  // Reseta o checkbox se marcar como pago
  React.useEffect(() => {
    if (watchedStatus === 'Pago') {
        form.setValue('isDueDateOpen', false);
    }
  }, [watchedStatus, form]);

  async function handleFormSubmit(data: ExpenseFormValues) {
    await onSubmit(data);
    form.reset({
        description: "",
        category: undefined,
        amount: "" as any,
        expenseDate: new Date(),
        status: "Pago",
        isDueDateOpen: false,
        dueDate: new Date(),
        paymentMethod: "Dinheiro",
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)}>
        <Card>
            <CardHeader>
                <CardTitle>Dados da Despesa</CardTitle>
                <CardDescription>Informe os detalhes do gasto para controle financeiro.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
                <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Descrição do Gasto</FormLabel>
                            <FormControl>
                                <Input placeholder="Ex: Pagamento Entregador João, Campanha Insta..." {...field} />
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
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                    <FormField
                        control={form.control}
                        name="amount"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Valor Total (R$)</FormLabel>
                            <FormControl>
                                <Input type="number" step="0.01" placeholder="0,00" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="expenseDate"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Data da Despesa</FormLabel>
                            <FormControl>
                                <DatePicker date={field.value} setDate={field.onChange} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                            <FormItem className="space-y-3">
                                <FormLabel>Status</FormLabel>
                                <FormControl>
                                    <RadioGroup
                                        onValueChange={field.onChange}
                                        value={field.value}
                                        className="flex space-x-4 pt-2"
                                    >
                                        <FormItem className="flex items-center space-x-2 space-y-0">
                                            <FormControl><RadioGroupItem value="Pendente" /></FormControl>
                                            <FormLabel className="font-normal">A Pagar</FormLabel>
                                        </FormItem>
                                        <FormItem className="flex items-center space-x-2 space-y-0">
                                            <FormControl><RadioGroupItem value="Pago" /></FormControl>
                                            <FormLabel className="font-normal">Já Pago</FormLabel>
                                        </FormItem>
                                    </RadioGroup>
                                </FormControl>
                            </FormItem>
                        )}
                    />
                </div>

                <div className="grid md:grid-cols-2 gap-8 items-start">
                    <div className="space-y-4">
                        <FormField
                            control={form.control}
                            name="dueDate"
                            render={({ field }) => (
                            <FormItem className={watchedIsDueDateOpen ? "opacity-50 pointer-events-none" : ""}>
                                <FormLabel>{watchedStatus === 'Pago' ? 'Data do Pagamento' : 'Data de Vencimento'}</FormLabel>
                                <FormControl>
                                    <DatePicker date={field.value} setDate={field.onChange} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        {watchedStatus === 'Pendente' && (
                            <FormField
                                control={form.control}
                                name="isDueDateOpen"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-muted/20">
                                        <FormControl>
                                            <Checkbox
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                        <div className="space-y-1 leading-none">
                                            <FormLabel className="flex items-center gap-2 cursor-pointer">
                                                <Clock className="h-3 w-3" /> Deixar em aberto (sem data definida)
                                            </FormLabel>
                                        </div>
                                    </FormItem>
                                )}
                            />
                        )}
                    </div>

                    <div className="space-y-4">
                        <FormField
                            control={form.control}
                            name="paymentMethod"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Forma de Pagamento</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="Boleto">Boleto</SelectItem>
                                            <SelectItem value="Cartão de Crédito">Cartão de Crédito</SelectItem>
                                            <SelectItem value="PIX">PIX</SelectItem>
                                            <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="invoiceFile"
                            render={({ field: { value, onChange, ...fieldProps } }) => (
                                <FormItem>
                                    <FormLabel>Anexar Comprovante (opcional)</FormLabel>
                                    <FormControl>
                                        <Input 
                                            type="file" 
                                            accept="image/*,application/pdf" 
                                            onChange={(e) => onChange(e.target.files?.[0])}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                    </div>
                </div>
            </CardContent>
            <CardFooter className="flex justify-end border-t pt-6">
                <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? 'Salvando...' : 'Lançar Despesa'}
                </Button>
            </CardFooter>
        </Card>
      </form>
    </Form>
  )
}
