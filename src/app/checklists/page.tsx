
'use client';

import * as React from 'react';
import { PlusCircle, Copy, Loader2 } from "lucide-react";
import { collection, onSnapshot, addDoc, query, where, doc, deleteDoc, updateDoc, orderBy, Timestamp, getDocs, writeBatch } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

import PageHeader from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { useStore } from '@/components/auth/store-provider';
import type { Checklist, ChecklistExecution, Manual, Store } from '@/lib/types';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ChecklistForm, type ChecklistFormValues } from '@/components/checklists/checklist-form';
import { ChecklistCard } from '@/components/checklists/checklist-card';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExecutionHistory } from '@/components/checklists/execution-history';
import { ManualsLibrary } from '@/components/checklists/manuals-library';
import { ManualForm, type ManualFormValues } from '@/components/checklists/manual-form';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


export default function ChecklistsPage() {
  const { toast } = useToast();
  const { currentStore } = useStore();
  const [checklists, setChecklists] = React.useState<Checklist[]>([]);
  const [executions, setExecutions] = React.useState<ChecklistExecution[]>([]);
  const [manuals, setManuals] = React.useState<Manual[]>([]);
  
  const [isChecklistSheetOpen, setIsChecklistSheetOpen] = React.useState(false);
  const [editingChecklist, setEditingChecklist] = React.useState<Checklist | null>(null);

  const [isManualSheetOpen, setIsManualSheetOpen] = React.useState(false);
  const [editingManual, setEditingManual] = React.useState<Manual | null>(null);

  // Import states
  const [allStores, setAllStores] = React.useState<Store[]>([]);
  const [isImportDialogOpen, setIsImportDialogOpen] = React.useState(false);
  const [sourceStoreId, setSourceStoreId] = React.useState<string>("");
  const [isImporting, setIsImporting] = React.useState(false);


  React.useEffect(() => {
    if (!currentStore) return;
    
    // Listener for Checklist Models - Filtered by currentStore
    const qChecklists = query(
        collection(db, 'checklists'), 
        where('storeId', '==', currentStore.id)
    );
    const unsubscribeChecklists = onSnapshot(qChecklists, (querySnapshot) => {
      const data: Checklist[] = [];
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as Checklist);
      });
      data.sort((a, b) => a.name.localeCompare(b.name));
      setChecklists(data);
    });

    // Listener for Checklist Executions - Filtered by currentStore and ordered by date
    const qExecutions = query(
        collection(db, 'checklistExecutions'), 
        where('storeId', '==', currentStore.id),
        orderBy('executionDate', 'desc')
    );
    const unsubscribeExecutions = onSnapshot(qExecutions, (querySnapshot) => {
        const data: ChecklistExecution[] = [];
        querySnapshot.forEach((doc) => {
            data.push({ id: doc.id, ...doc.data()} as ChecklistExecution)
        });
        setExecutions(data);
    }, (error) => {
        console.error("Error fetching executions:", error);
    });
    
    // Listener for Manuals - Filtered by currentStore
    const qManuals = query(
      collection(db, 'manuals'),
      where('storeId', '==', currentStore.id),
      orderBy('createdAt', 'desc')
    );
    const unsubscribeManuals = onSnapshot(qManuals, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Manual));
      setManuals(data);
    });

    // Fetch stores for import
    const qStores = query(collection(db, 'stores'), orderBy('name', 'asc'));
    const unsubscribeStores = onSnapshot(qStores, (snapshot) => {
        const storesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Store));
        setAllStores(storesData);
    });

    return () => {
        unsubscribeChecklists();
        unsubscribeExecutions();
        unsubscribeManuals();
        unsubscribeStores();
    };
  }, [currentStore]);
  
  React.useEffect(() => {
    if (!isChecklistSheetOpen) {
      setEditingChecklist(null);
    }
  }, [isChecklistSheetOpen]);

   React.useEffect(() => {
    if (!isManualSheetOpen) {
      setEditingManual(null);
    }
  }, [isManualSheetOpen]);


  const handleChecklistFormSubmit = async (data: ChecklistFormValues) => {
    if (!currentStore) {
        toast({ title: "Erro", description: "Nenhuma loja selecionada.", variant: "destructive" });
        return;
    }

    const checklistData = {
        ...data,
        storeId: currentStore.id,
    };
    
    try {
        if (editingChecklist) {
            const checklistRef = doc(db, 'checklists', editingChecklist.id);
            await updateDoc(checklistRef, checklistData);
            toast({ title: 'Modelo Atualizado!', description: `O checklist "${data.name}" foi atualizado.` });
        } else {
            await addDoc(collection(db, 'checklists'), checklistData);
            toast({ title: 'Modelo Salvo!', description: `O checklist "${data.name}" foi criado com sucesso.` });
        }
        setIsChecklistSheetOpen(false);
    } catch (error) {
        console.error("Error saving checklist:", error);
        toast({ title: "Erro ao Salvar", description: "Não foi possível salvar o modelo de checklist.", variant: "destructive"});
    }
  };

  const handleManualFormSubmit = async (data: ManualFormValues) => {
    if (!currentStore) {
        toast({ title: "Erro", description: "Nenhuma loja selecionada.", variant: "destructive" });
        return;
    }

    try {
        let manualData: Partial<Manual> = {
            topic: data.topic,
            storeId: currentStore.id,
        };

        // Handle file upload if a file is provided
        if (data.file) {
            const storage = getStorage();
            const storageRef = ref(storage, `manuals/${currentStore.id}/${data.file.name}`);
            const snapshot = await uploadBytes(storageRef, data.file);
            const downloadURL = await getDownloadURL(snapshot.ref);
            
            manualData.fileUrl = downloadURL;
            manualData.fileType = data.file.type;
            manualData.content = undefined; 
        } else {
            manualData.content = data.content;
            manualData.fileUrl = undefined;
            manualData.fileType = undefined;
        }

        if (editingManual) {
            manualData.createdAt = editingManual.createdAt; 
            const manualRef = doc(db, 'manuals', editingManual.id);
            await updateDoc(manualRef, manualData);
            toast({ title: 'Manual Atualizado!', description: `O manual "${data.topic}" foi atualizado.` });
        } else {
            manualData.createdAt = Timestamp.now();
            await addDoc(collection(db, 'manuals'), manualData);
            toast({ title: 'Manual Salvo!', description: `O manual "${data.topic}" foi salvo na biblioteca.` });
        }
        setIsManualSheetOpen(false);
    } catch (error) {
        console.error("Error saving manual:", error);
        toast({ title: "Erro ao Salvar", description: "Não foi possível salvar o manual.", variant: "destructive"});
    }
};


  const handleEditChecklist = (checklist: Checklist) => {
    setEditingChecklist(checklist);
    setIsChecklistSheetOpen(true);
  }

  const handleEditManual = (manual: Manual) => {
    setEditingManual(manual);
    setIsManualSheetOpen(true);
  };
  
  const handleDeleteChecklist = async (checklistId: string) => {
    try {
      await deleteDoc(doc(db, 'checklists', checklistId));
      toast({
        title: 'Modelo Excluído!',
        description: 'O modelo de checklist foi removido com sucesso.',
      });
    } catch (error) {
      console.error('Error deleting checklist: ', error);
      toast({
        title: 'Erro ao excluir!',
        description: 'Não foi possível remover o modelo de checklist.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteManual = async (manualId: string) => {
    try {
      await deleteDoc(doc(db, 'manuals', manualId));
      toast({ title: 'Manual Excluído!', description: 'O manual foi removido da biblioteca.' });
    } catch (error) {
      console.error('Error deleting manual: ', error);
      toast({ title: 'Erro ao excluir!', description: 'Não foi possível remover the manual.', variant: 'destructive' });
    }
  };

  const handleImportChecklistsAndManuals = async () => {
    if (!currentStore || !sourceStoreId) return;
    
    setIsImporting(true);
    try {
        const batch = writeBatch(db);
        let count = 0;

        // 1. Import Checklists
        const sourceChecklistsQuery = query(collection(db, 'checklists'), where('storeId', '==', sourceStoreId));
        const sourceChecklistsSnap = await getDocs(sourceChecklistsQuery);
        
        const existingChecklistNames = new Set(checklists.map(c => c.name.toLowerCase()));

        sourceChecklistsSnap.forEach((docSnap) => {
            const data = docSnap.data() as Checklist;
            if (!existingChecklistNames.has(data.name.toLowerCase())) {
                const newRef = doc(collection(db, 'checklists'));
                batch.set(newRef, {
                    ...data,
                    storeId: currentStore.id,
                });
                count++;
            }
        });

        // 2. Import Manuals
        const sourceManualsQuery = query(collection(db, 'manuals'), where('storeId', '==', sourceStoreId));
        const sourceManualsSnap = await getDocs(sourceManualsQuery);
        
        const existingManualTopics = new Set(manuals.map(m => m.topic.toLowerCase()));

        sourceManualsSnap.forEach((docSnap) => {
            const data = docSnap.data() as Manual;
            if (!existingManualTopics.has(data.topic.toLowerCase())) {
                const newRef = doc(collection(db, 'manuals'));
                batch.set(newRef, {
                    ...data,
                    storeId: currentStore.id,
                    createdAt: Timestamp.now()
                });
                count++;
            }
        });

        if (count > 0) {
            await batch.commit();
            toast({
                title: "Importação Concluída!",
                description: `${count} itens (checklists/manuais) foram importados para a loja "${currentStore.name}".`,
            });
        } else {
            toast({
                title: "Nenhum item novo",
                description: "Todos os modelos e manuais da loja selecionada já existem nesta unidade.",
            });
        }
        setIsImportDialogOpen(false);
        setSourceStoreId("");
    } catch (error) {
        console.error("Error importing checklists/manuals:", error);
        toast({
            title: "Erro ao importar",
            description: "Não foi possível completar a cópia dos dados.",
            variant: "destructive"
        });
    } finally {
        setIsImporting(false);
    }
  };


  return (
    <div className="flex flex-col gap-6">
       <PageHeader
        title="Checklists e POPs"
        description="Crie modelos de checklist, execute-os e gerencie sua biblioteca de manuais e POPs."
      >
        <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
                <Copy className="mr-2 h-4 w-4" />
                Importar de Outra Loja
            </Button>
            <Button onClick={() => setIsChecklistSheetOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Novo Modelo
            </Button>
        </div>
      </PageHeader>

      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Importar Checklists e POPs</DialogTitle>
                <DialogDescription>
                    Selecione uma loja de origem para copiar os modelos de checklist e a biblioteca de manuais para a loja atual ({currentStore?.name}). Apenas itens que ainda não existem aqui serão adicionados.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <Select value={sourceStoreId} onValueChange={setSourceStoreId}>
                    <SelectTrigger>
                        <SelectValue placeholder="Selecione a loja de origem" />
                    </SelectTrigger>
                    <SelectContent>
                        {allStores
                            .filter(s => s.id !== currentStore?.id)
                            .map(store => (
                                <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>
                            ))
                        }
                    </SelectContent>
                </Select>
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={() => setIsImportDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleImportChecklistsAndManuals} disabled={!sourceStoreId || isImporting}>
                    {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Copy className="mr-2 h-4 w-4" />}
                    Confirmar Importação
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Sheet open={isChecklistSheetOpen} onOpenChange={setIsChecklistSheetOpen}>
          <SheetContent className="sm:max-w-2xl w-full overflow-y-auto">
            <SheetHeader>
              <SheetTitle>{editingChecklist ? 'Editar Modelo' : 'Criar Novo Modelo de Checklist'}</SheetTitle>
              <SheetDescription>
                {editingChecklist ? 'Altere os dados do seu modelo.' : 'Crie um novo modelo de checklist para padronizar suas operações.'}
              </SheetDescription>
            </SheetHeader>
            <div className="py-4">
              <ChecklistForm 
                key={editingChecklist?.id ?? 'new-checklist'}
                onSubmit={handleChecklistFormSubmit} 
                initialData={editingChecklist}
              />
            </div>
          </SheetContent>
        </Sheet>
        
        <Sheet open={isManualSheetOpen} onOpenChange={setIsManualSheetOpen}>
          <SheetContent className="sm:max-w-2xl w-full overflow-y-auto">
            <SheetHeader>
              <SheetTitle>{editingManual ? 'Editar Manual' : 'Novo Manual'}</SheetTitle>
              <SheetDescription>
                {editingManual ? 'Altere o conteúdo do seu manual.' : 'Gere um novo manual ou POP com IA, ou faça upload de um arquivo existente.'}
              </SheetDescription>
            </SheetHeader>
            <div className="py-4">
              <ManualForm
                key={editingManual?.id ?? 'new-manual'}
                onSubmit={handleManualFormSubmit}
                initialData={editingManual}
              />
            </div>
          </SheetContent>
        </Sheet>
        
        <Tabs defaultValue="modelos">
            <TabsList className="mb-4">
                <TabsTrigger value="modelos">Modelos de Checklist</TabsTrigger>
                <TabsTrigger value="historico">Histórico de Execuções</TabsTrigger>
                <TabsTrigger value="biblioteca">Biblioteca de Manuais</TabsTrigger>
            </TabsList>
            <TabsContent value="modelos">
                 {checklists.length > 0 ? (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {checklists.map(checklist => (
                            <ChecklistCard 
                                key={checklist.id}
                                checklist={checklist}
                                onEdit={() => handleEditChecklist(checklist)}
                                onDelete={() => handleDeleteChecklist(checklist.id)}
                            />
                        ))}
                    </div>
                    ) : (
                    <Card>
                        <CardContent className="py-12">
                            <div className="text-center text-muted-foreground">
                                <p>Nenhum modelo de checklist encontrado.</p>
                                <p className="text-sm">Clique em "Novo Modelo" para começar.</p>
                            </div>
                        </CardContent>
                    </Card>
                    )}
            </TabsContent>
            <TabsContent value="historico">
                <ExecutionHistory executions={executions} />
            </TabsContent>
            <TabsContent value="biblioteca">
                <ManualsLibrary 
                  manuals={manuals}
                  onNew={() => { setEditingManual(null); setIsManualSheetOpen(true); }}
                  onEdit={handleEditManual}
                  onDelete={handleDeleteManual}
                />
            </TabsContent>
        </Tabs>
    </div>
  );
}
