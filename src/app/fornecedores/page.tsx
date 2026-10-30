
'use client';

import * as React from 'react';
import { PlusCircle, Trash2, Pencil } from "lucide-react";
import { collection, onSnapshot, addDoc, query, orderBy, where, doc, deleteDoc, updateDoc } from 'firebase/firestore';

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
import { SupplierForm, type SupplierFormValues } from '@/components/fornecedores/supplier-form';
import { db } from '@/lib/firebase';
import type { Supplier } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useStore } from '@/components/auth/store-provider';

export default function FornecedoresPage() {
  const { toast } = useToast();
  const { currentStore } = useStore();
  const [suppliers, setSuppliers] = React.useState<Supplier[]>([]);
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [editingSupplier, setEditingSupplier] = React.useState<Supplier | null>(null);

  React.useEffect(() => {
    if (!currentStore) return;
    const q = query(collection(db, 'suppliers'), where('storeId', '==', currentStore.id), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const suppliersData: Supplier[] = [];
      querySnapshot.forEach((doc) => {
        suppliersData.push({
          id: doc.id,
          ...doc.data(),
        } as Supplier);
      });
      setSuppliers(suppliersData);
    });

    return () => unsubscribe();
  }, [currentStore]);

  React.useEffect(() => {
    if (!isSheetOpen) {
      setEditingSupplier(null);
    }
  }, [isSheetOpen]);

  const handleFormSubmit = async (data: SupplierFormValues) => {
    if (editingSupplier) {
      await handleUpdateSupplier(editingSupplier.id, data);
    } else {
      await handleAddSupplier(data);
    }
  };

  const handleAddSupplier = async (data: SupplierFormValues) => {
    if (!currentStore) {
        toast({ title: "Erro", description: "Nenhuma loja selecionada.", variant: "destructive" });
        return;
    }
    try {
      await addDoc(collection(db, 'suppliers'), { ...data, storeId: currentStore.id });
      toast({
        title: "Fornecedor Adicionado!",
        description: `O fornecedor "${data.name}" foi salvo com sucesso.`,
      });
      setIsSheetOpen(false);
    } catch (error) {
      console.error("Error adding document: ", error);
      toast({
        title: "Erro ao salvar!",
        description: "Não foi possível salvar o fornecedor. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateSupplier = async (id: string, data: SupplierFormValues) => {
    const supplierRef = doc(db, 'suppliers', id);
    try {
      await updateDoc(supplierRef, data as any);
      toast({
        title: "Fornecedor Atualizado!",
        description: "Os dados do fornecedor foram atualizados.",
      });
      setIsSheetOpen(false);
    } catch (error) {
      console.error("Error updating document: ", error);
      toast({
        title: "Erro ao atualizar!",
        description: "Não foi possível atualizar o fornecedor.",
        variant: "destructive",
      });
    }
  };
  
  const handleDeleteSupplier = async (supplierId: string) => {
    try {
      await deleteDoc(doc(db, 'suppliers', supplierId));
      toast({
        title: 'Fornecedor Excluído!',
        description: 'O fornecedor foi removido com sucesso.',
      });
    } catch (error) {
      console.error('Error deleting supplier: ', error);
      toast({
        title: 'Erro ao excluir!',
        description: 'Não foi possível remover o fornecedor. Verifique se ele não está associado a nenhuma compra.',
        variant: 'destructive',
      });
    }
  };

  const handleEditClick = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setIsSheetOpen(true);
  };
  
  const handleAddNewClick = () => {
    setEditingSupplier(null);
    setIsSheetOpen(true);
  };


  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Fornecedores"
        description="Gerencie seus parceiros de negócio e informações de contato."
      >
        <Button onClick={handleAddNewClick}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Novo Fornecedor
        </Button>
      </PageHeader>
      
       <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>{editingSupplier ? 'Editar Fornecedor' : 'Adicionar Novo Fornecedor'}</SheetTitle>
              <SheetDescription>
                {editingSupplier ? 'Altere os dados do fornecedor.' : 'Preencha os detalhes do novo fornecedor.'}
              </SheetDescription>
            </SheetHeader>
            <div className="py-4">
              <SupplierForm 
                key={editingSupplier?.id ?? 'new'}
                onFormSubmit={handleFormSubmit}
                initialData={editingSupplier}
              />
            </div>
          </SheetContent>
        </Sheet>


      <Card>
        <CardHeader>
          <CardTitle>Lista de Fornecedores</CardTitle>
          <CardDescription>
            Aqui estão todos os fornecedores cadastrados no sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome do Fornecedor</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead className="text-center w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell className="font-medium">{supplier.name}</TableCell>
                  <TableCell>{supplier.contactInfo}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center items-center">
                      <Button variant="ghost" size="icon" onClick={() => handleEditClick(supplier)}>
                          <Pencil className="h-4 w-4" />
                          <span className="sr-only">Editar Fornecedor</span>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10">
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Excluir Fornecedor</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Você tem certeza absoluta?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Essa ação não pode ser desfeita. Isso excluirá permanentemente o fornecedor <span className="font-bold">{supplier.name}</span>.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteSupplier(supplier.id)}>
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
