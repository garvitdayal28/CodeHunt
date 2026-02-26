/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertCircle, CheckCircle2, Info, X, AlertTriangle } from "lucide-react";

const ToastContext = createContext(null);

const TYPE_CONFIG = {
  success: {
    icon: CheckCircle2,
    border: "border-success/25",
    bg: "bg-success-soft",
    text: "text-success",
  },
  error: {
    icon: AlertCircle,
    border: "border-danger/25",
    bg: "bg-danger-soft",
    text: "text-danger",
  },
  warning: {
    icon: AlertTriangle,
    border: "border-warning/30",
    bg: "bg-warning-soft",
    text: "text-warning",
  },
  info: {
    icon: Info,
    border: "border-info/25",
    bg: "bg-info-soft",
    text: "text-info",
  },
};

function ToastItem({ toast, onDismiss }) {
  const config = TYPE_CONFIG[toast.type] || TYPE_CONFIG.info;
  const Icon = config.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      transition={{ duration: 0.18 }}
      role="status"
      aria-live={toast.type === "error" ? "assertive" : "polite"}
      className={`pointer-events-auto w-full rounded-xl border shadow-sm ${config.border} bg-white`}
    >
      <div className="flex items-start gap-3 p-3.5">
        <div className={`mt-0.5 rounded-full p-1 ${config.bg}`}>
          <Icon className={`h-4 w-4 ${config.text}`} />
        </div>
        <div className="min-w-0 flex-1">
          {toast.title && (
            <p className="text-[13px] font-semibold text-ink truncate">{toast.title}</p>
          )}
          {toast.message && (
            <p className="text-[13px] text-text-secondary mt-0.5 break-words">
              {toast.message}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-sunken"
          aria-label="Dismiss notification"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timeoutRef = useRef(new Map());

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
    const timer = timeoutRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timeoutRef.current.delete(id);
    }
  }, []);

  const showToast = useCallback(
    ({ type = "info", title = "", message = "", duration = 3000 } = {}) => {
      const id =
        (typeof crypto !== "undefined" && crypto.randomUUID && crypto.randomUUID()) ||
        `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      setToasts((prev) => [{ id, type, title, message }, ...prev].slice(0, 4));

      if (duration > 0) {
        const timer = setTimeout(() => dismissToast(id), duration);
        timeoutRef.current.set(id, timer);
      }

      return id;
    },
    [dismissToast],
  );

  const value = useMemo(
    () => ({
      showToast,
      dismissToast,
      success: (title, message, duration) =>
        showToast({ type: "success", title, message, duration }),
      error: (title, message, duration) =>
        showToast({ type: "error", title, message, duration }),
      warning: (title, message, duration) =>
        showToast({ type: "warning", title, message, duration }),
      info: (title, message, duration) =>
        showToast({ type: "info", title, message, duration }),
    }),
    [dismissToast, showToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-none fixed inset-x-4 top-4 z-[120] mx-auto flex max-w-md flex-col gap-2 sm:right-4 sm:left-auto sm:mx-0"
      >
        <AnimatePresence initial={false}>
          {toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider.");
  return ctx;
}
