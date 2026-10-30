
'use client';

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { PlusCircle, Trash2, Sparkles, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "../ui/separator";
import { Textarea } from "../ui/textarea";
import type { Checklist, ChecklistCategory, ChecklistItemType } from "@/lib/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { generateChecklist } from "@/ai/flows/generate-checklist-flow";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

const checklistItemSchema = z.object({
  description: z.string().min(3, "A descrição do item deve ter pelo menos 3 caracteres."),
  type: z.enum(['checkbox', 'text', 'number', 'photo'], {
    required_error: "O tipo de item é obrigatório.",
  }),
});

const checklistFormSchema = z.object({
  name: z.string().min(3, "O nome do checklist deve ter pelo menos 3 caracteres."),
  description: z.string().optional(),
  category: z.enum(['Abertura', 'Fechamento', 'POPs', 'Limpeza'], {
    required_error: "A categoria é obrigatória.",
  }),
  items: z.array(checklistItemSchema).min(1, "Adicione pelo menos um item ao checklist."),
});

export type ChecklistFormValues = z.infer<typeof checklistFormSchema>;

interface ChecklistFormProps {
    onSubmit: (data: ChecklistFormValues) => Promise<void>;
    initialData?: Checklist | null;
}

const checklistCategories: { value: ChecklistCategory, label: string }[] = [
    { value: 'Abertura', label: 'Abertura de Loja' },
    { value: 'Fechamento', label: 'Fechamento de Loja' },
    { value: 'POPs', label: 'Procedimentos (POPs)' },
    { value: 'Limpeza', label: 'Limpeza e Higienização' },
];

const itemTypes: { value: ChecklistItemType, label: string }[] = [
    { value: 'checkbox', label: 'Caixa de Seleção (Sim/Não)' },
    { value: 'text', label: 'Campo de Texto' },
    { value: 'number', label: 'Campo Numérico' },
    { value: 'photo', label: 'Envio de Foto' },
];

export function ChecklistForm({ onSubmit, initialData }: ChecklistFormProps) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [aiTopic, setAiTopic] = React.useState("");

  const form = useForm<ChecklistFormValues>({
    resolver: zodResolver(checklistFormSchema),
    defaultValues: initialData ? {
      ...initialData,
      items: initialData.items.map(item => ({ description: item.description, type: item.type })),
    } : {
      name: "",
      description: "",
      category: undefined,
      items: [{ description: "", type: "checkbox" }],
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "items",
  });
  
  const watchedCategory = form.watch('category');


  const handleGenerateWithAI = async () => {
    if (!aiTopic) {
        toast({ title: "Tópico necessário", description: "Por favor, descreva o checklist que você quer gerar.", variant: "destructive" });
        return;
    }
    if (!watchedCategory) {
        toast({ title: "Categoria necessária", description: "Por favor, selecione uma categoria antes de gerar com IA.", variant: "destructive" });
        form.setFocus('category');
        return;
    }

    setIsGenerating(true);
    try {
        const result = await generateChecklist({ topic: aiTopic, category: watchedCategory });
        if (result.items.length > 0) {
            replace(result.items.map(item => ({...item}))); // Substitui os itens existentes pelos gerados
            if (!form.getValues('name')) {
              form.setValue('name', aiTopic); // Preenche o nome do checklist se estiver vazio
            }
            toast({ title: "Checklist Gerado!", description: `${result.items.length} itens foram criados pela IA.`});
        } else {
            toast({ title: "Nenhum item gerado", description: "A IA não retornou itens para este tópico. Tente ser mais específico.", variant: "destructive" });
        }
    } catch (error) {
        console.error("Error generating checklist with AI:", error);
        toast({ title: "Erro na IA", description: "Não foi possível gerar o checklist. Tente novamente.", variant: "destructive" });
    } finally {
        setIsGenerating(false);
    }
  };


  async function handleSubmit(data: ChecklistFormValues) {
    await onSubmit(data);
    if (!initialData) {
      form.reset();
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        <div className="grid md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome do Modelo</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Checklist de Abertura da Cozinha" {...field} />
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
                    {checklistCategories.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição (Opcional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Descreva o objetivo deste checklist." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Separator />
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="h-5 w-5 text-primary" />
                Gerar com Inteligência Artificial
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <FormLabel htmlFor="ai-topic">Descreva o checklist que você precisa</FormLabel>
              <Input 
                id="ai-topic"
                placeholder="Ex: POP para recebimento de mercadorias frias"
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
                className="mt-2"
              />
            </div>
             <Button type="button" onClick={handleGenerateWithAI} disabled={isGenerating}>
                {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                {isGenerating ? 'Gerando...' : 'Gerar Itens com IA'}
            </Button>
            <FormDescription>
                A IA irá substituir os itens abaixo pela lista de tarefas gerada.
            </FormDescription>
          </CardContent>
        </Card>

        <div>
          <h3 className="text-lg font-medium mb-4">Itens do Checklist</h3>
          <div className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-1 md:grid-cols-8 gap-2 items-start p-3 rounded-lg border">
                <FormField
                  control={form.control}
                  name={`items.${index}.description`}
                  render={({ field }) => (
                    <FormItem className="md:col-span-4">
                      {index === 0 && <FormLabel>Descrição da Tarefa</FormLabel>}
                      <FormControl>
                        <Input placeholder="Ex: Verificar temperatura da geladeira" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`items.${index}.type`}
                  render={({ field }) => (
                    <FormItem className="md:col-span-3">
                       {index === 0 && <FormLabel>Tipo de Resposta</FormLabel>}
                       <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {itemTypes.map(type => (
                              <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="md:col-span-1 flex items-end h-full pt-1.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:bg-destructive/10 h-10 w-10 mt-auto"
                    onClick={() => remove(index)}
                    disabled={fields.length <= 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => append({ description: "", type: "checkbox" })}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Adicionar Item
            </Button>
          </div>
        </div>

        <Separator />

        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Salvando...' : 'Salvar Modelo'}
        </Button>
      </form>
    </Form>
  );
}
