
'use client';

import * as React from 'react';
import { PlusCircle, Trash2, Pencil, Loader2 } from "lucide-react";
import { collection, onSnapshot, addDoc, query, doc, deleteDoc, updateDoc } from 'firebase/firestore';

import PageHeader from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { StoreForm, type StoreFormValues } from '@/components/lojas/store-form';
import { db } from '@/lib/firebase';
import type { Store } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/auth/auth-provider';
import { seedIngredientsForStore } from '@/lib/seed-data';

export default function LojasPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [stores, setStores] = React.useState<Store[]>([]);
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [editingStore, setEditingStore] = React.useState<Store | null>(null);
  const [isSeeding, setIsSeeding] = React.useState(false);

  React.useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'stores'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const storesData: Store[] = [];
      querySnapshot.forEach((doc) => {
        storesData.push({
          id: doc.id,
          ...doc.data(),
        } as Store);
      });
      setStores(storesData);
    });

    return () => unsubscribe();
  }, [user]);

  React.useEffect(() => {
    if (!isSheetOpen) {
      setEditingStore(null);
    }
  }, [isSheetOpen]);

  const handleFormSubmit = async (data: StoreFormValues) => {
      if (editingStore) {
        await handleUpdateStore(editingStore.id, data);
      } else {
        await handleAddStore(data);
      }
  };

  const handleAddStore = async (data: StoreFormValues) => {
    if (!user) {
        toast({ title: "Erro", description: "Você precisa estar logado para criar uma loja.", variant: "destructive" });
        return;
    }
    
    setIsSeeding(true);
    try {
      const docRef = await addDoc(collection(db, 'stores'), { name: data.name, location: data.location || null });
      
      // Seed default ingredients for the new store
      await seedIngredientsForStore(docRef.id);

      toast({
        title: "Loja Criada!",
        description: `A loja "${data.name}" foi criada e os insumos padrão foram importados.`,
      });
      setIsSheetOpen(false);
    } catch (error) {
      console.error("Error adding document or seeding: ", error);
      toast({
        title: "Erro ao criar loja!",
        description: "Não foi possível criar a loja ou importar os insumos. Tente novamente.",
        variant: "destructive",
      });
    } finally {
        setIsSeeding(false);
    }
  };
  
  const handleUpdateStore = async (id: string, data: StoreFormValues) => {
      const storeRef = doc(db, 'stores', id);
      try {
        await updateDoc(storeRef, { ...data });
        toast({
            title: "Loja Atualizada!",
            description: "Os dados da loja foram atualizados.",
        });
        setIsSheetOpen(false);
      } catch (error) {
         console.error("Error updating document: ", error);
          toast({
            title: "Erro ao atualizar!",
            description: "Não foi possível atualizar a loja.",
            variant: "destructive",
          });
      }
  };

  const handleDeleteStore = async (storeId: string) => {
    try {
      await deleteDoc(doc(db, 'stores', storeId));
      toast({
        title: 'Loja Excluída!',
        description: 'A loja foi removida com sucesso.',
      });
    } catch (error) {
      console.error('Error deleting store: ', error);
      toast({
        title: 'Erro ao excluir!',
        description: 'Não foi possível remover a loja. Verifique se ela não possui dados associados.',
        variant: 'destructive',
      });
    }
  };
  
  const handleEditClick = (store: Store) => {
    setEditingStore(store);
    setIsSheetOpen(true);
  };


  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Lojas"
        description="Gerencie suas unidades de negócio."
      >
        <Button onClick={() => setIsSheetOpen(true)} disabled={isSeeding}>
            {isSeeding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
            Nova Loja
        </Button>
      </PageHeader>
      
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>{editingStore ? 'Editar Loja' : 'Adicionar Nova Loja'}</SheetTitle>
              <SheetDescription>
                {editingStore ? 'Altere os dados da sua loja.' : 'Ao criar uma nova loja, os insumos padrão serão gerados automaticamente para o estoque desta unidade.'}
              </SheetDescription>
            </SheetHeader>
            <div className="py-4">
              <StoreForm onFormSubmit={handleFormSubmit} initialData={editingStore} />
            </div>
          </SheetContent>
        </Sheet>


      <Card>
        <CardHeader>
          <CardTitle>Lista de Lojas</CardTitle>
          <CardDescription>
            Aqui estão todas as lojas cadastradas no sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome da Loja</TableHead>
                <TableHead>Localização (Clima)</TableHead>
                <TableHead className="text-center w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stores.map((store) => (
                <TableRow key={store.id}>
                  <TableCell className="font-medium">{store.name}</TableCell>
                  <TableCell>{store.location || 'N/A'}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center items-center">
                        <Button variant="ghost" size="icon" onClick={() => handleEditClick(store)}>
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Editar Loja</span>
                        </Button>
                        <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10">
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Excluir Loja</span>
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Você tem certeza absoluta?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Essa ação não pode ser desfeita. Isso excluirá permanentemente a loja <span className="font-bold">{store.name}</span> e todos os seus dados associados.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteStore(store.id)}>
                                Excluir
                            </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                        </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
