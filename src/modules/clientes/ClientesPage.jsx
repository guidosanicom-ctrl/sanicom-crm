import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, Upload, Trash2, Users, Route, X, Eye, Copy, ClipboardList, MessageCircle, Mail, Phone, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { useClientesStore } from '../../store/clientesStore';
import { useAuthStore } from '../../store/authStore';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import SearchBar from '../../components/shared/SearchBar';
import Pagination from '../../components/shared/Pagination';
import EmptyState from '../../components/shared/EmptyState';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import ClienteForm from './ClienteForm';
import ImportWizard from './ImportWizard';
import RutaModal from './RutaModal';
import SanicomImportWizard from './SanicomImportWizard';
import DuplicadosModal from './DuplicadosModal';
import { formatDate } from '../../utils/formatters';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useEspecialidadesStore } from '../../store/especialidadesStore';
import { useSubespecialidadesStore } from '../../store/subespecialidadesStore';
import { useTiposClienteStore } from '../../store/tiposClienteStore';
import { useSeguimientoStore } from '../../store/seguimientoStore';

const TIPO_CONFIG = {
  whatsapp: { label: 'WhatsApp', color: '#25D366', bg: '#dcfce7', border: '#86efac', icon: '●' },
  email:    { label: 'Email',    color: '#1B4F8A', bg: '#eff6ff', border: '#93c5fd', icon: '●' },
  llamada:  { label: 'Llamada',  color: '#f59e0b', bg: '#fffbeb', border: '#fcd34d', icon: '●' },
};
const TIPO_EMOJI = { whatsapp: '💬', email: '📧', llamada: '📞' };

function TipoBtn({ tipo, active, onClick }) {
  const cfg = TIPO_CONFIG[tipo];
  return (
    <button onClick={onClick}
      style={active ? { backgroundColor: cfg.color, borderColor: cfg.color, color: '#fff' } : {}}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer
        ${active ? '' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
      {tipo === 'whatsapp'
        ? <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 flex-shrink-0" fill={active ? '#fff' : '#25D366'}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.558 4.114 1.528 5.836L.057 23.856a.498.498 0 0 0 .609.609l6.088-1.461A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.894a9.877 9.877 0 0 1-5.047-1.381l-.361-.214-3.747.898.931-3.651-.235-.374A9.859 9.859 0 0 1 2.106 12C2.106 6.533 6.533 2.106 12 2.106S21.894 6.533 21.894 12 17.467 21.894 12 21.894z"/></svg>
        : tipo === 'email'
          ? <Mail className="w-3.5 h-3.5 flex-shrink-0" />
          : <Phone className="w-3.5 h-3.5 flex-shrink-0" />
      }
      {cfg.label}
    </button>
  );
}

function ContactarForm({ clienteId, usuarioId, onSave, onCancel }) {
  const hoy = new Date().toISOString().split('T')[0];
  const [tipo, setTipo] = useState('whatsapp');
  const [fecha, setFecha] = useState(hoy);
  const [nota, setNota] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave({ clienteId, usuarioId, tipo, fecha, nota });
    setSaving(false);
  };

  return (
    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
      <div className="flex gap-2 flex-wrap">
        {['whatsapp', 'email', 'llamada'].map(t => (
          <TipoBtn key={t} tipo={t} active={tipo === t} onClick={() => setTipo(t)} />
        ))}
      </div>
      <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
        className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none bg-white" />
      <textarea value={nota} onChange={e => setNota(e.target.value)} rows={2} placeholder="Nota (opcional)..."
        className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none resize-none" />
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="px-3 py-1 text-xs text-gray-500 hover:text-gray-700 cursor-pointer">Cancelar</button>
        <button onClick={handleSave} disabled={saving}
          className="px-3 py-1 bg-[#1B4F8A] text-white text-xs rounded-lg hover:bg-[#1B4F8A]/90 cursor-pointer disabled:opacity-50">
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </div>
  );
}

