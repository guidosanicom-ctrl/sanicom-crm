import { useState } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { useClientesStore } from '../../store/clientesStore';
import { useEquiposStore } from '../../store/equiposStore';
import { useAuthStore } from '../../store/authStore';
import { TIPOS_EVENTO } from '../../utils/constants';

const empty = { titulo: '', tipo: 'Visita comercial', inicio: '', fin: '', clienteId: '', responsable: '', descripcion: '', equipoId: '' };

export default function EventForm({ open, onClose, onSave, initial, defaultDate }) {
  const init = initial || { ...empty, inicio: defaultDate ? `${defaultDate}T09:00` : '', fin: defaultDate ? `${defaultDate}T10:00` : '' };
  const [form, setForm] = useState(init);
  const [errors, setErrors] = useState({});
  const { clientes } = useClientesStore();
  const { equipos } = useEquiposStore();
  const { users } = useAuthStore();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.titulo.trim()) e.titulo = 'Requerido';
    if (!form.inicio) e.inicio = 'Requerido';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave(form);
    onClose();
    setForm(empty);
  };

  const inp = (k, type='text') => ({
    type,
    value: form[k] || '',
    onChange: e => set(k, e.target.value),
    className: `w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${errors[k] ? 'border-red-400' : 'border-gray-200'}`,
  });

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Editar evento' : 'Nuevo evento'} size="md"
      footer={<><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={handleSave}>{initial ? 'Guardar' : 'Crear'}</Button></>}
    >
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Título *</label>
          <input {...inp('titulo')} placeholder="Título del evento" />
          {errors.titulo && <p className="text-xs text-red-500 mt-1">{errors.titulo}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de evento</label>
          <select value={form.tipo} onChange={e => set('tipo', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none">
            {TIPOS_EVENTO.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Inicio *</label>
            <input {...inp('inicio', 'datetime-local')} />
            {errors.inicio && <p className="text-xs text-red-500 mt-1">{errors.inicio}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Fin</label>
            <input {...inp('fin', 'datetime-local')} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Cliente relacionado</label>
          <select value={form.clienteId} onChange={e => set('clienteId', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none">
            <option value="">Sin cliente</option>
            {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Responsable</label>
          <select value={form.responsable} onChange={e => set('responsable', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none">
            <option value="">Selecciona</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Equipo relacionado</label>
          <select value={form.equipoId} onChange={e => set('equipoId', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none">
            <option value="">Ninguno</option>
            {equipos.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Descripción</label>
          <textarea value={form.descripcion} onChange={e => set('descripcion', e.target.value)} rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none resize-none" placeholder="Descripción..." />
        </div>
      </div>
    </Modal>
  );
}
