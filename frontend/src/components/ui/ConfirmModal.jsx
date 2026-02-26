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
}) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onCancel}
      footer={(
        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}> 
            {cancelLabel}
          </Button>
          <Button variant={confirmVariant} loading={loading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      )}
    >
      <p className="text-[14px] text-text-secondary">{message}</p>
    </Modal>
  );
}
