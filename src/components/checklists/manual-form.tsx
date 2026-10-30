
'use client';

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Sparkles, Loader2, Download, Upload } from "lucide-react";
import jsPDF from 'jspdf';
import { format } from 'date-fns';

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
import { generateManual } from "@/ai/flows/generate-manual-flow";
import { useToast } from "@/hooks/use-toast";
import type { Manual } from "@/lib/types";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_FILE_TYPES = [
  "application/pdf", 
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/msword" // .doc
];

const manualFormSchema = z.object({
  topic: z.string().min(3, "O tópico deve ter pelo menos 3 caracteres."),
  content: z.string().optional(),
  file: z.any().optional(),
}).refine(data => {
    // Must have either content or a file, but not both.
    return (data.content && data.content.length >= 10 && !data.file) || (data.file && !data.content);
}, {
    message: "Você deve fornecer o conteúdo do texto ou um arquivo, mas não ambos.",
    path: ["content"],
}).refine(data => !data.file || data.file.size <= MAX_FILE_SIZE, {
    message: "O arquivo deve ter no máximo 5MB.",
    path: ["file"],
}).refine(data => !data.file || ACCEPTED_FILE_TYPES.includes(data.file.type), {
    message: "Formato de arquivo inválido. Apenas PDF e DOC/DOCX são aceitos.",
    path: ["file"],
});


export type ManualFormValues = z.infer<typeof manualFormSchema>;

interface ManualFormProps {
    onSubmit: (data: ManualFormValues) => Promise<void>;
    initialData?: Manual | null;
}

export function ManualForm({ onSubmit, initialData }: ManualFormProps) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [aiTopic, setAiTopic] = React.useState(initialData?.topic || "");

  const form = useForm<ManualFormValues>({
    resolver: zodResolver(manualFormSchema),
    defaultValues: {
      topic: initialData?.topic || "",
      content: initialData?.content || "",
      file: undefined,
    },
  });

  const handleGenerateWithAI = async () => {
    if (!aiTopic) {
        toast({ title: "Tópico necessário", description: "Por favor, descreva o manual que você quer gerar.", variant: "destructive" });
        return;
    }

    setIsGenerating(true);
    try {
        const result = await generateManual({ topic: aiTopic });
        if (result.content) {
            form.setValue('topic', aiTopic, { shouldValidate: true });
            form.setValue('content', result.content, { shouldValidate: true });
            form.setValue('file', undefined); // Clear file input if AI generates content
            toast({ title: "Rascunho Gerado!", description: `O rascunho do manual foi criado pela IA.`});
        } else {
            toast({ title: "Nenhum conteúdo gerado", description: "A IA não retornou um resultado. Tente ser mais específico.", variant: "destructive" });
        }
    } catch (error) {
        console.error("Error generating manual with AI:", error);
        toast({ title: "Erro na IA", description: "Não foi possível gerar o manual. Tente novamente.", variant: "destructive" });
    } finally {
        setIsGenerating(false);
    }
  };

  const handleDownloadPdf = () => {
    const topic = form.getValues('topic');
    const content = form.getValues('content');

    if (!topic || !content) {
      toast({ title: "Conteúdo vazio", description: "Preencha o tópico e o conteúdo para baixar.", variant: "destructive" });
      return;
    }
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(topic, 14, 22);
    doc.setFontSize(10);
    doc.text(`Data de Emissão: ${format(new Date(), 'dd/MM/yyyy')}`, 14, 30);
    const splitContent = doc.splitTextToSize(content, 180);
    doc.setFontSize(12);
    doc.text(splitContent, 14, 45);
    const pageCount = doc.internal.pages.length - 1;
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.text(`Página ${i} de ${pageCount}`, doc.internal.pageSize.width - 40, doc.internal.pageSize.height - 10);
    }
    const fileName = `Manual_${topic.replace(/\s+/g, '_')}.pdf`;
    doc.save(fileName);
    toast({ title: "Download Iniciado!", description: `Seu manual "${topic}" está sendo baixado.` });
  };
  
  const isEditingFile = !!initialData?.fileUrl;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
            control={form.control}
            name="topic"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Tópico do Manual</FormLabel>
                <FormControl>
                    <Input placeholder="Título do seu manual ou POP" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
        />
        
        {/* Se não estiver editando um manual que já é um arquivo */}
        {!isEditingFile && (
           <>
                <div className="space-y-4 p-4 border rounded-lg">
                    <h3 className="text-base font-medium">Opção 1: Gerar com Inteligência Artificial</h3>
                    <div>
                    <FormLabel htmlFor="ai-topic">Descreva o tópico do manual ou POP</FormLabel>
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
                        {isGenerating ? 'Gerando...' : 'Gerar Conteúdo com IA'}
                    </Button>
                </div>
                <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Conteúdo do Manual (suporta Markdown)</FormLabel>
                        <FormControl>
                            <Textarea
                                placeholder="O conteúdo do seu manual aparecerá aqui..."
                                className="min-h-[200px] text-sm"
                                {...field}
                                disabled={!!form.watch('file')}
                            />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <Separator />
                 <div className="space-y-4 p-4 border rounded-lg">
                    <h3 className="text-base font-medium">Opção 2: Fazer Upload de Arquivo</h3>
                    <FormField
                        control={form.control}
                        name="file"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Selecione um arquivo (PDF, DOC, DOCX)</FormLabel>
                            <FormControl>
                                <Input 
                                    type="file" 
                                    onChange={(e) => {
                                        field.onChange(e.target.files ? e.target.files[0] : null);
                                        form.setValue('content', ''); // Clear content if file is selected
                                    }}
                                    disabled={!!form.watch('content')}
                                />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                 </div>
           </>
        )}
        
        {/* Se estiver editando um manual que já é um arquivo */}
        {isEditingFile && (
            <div className="p-4 border rounded-lg text-sm">
                <p className="font-medium">Este manual é um arquivo externo.</p>
                <p className="text-muted-foreground">Para alterá-lo, exclua este registro e faça um novo upload.</p>
                <Button asChild variant="outline" className="mt-2">
                    <a href={initialData.fileUrl} target="_blank" rel="noopener noreferrer">
                        <Download className="mr-2 h-4 w-4" />
                        Baixar Arquivo Atual
                    </a>
                </Button>
            </div>
        )}
        

        <Separator />

        <div className="flex justify-between items-center">
            <Button type="submit" disabled={form.formState.isSubmitting || (isEditingFile && !form.formState.dirtyFields.topic)}>
                {form.formState.isSubmitting ? 'Salvando...' : (initialData ? 'Salvar Alterações' : 'Salvar na Biblioteca')}
            </Button>
            {!isEditingFile && (
                <Button type="button" variant="outline" onClick={handleDownloadPdf}>
                    <Download className="mr-2 h-4 w-4" />
                    Baixar PDF do Texto
                </Button>
            )}
        </div>
      </form>
    </Form>
  );
}
