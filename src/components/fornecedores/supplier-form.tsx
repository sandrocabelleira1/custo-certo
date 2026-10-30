
"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import * as React from "react"

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
import type { Supplier } from "@/lib/types"

const supplierFormSchema = z.object({
  name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres."),
  contactInfo: z.string().min(3, "A informação de contato é obrigatória."),
})

export type SupplierFormValues = z.infer<typeof supplierFormSchema>

interface SupplierFormProps {
    onFormSubmit: (data: SupplierFormValues) => Promise<void>;
    initialData?: Supplier | null;
}

export function SupplierForm({ onFormSubmit, initialData }: SupplierFormProps) {
  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: initialData || {
      name: "",
      contactInfo: "",
    },
  })

  React.useEffect(() => {
    form.reset(initialData || { name: "", contactInfo: "" });
  }, [initialData, form]);

  async function onSubmit(data: SupplierFormValues) {
    await onFormSubmit(data);
    if (!initialData) {
      form.reset();
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do Fornecedor</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Carnes Nobres S.A." {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="contactInfo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Informação de Contato</FormLabel>
              <FormControl>
                <Input placeholder="Ex: vendedor@email.com ou (11) 99999-8888" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
             {form.formState.isSubmitting ? 'Salvando...' : (initialData ? 'Salvar Alterações' : 'Salvar Fornecedor')}
        </Button>
      </form>
    </Form>
  )
}
