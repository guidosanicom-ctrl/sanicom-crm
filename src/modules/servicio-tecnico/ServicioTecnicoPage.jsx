import { useState, useMemo } from 'react';
import { useOpenFromUrl } from '../../hooks/useOpenFromUrl';
import { useAutoRefresh, makeRefresher } from '../../hooks/useAutoRefresh';
import RefreshIndicator from '../../components/ui/RefreshIndicator';
import { Plus, CheckCircle, TrendingUp, TrendingDown, Package, Euro, BarChart3 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useServicioStore } from '../../store/servicioStore';
import { useClientesStore } from '../../store/clientesStore';
import { useEquiposStore } from '../../store/equiposStore';
import { useAuthStore } from '../../store/authStore';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import SearchBar from '../../components/shared/SearchBar';
import Pagination from '../../components/shared/Pagination';
import EmptyState from '../../components/shared/EmptyState';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import ServicioForm from './ServicioForm';
import ServicioDetail from './ServicioDetail';
import FacturacionModal from './FacturacionModal';
import { formatDate } from '../../utils/formatters';
import { ESTADOS_SERVICIO, TIPOS_SERVICIO, PRIORIDADES_SERVICIO } from '../../utils/constants';
import { Wrench } from 'lucide-react';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function StatCard({ label, value, sub, color = 'gray', icon: Icon }) {
  const colors = {
    gray:   'bg-gray-50 border-gray-200 text-gray-700',
    blue:   'bg-blue-50 border-blue-200 text-blue-700',
    green:  'bg-green-50 border-green-200 text-green-700',
    red:    'bg-red-50 border-red-200 text-red-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
  };
  return (
    <div className={`border rounded-xl p-4 ${colors[color]}`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium opacity-70">{label}</p>
        {Icon && <Icon className="w-4 h-4 opacity-50" />}
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs mt-1 opacity-60">{sub}</p>}
    </div>
  );
}

function ResumenMensual({ servicios }) {
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth());
  const [anio, setAnio] = useState(now.getFullYear());

  const años = useMemo(() => {
    const set = new Set(servicios.map(s => new Date(s.fechaCreacion || s.fechaProgramada).getFullYear()).filter(Boolean));
    set.add(now.getFullYear());
    return [...set].sort((a, b) => b - a);
  }, [servicios]);

  const del = useMemo(() => servicios.filter(s => {
    const d = new Date(s.fechaCreacion || s.fechaProgramada);
    return d.getFullYear() === anio && d.getMonth() === mes;
  }), [servicios, mes, anio]);

  const completadas = del.filter(s => s.estado === 'Completada').length;
  const enCurso    = del.filter(s => s.estado === 'En curso').length;
  const pendientes  = del.filter(s => s.estado === 'Pendiente' || s.estado === 'Programada').length;
  const canceladas  = del.filter(s => s.estado === 'Cancelada').length;

  const totalCoste   = del.reduce((acc, s) => acc + (parseFloat(s.costeRepuestos) || 0), 0);
  const totalPrecio  = del.reduce((acc, s) => acc + (parseFloat(s.precioCobrado) || 0), 0);
  const margen       = totalPrecio - totalCoste;

  const fmt = (n) => n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

  return (
    <div className="space-y-6">
      {/* Selector */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-wrap gap-3 items-center">
        <span className="text-sm font-medium text-gray-600">Período:</span>
        <select value={mes} onChange={e => setMes(Number(e.target.value))}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none bg-white">
          {MESES.map((m, i) => <option key={i} value={i}>{m}</option>)}
        </select>
        <select value={anio} onChange={e => setAnio(Number(e.target.value))}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none bg-white">
          {años.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <span className="text-sm text-gray-400">{del.length} órdenes en este período</span>
      </div>

      {/* Estado de órdenes */}
      <div>
        <h3 className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wide">Órdenes de trabajo</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Total" value={del.length} color="blue" icon={Wrench} />
          <StatCard label="Completadas" value={completadas} color="green" icon={CheckCircle} />
          <StatCard label="En curso / Programadas" value={enCurso + pendientes} color="orange" icon={BarChart3} sub={`${enCurso} en curso · ${pendientes} pendientes`} />
          <StatCard label="Canceladas" value={canceladas} color="gray" />
        </div>
      </div>

      {/* Control económico */}
      <div>
        <h3 className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wide">Control económico</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatCard label="Coste de repuestos" value={fmt(totalCoste)} color="orange" icon={Package} sub="Total gastado en materiales" />
          <StatCard label="Facturado al cliente" value={fmt(totalPrecio)} color="blue" icon={Euro} sub="Total cobrado" />
          <StatCard
            label="Margen total"
            value={(margen >= 0 ? '+' : '') + fmt(margen)}
            color={margen >= 0 ? 'green' : 'red'}
            icon={margen >= 0 ? TrendingUp : TrendingDown}
            sub={totalPrecio > 0 ? `${((margen / totalPrecio) * 100).toFixed(1)}% sobre facturado` : undefined}
          />
        </div>
        {del.length === 0 && (
          <p className="text-center text-sm text-gray-400 mt-6">No hay órdenes registradas en {MESES[mes]} {anio}.</p>
        )}
      </div>
    </div>
  );
}

const ESTADO_BADGE = { 'Pendiente': 'yellow', 'Programada': 'blue', 'En curso': 'orange', 'Completada': 'green', 'Cancelada': 'gray' };
const PRIORIDAD_BADGE = { 'Baja': 'gray', 'Normal': 'blue', 'Alta': 'orange', 'Urgente': 'red' };

export default function ServicioTecnicoPage() {
  const { servicios, addServicio, updateServicio, deleteServicio } = useServicioStore();
  const { clientes } = useClientesStore();
  const { equipos } = useEquiposStore();
  const { users, isReadOnly, isCarlos } = useAuthStore();
  const readOnly = isReadOnly('servicio-tecnico');
  const [activeTab, setActiveTab] = useState('ordenes');
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [filterPrioridad, setFilterPrioridad] = useState('');
  const [filterTecnico, setFilterTecnico] = useState('');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [delOpen, setDelOpen] = useState(false);
  const [facturacionOT, setFacturacionOT] = useState(null);
  const PER_PAGE = 10;

  const filtered = useMemo(() => servicios.filter(s => {
    const client = clientes.find(c => c.id === s.clienteId);
    const equipoNombre = s.equipoNombre || equipos.find(e => e.id === s.equipoId)?.nombre || '';
    const q = search.toLowerCase();
    const matchSearch = !q || client?.nombre?.toLowerCase().includes(q) || equipoNombre.toLowerCase().includes(q) || s.numero?.toLowerCase().includes(q);
    return matchSearch
      && (!filterEstado || s.estado === filterEstado)
      && (!filterTipo || s.tipo === filterTipo)
      && (!filterPrioridad || s.prioridad === filterPrioridad)
      && (!filterTecnico || s.tecnico === filterTecnico);
  }), [servicios, clientes, equipos, search, filterEstado, filterTipo, filterPrioridad, filterTecnico]);

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const openDetail = (s) => { setSelected(s); setDetailOpen(true); };
  const openEdit = (s) => { setSelected(s); setDetailOpen(false); setFormOpen(true); };

  useOpenFromUrl(servicios, (ot) => openDetail(ot));

  const { refreshing } = useAutoRefresh([makeRefresher(useServicioStore)]);

  const sel = `px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none bg-white`;

  return (
    <div className="space-y-6">
      <RefreshIndicator show={refreshing} />
      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('ordenes')}
          className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors cursor-pointer ${activeTab === 'ordenes' ? 'bg-white border border-b-white border-gray-200 -mb-px text-[#1B4F8A]' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Órdenes de trabajo
        </button>
        {!isCarlos() && (
          <button
            onClick={() => setActiveTab('resumen')}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors cursor-pointer ${activeTab === 'resumen' ? 'bg-white border border-b-white border-gray-200 -mb-px text-[#1B4F8A]' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Resumen mensual
          </button>
        )}
      </div>

      {activeTab === 'resumen' && !isCarlos() && <ResumenMensual servicios={servicios} />}

      {activeTab === 'ordenes' && <>

      {/* Toolbar — escritorio */}
      <div className="hidden sm:flex flex-wrap gap-3 items-start justify-between">
        <div className="flex flex-wrap gap-2">
          <SearchBar value={search} onChange={s => { setSearch(s); setPage(1); }} placeholder="Buscar por cliente, equipo, Nº..." className="w-56" />
          <select className={sel} value={filterEstado} onChange={e => { setFilterEstado(e.target.value); setPage(1); }}>
            <option value="">Todos los estados</option>
            {ESTADOS_SERVICIO.map(s => <option key={s}>{s}</option>)}
          </select>
          <select className={sel} value={filterTipo} onChange={e => { setFilterTipo(e.target.value); setPage(1); }}>
            <option value="">Todos los tipos</option>
            {TIPOS_SERVICIO.map(t => <option key={t}>{t}</option>)}
          </select>
          <select className={sel} value={filterPrioridad} onChange={e => { setFilterPrioridad(e.target.value); setPage(1); }}>
            <option value="">Todas las prioridades</option>
            {PRIORIDADES_SERVICIO.map(p => <option key={p}>{p}</option>)}
          </select>
          <select className={sel} value={filterTecnico} onChange={e => { setFilterTecnico(e.target.value); setPage(1); }}>
            <option value="">Todos los técnicos</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        {!readOnly && <Button size="sm" onClick={() => { setSelected(null); setFormOpen(true); }}><Plus className="w-4 h-4" />Nueva orden</Button>}
      </div>

      {/* Toolbar — móvil */}
      <div className="flex sm:hidden flex-col gap-2">
        <SearchBar value={search} onChange={s => { setSearch(s); setPage(1); }} placeholder="Buscar por cliente, equipo, Nº..." className="w-full" />
        <div className="grid grid-cols-2 gap-2">
          <select className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none"
            value={filterEstado} onChange={e => { setFilterEstado(e.target.value); setPage(1); }}>
            <option value="">Estado</option>
            {ESTADOS_SERVICIO.map(s => <option key={s}>{s}</option>)}
          </select>
          <select className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none"
            value={filterTecnico} onChange={e => { setFilterTecnico(e.target.value); setPage(1); }}>
            <option value="">Técnico</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <select className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none"
            value={filterPrioridad} onChange={e => { setFilterPrioridad(e.target.value); setPage(1); }}>
            <option value="">Prioridad</option>
            {PRIORIDADES_SERVICIO.map(p => <option key={p}>{p}</option>)}
          </select>
          <select className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none"
            value={filterTipo} onChange={e => { setFilterTipo(e.target.value); setPage(1); }}>
            <option value="">Tipo</option>
            {TIPOS_SERVICIO.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState icon={Wrench} title="Sin órdenes de servicio" message="No hay órdenes con los filtros actuales." action={() => setFormOpen(true)} actionLabel="Nueva orden" />
        ) : (
          <>
            {/* Cards — solo móvil */}
            <div className="sm:hidden divide-y divide-gray-100">
              {paginated.map(s => {
                const client = clientes.find(c => c.id === s.clienteId);
                const equipoLabel = s.equipoNombre || equipos.find(e => e.id === s.equipoId)?.nombre;
                const tecnico = users.find(u => u.id === s.tecnico);
                return (
                  <div key={s.id} className="px-4 py-3 cursor-pointer active:bg-gray-50"
                    onClick={() => openDetail(s)}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-semibold text-[#1B4F8A]">{s.numero}</span>
                          <Badge color={ESTADO_BADGE[s.estado] || 'gray'}>{s.estado}</Badge>
                          <Badge color={PRIORIDAD_BADGE[s.prioridad] || 'gray'}>{s.prioridad}</Badge>
                        </div>
                        <p className="text-sm font-semibold text-gray-800 mt-1 truncate">{client?.nombre || '-'}</p>
                        {equipoLabel && <p className="text-xs text-gray-500 mt-0.5 truncate">{equipoLabel}</p>}
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          {tecnico && <span className="text-xs text-gray-400">{tecnico.name}</span>}
                          {s.fechaProgramada && <span className="text-xs text-gray-400">{formatDate(s.fechaProgramada)}</span>}
                        </div>
                      </div>
                      {s.facturacion && !s.facturacion.facturada && (
                        <Badge color="yellow">💶 Pendiente</Badge>
                      )}
                      {!readOnly && s.estado !== 'Completada' && (
                        <button onClick={e => { e.stopPropagation(); setFacturacionOT(s); }}
                          className="p-1.5 rounded-lg text-green-500 hover:bg-green-50 flex-shrink-0 cursor-pointer" title="Marcar completada">
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tabla — solo escritorio */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Nº', 'Cliente', 'Equipo', 'Tipo', 'Técnico', 'Programada', 'Estado', 'Prioridad', 'Acciones'].map(h => (
                      <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginated.map(s => {
                    const client = clientes.find(c => c.id === s.clienteId);
                    const equipoLabel = s.equipoNombre || equipos.find(e => e.id === s.equipoId)?.nombre;
                    const user = users.find(u => u.id === s.tecnico);
                    return (
                      <tr key={s.id} className="hover:bg-gray-50">
                        <td className="px-3 py-3">
                          <button onClick={() => openDetail(s)} className="font-mono text-xs text-[#1B4F8A] hover:underline cursor-pointer">{s.numero}</button>
                        </td>
                        <td className="px-3 py-3 font-medium">{client?.nombre || '-'}</td>
                        <td className="px-3 py-3 text-gray-600">{equipoLabel || '-'}</td>
                        <td className="px-3 py-3 text-gray-500 text-xs">{s.tipo}</td>
                        <td className="px-3 py-3 text-gray-500 text-xs">{user?.name?.split(' ')[0] || '-'}</td>
                        <td className="px-3 py-3 whitespace-nowrap text-xs">{formatDate(s.fechaProgramada)}</td>
                        <td className="px-3 py-3"><Badge color={ESTADO_BADGE[s.estado] || 'gray'}>{s.estado}</Badge></td>
                        <td className="px-3 py-3"><Badge color={PRIORIDAD_BADGE[s.prioridad] || 'gray'}>{s.prioridad}</Badge></td>
                        <td className="px-3 py-3">
                          <div className="flex gap-2 items-center">
                            {s.facturacion && !s.facturacion.facturada && (
                              <Badge color="yellow">💶 Pendiente</Badge>
                            )}
                            {!readOnly && s.estado !== 'Completada' && (
                              <button onClick={() => setFacturacionOT(s)}
                                className="p-1 text-green-500 hover:bg-green-50 rounded cursor-pointer" title="Marcar completada">
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            )}
                            {!readOnly && <button onClick={() => openEdit(s)} className="text-blue-600 hover:underline text-xs cursor-pointer">Editar</button>}
                            {!readOnly && <button onClick={() => { setSelected(s); setDelOpen(true); }} className="text-red-500 hover:underline text-xs cursor-pointer">Eliminar</button>}
                            {readOnly && <span className="text-xs text-gray-400 italic">Solo lectura</span>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="px-4 pb-4">
              <Pagination page={page} total={filtered.length} perPage={PER_PAGE} onChange={setPage} />
            </div>
          </>
        )}
      </div>

      {/* FAB móvil — Nueva orden */}
      {!readOnly && (
        <button
          className="sm:hidden fixed bottom-6 right-6 z-30 w-14 h-14 rounded-full bg-[#1B4F8A] text-white shadow-lg flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
          onClick={() => { setSelected(null); setFormOpen(true); }}
          aria-label="Nueva orden"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      <FacturacionModal
        open={!!facturacionOT}
        onClose={() => setFacturacionOT(null)}
        ordenNumero={facturacionOT?.numero}
        onConfirm={(facturacion) => {
          updateServicio(facturacionOT.id, { estado: 'Completada', facturacion });
          toast.success('Orden completada y detalle de facturación guardado.');
          setFacturacionOT(null);
        }}
      />

      </>}

      {/* Detail modal */}
      <ServicioDetail
        open={detailOpen}
        onClose={() => { setDetailOpen(false); setSelected(null); }}
        orden={selected && servicios.find(s => s.id === selected.id)}
        onEdit={readOnly ? null : () => openEdit(selected)}
        onDelete={readOnly ? null : () => { setDetailOpen(false); setDelOpen(true); }}
      />

      <ServicioForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setSelected(null); }}
        initial={selected}
        onSave={(data) => {
          if (selected) { updateServicio(selected.id, data); toast.success('Orden actualizada.'); }
          else { addServicio(data); toast.success('Orden creada.'); }
        }}
      />
      <ConfirmDialog open={delOpen} onClose={() => setDelOpen(false)}
        onConfirm={() => { deleteServicio(selected?.id); toast.success('Orden eliminada.'); setSelected(null); }}
        title="Eliminar orden"
        message={`¿Eliminar la orden ${selected?.numero}?`} />
    </div>
  );
}
