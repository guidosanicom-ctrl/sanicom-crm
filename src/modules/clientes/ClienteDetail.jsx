import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Phone, Mail, Globe, Edit, Plus, Trash2, Pencil,
         Package, ShoppingBag, Star, Stethoscope, FileText, ExternalLink,
         CalendarDays, CheckCircle2, Clock, X } from 'lucide-react';
import { useClientesStore } from '../../store/clientesStore';
import { useAuthStore } from '../../store/authStore';
import { useOportunidadesStore } from '../../store/oportunidadesStore';
import { useDemosStore } from '../../store/demosStore';
import { useServicioStore } from '../../store/servicioStore';
import { useVisitasStore } from '../../store/visitasStore';
import { useAgendaStore } from '../../store/agendaStore';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import ClienteForm from './ClienteForm';
import { formatDate, formatCurrency } from '../../utils/formatters';
import MapView from './MapView';
import { geocodificar } from '../../utils/geocode';

// ── Tipos que muestran la pestaña Servicios/Especialidades ─────────────────
const TIPOS_SERVICIOS = {
  'Hospital público':  { label: 'Servicios',      jefeLabel: 'Jefe de servicio' },
  'Hospital privado':  { label: 'Especialidades', jefeLabel: 'Responsable'      },
  'Centro médico':     { label: 'Especialidades', jefeLabel: 'Responsable'      },
};

// ── Helpers ────────────────────────────────────────────────────────────────
function genId() { return `id_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`; }

