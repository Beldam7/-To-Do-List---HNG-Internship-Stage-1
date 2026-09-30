import { useEffect, useState, type ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

let toastListeners: ((toast: Toast) => void)[] = [];

export function showToast(message: string, type: ToastType = 'info') {
  const toast: Toast = { id: crypto.randomUUID(), type, message };
  toastListeners.forEach((fn) => fn(toast));
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const listener = (toast: Toast) => {
      setToasts((prev) => [...prev, toast]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, 4000);
    };
    toastListeners.push(listener);
    return () => {
      toastListeners = toastListeners.filter((l) => l !== listener);
    };
  }, []);

  const dismiss = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-full max-w-sm px-4 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'pointer-events-auto flex items-start gap-3 rounded-xl px-4 py-3 shadow-lg border animate-slide-up',
            toast.type === 'success' && 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800',
            toast.type === 'error' && 'bg-white dark:bg-slate-900 border-red-200 dark:border-red-900',
            toast.type === 'info' && 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
          )}
          role="alert"
        >
          {toast.type === 'success' && <CheckCircle2 size={20} className="text-accent-600 shrink-0 mt-0.5" />}
          {toast.type === 'error' && <AlertCircle size={20} className="text-red-600 shrink-0 mt-0.5" />}
          {toast.type === 'info' && <Info size={20} className="text-blue-600 shrink-0 mt-0.5" />}
          <p className="text-sm text-slate-700 dark:text-slate-300 flex-1">{toast.message}</p>
          <button
            onClick={() => dismiss(toast.id)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 shrink-0"
            aria-label="Dismiss"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
