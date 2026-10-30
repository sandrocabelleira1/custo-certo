
'use client';

import * as React from 'react';
import { Pencil, Trash2, PlusCircle } from "lucide-react";
import { collection, onSnapshot, query, doc, deleteDoc, updateDoc, setDoc, deleteField } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';

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
import { UserForm, type UserFormValues } from '@/components/usuarios/user-form';
import { db } from '@/lib/firebase';
import type { AppUser, Store } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/components/auth/auth-provider';


export default function UsuariosPage() {
  const { toast } = useToast();
  const { appUser } = useAuth();
  const [users, setUsers] = React.useState<AppUser[]>([]);
  const [stores, setStores] = React.useState<Store[]>([]);
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<AppUser | null>(null);

  React.useEffect(() => {
    const qUsers = query(collection(db, 'users'));
    const unsubscribeUsers = onSnapshot(qUsers, (querySnapshot) => {
      const usersData: AppUser[] = [];
      querySnapshot.forEach((doc) => {
        usersData.push({ uid: doc.id, ...doc.data() } as AppUser);
      });
      setUsers(usersData);
    });

    const qStores = query(collection(db, 'stores'));
    const unsubscribeStores = onSnapshot(qStores, (snapshot) => {
        const storesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Store));
        setStores(storesData);
    });


    return () => {
        unsubscribeUsers();
        unsubscribeStores();
    };
  }, []);
  
  React.useEffect(() => {
    if (!isSheetOpen) {
      setEditingUser(null);
    }
  }, [isSheetOpen]);

  const handleFormSubmit = async (data: UserFormValues) => {
    if (editingUser) {
        await handleUpdateUser(editingUser.uid, data);
    } else {
        await handleAddUser(data);
    }
  };
  
 const handleAddUser = async (data: UserFormValues) => {
    if (!data.password) {
        toast({ title: "Erro", description: "A senha é obrigatória.", variant: "destructive" });
        return;
    }
    
    // Auth secundária para criar o usuário
    const secondaryAuth = getAuth();

    try {
        // 1. Criar o usuário no Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, data.email, data.password);
        const newUser = userCredential.user;

        // 2. Salvar o perfil do usuário no Firestore
        const selectedStore = stores.find(s => s.id === data.storeId);
        const userProfile: Omit<AppUser, 'uid'> = {
            email: data.email,
            displayName: data.displayName,
            role: data.role,
            ...( (data.role === 'Gerente' || data.role === 'Colaborador') && { 
                storeId: data.storeId, 
                storeName: selectedStore?.name 
            })
        };
        
        await setDoc(doc(db, "users", newUser.uid), userProfile);
        
        toast({
            title: 'Usuário Criado com Sucesso!',
            description: `O usuário ${data.displayName} foi criado.`,
        });
        handleCloseSheet();

    } catch (error: any) {
        console.error("Erro ao criar usuário:", error);
        let description = "Ocorreu um erro desconhecido.";
        if (error.code === 'auth/email-already-in-use') {
            description = "Este e-mail já está sendo utilizado.";
        } else if (error.code === 'auth/weak-password') {
            description = "A senha é muito fraca. Use pelo menos 6 caracteres.";
        }
        toast({
            title: "Erro ao criar usuário",
            description,
            variant: "destructive",
        });
    }
};


  const handleUpdateUser = async (uid: string, data: UserFormValues) => {
    const userRef = doc(db, 'users', uid);
    try {
        const selectedStore = stores.find(s => s.id === data.storeId);
        const updateData: any = {
            displayName: data.displayName,
            role: data.role,
        };

        if (data.role === 'Master') {
            updateData.storeId = deleteField();
            updateData.storeName = deleteField();
        } else {
            updateData.storeId = data.storeId;
            updateData.storeName = selectedStore?.name;
        }

        await updateDoc(userRef, updateData);
        toast({
            title: "Usuário Atualizado!",
            description: "Os dados do usuário foram atualizados.",
        });
        handleCloseSheet();
    } catch (error) {
        console.error("Error updating user: ", error);
        toast({
            title: "Erro ao atualizar!",
            description: "Não foi possível atualizar o usuário.",
            variant: "destructive",
        });
    }
  };

  const handleDeleteUser = async (uid: string) => {
    if (appUser?.uid === uid) {
      toast({
        title: 'Ação não permitida',
        description: 'Você não pode excluir seu próprio usuário.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await deleteDoc(doc(db, 'users', uid));
      toast({
        title: 'Perfil de Usuário Excluído!',
        description: 'O perfil do usuário foi removido. Para remover o acesso, exclua o usuário no Firebase Console.',
      });
    } catch (error) {
      console.error('Error deleting user profile: ', error);
      toast({
        title: 'Erro ao excluir!',
        description: 'Não foi possível remover o perfil do usuário.',
        variant: 'destructive',
      });
    }
  };
  
  const handleEditClick = (user: AppUser) => {
    setEditingUser(user);
    setIsSheetOpen(true);
  };
  
  const handleAddNewClick = () => {
    setEditingUser(null);
    setIsSheetOpen(true);
  }
  
  const handleCloseSheet = () => {
    setIsSheetOpen(false);
    setEditingUser(null);
  };


  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Usuários"
        description="Gerencie os cargos e permissões dos usuários do sistema."
      >
        <Button onClick={handleAddNewClick}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Novo Usuário
        </Button>
      </PageHeader>

        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>{editingUser ? 'Editar Usuário' : 'Adicionar Novo Usuário'}</SheetTitle>
              <SheetDescription>
                 {editingUser ? 'Altere o cargo e a loja associada a este usuário.' : 'Preencha os dados para criar um novo usuário.'}
              </SheetDescription>
            </SheetHeader>
            <div className="py-4">
              <UserForm 
                key={editingUser?.uid ?? 'new'}
                onSubmit={handleFormSubmit}
                stores={stores}
                initialData={editingUser}
                isEditing={!!editingUser}
                />
            </div>
          </SheetContent>
        </Sheet>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Usuários</CardTitle>
          <CardDescription>
            Aqui estão todos os usuários cadastrados no sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Loja</TableHead>
                <TableHead className="text-center w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.uid}>
                  <TableCell className="font-medium">{user.displayName}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={user.role === 'Master' ? 'default' : 'secondary'}>{user.role || 'Sem cargo'}</Badge>
                  </TableCell>
                  <TableCell>{user.storeName || 'N/A'}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center items-center">
                        <Button variant="ghost" size="icon" onClick={() => handleEditClick(user)}>
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Editar Usuário</span>
                        </Button>
                        <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" disabled={appUser?.uid === user.uid}>
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Excluir Usuário</span>
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Você tem certeza absoluta?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Esta ação removerá o perfil de permissões de <span className="font-bold">{user.displayName}</span>. Para remover completamente o acesso, você também deve excluir o usuário no Firebase Console.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteUser(user.uid)}>
                                Excluir Perfil
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

    

    
