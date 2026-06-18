import { useState, useEffect } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import ClienteSearchInput from '../../components/ui/ClienteSearchInput';
import { useClientesStore } from '../../store/clientesStore';
import { useAuthStore } from '../../store/authStore';
import { ORIGENES_OPP, REDES_SOCIALES } from '../../utils/constants';
import { usePipelineStore } from '../../store/pipelineStore';

const ESTADOS_CLIENTE = ['Evaluando opciones', 'Esperando aprobación', 'Consultando dirección', 'Silencio', 'Listo para decidir'];
const FINANCIACIONES = ['Propia', 'Financiación bancaria', 'Leasing', 'Subvención', 'Por definir'];
const TEMPERATURAS = [{ value: 'frio', label: '❄️ Frío' }, { value: 'tibio', label: '🌤 Tibio' }, { value: 'caliente', label: '🔥 Caliente' }];

const empty = { nombre: '', clienteId: '', equiposDescripcion: '', valor: '', probabilidad: 50, etapa: 'Prospecto', fechaCierre: '', responsable: '', origen: '', descripcion: '', estadoCliente: '', financiacion: '', temperatura: '', notaSeguimiento: '' };

export default function OportunidadForm({ open, onClose, onSave, initial }) {
  const { etapas: ETAPAS_PIPELINE } = usePipelineStore();
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
    if (!form.nombre.trim()) e.nombre = 'Requerido';
    if (!form.clienteId) e.clienteId = 'Requerido';
    if (!form.valor) e.valor = 'Requerido';
    if (!form.fechaCierre) e.fechaCierre = 'Requerido';
    if (!form.responsable) e.responsable = 'Requerido';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({ ...form, valor: Number(form.valor) });
    onClose();
    setForm(empty);
  };

  const f = (k) => ({
    value: form[k] || '',
    onChange: e => set(k, e.target.value),
    className: `w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${errors[k] ? 'border-red-400' : 'border-gray-200'}`,
  });

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Editar oportunidad' : 'Nueva oportunidad'} size="lg"
      footer={<><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={handleSave}>{initial ? 'Guardar' : 'Crear'}</Button></>}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Nombre *</label>
          <input {...f('nombre')} placeholder="Nombre de la oportunidad" />
          {errors.nombre && <p className="text-xs text-red-500 mt-1">{errors.nombre}</p>}
        </div>
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
          <label className="block text-xs font-medium text-gray-600 mb-1">Etapa *</label>
          <select value={form.etapa} onChange={e => set('etapa', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none">
            {ETAPAS_PIPELINE.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Valor estimado (€) *</label>
          <input type="number" {...f('valor')} placeholder="0" min={0} />
          {errors.valor && <p className="text-xs text-red-500 mt-1">{errors.valor}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Probabilidad: {form.probabilidad}%</label>
          <input type="range" min={0} max={100} value={form.probabilidad} onChange={e => set('probabilidad', Number(e.target.value))} className="w-full mt-2" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Fecha cierre *</label>
          <input type="date" {...f('fechaCierre')} />
          {errors.fechaCierre && <p className="text-xs text-red-500 mt-1">{errors.fechaCierre}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Responsable *</label>
          <select value={form.responsable} onChange={e => set('responsable', e.target.value)} className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none ${errors.responsable ? 'border-red-400' : 'border-gray-200'}`}>
            <option value="">Selecciona responsable</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          {errors.responsable && <p className="text-xs text-red-500 mt-1">{errors.responsable}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Origen</label>
          <select value={form.origen} onChange={e => { set('origen', e.target.value); if (e.target.value !== 'Redes sociales') set('redSocial', ''); }} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none">
            <option value="">Selecciona origen</option>
            {ORIGENES_OPP.map(o => <option key={o}>{o}</option>)}
          </select>
          {form.origen === 'Redes sociales' && (
            <select value={form.redSocial || ''} onChange={e => set('redSocial', e.target.value)} className="w-full mt-2 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none">
              <option value="">¿Cuál red social?</option>
              {REDES_SOCIALES.map(r => <option key={r}>{r}</option>)}
            </select>
          )}
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Equipos de interés</label>
          <input type="text" value={form.equiposDescripcion || ''} onChange={e => set('equiposDescripcion', e.target.value)} placeholder="Ej: Láser CO2, Ultrasonido terapéutico..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Descripción</label>
          <textarea value={form.descripcion} onChange={e => set('descripcion', e.target.value)} rows={2} placeholder="Descripción..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none resize-none" />
        </div>

        {/* Nuevos campos de seguimiento */}
        <div className="md:col-span-2 border-t border-gray-100 pt-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Seguimiento comercial</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">Estado del cliente</label>
              <div className="flex flex-wrap gap-1.5">
                {ESTADOS_CLIENTE.map(op => (
                  <button key={op} type="button" onClick={() => set('estadoCliente', form.estadoCliente === op ? '' : op)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer ${form.estadoCliente === op ? 'bg-[#1B4F8A] text-white border-[#1B4F8A]' : 'border-gray-200 text-gray-600 hover:border-[#1B4F8A]/40'}`}>
                    {op}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">Financiación</label>
              <div className="flex flex-wrap gap-1.5">
                {FINANCIACIONES.map(op => (
                  <button key={op} type="button" onClick={() => set('financiacion', form.financiacion === op ? '' : op)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer ${form.financiacion === op ? 'bg-[#3ABDD5] text-white border-[#3ABDD5]' : 'border-gray-200 text-gray-600 hover:border-[#3ABDD5]/40'}`}>
                    {op}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">Temperatura</label>
              <div className="flex gap-2">
                {TEMPERATURAS.map(t => (
                  <button key={t.value} type="button" onClick={() => set('temperatura', form.temperatura === t.value ? '' : t.value)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all cursor-pointer ${form.temperatura === t.value ? 'bg-gray-800 text-white border-gray-800 scale-105' : 'border-gray-200 text-gray-600 hover:border-gray-400'}`}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nota de seguimiento</label>
              <textarea value={form.notaSeguimiento || ''} onChange={e => set('notaSeguimiento', e.target.value)} rows={2}
                placeholder="Próximo paso, observación clave..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none resize-none" />
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
