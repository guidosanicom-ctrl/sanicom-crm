import { useState, useMemo } from 'react';
import { useOpenFromUrl } from '../../hooks/useOpenFromUrl';
import { Plus, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import { useDemosStore } from '../../store/demosStore';
import { useClientesStore } from '../../store/clientesStore';
import { useEquiposStore } from '../../store/equiposStore';
import { useAuthStore } from '../../store/authStore';
import { useOportunidadesStore } from '../../store/oportunidadesStore';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import SearchBar from '../../components/shared/SearchBar';
import Pagination from '../../components/shared/Pagination';
import EmptyState from '../../components/shared/EmptyState';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import DemoForm from './DemoForm';
import DemoDetail from './DemoDetail';
import { formatDate } from '../../utils/formatters';
import { ESTADOS_DEMO } from '../../utils/constants';
import { PlaySquare, TrendingUp, Link2 } from 'lucide-react';

const BADGE_MAP = { 'Pendiente': 'yellow', 'Confirmada': 'blue', 'Realizada': 'green', 'Reprogramada': 'orange', 'Cancelada': 'black' };
const ETAPAS_ABIERTAS = ['Prospecto', 'Interesado', 'Propuesta enviada', 'Negociación'];

export default function DemostracionesPage() {
  const { demos, addDemo, updateDemo, deleteDemo } = useDemosStore();
  const { clientes } = useClientesStore();
  const { equipos } = useEquiposStore();
  const { users, canEditRecord } = useAuthStore();
  const { oportunidades, addOportunidad, updateOportunidad } = useOportunidadesStore();

  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [filterResp, setFilterResp] = useState('');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [delOpen, setDelOpen] = useState(false);
  const PER_PAGE = 25;

  // ── Flujo post-creación ────────────────────────────────────────────────────
  // oppFlow: null | { demo, step: 'ask' | 'conflict', conflictOpp: opp | null }
  const [oppFlow, setOppFlow] = useState(null);

  const filtered = useMemo(() => demos.filter(d => {
    const client = clientes.find(c => c.id === d.clienteId);
    const equipoNombre = d.equipoNombre || equipos.find(e => e.id === d.equipoId)?.nombre || '';
    const q = search.toLowerCase();
    const matchSearch = !q || client?.nombre?.toLowerCase().includes(q) || equipoNombre.toLowerCase().includes(q);
    const matchEstado = !filterEstado || d.estado === filterEstado;
    const matchResp = !filterResp || d.responsable === filterResp;
    return matchSearch && matchEstado && matchResp;
  }), [demos, clientes, equipos, search, filterEstado, filterResp]);

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const openDetail = (d) => { setSelected(d); setDetailOpen(true); };
  const openEdit   = (d) => { setSelected(d); setDetailOpen(false); setFormOpen(true); };

  useOpenFromUrl(demos, (demo) => openDetail(demo));

  // ── Vincular demo ↔ oportunidad ───────────────────────────────────────────
  const vincularDemoOpp = (demoId, opp) => {
    updateDemo(demoId, { oportunidadId: opp.id, oportunidadNombre: opp.nombre });
    updateOportunidad(opp.id, { demoIds: [...(opp.demoIds || []), demoId] });
  };

  const crearOportunidadDesdeDemo = (demo) => {
    const nuevaOpp = addOportunidad({
      nombre: `Demo ${demo.equipoNombre}`,
      clienteId: demo.clienteId,
      equiposDescripcion: demo.equipoNombre,
      valor: 0,
      probabilidad: 50,
      etapa: 'Prospecto',
      fechaCierre: '',
      responsable: demo.responsable,
      origen: 'Demo de equipo',
      demoIds: [demo.id],
    });
    updateDemo(demo.id, { oportunidadId: nuevaOpp.id, oportunidadNombre: nuevaOpp.nombre });
    return nuevaOpp;
  };

  // ── Guardar demo ───────────────────────────────────────────────────────────
  const handleSave = (data) => {
    if (selected) {
      updateDemo(selected.id, data);
      toast.success('Demostración actualizada.');
    } else {
      const demo = addDemo({ ...data, adjuntos: [] });
      toast.success('Demostración creada.');
      // Abrir flujo de oportunidad
      setOppFlow({ demo, step: 'ask', conflictOpp: null });
    }
  };

  // ── Respuesta: "Sí, crear oportunidad" ────────────────────────────────────
  const handleQuiereOpp = () => {
    const { demo } = oppFlow;
    const oppsAbiertas = oportunidades.filter(
      o => o.clienteId === demo.clienteId && ETAPAS_ABIERTAS.includes(o.etapa)
    );
    if (oppsAbiertas.length > 0) {
      setOppFlow(f => ({ ...f, step: 'conflict', conflictOpp: oppsAbiertas[0] }));
    } else {
      const nueva = crearOportunidadDesdeDemo(demo);
      toast.success(`Oportunidad "${nueva.nombre}" creada y vinculada.`);
      setOppFlow(null);
    }
  };

  // ── Respuestas de conflicto ────────────────────────────────────────────────
  const handleVincularExistente = () => {
    const { demo, conflictOpp } = oppFlow;
    vincularDemoOpp(demo.id, conflictOpp);
    toast.success(`Demo vinculada a "${conflictOpp.nombre}".`);
    setOppFlow(null);
  };

  const handleCrearNueva = () => {
    const { demo } = oppFlow;
    const nueva = crearOportunidadDesdeDemo(demo);
    toast.success(`Oportunidad "${nueva.nombre}" creada y vinculada.`);
    setOppFlow(null);
  };

  const sel = `px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none bg-white`;

  return (
    <div className="space-y-6">
      {/* Toolbar — escritorio */}
      <div className="hidden sm:flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <SearchBar value={search} onChange={s => { setSearch(s); setPage(1); }} placeholder="Buscar cliente, equipo..." className="w-56" />
          <select className={sel} value={filterEstado} onChange={e => { setFilterEstado(e.target.value); setPage(1); }}>
            <option value="">Todos los estados</option>
            {ESTADOS_DEMO.map(s => <option key={s}>{s}</option>)}
          </select>
          <select className={sel} value={filterResp} onChange={e => { setFilterResp(e.target.value); setPage(1); }}>
            <option value="">Todos los responsables</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        <Button size="sm" onClick={() => { setSelected(null); setFormOpen(true); }}><Plus className="w-4 h-4" />Nueva demo</Button>
      </div>

      {/* Toolbar — móvil */}
      <div className="flex sm:hidden flex-col gap-2">
        <SearchBar value={search} onChange={s => { setSearch(s); setPage(1); }} placeholder="Buscar cliente, equipo..." className="w-full" />
        <div className="grid grid-cols-2 gap-2">
          <select className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none"
            value={filterEstado} onChange={e => { setFilterEstado(e.target.value); setPage(1); }}>
            <option value="">Todos los estados</option>
            {ESTADOS_DEMO.map(s => <option key={s}>{s}</option>)}
          </select>
          <select className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none"
            value={filterResp} onChange={e => { setFilterResp(e.target.value); setPage(1); }}>
            <option value="">Responsable</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState icon={PlaySquare} title="Sin demostraciones" message="No hay demostraciones con los filtros actuales." action={() => setFormOpen(true)} actionLabel="Nueva demo" />
        ) : (
          <>
            {/* Cards — solo móvil */}
            <div className="sm:hidden divide-y divide-gray-100">
              {paginated.map(d => {
                const client = clientes.find(c => c.id === d.clienteId);
                const equipoLabel = d.equipoNombre || equipos.find(e => e.id === d.equipoId)?.nombre;
                const resp = users.find(u => u.id === d.responsable);
                return (
                  <div key={d.id} className={`px-4 py-3 cursor-pointer active:bg-gray-50 ${d.estado === 'Realizada' ? 'bg-green-200' : ''}`} onClick={() => openDetail(d)}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-semibold text-[#1B4F8A]">{d.numero}</span>
                          <Badge color={BADGE_MAP[d.estado] || 'gray'}>{d.estado}</Badge>
                        </div>
                        <p className="text-sm font-semibold text-gray-800 mt-1 truncate">{client?.nombre || '-'}</p>
                        {equipoLabel && <p className="text-xs text-gray-500 mt-0.5 truncate">{equipoLabel}</p>}
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          {resp && <span className="text-xs text-gray-400">{resp.name}</span>}
                          {d.fecha && <span className="text-xs text-gray-400">{formatDate(d.fecha)}{d.hora ? ` · ${d.hora}` : ''}</span>}
                        </div>
                      </div>
                      {canEditRecord(d) && (
                        <button onClick={e => { e.stopPropagation(); openEdit(d); }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 flex-shrink-0 cursor-pointer">
                          <Pencil className="w-4 h-4" />
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
                    {['Nº', 'Cliente', 'Equipo', 'Responsable', 'Fecha', 'Estado', 'Resultado', 'Acciones'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginated.map(d => {
                    const client = clientes.find(c => c.id === d.clienteId);
                    const equipoLabel = d.equipoNombre || equipos.find(e => e.id === d.equipoId)?.nombre;
                    const user = users.find(u => u.id === d.responsable);
                    return (
                      <tr key={d.id} className={d.estado === 'Realizada' ? 'bg-green-200 hover:bg-green-300' : 'hover:bg-gray-50'}>
                        <td className="px-4 py-3">
                          <button onClick={() => openDetail(d)} className="font-mono text-xs text-[#1B4F8A] hover:underline cursor-pointer">{d.numero}</button>
                        </td>
                        <td className="px-4 py-3 font-medium">{client?.nombre || '-'}</td>
                        <td className="px-4 py-3 text-gray-600">{equipoLabel || '-'}</td>
                        <td className="px-4 py-3 text-gray-500">{user?.name || '-'}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{formatDate(d.fecha)} {d.hora}</td>
                        <td className="px-4 py-3"><Badge color={BADGE_MAP[d.estado] || 'gray'}>{d.estado}</Badge></td>
                        <td className="px-4 py-3 text-gray-500">{d.resultado || '-'}</td>
                        <td className="px-4 py-3">
                          {canEditRecord(d) && <button onClick={() => openEdit(d)} className="text-blue-600 hover:underline text-xs cursor-pointer mr-2">Editar</button>}
                          {canEditRecord(d) && <button onClick={() => { setSelected(d); setDelOpen(true); }} className="text-red-500 hover:underline text-xs cursor-pointer">Eliminar</button>}
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

      {/* FAB móvil — Nueva demo */}
      <button
        className="sm:hidden fixed bottom-6 right-6 z-30 w-14 h-14 rounded-full bg-[#1B4F8A] text-white shadow-lg flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
        onClick={() => { setSelected(null); setFormOpen(true); }}
        aria-label="Nueva demo"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Detail modal */}
      <DemoDetail
        open={detailOpen}
        onClose={() => { setDetailOpen(false); setSelected(null); }}
        demo={selected && demos.find(d => d.id === selected.id)}
        onEdit={canEditRecord(selected) ? () => openEdit(selected) : null}
        onDelete={canEditRecord(selected) ? () => { setDetailOpen(false); setDelOpen(true); } : null}
      />

      <DemoForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setSelected(null); }}
        initial={selected}
        onSave={handleSave}
      />

      <ConfirmDialog open={delOpen} onClose={() => setDelOpen(false)}
        onConfirm={() => { deleteDemo(selected?.id); toast.success('Demostración eliminada.'); setSelected(null); }}
        title="Eliminar demostración"
        message={`¿Eliminar la demo ${selected?.numero}?`} />

      {/* ── Modal paso 1: ¿Crear oportunidad? ── */}
      <Modal
        open={oppFlow?.step === 'ask'}
        onClose={() => setOppFlow(null)}
        title="Crear oportunidad"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setOppFlow(null)}>No, solo la demo</Button>
            <Button onClick={handleQuiereOpp}>
              <TrendingUp className="w-4 h-4" />Sí, crear oportunidad
            </Button>
          </>
        }
      >
        <div className="flex flex-col items-center text-center gap-3 py-2">
          <div className="w-12 h-12 rounded-full bg-[#1B4F8A]/10 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-[#1B4F8A]" />
          </div>
          <p className="text-gray-700 font-medium">¿Quieres crear una oportunidad a partir de esta demo?</p>
          <p className="text-sm text-gray-400">
            Demo <span className="font-medium text-gray-600">{oppFlow?.demo?.numero}</span>
            {' · '}{clientes.find(c => c.id === oppFlow?.demo?.clienteId)?.nombre}
          </p>
        </div>
      </Modal>

      {/* ── Modal paso 2: conflicto con opp existente ── */}
      <Modal
        open={oppFlow?.step === 'conflict'}
        onClose={() => setOppFlow(null)}
        title="Ya existe una oportunidad abierta"
        size="sm"
        footer={
          <div className="flex flex-col gap-2 w-full">
            <Button onClick={handleVincularExistente}>
              <Link2 className="w-4 h-4" />Vincular a la existente
            </Button>
            <Button variant="outline" onClick={handleCrearNueva}>
              <TrendingUp className="w-4 h-4" />Crear nueva oportunidad
            </Button>
            <Button variant="outline" onClick={() => setOppFlow(null)}>Cancelar</Button>
          </div>
        }
      >
        <div className="py-2 space-y-3">
          <p className="text-sm text-gray-600">
            Ya existe una oportunidad abierta para este cliente:
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            <p className="text-sm font-semibold text-amber-800">{oppFlow?.conflictOpp?.nombre}</p>
            <p className="text-xs text-amber-600 mt-0.5">Etapa: {oppFlow?.conflictOpp?.etapa}</p>
          </div>
          <p className="text-sm text-gray-500">¿Quieres vincular esta demo a la existente o crear una nueva oportunidad?</p>
        </div>
      </Modal>
    </div>
  );
}
