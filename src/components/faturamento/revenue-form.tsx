
"use client"

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
import { Textarea } from "../ui/textarea"

const revenueFormSchema = z.object({
  date: z.date({
    required_error: "A data do faturamento é obrigatória.",
  }),
  description: z.string().min(1, "A descrição é obrigatória."),
  amount: z.coerce.number().min(0.01, "O valor do faturamento deve ser positivo."),
})

export type RevenueFormValues = z.infer<typeof revenueFormSchema>

interface RevenueFormProps {
  onAddRevenue: (data: RevenueFormValues) => Promise<void>;
}


export function RevenueForm({ onAddRevenue }: RevenueFormProps) {
  const form = useForm<RevenueFormValues>({
    resolver: zodResolver(revenueFormSchema),
    defaultValues: {
      date: new Date(),
      description: "Faturamento do Dia",
      amount: "" as any,
    },
  })

  async function onSubmit(data: RevenueFormValues) {
    await onAddRevenue(data);
    form.reset({
      date: new Date(),
      description: "Faturamento do Dia",
      amount: "" as any,
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
            <CardHeader>
                <CardTitle>Registrar Faturamento</CardTitle>
                <CardDescription>Preencha os dados do faturamento para registrar.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
                <div className="grid grid-cols-1 gap-4">
                    <FormField
                        control={form.control}
                        name="date"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Data</FormLabel>
                            <FormControl>
                            <DatePicker date={field.value} setDate={field.onChange} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Descrição</FormLabel>
                            <FormControl>
                            <Textarea placeholder="Ex: Faturamento do dia, venda de evento..." {...field} value={field.value ?? ''} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="amount"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Valor (R$)</FormLabel>
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
                </div>
            </CardContent>
            <CardFooter className="flex justify-end border-t pt-6">
                <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? 'Salvando...' : 'Salvar Faturamento'}
                </Button>
            </CardFooter>
        </Card>
      </form>
    </Form>
  )
}
