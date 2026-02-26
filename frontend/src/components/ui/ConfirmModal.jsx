import Button from './Button';
import Modal from './Modal';

export default function ConfirmModal({
  open,
  title,
  message,
  onCancel,
  onConfirm,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'primary',
  loading = false,
  intent = 'neutral',
  confirmIcon = null,
  confirmDisabled = false,
}) {
  const intentStyles = {
    danger: {
      variant: confirmVariant === 'primary' ? 'danger' : confirmVariant,
      destructive: true,
    },
    warning: {
      variant: confirmVariant === 'primary' ? 'blue' : confirmVariant,
      destructive: false,
    },
    neutral: {
      variant: confirmVariant,
      destructive: false,
    },
  }[intent] || { variant: confirmVariant, destructive: false };

  return (
    <Modal
      open={open}
      title={title}
      onClose={onCancel}
      destructive={intentStyles.destructive}
      busy={loading}
      footer={(
        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={onCancel} disabled={loading}> 
            {cancelLabel}
          </Button>
          <Button
            variant={intentStyles.variant}
            loading={loading}
            disabled={confirmDisabled}
            icon={confirmIcon}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      )}
    >
      <p className="text-[14px] text-text-secondary">{message}</p>
    </Modal>
  );
}
