
"use client"

import * as React from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import type { AppUser, Store } from "@/lib/types";

// Schema base sem as validações refinadas
const baseUserFormSchema = z.object({
  displayName: z.string().min(2, "O nome deve ter pelo menos 2 caracteres."),
  email: z.string().email("Por favor, insira um e-mail válido."),
  role: z.enum(['Master', 'Gerente', 'Colaborador'], {
    required_error: "O cargo é obrigatório.",
  }),
  storeId: z.string().optional(),
  password: z.string().optional(),
});

// Validação refinada que será aplicada a ambos os schemas
const refinedValidation = (data: z.infer<typeof baseUserFormSchema>, ctx: z.RefinementCtx) => {
    if ((data.role === 'Gerente' || data.role === 'Colaborador') && !data.storeId) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "A loja é obrigatória para Gerentes e Colaboradores.",
            path: ["storeId"],
        });
    }
};

// Schema para editar usuários existentes
const userFormSchema = baseUserFormSchema.superRefine(refinedValidation);

// Schema para criar novos usuários (com senha obrigatória)
const newUserFormSchema = baseUserFormSchema.extend({
    password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
}).superRefine(refinedValidation);


export type UserFormValues = z.infer<typeof userFormSchema>;

interface UserFormProps {
    onSubmit: (data: UserFormValues) => Promise<void>;
    stores: Store[];
    initialData?: AppUser | null;
    isEditing: boolean;
}

export function UserForm({ onSubmit, stores, initialData, isEditing }: UserFormProps) {
  
  const form = useForm<UserFormValues>({
    resolver: zodResolver(isEditing ? userFormSchema : newUserFormSchema),
    defaultValues: initialData ? {
        displayName: initialData.displayName,
        email: initialData.email,
        role: initialData.role,
        storeId: initialData.storeId,
        password: "",
    } : {
      displayName: "",
      email: "",
      password: "",
      role: undefined,
      storeId: undefined,
    },
  });
  
  const watchedRole = form.watch("role");

  async function handleFormSubmit(data: UserFormValues) {
    await onSubmit(data);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <FormField
            control={form.control}
            name="displayName"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Nome Completo</FormLabel>
                <FormControl>
                    <Input placeholder="Ex: João da Silva" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>E-mail</FormLabel>
              <FormControl>
                <Input type="email" placeholder="usuario@seuemail.com" {...field} disabled={isEditing} value={field.value ?? ''} />
              </FormControl>
               <FormDescription>
                {isEditing ? "O e-mail não pode ser alterado." : "Este e-mail será usado para o login."}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {!isEditing && (
             <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Senha</FormLabel>
                    <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormDescription>
                        A senha deve ter no mínimo 6 caracteres.
                    </FormDescription>
                    <FormMessage />
                    </FormItem>
                )}
            />
        )}
        
        <>
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cargo</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue placeholder="Selecione o cargo do usuário" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="Master">Master</SelectItem>
                            <SelectItem value="Gerente">Gerente</SelectItem>
                            <SelectItem value="Colaborador">Colaborador</SelectItem>
                        </SelectContent>
                    </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {(watchedRole === 'Gerente' || watchedRole === 'Colaborador') && (
              <FormField
                  control={form.control}
                  name="storeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Loja</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                <SelectValue placeholder="Selecione a loja de acesso" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {stores.map(store => (
                                    <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            )}
        </>
        
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
             {form.formState.isSubmitting ? 'Salvando...' : (isEditing ? 'Salvar Alterações' : 'Criar Usuário')}
        </Button>
      </form>
    </Form>
  )
}
