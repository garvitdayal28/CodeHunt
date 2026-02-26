import { X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useEffect, useId, useRef } from "react";

export default function Modal({
  open,
  title,
  onClose,
  children,
  footer = null,
  maxWidthClass = "max-w-lg",
  closeOnBackdrop = true,
  closeOnEsc = true,
  initialFocusRef,
  destructive = false,
  busy = false,
}) {
  const closeBtnRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    previousFocusRef.current = document.activeElement;
    const focusTarget = initialFocusRef?.current || closeBtnRef.current;
    focusTarget?.focus?.();

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event) => {
      if (event.key === "Escape" && closeOnEsc && !busy) {
        onClose?.();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = originalOverflow;
      if (previousFocusRef.current && previousFocusRef.current.focus) {
        previousFocusRef.current.focus();
      }
    };
  }, [busy, closeOnEsc, initialFocusRef, onClose, open]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            type="button"
            className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
            onClick={closeOnBackdrop && !busy ? onClose : undefined}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", duration: 0.4, bounce: 0.3 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            className={`relative w-full ${maxWidthClass} rounded-2xl border bg-white shadow-xl ${
              destructive ? "border-danger/30" : "border-border"
            } ${busy ? "pointer-events-none" : ""}`}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 id={titleId} className="text-[16px] font-semibold text-ink">
                {title}
              </h3>
              <button
                ref={closeBtnRef}
                type="button"
                onClick={onClose}
                disabled={busy}
                className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-text-secondary hover:bg-surface-sunken"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div id={descriptionId} className="px-5 py-4">
              {children}
            </div>
            {footer && (
              <div className="px-5 py-4 border-t border-border bg-surface-sunken/40 rounded-b-2xl">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
