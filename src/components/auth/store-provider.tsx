
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Store } from '@/lib/types';
import { useAuth } from './auth-provider';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { usePathname, useRouter } from 'next/navigation';

interface StoreContextType {
  currentStore: Store | null;
  setStore: (store: Store) => void;
  loading: boolean;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: ReactNode }) {
  const { user, appUser, loading: authLoading } = useAuth();
  const [currentStore, setCurrentStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }

    if (!user || !appUser) {
      setCurrentStore(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    let q = query(collection(db, 'stores'));

    // If user is not Master and has a storeId, filter by their store
    if (appUser.role !== 'Master' && appUser.storeId) {
      q = query(q, where('__name__', '==', appUser.storeId));
    }
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allStores = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Store));
      
      if (allStores.length === 0 && appUser.role === 'Master') {
        setCurrentStore(null);
        if (pathname !== '/lojas') {
          router.push('/lojas');
        }
      } else if (allStores.length > 0) {
        const storedStoreId = localStorage.getItem('lastStore');
        const foundStoreInList = allStores.find(s => s.id === storedStoreId);

        if (foundStoreInList) {
          setCurrentStore(foundStoreInList);
        } else {
          const firstStore = allStores[0];
          setCurrentStore(firstStore);
          localStorage.setItem('lastStore', firstStore.id);
        }
      } else {
        setCurrentStore(null);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching stores:", error);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [user, appUser, authLoading, pathname, router]);


  const setStore = (store: Store) => {
    setCurrentStore(store);
    localStorage.setItem('lastStore', store.id);
  };

  const isAuthPage = pathname === '/login';
  if (isAuthPage) {
    return <>{children}</>;
  }
  
  const pagesWithoutStore = ['/login', '/lojas', '/usuarios'];
  if ((loading || authLoading) && !pagesWithoutStore.includes(pathname)) {
    return <div className="flex h-screen w-full items-center justify-center">Carregando dados...</div>;
  }
  
  if (!currentStore && !pagesWithoutStore.includes(pathname) && appUser?.role === 'Master') {
     return (
        <div className="flex flex-col h-screen w-full items-center justify-center gap-4">
            <span>Nenhuma loja selecionada. Redirecionando...</span>
        </div>
     );
  }

  return (
    <StoreContext.Provider value={{ currentStore, setStore, loading }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}
