import React, { useEffect, useRef } from "react";
import { AlertTriangle, Trash2, LogOut, Info } from "lucide-react";

export type ConfirmVariant = "danger" | "warning" | "neutral";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  variant?: ConfirmVariant;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const variantConfig: Record<
  ConfirmVariant,
  { icon: typeof AlertTriangle; confirmClass: string; iconClass: string }
> = {
  danger: {
    icon: Trash2,
    confirmClass: "bg-red-600 hover:bg-red-700 text-white border-red-200",
    iconClass: "text-red-600 bg-red-50",
  },
  warning: {
    icon: AlertTriangle,
    confirmClass: "bg-amber-600 hover:bg-amber-700 text-white border-amber-200",
    iconClass: "text-amber-600 bg-amber-50",
  },
  neutral: {
    icon: Info,
    confirmClass: "bg-uzblue hover:bg-blue-600 text-white border-blue-200",
    iconClass: "text-uzblue bg-blue-50",
  },
};

/**
 * Government-grade confirmation dialog. Accessible, focus-trapped, no native confirm().
 */
export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  variant = "neutral",
  loading = false,
  onConfirm,
  onCancel,
}) => {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const config = variantConfig[variant];
  const Icon = config.icon;

  useEffect(() => {
    if (!open) return;
    const prevFocus = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      prevFocus?.focus();
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      aria-describedby="confirm-modal-desc"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-2xl shrink-0 ${config.iconClass}`}>
            <Icon size={24} aria-hidden />
          </div>
          <div className="flex-1 min-w-0">
            <h2 id="confirm-modal-title" className="text-lg font-black text-slate-900 mb-2">
              {title}
            </h2>
            <p id="confirm-modal-desc" className="text-sm text-slate-600 leading-relaxed">
              {message}
            </p>
          </div>
        </div>
        <div className="flex gap-3 mt-6 justify-end">
          <button
            type="button"
            ref={cancelRef}
            onClick={onCancel}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl font-bold text-sm border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-60"
            aria-label={cancelLabel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm border transition-colors disabled:opacity-60 ${config.confirmClass}`}
            aria-label={confirmLabel}
          >
            {loading ? "..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
