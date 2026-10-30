'use client';

/**
 * @fileOverview Definições de erros customizados para o Firestore.
 * Fornece contexto sobre falhas de segurança para facilitar a depuração.
 */

export type SecurityRuleContext = {
  path: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete' | 'write';
  requestResourceData?: any;
};

export class FirestorePermissionError extends Error {
  context: SecurityRuleContext;

  constructor(context: SecurityRuleContext) {
    super(`Permissão Negada no Firestore: ${context.operation} em ${context.path}`);
    this.name = 'FirestorePermissionError';
    this.context = context;
  }
}
