import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { AlertTriangle } from 'lucide-react';

export default function ConfirmDialog({ open, onClose, onConfirm, title = '¿Confirmar acción?', message, confirmText = 'Eliminar', variant = 'danger' }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm"
      footer={<>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button variant={variant} onClick={() => { onConfirm(); onClose(); }}>{confirmText}</Button>
      </>}
    >
      <div className="flex gap-4 items-start">
        <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
          <AlertTriangle className="w-5 h-5 text-red-500" />
        </div>
        <p className="text-gray-600 pt-2">{message || '¿Estás seguro de que deseas realizar esta acción? Esta operación no se puede deshacer.'}</p>
      </div>
    </Modal>
  );
}
