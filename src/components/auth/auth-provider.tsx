
"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { usePathname, useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import type { AppUser } from '@/lib/types';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  appUser: AppUser | null;
  loading: boolean;
}


const AuthContext = createContext<AuthContextType>({ user: null, appUser: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setAppUser(null);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);
  
  useEffect(() => {
    if (!user) {
        if (appUser) setAppUser(null);
        if (loading) setLoading(false);
        return;
    }

    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
            setAppUser(docSnap.data() as AppUser);
        } else {
            // If user document doesn't exist in Firestore, log them out.
            setAppUser(null);
            signOut(auth);
        }
        setLoading(false);
    }, (error) => {
        console.error("Error fetching user profile:", error);
        setAppUser(null);
        signOut(auth);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);


  useEffect(() => {
    if (loading) return;

    const isAuthPage = pathname === '/login';
    
    const masterPages = ['/usuarios', '/lojas', '/relatorios'];
    const collaboratorPages = ['/ajuste-estoque', '/balanco-estoque', '/etiquetas'];

    if (!user && !isAuthPage) {
      router.push('/login');
    } else if (user && isAuthPage) {
      router.push('/');
    }
    
    if (user && appUser) {
        // Redirect Master users from forbidden pages
        if (appUser.role !== 'Master' && masterPages.includes(pathname)) {
            router.push('/');
        }
        
        // Handle collaborator routing
        if (appUser.role === 'Colaborador') {
            // Redirect from dashboard to their main page
            if (pathname === '/') {
                router.push('/ajuste-estoque');
            }
            // Redirect from any other forbidden page
            else if (!collaboratorPages.includes(pathname)) {
                router.push('/ajuste-estoque');
            }
        }
    }

  }, [user, appUser, loading, router, pathname]);

  if (loading) {
    return <div className="flex h-screen w-full items-center justify-center">Carregando autenticação...</div>;
  }
  
  const isAuthPage = pathname === '/login';
  if (!user && !isAuthPage) {
    return null; 
  }
  
  if (user && isAuthPage) {
    return null; 
  }
  
  if (user && !appUser && !loading) {
      return <div className="flex h-screen w-full items-center justify-center">Aguardando dados do usuário...</div>;
  }

  return (
    <AuthContext.Provider value={{ user, appUser, loading }}>
        {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