function FRow({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
}
const inputCls = 'w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20';
const selCls   = 'w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none bg-white';

// ── Pestaña: Servicios / Especialidades ────────────────────────────────────
const SERVICIO_EMPTY = { nombre: '', jefe: '', telefono: '', email: '', notas: '' };

function ServiciosTab({ entries = [], onSave, seccionLabel, jefeLabel }) {
  const [form, setForm] = useState(null);
  const [delId, setDelId] = useState(null);
  const s = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = () => {
    if (!form?.nombre?.trim()) return;
    const list = form.id
      ? entries.map(e => e.id === form.id ? form : e)
      : [...entries, { ...form, id: genId() }];
    onSave(list);
    setForm(null);
  };

  const remove = (id) => { onSave(entries.filter(e => e.id !== id)); setDelId(null); };

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-800">{seccionLabel}</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {seccionLabel === 'Servicios' ? 'Servicios del hospital y sus responsables' : 'Especialidades médicas y sus responsables'}
          </p>
        </div>
        {!form && (
          <Button size="sm" onClick={() => setForm(SERVICIO_EMPTY)}>
            <Plus className="w-4 h-4" />Añadir
          </Button>
        )}
      </div>

      {/* Formulario inline */}
      {form && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-5 space-y-3">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
            {form.id ? `Editar ${seccionLabel.slice(0, -1).toLowerCase()}` : `Nuevo ${seccionLabel.slice(0, -1).toLowerCase()}`}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FRow label="Nombre *">
              <input className={inputCls} value={form.nombre} onChange={e => s('nombre', e.target.value)}
                placeholder={seccionLabel === 'Servicios' ? 'Ej: Cardiología, Urgencias…' : 'Ej: Traumatología, Pediatría…'} />
            </FRow>
            <FRow label={jefeLabel}>
              <input className={inputCls} value={form.jefe} onChange={e => s('jefe', e.target.value)} placeholder="Nombre completo" />
            </FRow>
            <FRow label="Teléfono directo">
              <input className={inputCls} value={form.telefono} onChange={e => s('telefono', e.target.value)} placeholder="Ext. o directo" />
            </FRow>
            <FRow label="Email">
              <input className={inputCls} type="email" value={form.email} onChange={e => s('email', e.target.value)} placeholder="servicio@hospital.es" />
            </FRow>
            <div className="sm:col-span-2">
              <FRow label="Notas">
                <textarea className={`${inputCls} resize-none`} rows={2} value={form.notas}
                  onChange={e => s('notas', e.target.value)} placeholder="Observaciones…" />
              </FRow>
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <Button size="sm" variant="outline" onClick={() => setForm(null)}>Cancelar</Button>
            <Button size="sm" onClick={save}>Guardar</Button>
          </div>
        </div>
      )}

      {/* Lista */}
      {entries.length === 0 && !form ? (
        <div className="py-12 text-center">
          <Stethoscope className="w-8 h-8 mx-auto mb-2 text-gray-200" />
          <p className="text-sm text-gray-400">Sin {seccionLabel.toLowerCase()} registradas</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {entries.map(entry => (
            <div key={entry.id} className="py-3 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800">{entry.nombre}</p>
                {entry.jefe && (
                  <p className="text-xs text-gray-500 mt-0.5">{jefeLabel}: {entry.jefe}</p>
                )}
                <div className="flex flex-wrap gap-3 mt-0.5">
                  {entry.telefono && (
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Phone className="w-3 h-3" />{entry.telefono}
                    </span>
                  )}
                  {entry.email && (
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Mail className="w-3 h-3" />{entry.email}
                    </span>
                  )}
                </div>
                {entry.notas && <p className="text-xs text-gray-400 italic mt-0.5">{entry.notas}</p>}
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => setForm(entry)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer" title="Editar">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => setDelId(entry.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 cursor-pointer" title="Eliminar">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!delId}
        onClose={() => setDelId(null)}
        onConfirm={() => remove(delId)}
        title={`Eliminar ${seccionLabel.slice(0, -1).toLowerCase()}`}
        message={`¿Eliminar este registro de ${seccionLabel.toLowerCase()}?`}
        confirmText="Eliminar"
      />
    </Card>
  );
}

// ── Pestaña: Equipos que tiene ─────────────────────────────────────────────
const ESTADOS_EQUIPO_INST  = ['Operativo', 'Averiado', 'Obsoleto'];
const BADGE_ESTADO_INST    = { 'Operativo': 'green', 'Averiado': 'red', 'Obsoleto': 'gray' };
const EQUIPO_INST_EMPTY    = { nombre: '', marca: '', modelo: '', nSerie: '', anioInstalacion: '', distribuidor: '', estado: 'Operativo' };

function EquiposTieneTab({ equipos = [], equiposInteres = [], onSave, onSaveInteres }) {
  const [form, setForm] = useState(null);
  const [delId, setDelId] = useState(null);
  const s = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = () => {
    if (!form?.nombre?.trim()) return;
    onSave(form.id ? equipos.map(e => e.id === form.id ? form : e) : [...equipos, { ...form, id: genId() }]);
    setForm(null);
  };
  const remove = (id) => { onSave(equipos.filter(e => e.id !== id)); setDelId(null); };

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-800">Equipos que tiene</h3>
          <p className="text-xs text-gray-400 mt-0.5">Equipos del cliente, incluyendo los de otros distribuidores</p>
        </div>
        {!form && <Button size="sm" onClick={() => setForm(EQUIPO_INST_EMPTY)}><Plus className="w-4 h-4" />Añadir equipo</Button>}
      </div>

      {form && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-5 space-y-3">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{form.id ? 'Editar equipo' : 'Nuevo equipo'}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <FRow label="Nombre *"><input className={inputCls} value={form.nombre} onChange={e => s('nombre', e.target.value)} placeholder="Ej: Ecógrafo portátil" /></FRow>
            <FRow label="Marca"><input className={inputCls} value={form.marca} onChange={e => s('marca', e.target.value)} placeholder="GE, Philips…" /></FRow>
            <FRow label="Modelo"><input className={inputCls} value={form.modelo} onChange={e => s('modelo', e.target.value)} /></FRow>
            <FRow label="Nº de serie"><input className={inputCls} value={form.nSerie} onChange={e => s('nSerie', e.target.value)} placeholder="SN-000000" /></FRow>
            <FRow label="Año de instalación"><input className={inputCls} type="number" min="1990" max="2099" value={form.anioInstalacion} onChange={e => s('anioInstalacion', e.target.value)} placeholder="2022" /></FRow>
            <FRow label="Estado">
              <select className={selCls} value={form.estado} onChange={e => s('estado', e.target.value)}>
                {ESTADOS_EQUIPO_INST.map(st => <option key={st}>{st}</option>)}
              </select>
            </FRow>
            <FRow label="Distribuidor / Proveedor anterior"><input className={inputCls} value={form.distribuidor} onChange={e => s('distribuidor', e.target.value)} placeholder="Empresa proveedora" /></FRow>
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <Button size="sm" variant="outline" onClick={() => setForm(null)}>Cancelar</Button>
            <Button size="sm" onClick={save}>Guardar</Button>
          </div>
        </div>
      )}

      {equipos.length === 0 && !form ? (
        <div className="py-12 text-center"><Package className="w-8 h-8 mx-auto mb-2 text-gray-200" /><p className="text-sm text-gray-400">Sin equipos registrados</p></div>
      ) : (
        <div className="divide-y divide-gray-100">
          {equipos.map(eq => (
            <div key={eq.id} className="py-3 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-gray-800">{eq.nombre}</p>
                  <Badge color={BADGE_ESTADO_INST[eq.estado] || 'gray'}>{eq.estado}</Badge>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{[eq.marca, eq.modelo].filter(Boolean).join(' · ')}{eq.nSerie && <span className="ml-2 text-gray-400">SN: {eq.nSerie}</span>}</p>
                <p className="text-xs text-gray-400 mt-0.5">{eq.anioInstalacion && <span>Instalado: {eq.anioInstalacion}</span>}{eq.anioInstalacion && eq.distribuidor && ' · '}{eq.distribuidor && <span>Proveedor: {eq.distribuidor}</span>}</p>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => setForm(eq)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => setDelId(eq.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 cursor-pointer"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog open={!!delId} onClose={() => setDelId(null)} onConfirm={() => remove(delId)} title="Eliminar equipo" message="¿Eliminar este equipo del registro del cliente?" confirmText="Eliminar" />

      {equiposInteres.length > 0 && (
        <div className="mt-6 pt-5 border-t border-dashed border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-cyan-100 flex items-center justify-center"><Star className="w-3 h-3 text-cyan-600" /></div>
              <h4 className="text-sm font-semibold text-gray-700">Equipos con interés</h4>
              <span className="text-xs bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded-full">{equiposInteres.length}</span>
            </div>
            <p className="text-xs text-gray-400">Importado desde planilla (celdas celestes)</p>
          </div>
          <div className="divide-y divide-gray-50">
            {equiposInteres.map((eq, i) => (
              <div key={eq.id || i} className="py-2 flex items-center justify-between">
                <p className="text-sm text-gray-700">{eq.nombre}</p>
                <button onClick={() => onSaveInteres(equiposInteres.filter((_, j) => j !== i))} className="p-1 rounded text-gray-300 hover:text-red-400 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

// ── Pestaña: Equipos vendidos por Sanicom ─────────────────────────────────
const ESTADOS_EQUIPO_VENTA = ['En garantía', 'Fuera de garantía'];
const BADGE_ESTADO_VENTA   = { 'En garantía': 'green', 'Fuera de garantía': 'gray' };
const EQUIPO_VENTA_EMPTY   = { nombre: '', marca: '', modelo: '', nSerie: '', fechaVenta: '', precioVenta: '', responsable: '', estado: 'En garantía' };

function EquiposVendidosTab({ equipos = [], onSave }) {
  const { users } = useAuthStore();
  const [form, setForm] = useState(null);
  const [delId, setDelId] = useState(null);
  const s = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = () => {
    if (!form?.nombre?.trim()) return;
    onSave(form.id ? equipos.map(e => e.id === form.id ? form : e) : [...equipos, { ...form, id: genId() }]);
    setForm(null);
  };
  const remove = (id) => { onSave(equipos.filter(e => e.id !== id)); setDelId(null); };
  const userName = (id) => users.find(u => u.id === id)?.name || id || '-';

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-800">Equipos vendidos por Sanicom</h3>
          <p className="text-xs text-gray-400 mt-0.5">Historial de ventas realizadas a este cliente</p>
        </div>
        {!form && <Button size="sm" onClick={() => setForm(EQUIPO_VENTA_EMPTY)}><Plus className="w-4 h-4" />Añadir venta</Button>}
      </div>

      {form && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-5 space-y-3">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{form.id ? 'Editar venta' : 'Nueva venta'}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <FRow label="Nombre del equipo *"><input className={inputCls} value={form.nombre} onChange={e => s('nombre', e.target.value)} placeholder="Ej: Ecógrafo portátil" /></FRow>
            <FRow label="Marca"><input className={inputCls} value={form.marca} onChange={e => s('marca', e.target.value)} placeholder="GE, Philips…" /></FRow>
            <FRow label="Modelo"><input className={inputCls} value={form.modelo} onChange={e => s('modelo', e.target.value)} /></FRow>
            <FRow label="Nº de serie"><input className={inputCls} value={form.nSerie} onChange={e => s('nSerie', e.target.value)} placeholder="SN-000000" /></FRow>
            <FRow label="Fecha de venta"><input className={inputCls} type="date" value={form.fechaVenta} onChange={e => s('fechaVenta', e.target.value)} /></FRow>
            <FRow label="Precio de venta (€)"><input className={inputCls} type="number" min="0" step="0.01" value={form.precioVenta} onChange={e => s('precioVenta', e.target.value)} placeholder="0.00" /></FRow>
            <FRow label="Responsable comercial">
              <select className={selCls} value={form.responsable} onChange={e => s('responsable', e.target.value)}>
                <option value="">Sin asignar</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </FRow>
            <FRow label="Estado">
              <select className={selCls} value={form.estado} onChange={e => s('estado', e.target.value)}>
                {ESTADOS_EQUIPO_VENTA.map(st => <option key={st}>{st}</option>)}
              </select>
            </FRow>
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <Button size="sm" variant="outline" onClick={() => setForm(null)}>Cancelar</Button>
            <Button size="sm" onClick={save}>Guardar</Button>
          </div>
        </div>
      )}

      {equipos.length === 0 && !form ? (
        <div className="py-12 text-center"><ShoppingBag className="w-8 h-8 mx-auto mb-2 text-gray-200" /><p className="text-sm text-gray-400">Sin ventas registradas</p></div>
      ) : (
        <div className="divide-y divide-gray-100">
          {equipos.map(eq => (
            <div key={eq.id} className="py-3 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-gray-800">{eq.nombre}</p>
                  <Badge color={BADGE_ESTADO_VENTA[eq.estado] || 'gray'}>{eq.estado}</Badge>
                  {eq.precioVenta && <span className="text-xs font-semibold text-[#1B4F8A] bg-blue-50 px-2 py-0.5 rounded-full">{formatCurrency(Number(eq.precioVenta))}</span>}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{[eq.marca, eq.modelo].filter(Boolean).join(' · ')}{eq.nSerie && <span className="ml-2 text-gray-400">SN: {eq.nSerie}</span>}</p>
                <p className="text-xs text-gray-400 mt-0.5">{eq.fechaVenta && <span>Vendido: {formatDate(eq.fechaVenta)}</span>}{eq.responsable && <span> · {userName(eq.responsable)}</span>}</p>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => setForm(eq)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => setDelId(eq.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 cursor-pointer"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog open={!!delId} onClose={() => setDelId(null)} onConfirm={() => remove(delId)} title="Eliminar registro de venta" message="¿Eliminar este equipo del historial de ventas?" confirmText="Eliminar" />
    </Card>
  );
}

// ── Pestaña: Visitas comerciales ───────────────────────────────────────────
const ESTADOS_VISITA  = ['Pendiente', 'Realizada'];
const BADGE_VISITA    = { Pendiente: 'yellow', Realizada: 'green' };
const VISITA_EMPTY    = { fecha: '', hora: '', comercialId: '', comercialNombre: '', estado: 'Pendiente', objetivo: '', resultado: '', oportunidadId: '' };

function VisitasTab({ visitas = [], clienteId, clienteNombre, clienteOpps = [] }) {
  const { users } = useAuthStore();
  const { addVisita, updateVisita, deleteVisita } = useVisitasStore();
  const addEvento = useAgendaStore(s => s.addEvento);
  const [form, setForm] = useState(null);
  const [delId, setDelId] = useState(null);
  const s = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const sorted = [...visitas].sort((a, b) => {
    if (a.estado === b.estado) {
      const da = new Date(`${a.fecha}T${a.hora || '00:00'}`);
      const db2 = new Date(`${b.fecha}T${b.hora || '00:00'}`);
      return a.estado === 'Pendiente' ? da - db2 : db2 - da;
    }
    return a.estado === 'Pendiente' ? -1 : 1;
  });

  const handleSave = () => {
    if (!form?.fecha || !form?.comercialId) return;
    const user = users.find(u => u.id === form.comercialId);
    const visita = { ...form, clienteId, comercialNombre: user?.name || '' };

    if (form.id) {
      updateVisita(form.id, visita);
    } else {
      const saved = addVisita(visita);
      if (visita.estado === 'Pendiente') {
        const evento = addEvento({
          tipo: 'Visita comercial',
          titulo: `Visita a ${clienteNombre}`,
          fecha: visita.fecha,
          hora: visita.hora || '09:00',
          descripcion: visita.objetivo,
          clienteId,
          visitaId: saved.id,
        });
        updateVisita(saved.id, { eventoAgendaId: evento.id });
      }
    }
    setForm(null);
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-800">Visitas comerciales</h3>
          <p className="text-xs text-gray-400 mt-0.5">Historial y planificación de visitas a este cliente</p>
        </div>
        {!form && (
          <Button size="sm" onClick={() => setForm({ ...VISITA_EMPTY })}>
            <Plus className="w-4 h-4" />Nueva visita
          </Button>
        )}
      </div>

      {form && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-5 space-y-3">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
            {form.id ? 'Editar visita' : 'Nueva visita'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FRow label="Fecha *">
              <input type="date" className={inputCls} value={form.fecha} onChange={e => s('fecha', e.target.value)} />
            </FRow>
            <FRow label="Hora">
              <input type="time" className={inputCls} value={form.hora} onChange={e => s('hora', e.target.value)} />
            </FRow>
            <FRow label="Comercial *">
              <select className={selCls} value={form.comercialId} onChange={e => s('comercialId', e.target.value)}>
                <option value="">Seleccionar...</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </FRow>
            <FRow label="Estado">
              <select className={selCls} value={form.estado} onChange={e => s('estado', e.target.value)}>
                {ESTADOS_VISITA.map(st => <option key={st}>{st}</option>)}
              </select>
            </FRow>
            <div className="sm:col-span-2">
              <FRow label="Objetivo de la visita">
                <textarea className={`${inputCls} resize-none`} rows={2} value={form.objetivo}
                  onChange={e => s('objetivo', e.target.value)} placeholder="¿Qué se quiere conseguir con esta visita?" />
              </FRow>
            </div>
            {form.estado === 'Realizada' && (
              <div className="sm:col-span-2">
                <FRow label="Resultado / notas">
                  <textarea className={`${inputCls} resize-none`} rows={2} value={form.resultado}
                    onChange={e => s('resultado', e.target.value)} placeholder="Resumen de lo hablado, acuerdos, próximos pasos..." />
                </FRow>
              </div>
            )}
            {clienteOpps.length > 0 && (
              <div className="sm:col-span-2">
                <FRow label="Oportunidad relacionada (opcional)">
                  <select className={selCls} value={form.oportunidadId} onChange={e => s('oportunidadId', e.target.value)}>
                    <option value="">Sin vincular</option>
                    {clienteOpps.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                  </select>
                </FRow>
              </div>
            )}
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <Button size="sm" variant="outline" onClick={() => setForm(null)}>Cancelar</Button>
            <Button size="sm" onClick={handleSave}>Guardar</Button>
          </div>
        </div>
      )}

      {sorted.length === 0 && !form ? (
        <div className="py-12 text-center">
          <CalendarDays className="w-8 h-8 mx-auto mb-2 text-gray-200" />
          <p className="text-sm text-gray-400">Sin visitas registradas</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {sorted.map(v => {
            const opp = clienteOpps.find(o => o.id === v.oportunidadId);
            return (
              <div key={v.id} className="py-3 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`mt-0.5 w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0
                    ${v.estado === 'Realizada' ? 'bg-green-100' : 'bg-amber-100'}`}>
                    {v.estado === 'Realizada'
                      ? <CheckCircle2 className="w-4 h-4 text-green-600" />
                      : <Clock className="w-4 h-4 text-amber-500" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-800">
                        {v.fecha ? new Date(v.fecha + 'T12:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                        {v.hora && ` · ${v.hora}`}
                      </span>
                      <Badge color={BADGE_VISITA[v.estado] || 'gray'}>{v.estado}</Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{v.comercialNombre || '-'}</p>
                    {v.objetivo && <p className="text-xs text-gray-600 mt-1">{v.objetivo}</p>}
                    {v.resultado && <p className="text-xs text-gray-400 italic mt-0.5">Resultado: {v.resultado}</p>}
                    {opp && <p className="text-xs text-[#1B4F8A] mt-0.5">Opp: {opp.nombre}</p>}
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => setForm(v)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer" title="Editar">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => setDelId(v.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 cursor-pointer" title="Eliminar">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!delId}
        onClose={() => setDelId(null)}
        onConfirm={() => { deleteVisita(delId); setDelId(null); }}
        title="Eliminar visita"
        message="¿Eliminar esta visita del registro?"
        confirmText="Eliminar"
      />
    </Card>
  );
}

// ── Componente principal ───────────────────────────────────────────────────
export default function ClienteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getCliente, updateCliente, deleteCliente, addContacto, deleteContacto } = useClientesStore();
  const { oportunidades } = useOportunidadesStore();
  const { demos } = useDemosStore();
  const { servicios } = useServicioStore();
  const { visitas } = useVisitasStore();
  const [activeTab, setActiveTab] = useState('resumen');
  const [editOpen, setEditOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [contactoForm, setContactoForm] = useState(null);
  const [note, setNote] = useState('');
  const [notes, setNotes] = useState([]);
  const [geoLoading, setGeoLoading] = useState(false);

  const { isCarlos, CARLOS_ESPECIALIDADES } = useAuthStore();
  const carlos = isCarlos();

  const cliente = getCliente(id);
  if (!cliente) return <div className="p-8 text-gray-400">Cliente no encontrado.</div>;
  if (carlos && !CARLOS_ESPECIALIDADES.includes(cliente.especialidad)) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-gray-400 text-sm">No tienes acceso a este cliente.</p>
        <button onClick={() => navigate('/clientes')} className="text-[#1B4F8A] text-sm hover:underline cursor-pointer">Volver a clientes</button>
      </div>
    );
  }

  // Configuración de la sección Servicios/Especialidades según tipo de cliente
  const seccionConfig = TIPOS_SERVICIOS[cliente.tipo] || null;

  // Tabs dinámicas: solo incluye 'servicios' si el tipo de cliente lo requiere
  const TABS = [
    { key: 'resumen',           label: 'Resumen' },
    { key: 'contactos',         label: 'Contactos' },
    ...(seccionConfig ? [{ key: 'servicios', label: seccionConfig.label }] : []),
    { key: 'equipos-tiene',     label: 'Equipos que tiene' },
    { key: 'equipos-vendidos',  label: 'Equipos vendidos por Sanicom' },
    { key: 'oportunidades',     label: 'Oportunidades' },
    { key: 'presupuestos',      label: 'Presupuestos' },
    { key: 'visitas',           label: 'Visitas' },
    { key: 'servicio-tecnico',  label: 'Servicio técnico' },
    { key: 'notas',             label: 'Notas & actividad' },
  ];

  const clienteOpps     = oportunidades.filter(o => o.clienteId === id);
  const clienteServices = servicios.filter(s => s.clienteId === id);
  const clienteDemos    = demos.filter(d => d.clienteId === id);
  const clienteVisitas  = visitas.filter(v => v.clienteId === id);

  // Todos los presupuestos del cliente, de opps y demos
  const todosPresupuestos = [
    ...clienteOpps.flatMap(o => (o.presupuestos || []).map(p => ({ ...p, origen: 'Oportunidad', origenNombre: o.nombre }))),
    ...clienteDemos.flatMap(d => (d.presupuestos || []).map(p => ({ ...p, origen: 'Demo', origenNombre: `Demo ${d.numero}` }))),
  ].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  const addNote = () => {
    if (!note.trim()) return;
    setNotes(n => [{ text: note, date: new Date().toISOString() }, ...n]);
    setNote('');
  };

  // Auto-geocodificar al abrir la ficha si tiene dirección pero no coordenadas
  useEffect(() => {
    if (cliente.lat || cliente.lng) return;
    if (!cliente.direccion && !cliente.ciudad) return;
    let cancelled = false;
    geocodificar(cliente.direccion, cliente.ciudad, cliente.provincia).then(coords => {
      if (!cancelled && coords) updateCliente(id, { lat: coords.lat, lng: coords.lng });
    });
    return () => { cancelled = true; };
  }, [id]);

  const handleLocalizar = async () => {
    if (!cliente.direccion && !cliente.ciudad) return;
    setGeoLoading(true);
    const coords = await geocodificar(cliente.direccion, cliente.ciudad, cliente.provincia);
    setGeoLoading(false);
    if (coords) updateCliente(id, { lat: coords.lat, lng: coords.lng });
  };

  const saveServicios      = (list) => updateCliente(id, { serviciosEspecialidades: list });
  const saveEquiposTiene   = (list) => updateCliente(id, { equiposInstalados: list });
  const saveEquiposInteres = (list) => updateCliente(id, { equiposInteres: list });
  const saveEquiposVendidos = (list) => updateCliente(id, { equiposVendidos: list });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/clientes')} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 cursor-pointer">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{cliente.nombre}</h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge color={cliente.estado === 'Activo' ? 'green' : 'gray'}>{cliente.estado}</Badge>
              <span className="text-sm text-gray-500">{cliente.tipo}</span>
              {cliente.especialidad && <span className="text-sm text-gray-400">· {cliente.especialidad}</span>}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}><Edit className="w-4 h-4" />Editar</Button>
          <Button variant="danger" size="sm" onClick={() => setDelOpen(true)}><Trash2 className="w-4 h-4" />Eliminar</Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors cursor-pointer border-b-2 -mb-px
                ${activeTab === tab.key ? 'border-[#1B4F8A] text-[#1B4F8A]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Resumen ── */}
      {activeTab === 'resumen' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-4">
            <Card>
              <h3 className="font-semibold text-gray-800 mb-4">Datos generales</h3>
              <div className="grid grid-cols-2 gap-y-3 text-sm">
                <div className="text-gray-500">Contacto principal</div><div className="font-medium">{cliente.contactoPrincipal || '-'}</div>
                <div className="text-gray-500">CIF/NIF</div><div className="font-medium">{cliente.cif || '-'}</div>
                <div className="text-gray-500">Tipo</div><div className="font-medium">{cliente.tipo}</div>
                <div className="text-gray-500">Especialidad</div><div className="font-medium">{cliente.especialidad || '-'}</div>
                <div className="text-gray-500">Fecha de alta</div><div className="font-medium">{formatDate(cliente.fechaAlta)}</div>
              </div>
            </Card>
            <Card>
              <h3 className="font-semibold text-gray-800 mb-4">Contacto</h3>
              <div className="space-y-2">
                {cliente.telefono && <div className="flex items-center gap-2 text-sm"><Phone className="w-4 h-4 text-gray-400" />{cliente.telefono}</div>}
                {cliente.email && <div className="flex items-center gap-2 text-sm"><Mail className="w-4 h-4 text-gray-400" />{cliente.email}</div>}
                {cliente.website && <div className="flex items-center gap-2 text-sm"><Globe className="w-4 h-4 text-gray-400" />{cliente.website}</div>}
                {cliente.direccion && <div className="flex items-center gap-2 text-sm"><MapPin className="w-4 h-4 text-gray-400" />{cliente.direccion}, {cliente.ciudad} {cliente.cp}</div>}
              </div>
            </Card>
            {cliente.notas && <Card><h3 className="font-semibold text-gray-800 mb-2">Notas internas</h3><p className="text-sm text-gray-600">{cliente.notas}</p></Card>}
          </div>
          <div>
            <MapView
              lat={cliente.lat} lng={cliente.lng}
              nombre={cliente.nombre} ciudad={cliente.ciudad}
              onLocalizar={handleLocalizar}
              geoLoading={geoLoading}
            />
          </div>
        </div>
      )}

      {/* ── Contactos ── */}
      {activeTab === 'contactos' && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">Contactos</h3>
            <Button size="sm" onClick={() => setContactoForm({ nombre: '', cargo: '', telefono: '', email: '' })}>
              <Plus className="w-4 h-4" />Añadir
            </Button>
          </div>
          {contactoForm && (
            <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {['nombre', 'cargo', 'telefono', 'email'].map(k => (
                  <div key={k}>
                    <label className="text-xs font-medium text-gray-600 capitalize mb-1 block">{k}</label>
                    <input value={contactoForm[k]} onChange={e => setContactoForm(f => ({ ...f, [k]: e.target.value }))}
                      className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none" />
                  </div>
                ))}
              </div>
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="outline" onClick={() => setContactoForm(null)}>Cancelar</Button>
                <Button size="sm" onClick={() => { addContacto(id, contactoForm); setContactoForm(null); }}>Guardar</Button>
              </div>
            </div>
          )}
          {(cliente.contactos || []).length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No hay contactos</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {(cliente.contactos || []).map(ct => (
                <div key={ct.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{ct.nombre}</p>
                    <p className="text-xs text-gray-500">{ct.cargo} · {ct.telefono} · {ct.email}</p>
                  </div>
                  <button onClick={() => deleteContacto(id, ct.id)} className="p-1.5 text-gray-400 hover:text-red-500 cursor-pointer rounded-lg hover:bg-red-50">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* ── Servicios / Especialidades (solo hospitales y centros médicos) ── */}
      {activeTab === 'servicios' && seccionConfig && (
        <ServiciosTab
          entries={cliente.serviciosEspecialidades || []}
          onSave={saveServicios}
          seccionLabel={seccionConfig.label}
          jefeLabel={seccionConfig.jefeLabel}
        />
      )}

      {/* ── Equipos que tiene ── */}
      {activeTab === 'equipos-tiene' && (
        <EquiposTieneTab
          equipos={cliente.equiposInstalados || []}
          equiposInteres={cliente.equiposInteres || []}
          onSave={saveEquiposTiene}
          onSaveInteres={saveEquiposInteres}
        />
      )}

      {/* ── Equipos vendidos por Sanicom ── */}
      {activeTab === 'equipos-vendidos' && (
        <EquiposVendidosTab
          equipos={cliente.equiposVendidos || []}
          onSave={saveEquiposVendidos}
        />
      )}

      {/* ── Oportunidades ── */}
      {activeTab === 'oportunidades' && (
        <Card>
          <h3 className="font-semibold text-gray-800 mb-4">Oportunidades</h3>
          {clienteOpps.length === 0 ? <p className="text-sm text-gray-400 text-center py-8">Sin oportunidades.</p> : (
            <div className="divide-y divide-gray-100">
              {clienteOpps.map(op => (
                <div key={op.id} className="py-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 rounded-lg px-2" onClick={() => navigate('/pipeline')}>
                  <div>
                    <p className="text-sm font-medium">{op.nombre}</p>
                    <p className="text-xs text-gray-500">{op.etapa} · {formatCurrency(op.valor)}</p>
                  </div>
                  <Badge color={op.etapa === 'Ganado' ? 'green' : op.etapa === 'Perdido' ? 'gray' : 'blue'}>{op.etapa}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* ── Presupuestos ── */}
      {activeTab === 'presupuestos' && (
        <Card>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-gray-800">Presupuestos enviados</h3>
              <p className="text-xs text-gray-400 mt-0.5">Todos los PDFs subidos en oportunidades y demos de este cliente</p>
            </div>
            <span className="text-sm text-gray-400">{todosPresupuestos.length} {todosPresupuestos.length === 1 ? 'archivo' : 'archivos'}</span>
          </div>

          {todosPresupuestos.length === 0 ? (
            <div className="py-12 text-center">
              <FileText className="w-8 h-8 mx-auto mb-2 text-gray-200" />
              <p className="text-sm text-gray-400">No hay presupuestos subidos aún</p>
              <p className="text-xs text-gray-300 mt-1">Súbelos desde una Oportunidad o Demo de este cliente</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {todosPresupuestos.map(p => (
                <div key={p.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4 text-red-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{p.nombre}</p>
                      <p className="text-xs text-gray-400">
                        <span className="text-[#1B4F8A] font-medium">{p.origen}:</span> {p.origenNombre}
                        {' · '}{p.subidoPorNombre}
                        {' · '}{p.fecha ? new Date(p.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                      </p>
                    </div>
                  </div>
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer inline-flex flex-shrink-0"
                    title="Abrir"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* ── Visitas comerciales ── */}
      {activeTab === 'visitas' && (
        <VisitasTab
          visitas={clienteVisitas}
          clienteId={id}
          clienteNombre={cliente.nombre}
          clienteOpps={clienteOpps}
        />
      )}

      {/* ── Servicio técnico ── */}
      {activeTab === 'servicio-tecnico' && (
        <Card>
          <h3 className="font-semibold text-gray-800 mb-4">Historial de servicio técnico</h3>
          {clienteServices.length === 0 ? <p className="text-sm text-gray-400 text-center py-8">Sin órdenes de servicio.</p> : (
            <div className="divide-y divide-gray-100">
              {clienteServices.map(s => (
                <div key={s.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{s.numero} · {s.tipo}</p>
                    <p className="text-xs text-gray-500">{formatDate(s.fechaProgramada)} · {s.estado}</p>
                  </div>
                  <Badge color={s.estado === 'Completada' ? 'green' : s.estado === 'En curso' ? 'orange' : 'yellow'}>{s.estado}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* ── Notas & actividad ── */}
      {activeTab === 'notas' && (
        <Card>
          <h3 className="font-semibold text-gray-800 mb-4">Notas & Actividad</h3>
          <div className="flex gap-2 mb-4">
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="Añadir nota..."
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none"
              onKeyDown={e => e.key === 'Enter' && addNote()} />
            <Button size="sm" onClick={addNote}>Añadir</Button>
          </div>
          {notes.length === 0 ? <p className="text-sm text-gray-400 text-center py-8">Sin actividad registrada.</p> : (
            <div className="space-y-3">
              {notes.map((n, i) => (
                <div key={i} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-700">{n.text}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatDate(n.date)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <ClienteForm open={editOpen} onClose={() => setEditOpen(false)} initial={cliente}
        onSave={(data) => updateCliente(id, data)} />
      <ConfirmDialog open={delOpen} onClose={() => setDelOpen(false)}
        onConfirm={() => { deleteCliente(id); navigate('/clientes'); }}
        title="Eliminar cliente"
        message={`¿Seguro que deseas eliminar "${cliente.nombre}"? Esta acción no se puede deshacer.`} />
    </div>
  );
}