function ClienteSeguimientoRow({ cliente, contactosCliente, usuarioId, onContactar }) {
  const [open, setOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const navigate = useNavigate();
  const ultimo = contactosCliente.sort((a, b) => b.fecha.localeCompare(a.fecha))[0];

  return (
    <div className="border border-gray-100 rounded-xl bg-white p-3 space-y-1">
      <div className="flex items-center justify-between gap-2">
        <button onClick={() => navigate(`/clientes/${cliente.id}`)}
          className="flex-1 text-left min-w-0">
          <p className="text-sm font-semibold text-[#1B4F8A] truncate">{cliente.nombre}</p>
          <p className="text-xs text-gray-400 truncate">{[cliente.especialidad, cliente.ciudad].filter(Boolean).join(' · ')}</p>
          {ultimo && (
            <p className="text-xs text-gray-400 mt-0.5">
              Último: {TIPO_EMOJI[ultimo.tipo]} {ultimo.fecha}{ultimo.nota && ` — ${ultimo.nota}`}
            </p>
          )}
        </button>
        <div className="flex gap-1 flex-shrink-0">
          {contactosCliente.length > 0 && (
            <button onClick={() => setOpen(o => !o)}
              className="p-1.5 text-gray-400 hover:text-gray-600 cursor-pointer">
              {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
          <button onClick={() => setFormOpen(f => !f)}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-[#1B4F8A] text-white text-xs rounded-lg hover:bg-[#1B4F8A]/90 cursor-pointer">
            <Plus className="w-3 h-3" /> Contactar
          </button>
        </div>
      </div>

      {open && contactosCliente.length > 0 && (
        <div className="mt-2 space-y-1 pl-2 border-l-2 border-gray-100">
          {contactosCliente.sort((a, b) => b.fecha.localeCompare(a.fecha)).map(c => (
            <p key={c.id} className="text-xs text-gray-500">
              {TIPO_EMOJI[c.tipo]} <span className="font-medium">{c.fecha}</span>{c.nota && ` — ${c.nota}`}
            </p>
          ))}
        </div>
      )}

      {formOpen && (
        <ContactarForm
          clienteId={cliente.id}
          usuarioId={usuarioId}
          onSave={async (data) => { await onContactar(data); setFormOpen(false); }}
          onCancel={() => setFormOpen(false)}
        />
      )}
    </div>
  );
}

function SeguimientoView({ clientes, contactos, usuarioId, onContactar }) {
  const [tabMovil, setTabMovil] = useState('no');
  const misContactos = contactos.filter(c => c.usuarioId === usuarioId);
  const contactadosIds = new Set(misContactos.map(c => c.clienteId));

  const noContactados = clientes
    .filter(c => !contactadosIds.has(c.id))
    .sort((a, b) => new Date(b.fechaAlta) - new Date(a.fechaAlta));

  const contactados = clientes
    .filter(c => contactadosIds.has(c.id))
    .sort((a, b) => {
      const ua = Math.max(...misContactos.filter(x => x.clienteId === a.id).map(x => new Date(x.fecha)));
      const ub = Math.max(...misContactos.filter(x => x.clienteId === b.id).map(x => new Date(x.fecha)));
      return ub - ua;
    });

  const getContactos = (clienteId) => misContactos.filter(c => c.clienteId === clienteId);

  const colNoCont = (
    <div className="space-y-2">
      {noContactados.length === 0
        ? <p className="text-sm text-gray-400 text-center py-6">¡Todos contactados! 🎉</p>
        : noContactados.map(c => (
            <ClienteSeguimientoRow key={c.id} cliente={c} contactosCliente={getContactos(c.id)}
              usuarioId={usuarioId} onContactar={onContactar} />
          ))
      }
    </div>
  );

  const colCont = (
    <div className="space-y-2">
      {contactados.length === 0
        ? <p className="text-sm text-gray-400 text-center py-6">Sin contactados aún.</p>
        : contactados.map(c => (
            <ClienteSeguimientoRow key={c.id} cliente={c} contactosCliente={getContactos(c.id)}
              usuarioId={usuarioId} onContactar={onContactar} />
          ))
      }
    </div>
  );

  return (
    <div>
      {/* Tabs móvil (< md) */}
      <div className="flex md:hidden border-b border-gray-200 mb-4">
        {[
          { key: 'no', label: '📋 No contactados', count: noContactados.length, active: 'bg-amber-50 text-amber-700 border-amber-400' },
          { key: 'si', label: '✅ Contactados',    count: contactados.length,   active: 'bg-green-50 text-green-700 border-green-400' },
        ].map(tab => (
          <button key={tab.key} onClick={() => setTabMovil(tab.key)}
            className={`flex-1 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer
              ${tabMovil === tab.key ? tab.active : 'border-transparent text-gray-500'}`}>
            {tab.label} <span className="ml-1 font-bold">({tab.count})</span>
          </button>
        ))}
      </div>
      <div className="block md:hidden">
        {tabMovil === 'no' ? colNoCont : colCont}
      </div>

      {/* Columnas escritorio (≥ md) */}
      <div className="hidden md:grid md:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span>📋</span>
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">No contactados</h3>
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">{noContactados.length}</span>
          </div>
          {colNoCont}
        </div>
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span>✅</span>
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Contactados</h3>
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">{contactados.length}</span>
          </div>
          {colCont}
        </div>
      </div>
    </div>
  );
}

export default function ClientesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { clientes, addCliente, deleteCliente, deleteClientes, importClientes } = useClientesStore();
  const { user, isCarlos, CARLOS_ESPECIALIDADES } = useAuthStore();
  const { contactos, addContacto } = useSeguimientoStore();
  const { especialidades } = useEspecialidadesStore();
  const { subespecialidades } = useSubespecialidadesStore();
  const { tipos: tiposCliente } = useTiposClienteStore();

  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [filterEsp, setFilterEsp] = useState('');
  const [filterSubesp, setFilterSubesp] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(50);
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [viewingSelected, setViewingSelected] = useState(false);
  const [delBulkOpen, setDelBulkOpen] = useState(false);
  const [rutaOpen, setRutaOpen] = useState(false);
  const [sanicomOpen, setSanicomOpen] = useState(false);
  const [dupOpen, setDupOpen] = useState(false);
  const [vistaSegui, setVistaSegui] = useState(false);
  useEffect(() => { setVistaSegui(false); }, [location.key]);

  const carlos = isCarlos();
  const puedeCrearRuta = carlos || user?.email === 'jgovantes@sanicom.es';
  const espOptions = carlos ? CARLOS_ESPECIALIDADES.filter(e => especialidades.includes(e)) : especialidades;

  // Mis clientes recientes (últimos 20 clientes accesibles, ordenados por actividad reciente)
  const misRecientes = useMemo(() => {
    if (!user?.id) return [];
    const accesibles = carlos
      ? clientes.filter(c => CARLOS_ESPECIALIDADES.includes(c.especialidad))
      : clientes.filter(c => c.creadoPorId === user.id || c.modificadoPorId === user.id);
    return accesibles
      .sort((a, b) => new Date(b.fechaModificacion || b.fechaAlta) - new Date(a.fechaModificacion || a.fechaAlta))
      .slice(0, 20);
  }, [clientes, user, carlos]);

  // Clientes accesibles para seguimiento
  const clientesSeguimiento = useMemo(() => {
    if (!user?.id) return [];
    return carlos
      ? clientes.filter(c => CARLOS_ESPECIALIDADES.includes(c.especialidad))
      : clientes;
  }, [clientes, user, carlos]);

  const handleContactar = async (data) => {
    await addContacto(data);
    toast.success('Contacto registrado.');
  };

  // Filtrado base (sin considerar "ver seleccionados")
  const baseFiltered = useMemo(() => {
    return clientes.filter(c => {
      if (carlos && !CARLOS_ESPECIALIDADES.includes(c.especialidad)) return false;
      const q = search.toLowerCase();
      const matchSearch = !q || c.nombre?.toLowerCase().includes(q) || c.ciudad?.toLowerCase().includes(q) || c.tipo?.toLowerCase().includes(q);
      const matchTipo = !filterTipo || c.tipo === filterTipo;
      const matchEstado = !filterEstado || c.estado === filterEstado;
      const matchEsp = !filterEsp || c.especialidad === filterEsp;
      const matchSubesp = !filterSubesp || c.subespecialidad === filterSubesp;
      return matchSearch && matchTipo && matchEstado && matchEsp && matchSubesp;
    });
  }, [clientes, search, filterTipo, filterEstado, filterEsp, filterSubesp, carlos]);

  // Si "Ver seleccionados" está activo, filtra sobre la lista base
  const filtered = useMemo(() => {
    const base = viewingSelected ? clientes.filter(c => selected.has(c.id)) : baseFiltered;
    if (carlos) return [...base].sort((a, b) => new Date(b.fechaAlta) - new Date(a.fechaAlta));
    return base;
  }, [baseFiltered, viewingSelected, selected, clientes, carlos]);

  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const pageIds = useMemo(() => new Set(paginated.map(c => c.id)), [paginated]);
  const allPageSelected = pageIds.size > 0 && [...pageIds].every(id => selected.has(id));
  const somePageSelected = [...pageIds].some(id => selected.has(id));

  const toggleOne = (id, e) => {
    e.stopPropagation();
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const togglePage = (e) => {
    e.stopPropagation();
    setSelected(prev => {
      const next = new Set(prev);
      if (allPageSelected) pageIds.forEach(id => next.delete(id));
      else pageIds.forEach(id => next.add(id));
      return next;
    });
  };

  const clearSelection = () => {
    setSelected(new Set());
    setViewingSelected(false);
  };

  const handleDeleteBulk = () => {
    selected.forEach(id => deleteCliente(id));
    toast.success(`${selected.size} cliente${selected.size > 1 ? 's' : ''} eliminado${selected.size > 1 ? 's' : ''}.`);
    clearSelection();
  };

  const handleImport = (rows, mode) => {
    const result = importClientes(rows, mode);
    toast.success(`Se importaron ${result.imported} clientes correctamente. ${result.skipped} omitidos por duplicado.`);
    return result;
  };

  const sel = `px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white`;
  const chk = 'w-4 h-4 rounded border-gray-300 text-[#1B4F8A] accent-[#1B4F8A] cursor-pointer';

  return (
    <div className="space-y-4">
      {/* Mis clientes recientes */}
      {!vistaSegui && misRecientes.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 pt-3 pb-2">
            Mis clientes recientes
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0">
            {/* Columna izquierda */}
            <div className="divide-y divide-gray-50">
              {misRecientes.slice(0, 10).map(c => (
                <button
                  key={c.id}
                  onClick={() => navigate(`/clientes/${c.id}`)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-full bg-[#1B4F8A]/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-[#1B4F8A]">{c.nombre?.charAt(0)?.toUpperCase()}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-800 truncate">{c.nombre}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {[c.especialidad, c.ciudad, c.telefono].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <span className="text-[10px] text-gray-300 flex-shrink-0 whitespace-nowrap">
                    {c.fechaAlta ? formatDistanceToNow(parseISO(c.fechaAlta), { addSuffix: false, locale: es }) : ''}
                  </span>
                </button>
              ))}
            </div>
            {/* Columna derecha */}
            <div className="divide-y divide-gray-50 sm:border-l sm:border-gray-100">
              {misRecientes.slice(10, 20).map(c => (
                <button
                  key={c.id}
                  onClick={() => navigate(`/clientes/${c.id}`)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-full bg-[#1B4F8A]/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-[#1B4F8A]">{c.nombre?.charAt(0)?.toUpperCase()}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-800 truncate">{c.nombre}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {[c.especialidad, c.ciudad, c.telefono].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <span className="text-[10px] text-gray-300 flex-shrink-0 whitespace-nowrap">
                    {c.fechaAlta ? formatDistanceToNow(parseISO(c.fechaAlta), { addSuffix: false, locale: es }) : ''}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Toolbar — escritorio */}
      <div className="hidden sm:flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2 flex-1 min-w-0">
          <SearchBar
            value={search}
            onChange={s => { setSearch(s); setPage(1); }}
            placeholder="Buscar por nombre, ciudad..."
            className="w-64"
          />
          <select className={sel} value={filterTipo} onChange={e => { setFilterTipo(e.target.value); setPage(1); }}>
            <option value="">Todos los tipos</option>
            {tiposCliente.map(t => <option key={t}>{t}</option>)}
          </select>
          <select className={sel} value={filterEstado} onChange={e => { setFilterEstado(e.target.value); setPage(1); }}>
            <option value="">Todos los estados</option>
            <option>Activo</option><option>Inactivo</option>
          </select>
          <select className={sel} value={filterEsp} onChange={e => { setFilterEsp(e.target.value); setFilterSubesp(''); setPage(1); }}>
            <option value="">Todas las especialidades</option>
            {espOptions.map(e => <option key={e}>{e}</option>)}
          </select>
          {filterEsp === 'Fisioterapia' && (
            <select className={sel} value={filterSubesp} onChange={e => { setFilterSubesp(e.target.value); setPage(1); }}>
              <option value="">Todas las subespecialidades</option>
              {subespecialidades.map(s => <option key={s}>{s}</option>)}
            </select>
          )}
        </div>
        <div className="flex gap-2">
          {!carlos && <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}><Upload className="w-4 h-4" />Importar</Button>}
          {!carlos && <Button variant="outline" size="sm" onClick={() => setSanicomOpen(true)}><Upload className="w-4 h-4" />Importar planilla Sanicom</Button>}
          {!carlos && <Button variant="outline" size="sm" onClick={() => setDupOpen(true)}><Copy className="w-4 h-4" />Gestionar duplicados</Button>}
          {carlos && (
            <button onClick={() => setVistaSegui(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors cursor-pointer
                ${vistaSegui ? 'bg-[#1B4F8A] text-white border-[#1B4F8A]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
              <ClipboardList className="w-4 h-4" />Seguimiento
            </button>
          )}
          <Button size="sm" onClick={() => setFormOpen(true)}><Plus className="w-4 h-4" />Nuevo cliente</Button>
        </div>
      </div>

      {/* Toolbar — móvil */}
      <div className="flex sm:hidden flex-col gap-2">
        {/* Fila 1: buscador */}
        <SearchBar
          value={search}
          onChange={s => { setSearch(s); setPage(1); }}
          placeholder="Buscar por nombre, ciudad..."
          className="w-full"
        />
        {/* Fila 2: filtros scrollables */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <select className="flex-shrink-0 px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none"
            value={filterTipo} onChange={e => { setFilterTipo(e.target.value); setPage(1); }}>
            <option value="">Tipo</option>
            {tiposCliente.map(t => <option key={t}>{t}</option>)}
          </select>
          <select className="flex-shrink-0 px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none"
            value={filterEstado} onChange={e => { setFilterEstado(e.target.value); setPage(1); }}>
            <option value="">Estado</option>
            <option>Activo</option><option>Inactivo</option>
          </select>
          <select className="flex-shrink-0 px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none"
            value={filterEsp} onChange={e => { setFilterEsp(e.target.value); setFilterSubesp(''); setPage(1); }}>
            <option value="">Especialidad</option>
            {espOptions.map(e => <option key={e}>{e}</option>)}
          </select>
          {filterEsp === 'Fisioterapia' && (
            <select className="flex-shrink-0 px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none"
              value={filterSubesp} onChange={e => { setFilterSubesp(e.target.value); setPage(1); }}>
              <option value="">Subespecialidad</option>
              {subespecialidades.map(s => <option key={s}>{s}</option>)}
            </select>
          )}
        </div>
        {/* Fila 3: Seguimiento (solo Carlos) */}
        {carlos && (
          <button onClick={() => setVistaSegui(v => !v)}
            className={`w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors cursor-pointer
              ${vistaSegui ? 'bg-[#1B4F8A] text-white border-[#1B4F8A]' : 'bg-white text-gray-600 border-gray-200'}`}>
            <ClipboardList className="w-4 h-4" />Seguimiento
          </button>
        )}
      </div>

      {/* Vista Seguimiento */}
      {vistaSegui && (
        <SeguimientoView
          clientes={clientesSeguimiento}
          contactos={contactos}
          usuarioId={user?.id}
          onContactar={handleContactar}
        />
      )}

      {/* Barra de selección múltiple — escritorio (inline) */}
      {selected.size > 0 && (
        <div className="hidden sm:flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-blue-800">
              Seleccionados: {selected.size} cliente{selected.size > 1 ? 's' : ''}
            </span>
            {viewingSelected && (
              <span className="text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full font-medium">Vista filtrada</span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => { setViewingSelected(v => !v); setPage(1); }}>
              <Eye className="w-4 h-4" />{viewingSelected ? 'Ver todos' : 'Ver seleccionados'}
            </Button>
            <Button variant="outline" size="sm" onClick={clearSelection}>
              <X className="w-4 h-4" />Limpiar selección
            </Button>
            {puedeCrearRuta && (
              <Button size="sm" onClick={() => setRutaOpen(true)}>
                <Route className="w-4 h-4" />Crear ruta ({selected.size})
              </Button>
            )}
            <Button variant="danger" size="sm" onClick={() => setDelBulkOpen(true)}>
              <Trash2 className="w-4 h-4" />Eliminar ({selected.size})
            </Button>
          </div>
        </div>
      )}

      {/* Barra de selección múltiple — móvil (fixed al fondo) */}
      {selected.size > 0 && (
        <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-blue-200 px-4 py-3 shadow-xl">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-sm font-semibold text-blue-800">
              {selected.size} cliente{selected.size > 1 ? 's' : ''} seleccionado{selected.size > 1 ? 's' : ''}
            </span>
            <button onClick={clearSelection} className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-2">
            {puedeCrearRuta && (
              <Button size="sm" className="flex-1" onClick={() => setRutaOpen(true)}>
                <Route className="w-4 h-4" />Crear ruta ({selected.size})
              </Button>
            )}
            <Button variant="danger" size="sm" className={puedeCrearRuta ? '' : 'flex-1'} onClick={() => setDelBulkOpen(true)}>
              <Trash2 className="w-4 h-4" />{puedeCrearRuta ? '' : `Eliminar (${selected.size})`}
            </Button>
          </div>
        </div>
      )}

      {/* Lista de clientes */}
      {vistaSegui ? null : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {filtered.length === 0 ? (
            viewingSelected ? (
              <div className="py-16 text-center">
                <Eye className="w-8 h-8 mx-auto mb-3 text-gray-300" />
                <p className="text-sm text-gray-500 font-medium">No hay clientes seleccionados visibles</p>
                <p className="text-xs text-gray-400 mt-1">Cambia los filtros o selecciona clientes en la lista</p>
                <button onClick={() => setViewingSelected(false)} className="mt-3 text-xs text-[#1B4F8A] hover:underline cursor-pointer">
                  Volver a la lista completa
                </button>
              </div>
            ) : (
              <EmptyState icon={Users} title="Sin clientes" message="No se encontraron clientes con los filtros actuales." action={() => setFormOpen(true)} actionLabel="Nuevo cliente" />
            )
          ) : (
            <>
              {/* Cards — solo móvil */}
              <div className="sm:hidden divide-y divide-gray-50">
                {paginated.map(c => {
                  const esContactado = carlos && contactos.some(x => x.clienteId === c.id);
                  const isSelected = selected.has(c.id);
                  return (
                    <div key={c.id}
                      className={`flex items-center gap-3 px-4 py-3 transition-colors ${isSelected ? 'bg-blue-50' : ''}`}
                      style={!isSelected && esContactado ? { backgroundColor: '#DCFCE7' } : undefined}>
                      {/* Checkbox de selección */}
                      <input
                        type="checkbox"
                        className={chk}
                        checked={isSelected}
                        onChange={e => { e.stopPropagation(); toggleOne(c.id, e); }}
                      />
                      {/* Toque en el contenido navega a la ficha */}
                      <div className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                        onClick={() => navigate(`/clientes/${c.id}`)}>
                        <div className="w-9 h-9 rounded-full bg-[#1B4F8A]/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-[#1B4F8A]">{c.nombre?.charAt(0)?.toUpperCase()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[#1B4F8A] truncate">{c.nombre}</p>
                          <p className="text-xs text-gray-400 truncate">{[c.especialidad, c.ciudad].filter(Boolean).join(' · ')}</p>
                          {c.telefono && <p className="text-xs text-gray-500 mt-0.5">{c.telefono}</p>}
                        </div>
                        <Badge color={c.estado === 'Activo' ? 'green' : 'gray'}>{c.estado}</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Tabla — escritorio */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-3 w-10">
                        <input type="checkbox" className={chk} checked={allPageSelected}
                          ref={el => { if (el) el.indeterminate = somePageSelected && !allPageSelected; }}
                          onChange={togglePage} title="Seleccionar página" />
                      </th>
                      {['Nombre', 'Contacto', 'Tipo', 'Especialidad', 'Teléfono', 'Email', 'Ciudad', 'País', 'Alta', 'Estado'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {paginated.map(c => {
                      const isSelected = selected.has(c.id);
                      const esContactado = carlos && contactos.some(x => x.clienteId === c.id);
                      return (
                        <tr key={c.id}
                          className={`cursor-pointer transition-colors ${isSelected ? 'bg-blue-50/60 hover:bg-blue-100/60' : esContactado ? 'hover:bg-green-100/40' : 'hover:bg-gray-50'}`}
                          style={!isSelected && esContactado ? { backgroundColor: '#DCFCE7' } : undefined}
                          onClick={() => navigate(`/clientes/${c.id}`)}>
                          <td className="px-4 py-3 w-10" onClick={e => toggleOne(c.id, e)}>
                            <input type="checkbox" className={chk} checked={isSelected} onChange={() => {}} />
                          </td>
                          <td className="px-4 py-3 font-medium text-[#1B4F8A]">{c.nombre}</td>
                          <td className="px-4 py-3 text-gray-500">{c.contactoPrincipal || '-'}</td>
                          <td className="px-4 py-3 text-gray-600">{c.tipo}</td>
                          <td className="px-4 py-3 text-gray-500">
                            {c.especialidad ? (c.subespecialidad ? `${c.especialidad} (${c.subespecialidad})` : c.especialidad) : '-'}
                          </td>
                          <td className="px-4 py-3 text-gray-500">{c.telefono || '-'}</td>
                          <td className="px-4 py-3 text-gray-500">{c.email || '-'}</td>
                          <td className="px-4 py-3 text-gray-500">{c.ciudad || '-'}</td>
                          <td className="px-4 py-3 text-gray-500">{c.pais || 'España'}</td>
                          <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{formatDate(c.fechaAlta)}</td>
                          <td className="px-4 py-3">
                            <Badge color={c.estado === 'Activo' ? 'green' : 'gray'}>{c.estado}</Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="px-4 pb-4">
                <Pagination
                  page={page}
                  total={filtered.length}
                  perPage={perPage}
                  onChange={p => setPage(p)}
                  onPerPageChange={n => { setPerPage(n); setPage(1); }}
                  perPageOptions={[25, 50, 100]}
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* FAB móvil — Nuevo cliente (sube si hay barra de selección activa) */}
      <button
        className={`sm:hidden fixed right-6 z-30 w-14 h-14 rounded-full bg-[#1B4F8A] text-white shadow-lg flex items-center justify-center cursor-pointer active:scale-95 transition-all ${selected.size > 0 ? 'bottom-24' : 'bottom-6'}`}
        onClick={() => setFormOpen(true)}
        aria-label="Nuevo cliente"
      >
        <Plus className="w-6 h-6" />
      </button>

      <RutaModal
        open={rutaOpen}
        onClose={() => setRutaOpen(false)}
        clientes={clientes.filter(c => selected.has(c.id))}
      />

      <ClienteForm open={formOpen} onClose={() => setFormOpen(false)}
        onSave={(data) => { const c = addCliente(data); toast.success('Cliente creado correctamente.'); setFormOpen(false); return c; }} />
      <ImportWizard open={importOpen} onClose={() => setImportOpen(false)} onImport={handleImport} />
      <SanicomImportWizard
        open={sanicomOpen}
        onClose={() => setSanicomOpen(false)}
        onImport={async (rows, mode) => {
          const result = await importClientes(rows, mode);
          if (result.dbErrors > 0) {
            toast.error(`Se guardaron ${result.imported - result.dbErrors} de ${result.imported} clientes. ${result.dbErrors} fallaron al guardar en base de datos.`);
          } else {
            toast.success(`${result.imported} clientes importados. ${result.skipped} omitidos por duplicado.`);
          }
          return result;
        }}
      />

      <ConfirmDialog
        open={delBulkOpen}
        onClose={() => setDelBulkOpen(false)}
        onConfirm={handleDeleteBulk}
        title="Eliminar clientes seleccionados"
        message={`¿Eliminar ${selected.size} cliente${selected.size > 1 ? 's' : ''}? Esta acción no se puede deshacer.`}
        confirmText={`Eliminar ${selected.size}`}
      />

      <DuplicadosModal
        open={dupOpen}
        onClose={() => setDupOpen(false)}
        clientes={clientes}
        onEliminar={async (ids) => {
          const result = await deleteClientes(ids);
          if (result?.ok === false) {
            toast.error('Error al eliminar en Supabase. Revisa la consola (F12) para ver el detalle.');
          } else {
            toast.success(`${ids.length} duplicado${ids.length !== 1 ? 's' : ''} eliminado${ids.length !== 1 ? 's' : ''}.`);
          }
        }}
      />
    </div>
  );
}
