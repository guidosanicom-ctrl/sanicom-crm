import { useState, useEffect } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import ClienteSearchInput from '../../components/ui/ClienteSearchInput';
import { useClientesStore } from '../../store/clientesStore';
import { useAuthStore } from '../../store/authStore';
import { ESTADOS_DEMO, RESULTADOS_DEMO, LUGARES_DEMO } from '../../utils/constants';

const empty = { clienteId: '', contactoId: '', equipoNombre: '', responsable: '', fecha: '', hora: '09:00', lugar: 'Cliente', direccion: '', objetivo: '', estado: 'Pendiente', resultado: '', observaciones: '', fechaRecogida: '' };

export default function DemoForm({ open, onClose, onSave, initial }) {
  const [form, setForm] = useState(initial ? { ...empty, ...initial } : empty);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      setForm(initial ? { ...empty, ...initial } : empty);
      setErrors({});
    }
  }, [open, initial]);

  const { clientes: todosClientes } = useClientesStore();
  const { users, isCarlos, CARLOS_ESPECIALIDADES } = useAuthStore();
  const clientes = isCarlos() ? todosClientes.filter(c => CARLOS_ESPECIALIDADES.includes(c.especialidad)) : todosClientes;

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const contactos = clientes.find(c => c.id === form.clienteId)?.contactos || [];

  const validate = () => {
    const e = {};
    if (!form.clienteId) e.clienteId = 'Requerido';
    if (!form.equipoNombre) e.equipoNombre = 'Requerido';
    if (!form.responsable) e.responsable = 'Requerido';
    if (!form.fecha) e.fecha = 'Requerido';
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
    <Modal open={open} onClose={onClose} title={initial ? 'Editar demostración' : 'Nueva demostración'} size="lg"
      footer={<><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={handleSave}>{initial ? 'Guardar' : 'Crear'}</Button></>}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Cliente *</label>
          <ClienteSearchInput
            value={form.clienteId}
            onChange={id => { set('clienteId', id); set('contactoId', ''); }}
            clientes={clientes}
            error={!!errors.clienteId}
            placeholder="Buscar cliente..."
          />
          {errors.clienteId && <p className="text-xs text-red-500 mt-1">{errors.clienteId}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Contacto</label>
          <select value={form.contactoId} onChange={e => set('contactoId', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none" disabled={!form.clienteId}>
            <option value="">Sin contacto específico</option>
            {contactos.map(ct => <option key={ct.id} value={ct.id}>{ct.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Equipo *</label>
          <input {...inp('equipoNombre')} placeholder="Nombre del equipo a demostrar" />
          {errors.equipoNombre && <p className="text-xs text-red-500 mt-1">{errors.equipoNombre}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Responsable *</label>
          <select value={form.responsable} onChange={e => set('responsable', e.target.value)} className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none ${errors.responsable ? 'border-red-400' : 'border-gray-200'}`}>
            <option value="">Selecciona</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          {errors.responsable && <p className="text-xs text-red-500 mt-1">{errors.responsable}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Fecha *</label>
          <input {...inp('fecha', 'date')} />
          {errors.fecha && <p className="text-xs text-red-500 mt-1">{errors.fecha}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Hora</label>
          <input {...inp('hora', 'time')} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Lugar</label>
          <select value={form.lugar} onChange={e => set('lugar', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none">
            {LUGARES_DEMO.map(l => <option key={l}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Estado *</label>
          <select value={form.estado} onChange={e => set('estado', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none">
            {ESTADOS_DEMO.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        {form.lugar === 'Videollamada' && (
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Link videollamada</label>
            <input {...inp('direccion')} placeholder="https://..." />
          </div>
        )}
        {form.estado === 'Realizada' && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Resultado</label>
            <select value={form.resultado} onChange={e => set('resultado', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none">
              <option value="">Sin resultado</option>
              {RESULTADOS_DEMO.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Fecha de recogida</label>
          <input {...inp('fechaRecogida', 'date')} />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Objetivo</label>
          <input {...inp('objetivo')} placeholder="Objetivo de la demostración" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Observaciones</label>
          <textarea value={form.observaciones} onChange={e => set('observaciones', e.target.value)} rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none resize-none" />
        </div>

      </div>
    </Modal>
  );
}
