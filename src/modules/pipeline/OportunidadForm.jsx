import { useState, useEffect } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import ClienteSearchInput from '../../components/ui/ClienteSearchInput';
import { useClientesStore } from '../../store/clientesStore';
import { useAuthStore } from '../../store/authStore';
import { ORIGENES_OPP, REDES_SOCIALES, etapaLabel } from '../../utils/constants';
import { usePipelineStore } from '../../store/pipelineStore';
import { useCatalogoEquiposStore, SUBCATEGORIA_LIBRE } from '../../store/catalogoEquiposStore';
import { X } from 'lucide-react';

const ESTADOS_CLIENTE = ['Evaluando opciones', 'Esperando aprobación', 'Consultando dirección', 'Silencio', 'Listo para decidir'];
const FINANCIACIONES = ['Propia', 'Financiación bancaria', 'Leasing', 'Subvención', 'Por definir'];
const TEMPERATURAS = [{ value: 'frio', label: '❄️ Frío' }, { value: 'tibio', label: '🌤 Tibio' }, { value: 'caliente', label: '🔥 Caliente' }];
const MOTIVOS_PAUSA = ['Gasto reciente en otro equipo', 'Esperando presupuesto', 'Decisión interna pendiente', 'Problema financiero', 'Competencia', 'Otro'];

