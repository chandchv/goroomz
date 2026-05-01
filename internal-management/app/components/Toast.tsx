/**
 * Toast Component
 * 
 * Displays toast notifications using Radix UI Toast
 */

import * as ToastPrimitive from '@radix-ui/react-toast';
import type { Toast as ToastType } from '../hooks/useToast';

interface ToastProps {
  toast: ToastType;
  onDismiss: (id: string) => void;
}

export function Toast({ toast, onDismiss }: ToastProps) {
  const typeStyles = {
    info: 'bg-blue-600 text-white',
    success: 'bg-green-600 text-white',
    warning: 'bg-yellow-600 text-white',
    error: 'bg-red-600 text-white',
  };

  const style = typeStyles[toast.type || 'info'];

  return (
    <ToastPrimitive.Root
      className={`${style} rounded-lg shadow-lg p-4 flex items-start gap-3 min-w-[300px] max-w-[500px]`}
      onOpenChange={(open) => {
        if (!open) {
          onDismiss(toast.id);
        }
      }}
    >
      <div className="flex-1">
        <ToastPrimitive.Title className="font-semibold text-sm mb-1">
          {toast.title}
        </ToastPrimitive.Title>
        {toast.description && (
          <ToastPrimitive.Description className="text-sm opacity-90">
            {toast.description}
          </ToastPrimitive.Description>
        )}
      </div>
      <ToastPrimitive.Close
        className="text-white/80 hover:text-white transition-colors"
        aria-label="Close"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 4L4 12M4 4L12 12"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </ToastPrimitive.Close>
    </ToastPrimitive.Root>
  );
}

interface ToastProviderProps {
  children: React.ReactNode;
  toasts: ToastType[];
  onDismiss: (id: string) => void;
}

export function ToastProvider({ children, toasts, onDismiss }: ToastProviderProps) {
  return (
    <ToastPrimitive.Provider swipeDirection="right">
      {children}
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
      <ToastPrimitive.Viewport className="fixed bottom-0 right-0 flex flex-col gap-2 p-6 max-w-[100vw] m-0 list-none z-50" />
    </ToastPrimitive.Provider>
  );
}
