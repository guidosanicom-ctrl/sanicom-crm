import { useState, useEffect } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import ClienteSearchInput from '../../components/ui/ClienteSearchInput';
import { useClientesStore } from '../../store/clientesStore';
import { useAuthStore } from '../../store/authStore';
import { TIPOS_EVENTO } from '../../utils/constants';

const empty = { titulo: '', tipo: 'Visita comercial', inicio: '', fin: '', clienteId: '', responsable: '', descripcion: '', equipoNombre: '', compartidoCon: [] };

function buildDefault(initial, defaultDate, defaultHour) {
  if (initial) return initial;
  const hora = defaultHour || '09:00';
  const [h, m] = hora.split(':').map(Number);
  const finH = String(h + 1).padStart(2, '0');
  const fin = `${finH}:${String(m).padStart(2, '0')}`;
  return {
    ...empty,
    inicio: defaultDate ? `${defaultDate}T${hora}` : '',
    fin:    defaultDate ? `${defaultDate}T${fin}`  : '',
  };
}

export default function EventForm({ open, onClose, onSave, initial, defaultDate, defaultHour }) {
  const [form, setForm] = useState(() => buildDefault(initial, defaultDate, defaultHour));
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      setForm(buildDefault(initial, defaultDate, defaultHour));
      setErrors({});
    }
  }, [open, initial, defaultDate, defaultHour]);
  const { clientes: todosClientes } = useClientesStore();
  const { users, user, isCarlos, CARLOS_ESPECIALIDADES } = useAuthStore();
  const clientes = isCarlos() ? todosClientes.filter(c => CARLOS_ESPECIALIDADES.includes(c.especialidad)) : todosClientes;

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.titulo.trim()) e.titulo = 'Requerido';
    if (!form.inicio) e.inicio = 'Requerido';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const toggleCompartir = (uid) => {
    const list = form.compartidoCon || [];
    set('compartidoCon', list.includes(uid) ? list.filter(x => x !== uid) : [...list, uid]);
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({ ...form, creadoPor: form.creadoPor || user?.id });
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
          <ClienteSearchInput
            value={form.clienteId}
            onChange={id => set('clienteId', id)}
            clientes={clientes}
            placeholder="Buscar cliente (opcional)..."
          />
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
          <input type="text" value={form.equipoNombre || ''} onChange={e => set('equipoNombre', e.target.value)} placeholder="Nombre del equipo (opcional)" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Descripción</label>
          <textarea value={form.descripcion} onChange={e => set('descripcion', e.target.value)} rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none resize-none" placeholder="Descripción..." />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-2">👥 Compartir con</label>
          <div className="flex flex-wrap gap-2">
            {users.filter(u => u.id !== (form.responsable || user?.id)).map(u => {
              const checked = (form.compartidoCon || []).includes(u.id);
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => toggleCompartir(u.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                    checked
                      ? 'bg-blue-100 border-blue-300 text-blue-800'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'
                  }`}
                >
                  {checked ? '✓ ' : ''}{u.name.split(' ')[0]}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
}
