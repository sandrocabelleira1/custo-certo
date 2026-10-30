'use client';

/**
 * @fileOverview Emissor de eventos global para erros do Firebase.
 * Permite que componentes ou serviços emitam erros que serão capturados por um listener central.
 */

type ErrorCallback = (error: any) => void;

class ErrorEmitter {
  private listeners: { [key: string]: ErrorCallback[] } = {};

  on(event: string, callback: ErrorCallback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  off(event: string, callback: ErrorCallback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  emit(event: string, error: any) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach(callback => callback(error));
  }
}

export const errorEmitter = new ErrorEmitter();
