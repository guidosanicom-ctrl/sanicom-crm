import { useState, useEffect } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import ClienteSearchInput from '../../components/ui/ClienteSearchInput';
import { useClientesStore } from '../../store/clientesStore';
import { useAuthStore } from '../../store/authStore';
import { TIPOS_SERVICIO, PRIORIDADES_SERVICIO, ESTADOS_SERVICIO } from '../../utils/constants';

const empty = { clienteId: '', equipoNombre: '', tipo: 'Mantenimiento preventivo', prioridad: 'Normal', fechaProgramada: '', tecnico: '', descripcion: '', nSerie: '', resultado: '', estado: 'Pendiente', confirmacionCliente: false };

export default function ServicioForm({ open, onClose, onSave, initial }) {
  const [form, setForm] = useState(initial || empty);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      setForm(initial || empty);
      setErrors({});
    }
  }, [open, initial]);

  const { clientes: todosClientes } = useClientesStore();
  const { users, isCarlos, CARLOS_ESPECIALIDADES } = useAuthStore();
  const clientes = isCarlos() ? todosClientes.filter(c => CARLOS_ESPECIALIDADES.includes(c.especialidad)) : todosClientes;

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.clienteId) e.clienteId = 'Requerido';
    if (!form.equipoNombre) e.equipoNombre = 'Requerido';
    if (!form.fechaProgramada) e.fechaProgramada = 'Requerido';
    if (!form.tecnico) e.tecnico = 'Requerido';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave(form);
    onClose();
    setForm(empty);
  };

  const err = (k) => errors[k] ? 'border-red-400' : 'border-gray-200';

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Editar orden de servicio' : 'Nueva orden de servicio'} size="lg"
      footer={<><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={handleSave}>{initial ? 'Guardar' : 'Crear'}</Button></>}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Cliente *</label>
          <ClienteSearchInput
            value={form.clienteId}
            onChange={id => set('clienteId', id)}
            clientes={clientes}
            error={!!errors.clienteId}
            placeholder="Buscar cliente..."
          />
          {errors.clienteId && <p className="text-xs text-red-500 mt-1">{errors.clienteId}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Equipo *</label>
          <input type="text" value={form.equipoNombre || ''} onChange={e => set('equipoNombre', e.target.value)} placeholder="Nombre del equipo" className={`w-full px-3 py-2 border ${err('equipoNombre')} rounded-lg text-sm focus:outline-none`} />
          {errors.equipoNombre && <p className="text-xs text-red-500 mt-1">{errors.equipoNombre}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de servicio *</label>
          <select value={form.tipo} onChange={e => set('tipo', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none">
            {TIPOS_SERVICIO.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Prioridad *</label>
          <select value={form.prioridad} onChange={e => set('prioridad', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none">
            {PRIORIDADES_SERVICIO.map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Fecha programada *</label>
          <input type="date" value={form.fechaProgramada} onChange={e => set('fechaProgramada', e.target.value)} className={`w-full px-3 py-2 border ${err('fechaProgramada')} rounded-lg text-sm focus:outline-none`} />
          {errors.fechaProgramada && <p className="text-xs text-red-500 mt-1">{errors.fechaProgramada}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Técnico *</label>
          <select value={form.tecnico} onChange={e => set('tecnico', e.target.value)} className={`w-full px-3 py-2 border ${err('tecnico')} rounded-lg text-sm focus:outline-none`}>
            <option value="">Selecciona técnico</option>
            {users.filter(u => u.email === 'guidorosso@sanicom.es').map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          {errors.tecnico && <p className="text-xs text-red-500 mt-1">{errors.tecnico}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Estado</label>
          <select value={form.estado} onChange={e => set('estado', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none">
            {ESTADOS_SERVICIO.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Nº de serie</label>
          <input type="text" value={form.nSerie} onChange={e => set('nSerie', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none" placeholder="SN-000000" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Descripción del problema</label>
          <textarea value={form.descripcion} onChange={e => set('descripcion', e.target.value)} rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none resize-none" placeholder="Descripción..." />
        </div>
        {form.estado === 'Completada' && (
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Resultado final</label>
            <textarea value={form.resultado} onChange={e => set('resultado', e.target.value)} rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none resize-none" placeholder="Resultado..." />
          </div>
        )}
        <div className="md:col-span-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.confirmacionCliente} onChange={e => set('confirmacionCliente', e.target.checked)} />
            <span className="text-sm text-gray-700">Confirmación del cliente recibida</span>
          </label>
        </div>
      </div>
    </Modal>
  );
}
