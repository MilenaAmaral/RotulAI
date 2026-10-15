import { createContext, useContext } from 'react';

export type ToastTone = 'success' | 'error';

export interface ToastContextValue {
  notify: (message: string, tone?: ToastTone) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const value = useContext(ToastContext);
  if (!value) throw new Error('useToast deve ser usado dentro de ToastProvider');
  return value;
}
