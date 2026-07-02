import { useState, useEffect } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';

const empty = { fechaInicio: '', fechaFin: '', notas: '' };

export default function VacacionesForm({ open, onClose, onSave }) {
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) { setForm(empty); setErrors({}); }
  }, [open]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.fechaInicio) e.fechaInicio = 'Requerido';
    if (!form.fechaFin) e.fechaFin = 'Requerido';
    if (form.fechaInicio && form.fechaFin && form.fechaFin < form.fechaInicio)
      e.fechaFin = 'La fecha de fin debe ser posterior al inicio';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave(form);
    onClose();
  };

  const inp = (k) => ({
    type: 'date',
    value: form[k] || '',
    onChange: e => set(k, e.target.value),
    className: `w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${errors[k] ? 'border-red-400' : 'border-gray-200'}`,
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="🏖️ Añadir vacaciones"
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave}>Guardar</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Fecha de inicio *</label>
          <input {...inp('fechaInicio')} />
          {errors.fechaInicio && <p className="text-xs text-red-500 mt-1">{errors.fechaInicio}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Fecha de fin *</label>
          <input {...inp('fechaFin')} />
          {errors.fechaFin && <p className="text-xs text-red-500 mt-1">{errors.fechaFin}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Notas</label>
          <textarea
            value={form.notas}
            onChange={e => set('notas', e.target.value)}
            rows={2}
            placeholder="Ej. Vacaciones de verano"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none resize-none"
          />
        </div>
      </div>
    </Modal>
  );
}
