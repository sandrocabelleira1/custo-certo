'use client';

import * as React from 'react';
import { doc, getDoc, addDoc, collection, Timestamp } from 'firebase/firestore';
import { notFound, useParams, useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Check, ChevronLeft, Image as ImageIcon, Pilcrow, Hash, Loader2, Camera } from 'lucide-react';
import Link from 'next/link';

import { db } from '@/lib/firebase';
import type { Checklist, ChecklistExecution, ChecklistExecutionItem } from '@/lib/types';
import PageHeader from '@/components/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/auth/auth-provider';
import { useStore } from '@/components/auth/store-provider';

const executionItemSchema = z.object({
  itemId: z.string(),
  description: z.string(),
  type: z.enum(['checkbox', 'text', 'number', 'photo']),
  answer: z.any(),
});

const executionFormSchema = z.object({
  items: z.array(executionItemSchema),
});

type ExecutionFormValues = z.infer<typeof executionFormSchema>;


export default function ExecutarChecklistPage() {
    const params = useParams();
    const router = useRouter();
    const { id } = params;
    const { toast } = useToast();
    const { user, appUser } = useAuth();
    const { currentStore } = useStore();
    const [checklist, setChecklist] = React.useState<Checklist | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isSubmitting, setIsSubmitting] = React.useState(false);


    const form = useForm<ExecutionFormValues>({
        resolver: zodResolver(executionFormSchema),
        defaultValues: {
            items: [],
        },
    });
    
    const { fields } = useFieldArray({
        control: form.control,
        name: "items",
    });

    React.useEffect(() => {
        const fetchChecklist = async () => {
            if (typeof id !== 'string') {
                notFound();
                return;
            }
            try {
                const docRef = doc(db, 'checklists', id);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = { id: docSnap.id, ...docSnap.data() } as Checklist;
                    setChecklist(data);
                    // Populate form with checklist items
                    form.reset({ 
                        items: data.items.map((item, index) => ({
                            itemId: `item-${index}`,
                            description: item.description,
                            type: item.type,
                            answer: item.type === 'checkbox' ? false : '',
                        })) 
                    });
                } else {
                    notFound();
                }
            } catch (error) {
                console.error("Error fetching checklist:", error);
                notFound();
            } finally {
                setIsLoading(false);
            }
        };

        fetchChecklist();
    }, [id, form]);

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-10 w-1/4" />
                <Skeleton className="h-8 w-1/2" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    if (!checklist) {
        return null; // or a not found component
    }
    
    const onSubmit = async (data: ExecutionFormValues) => {
       if (!user || !appUser || !currentStore) {
            toast({
                title: "Erro de Autenticação",
                description: "Usuário ou loja não identificados. Faça login novamente.",
                variant: "destructive"
            });
            return;
        }
        setIsSubmitting(true);

        // Process answers avoiding undefined values for Firestore
        const processedAnswers = data.items.map(item => {
            const result: any = {
                itemId: item.itemId,
                description: item.description,
                type: item.type,
                answer: item.answer ?? "" // Never undefined
            };
            
            // Photo handling
            if (item.type === 'photo') {
                result.photoUrl = item.answer ? 'upload_pendente' : '';
            }
            
            return result;
        });

        const executionData = {
            checklistId: checklist.id,
            checklistName: checklist.name,
            executionDate: Timestamp.now(),
            completedByUserId: user.uid,
            completedByUserName: appUser.displayName || user.displayName || 'Usuário',
            storeId: currentStore.id,
            status: 'Completo',
            answers: processedAnswers,
        };

        try {
            await addDoc(collection(db, "checklistExecutions"), executionData);
            toast({
                title: "Checklist Finalizado!",
                description: `O checklist "${checklist.name}" foi salvo com sucesso.`,
            });
            router.push('/checklists');
        } catch (error) {
             console.error("Error saving execution:", error);
             toast({
                title: "Erro ao Salvar",
                description: "Não foi possível salvar a execução do checklist.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const getItemIcon = (type: string) => {
        switch(type) {
            case 'checkbox': return <Check className="h-5 w-5 text-muted-foreground" />;
            case 'text': return <Pilcrow className="h-5 w-5 text-muted-foreground" />;
            case 'number': return <Hash className="h-5 w-5 text-muted-foreground" />;
            case 'photo': return <Camera className="h-5 w-5 text-muted-foreground" />;
            default: return null;
        }
    }

    return (
        <div className="flex flex-col gap-6">
             <PageHeader title={checklist.name}>
                 <Link href="/checklists" className={cn(buttonVariants({ variant: "outline" }))}>
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Voltar para Modelos
                 </Link>
             </PageHeader>
             
             <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <Card>
                        <CardHeader>
                            <CardTitle>Execução de Checklist</CardTitle>
                            <CardDescription>{checklist.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                           {fields.map((field, index) => (
                               <div key={field.id} className="p-4 border rounded-lg grid md:grid-cols-2 gap-4 items-center">
                                    <div className="flex items-start gap-3">
                                       {getItemIcon(field.type)}
                                        <label className="font-medium flex-1">
                                            {field.description}
                                        </label>
                                    </div>
                                    <FormField
                                        control={form.control}
                                        name={`items.${index}.answer`}
                                        render={({ field: formField }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <div>
                                                        {field.type === 'checkbox' && (
                                                            <div className="flex items-center space-x-2">
                                                                <Checkbox 
                                                                    id={`item-${index}`}
                                                                    checked={formField.value} 
                                                                    onCheckedChange={formField.onChange}
                                                                />
                                                                <label htmlFor={`item-${index}`} className="font-normal cursor-pointer">Concluído</label>
                                                            </div>
                                                        )}
                                                        {field.type === 'text' && <Textarea {...formField} placeholder="Digite sua observação..." />}
                                                        {field.type === 'number' && <Input type="number" {...formField} placeholder="Digite um valor..." />}
                                                        {field.type === 'photo' && (
                                                            <div className="grid gap-2">
                                                                <Input 
                                                                    type="file" 
                                                                    accept="image/*" 
                                                                    capture="environment" 
                                                                    className="h-auto"
                                                                    onChange={(e) => {
                                                                        const file = e.target.files?.[0];
                                                                        formField.onChange(file ? file.name : '');
                                                                    }}
                                                                />
                                                                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                                    <Camera className="h-3 w-3" />
                                                                    Apenas fotos tiradas na hora são permitidas.
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                               </div>
                           ))}
                        </CardContent>
                        <CardFooter className="border-t pt-6">
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isSubmitting ? 'Finalizando...' : 'Finalizar Execução'}
                            </Button>
                        </CardFooter>
                    </Card>
                </form>
            </Form>
        </div>
    );
}
