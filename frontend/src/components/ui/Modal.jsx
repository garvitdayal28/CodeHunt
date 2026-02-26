import { X } from 'lucide-react';

export default function Modal({
  open,
  title,
  onClose,
  children,
  footer = null,
  maxWidthClass = 'max-w-lg',
  closeOnBackdrop = true,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
        onClick={closeOnBackdrop ? onClose : undefined}
      />
      <div className={`relative w-full ${maxWidthClass} rounded-2xl border border-border bg-white shadow-xl`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-[16px] font-semibold text-ink">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-text-secondary hover:bg-surface-sunken"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="px-5 py-4 border-t border-border bg-surface-sunken/40 rounded-b-2xl">{footer}</div>}
      </div>
    </div>
  );
}