function addMonths(months) {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

const empty = { nombre: '', clienteId: '', clienteNombreLibre: '', equiposDescripcion: '', equiposSeleccionados: [], valor: '', probabilidad: 50, etapa: 'Prospecto', fechaCierre: '', responsable: '', corresponsableId: '', origen: '', descripcion: '', estadoCliente: '', financiacion: '', temperatura: '', notaSeguimiento: '', comisionGuidoPct: 10 };

const JULIETA_ID = 'u1';
const ORIGENES_JULIETA = ['Redes sociales', 'Web'];

export default function OportunidadForm({ open, onClose, onSave, initial }) {
  const { etapas: ETAPAS_PIPELINE } = usePipelineStore();
  const { categorias: getCats, subcategorias: getSubs } = useCatalogoEquiposStore();
  const [form, setForm] = useState(initial || empty);
  const [errors, setErrors] = useState({});
  // clienteLibre: true = texto libre, false = buscar existente
  const [clienteLibre, setClienteLibre] = useState(() => !!(initial?.clienteNombreLibre && !initial?.clienteId));
  // selector de equipo pendiente de añadir
  const [equipoPick, setEquipoPick] = useState({ categoria: '', subcategoria: '', otroTexto: '' });

  useEffect(() => {
    if (open) {
      setForm(initial || empty);
      setErrors({});
      setClienteLibre(!!(initial?.clienteNombreLibre && !initial?.clienteId));
      setEquipoPick({ categoria: '', subcategoria: '', otroTexto: '' });
    }
  }, [open, initial]);

  const { clientes: todosClientes } = useClientesStore();
  const { users, isCarlos, isGuido, CARLOS_ESPECIALIDADES } = useAuthStore();
  const clientes = isCarlos() ? todosClientes.filter(c => CARLOS_ESPECIALIDADES.includes(c.especialidad)) : todosClientes;

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.nombre.trim()) e.nombre = 'Requerido';
    if (clienteLibre) {
      if (!form.clienteNombreLibre?.trim()) e.clienteNombreLibre = 'Escribe el nombre del cliente';
    } else {
      if (!form.clienteId) e.clienteId = 'Selecciona un cliente';
    }
    if (!form.valor) e.valor = 'Requerido';
    if (!form.responsable) e.responsable = 'Requerido';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const addEquipo = () => {
    if (!equipoPick.categoria) return;
    const catFinal = equipoPick.categoria === 'Otro' ? equipoPick.otroTexto?.trim() : equipoPick.categoria;
    if (!catFinal) return;
    const subFinal = equipoPick.subcategoria === SUBCATEGORIA_LIBRE
      ? (equipoPick.otroTexto?.trim() || SUBCATEGORIA_LIBRE)
      : equipoPick.subcategoria;
    const label = [catFinal, subFinal].filter(Boolean).join(' — ');
    const ya = (form.equiposSeleccionados || []).some(e => e.label === label);
    if (ya) return;
    const lista = [...(form.equiposSeleccionados || []), { ...equipoPick, label }];
    set('equiposSeleccionados', lista);
    set('equiposDescripcion', lista.map(e => e.label).join(', '));
    setEquipoPick({ categoria: '', subcategoria: '', otroTexto: '' });
  };

  const removeEquipo = (label) => {
    const lista = (form.equiposSeleccionados || []).filter(e => e.label !== label);
    set('equiposSeleccionados', lista);
    set('equiposDescripcion', lista.map(e => e.label).join(', '));
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
          {/* Toggle: existente / libre */}
          <div className="flex gap-1 mb-2 bg-gray-100 p-0.5 rounded-lg w-fit">
            <button type="button"
              onClick={() => { setClienteLibre(false); set('clienteNombreLibre', ''); }}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${!clienteLibre ? 'bg-white text-[#1B4F8A] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              Buscar existente
            </button>
            <button type="button"
              onClick={() => { setClienteLibre(true); set('clienteId', ''); }}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${clienteLibre ? 'bg-white text-[#1B4F8A] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              Sin registrar
            </button>
          </div>
          {clienteLibre ? (
            <input
              type="text"
              value={form.clienteNombreLibre || ''}
              onChange={e => set('clienteNombreLibre', e.target.value)}
              placeholder="Nombre del cliente o clínica..."
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${errors.clienteNombreLibre ? 'border-red-400' : 'border-gray-200'}`}
            />
          ) : (
            <ClienteSearchInput
              value={form.clienteId}
              onChange={id => set('clienteId', id)}
              clientes={clientes}
              error={!!errors.clienteId}
              placeholder="Buscar cliente..."
            />
          )}
          {(errors.clienteId || errors.clienteNombreLibre) && (
            <p className="text-xs text-red-500 mt-1">{errors.clienteId || errors.clienteNombreLibre}</p>
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Etapa *</label>
          <select value={form.etapa} onChange={e => set('etapa', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none">
            {ETAPAS_PIPELINE.map(s => <option key={s} value={s}>{etapaLabel(s)}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Valor estimado (€) *</label>
          <input type="number" {...f('valor')} placeholder="0" min={0} />
          {errors.valor && <p className="text-xs text-red-500 mt-1">{errors.valor}</p>}
        </div>
        {form.etapa === 'Ganado' && form.responsable === 'u4' && isGuido() && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">💰 % Comisión de Guido</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={form.comisionGuidoPct ?? 10}
                onChange={e => set('comisionGuidoPct', parseFloat(e.target.value) || 0)}
                className="w-28 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <span className="text-sm text-gray-500">%</span>
              {form.valor ? (
                <span className="text-sm text-green-700 font-medium">
                  = {((Number(form.valor) * (form.comisionGuidoPct ?? 10)) / 100).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                </span>
              ) : null}
            </div>
          </div>
        )}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Probabilidad: {form.probabilidad}%</label>
          <input type="range" min={0} max={100} value={form.probabilidad} onChange={e => set('probabilidad', Number(e.target.value))} className="w-full mt-2" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Fecha cierre estimada</label>
          <input type="date" {...f('fechaCierre')} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">📅 Fecha de apertura</label>
          <input type="date" {...f('fechaApertura')} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">📤 Fecha de envío de información</label>
          <input type="date" {...f('fechaEnvioInfo')} />
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
          <select
            value={form.origen}
            onChange={e => {
              const v = e.target.value;
              set('origen', v);
              if (v !== 'Redes sociales') set('redSocial', '');
              set('corresponsableId', ORIGENES_JULIETA.includes(v) ? JULIETA_ID : '');
            }}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none"
          >
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
        {form.corresponsableId && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Corresponsable (captación)</label>
            <div className="w-full px-3 py-2 border border-gray-100 rounded-lg text-sm bg-purple-50 text-purple-700 font-medium">
              Julieta Govantes
            </div>
          </div>
        )}
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Equipos de interés</label>
          {/* Tags de equipos seleccionados */}
          {(form.equiposSeleccionados || []).length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {form.equiposSeleccionados.map(e => (
                <span key={e.label} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
                  {e.label}
                  <button type="button" onClick={() => removeEquipo(e.label)} className="ml-0.5 hover:text-blue-900 cursor-pointer"><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
          )}
          {/* Selector cascada + botón añadir */}
          <div className="flex gap-2 items-start">
            <div className="flex-1 space-y-1.5">
              <select
                value={equipoPick.categoria}
                onChange={e => setEquipoPick({ categoria: e.target.value, subcategoria: '', otroTexto: '' })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
              >
                <option value="">Categoría...</option>
                {getCats().map(c => <option key={c} value={c}>{c}</option>)}
                <option value="Otro">Otro</option>
              </select>
              {equipoPick.categoria === 'Otro' && (
                <input
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  value={equipoPick.otroTexto}
                  onChange={e => setEquipoPick(p => ({ ...p, otroTexto: e.target.value }))}
                  placeholder="Especifica el equipo..."
                  autoFocus
                />
              )}
              {equipoPick.categoria && equipoPick.categoria !== 'Otro' && getSubs(equipoPick.categoria).length > 0 && (
                <select
                  value={equipoPick.subcategoria}
                  onChange={e => setEquipoPick(p => ({ ...p, subcategoria: e.target.value, otroTexto: '' }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                >
                  <option value="">Modelo / subcategoría (opcional)</option>
                  {getSubs(equipoPick.categoria).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              )}
              {equipoPick.subcategoria === SUBCATEGORIA_LIBRE && (
                <input
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  value={equipoPick.otroTexto}
                  onChange={e => setEquipoPick(p => ({ ...p, otroTexto: e.target.value }))}
                  placeholder="Marca y modelo..."
                  autoFocus
                />
              )}
            </div>
            <button
              type="button"
              onClick={addEquipo}
              disabled={!equipoPick.categoria || (equipoPick.categoria === 'Otro' && !equipoPick.otroTexto?.trim())}
              className="px-3 py-2 rounded-lg border border-blue-300 text-blue-700 text-sm font-medium hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
            >
              + Añadir
            </button>
          </div>
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Descripción</label>
          <textarea value={form.descripcion} onChange={e => set('descripcion', e.target.value)} rows={2} placeholder="Descripción..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none resize-none" />
        </div>

        {/* En pausa */}
        <div className="md:col-span-2 border-t border-gray-100 pt-4">
          <div className="flex items-center gap-3 mb-3">
            <button
              type="button"
              onClick={() => set('enPausa', !form.enPausa)}
              className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${form.enPausa ? 'bg-gray-400' : 'bg-gray-200'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${form.enPausa ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
            <span className="text-sm font-medium text-gray-700">⏸️ En pausa</span>
          </div>
          {form.enPausa && (
            <div className="bg-gray-50 rounded-xl p-3 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Motivo de pausa</label>
                <select value={form.pausaMotivo || ''} onChange={e => set('pausaMotivo', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none">
                  <option value="">Selecciona motivo...</option>
                  {MOTIVOS_PAUSA.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nota (opcional)</label>
                <textarea value={form.pausaNota || ''} onChange={e => set('pausaNota', e.target.value)} rows={2}
                  placeholder="Contexto adicional..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none resize-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Recordatorio</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {[['1m', '1 mes'], ['2m', '2 meses'], ['3m', '3 meses']].map(([key, label]) => (
                    <button key={key} type="button"
                      onClick={() => set('pausaRecordatorio', addMonths(key === '1m' ? 1 : key === '2m' ? 2 : 3))}
                      className="px-3 py-1 rounded-lg text-xs font-medium border border-gray-200 bg-white hover:border-gray-400 transition-colors cursor-pointer">
                      {label}
                    </button>
                  ))}
                </div>
                <input type="date" value={form.pausaRecordatorio || ''} onChange={e => set('pausaRecordatorio', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none" />
              </div>
            </div>
          )}
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
