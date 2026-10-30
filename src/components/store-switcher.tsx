
'use client';

import * as React from 'react';
import { Store as StoreIcon, ChevronsUpDown, PlusCircle } from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

import { useStore } from '@/components/auth/store-provider';
import { useAuth } from '@/components/auth/auth-provider';
import { db } from '@/lib/firebase';
import type { Store } from '@/lib/types';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import Link from 'next/link';

export default function StoreSwitcher() {
  const { user } = useAuth();
  const { currentStore, setStore } = useStore();
  const [stores, setStores] = React.useState<Store[]>([]);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'stores'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const storesData: Store[] = [];
      snapshot.forEach((doc) => {
        storesData.push({ id: doc.id, ...doc.data() } as Store);
      });
      setStores(storesData);
      if (!currentStore && storesData.length > 0) {
        const lastStoreId = localStorage.getItem('lastStore');
        const lastStore = storesData.find(s => s.id === lastStoreId);
        setStore(lastStore || storesData[0]);
      }
    });

    return () => unsubscribe();
  }, [user, currentStore, setStore]);

  const handleStoreSelect = (store: Store) => {
    setStore(store);
    localStorage.setItem('lastStore', store.id);
    setOpen(false);
  };

  if (!currentStore) {
    return (
      <div className="group-data-[collapsible=icon]:hidden p-2">
        <p className="text-sm text-muted-foreground p-2 text-center">Nenhuma loja criada.</p>
        <Button asChild variant="secondary" className="w-full">
            <Link href="/lojas">
                <PlusCircle className="mr-2 h-4 w-4" /> Criar Loja
            </Link>
        </Button>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="secondary"
          role="combobox"
          aria-expanded={open}
          aria-label="Selecione uma loja"
          className="w-[200px] justify-between"
        >
          <StoreIcon className="mr-2 hidden group-data-[collapsible=icon]:block h-4 w-4" />
          <span className="truncate group-data-[collapsible=icon]:hidden">{currentStore.name}</span>
          <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50 group-data-[collapsible=icon]:hidden" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandList>
            <CommandInput placeholder="Buscar loja..." />
            <CommandEmpty>Nenhuma loja encontrada.</CommandEmpty>
            <CommandGroup heading="Lojas">
              {stores.map((store) => (
                <CommandItem
                  key={store.id}
                  onSelect={() => handleStoreSelect(store)}
                  className="text-sm"
                >
                  <StoreIcon className="mr-2 h-4 w-4" />
                  {store.name}
                  <Check
                    className={cn(
                      'ml-auto h-4 w-4',
                      currentStore.id === store.id
                        ? 'opacity-100'
                        : 'opacity-0'
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          <CommandSeparator />
          <CommandList>
            <CommandGroup>
                <CommandItem onSelect={() => {
                  setOpen(false);
                  // Workaround to make Link inside CommandItem work
                  document.getElementById('create-store-link')?.click();
                }}>
                    <PlusCircle className="mr-2 h-5 w-5" />
                    Criar Nova Loja
                    <Link href="/lojas" id="create-store-link" className="hidden"/>
                </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
