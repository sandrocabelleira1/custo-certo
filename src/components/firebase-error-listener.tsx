'use client';

import * as React from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';

/**
 * @fileOverview Listener central para erros do Firebase.
 * Captura erros emitidos e exibe notificações amigáveis ao usuário.
 */

export function FirebaseErrorListener() {
  const { toast } = useToast();

  React.useEffect(() => {
    const handlePermissionError = (error: FirestorePermissionError) => {
      console.error('Erro de Permissão Detectado:', error.context);
      
      toast({
        variant: 'destructive',
        title: 'Acesso Negado',
        description: `Você não tem permissão para ${error.context.operation} neste item. Verifique seu cargo ou se a loja está correta.`,
      });
    };

    errorEmitter.on('permission-error', handlePermissionError);

    return () => {
      errorEmitter.off('permission-error', handlePermissionError);
    };
  }, [toast]);

  return null;
}
