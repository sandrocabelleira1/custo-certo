
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
  FormDescription,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import type { Store } from "@/lib/types"

const storeFormSchema = z.object({
  name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres."),
  location: z.string().optional(),
})

export type StoreFormValues = z.infer<typeof storeFormSchema>

interface StoreFormProps {
    onFormSubmit: (data: StoreFormValues) => Promise<void>;
    initialData?: Store | null;
}

export function StoreForm({ onFormSubmit, initialData }: StoreFormProps) {
  const form = useForm<StoreFormValues>({
    resolver: zodResolver(storeFormSchema),
    defaultValues: {
      name: initialData?.name || "",
      location: initialData?.location || "",
    }
  })

  async function onSubmit(data: StoreFormValues) {
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
              <FormLabel>Nome da Loja</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Bruxas Xangri-Lá" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Localização para Clima (Opcional)</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Xangri-Lá" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormDescription>
                Usado para a previsão do tempo. Se vazio, o nome da loja será usado.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
             {form.formState.isSubmitting ? 'Salvando...' : 'Salvar Loja'}
        </Button>
      </form>
    </Form>
  )
}
