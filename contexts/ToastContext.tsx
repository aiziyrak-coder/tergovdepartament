import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from "react";
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const MAX_TOASTS = 5;
const TOAST_DURATION_MS = 4000;

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    setToasts((prev) => {
      const next = [...prev, { id, message, type }];
      return next.length > MAX_TOASTS ? next.slice(-MAX_TOASTS) : next;
    });

    const existing = timeoutsRef.current.get(id);
    if (existing) clearTimeout(existing);
    const timeoutId = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      timeoutsRef.current.delete(id);
    }, TOAST_DURATION_MS);
    timeoutsRef.current.set(id, timeoutId);
  }, []);

  const removeToast = useCallback((id: string) => {
    const t = timeoutsRef.current.get(id);
    if (t) {
      clearTimeout(t);
      timeoutsRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
        {toasts.map((t) => (
          <div 
            key={t.id} 
            className={`pointer-events-auto min-w-[300px] max-w-md p-4 rounded-xl shadow-2xl border flex items-start gap-3 animate-in slide-in-from-right duration-300 ${
              t.type === 'success' ? 'bg-white border-green-500 text-slate-800' :
              t.type === 'error' ? 'bg-white border-red-500 text-slate-800' :
              t.type === 'warning' ? 'bg-white border-amber-500 text-slate-800' :
              'bg-white border-blue-500 text-slate-800'
            }`}
          >
            <div className={`mt-0.5 ${
               t.type === 'success' ? 'text-green-500' :
               t.type === 'error' ? 'text-red-500' :
               t.type === 'warning' ? 'text-amber-500' : 'text-blue-500'
            }`}>
              {t.type === 'success' && <CheckCircle2 size={20} />}
              {t.type === 'error' && <AlertCircle size={20} />}
              {t.type === 'warning' && <AlertTriangle size={20} />}
              {t.type === 'info' && <Info size={20} />}
            </div>
            <div className="flex-1">
               <h4 className="font-bold text-sm uppercase mb-1">{t.type}</h4>
               <p className="text-sm font-medium text-slate-600 leading-snug">{t.message}</p>
            </div>
            <button type="button" aria-label="Ёпиш" onClick={() => removeToast(t.id)} className="text-slate-400 hover:text-slate-600 p-1 rounded">
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
};
