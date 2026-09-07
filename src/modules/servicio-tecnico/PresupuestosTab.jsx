import { useState, useMemo } from 'react';
import { Plus, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { usePresupuestosStore } from '../../store/presupuestosStore';
import { useClientesStore } from '../../store/clientesStore';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import SearchBar from '../../components/shared/SearchBar';
import Pagination from '../../components/shared/Pagination';
import EmptyState from '../../components/shared/EmptyState';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import PresupuestoForm from './PresupuestoForm';
import PresupuestoDetail from './PresupuestoDetail';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { ESTADOS_PRESUPUESTO } from '../../utils/constants';

const ESTADO_BADGE = { 'Borrador': 'gray', 'Enviado': 'blue', 'Aceptado': 'green', 'Rechazado': 'red' };

export default function PresupuestosTab() {
  const { presupuestos, addPresupuesto, updatePresupuesto, deletePresupuesto } = usePresupuestosStore();
  const { clientes } = useClientesStore();

  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [delOpen, setDelOpen] = useState(false);

  const filtered = useMemo(() => presupuestos.filter(p => {
    const client = clientes.find(c => c.id === p.clienteId);
    const q = search.toLowerCase();
    const matchSearch = !q || client?.nombre?.toLowerCase().includes(q) || p.equipoNombre?.toLowerCase().includes(q) || p.numero?.toLowerCase().includes(q);
    return matchSearch && (!filterEstado || p.estado === filterEstado);
  }), [presupuestos, clientes, search, filterEstado]);

  const sorted = useMemo(() => [...filtered].sort((a, b) => (b.numero || '').localeCompare(a.numero || '')), [filtered]);
  const paginated = sorted.slice((page - 1) * perPage, page * perPage);

  const openDetail = (p) => { setSelected(p); setDetailOpen(true); };
  const openEdit = (p) => { setSelected(p); setDetailOpen(false); setFormOpen(true); };

  const sel = `px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none bg-white`;

  return (
    <div className="space-y-4">
      {/* Toolbar — escritorio */}
      <div className="hidden sm:flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <SearchBar value={search} onChange={s => { setSearch(s); setPage(1); }} placeholder="Buscar cliente, equipo, Nº..." className="w-56" />
          <select className={sel} value={filterEstado} onChange={e => { setFilterEstado(e.target.value); setPage(1); }}>
            <option value="">Todos los estados</option>
            {ESTADOS_PRESUPUESTO.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <Button size="sm" onClick={() => { setSelected(null); setFormOpen(true); }}><Plus className="w-4 h-4" />Nuevo presupuesto</Button>
      </div>

      {/* Toolbar — móvil */}
      <div className="flex sm:hidden flex-col gap-2">
        <SearchBar value={search} onChange={s => { setSearch(s); setPage(1); }} placeholder="Buscar cliente, equipo, Nº..." className="w-full" />
        <select className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none"
          value={filterEstado} onChange={e => { setFilterEstado(e.target.value); setPage(1); }}>
          <option value="">Todos los estados</option>
          {ESTADOS_PRESUPUESTO.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState icon={FileText} title="Sin presupuestos" message="No hay presupuestos con los filtros actuales." action={() => setFormOpen(true)} actionLabel="Nuevo presupuesto" />
        ) : (
          <>
            {/* Cards — solo móvil */}
            <div className="sm:hidden divide-y divide-gray-100">
              {paginated.map(p => {
                const client = clientes.find(c => c.id === p.clienteId);
                return (
                  <div key={p.id} className="px-4 py-3 cursor-pointer active:bg-gray-50" onClick={() => openDetail(p)}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-semibold text-[#1B4F8A]">{p.numero}</span>
                          <Badge color={ESTADO_BADGE[p.estado] || 'gray'}>{p.estado}</Badge>
                        </div>
                        <p className="text-sm font-semibold text-gray-800 mt-1 truncate">{client?.nombre || '-'}</p>
                        {p.equipoNombre && <p className="text-xs text-gray-500 mt-0.5 truncate">{p.equipoNombre}</p>}
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          {p.fecha && <span className="text-xs text-gray-400">{formatDate(p.fecha)}</span>}
                          <span className="text-xs font-medium text-gray-600">{formatCurrency(p.totalConIva || 0)}</span>
                        </div>
                      </div>
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
                    {['Nº', 'Cliente', 'Equipo', 'Fecha', 'Total con IVA', 'Estado', 'Acciones'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginated.map(p => {
                    const client = clientes.find(c => c.id === p.clienteId);
                    return (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <button onClick={() => openDetail(p)} className="font-mono text-xs text-[#1B4F8A] hover:underline cursor-pointer">{p.numero}</button>
                        </td>
                        <td className="px-4 py-3 font-medium">{client?.nombre || '-'}</td>
                        <td className="px-4 py-3 text-gray-600">{p.equipoNombre || '-'}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{formatDate(p.fecha)}</td>
                        <td className="px-4 py-3 font-medium text-gray-800">{formatCurrency(p.totalConIva || 0)}</td>
                        <td className="px-4 py-3"><Badge color={ESTADO_BADGE[p.estado] || 'gray'}>{p.estado}</Badge></td>
                        <td className="px-4 py-3">
                          <button onClick={() => openEdit(p)} className="text-blue-600 hover:underline text-xs cursor-pointer mr-2">Editar</button>
                          <button onClick={() => { setSelected(p); setDelOpen(true); }} className="text-red-500 hover:underline text-xs cursor-pointer">Eliminar</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="px-4 pb-4 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>Mostrar</span>
                {[25, 50, 100].map(n => (
                  <button key={n} onClick={() => { setPerPage(n); setPage(1); }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${perPage === n ? 'bg-[#1B4F8A] text-white border-[#1B4F8A]' : 'border-gray-200 text-gray-600 hover:border-gray-400'}`}>
                    {n}
                  </button>
                ))}
                <button onClick={() => { setPerPage(Infinity); setPage(1); }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${perPage === Infinity ? 'bg-[#1B4F8A] text-white border-[#1B4F8A]' : 'border-gray-200 text-gray-600 hover:border-gray-400'}`}>
                  Todos
                </button>
                <span className="text-gray-400">({filtered.length} total)</span>
              </div>
              {perPage !== Infinity && (
                <Pagination page={page} total={filtered.length} perPage={perPage} onChange={setPage} />
              )}
            </div>
          </>
        )}
      </div>

      {/* FAB móvil — Nuevo presupuesto */}
      <button
        className="sm:hidden fixed bottom-6 right-6 z-30 w-14 h-14 rounded-full bg-[#1B4F8A] text-white shadow-lg flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
        onClick={() => { setSelected(null); setFormOpen(true); }}
        aria-label="Nuevo presupuesto"
      >
        <Plus className="w-6 h-6" />
      </button>

      <PresupuestoDetail
        open={detailOpen}
        onClose={() => { setDetailOpen(false); setSelected(null); }}
        presupuesto={selected && presupuestos.find(p => p.id === selected.id)}
        onEdit={() => openEdit(selected)}
        onDelete={() => { setDetailOpen(false); setDelOpen(true); }}
      />

      <PresupuestoForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setSelected(null); }}
        initial={selected}
        onSave={(data) => {
          if (selected) {
            updatePresupuesto(selected.id, data);
            toast.success('Presupuesto actualizado.');
          } else {
            addPresupuesto(data);
            toast.success('Presupuesto creado.');
          }
          setFormOpen(false);
          setSelected(null);
        }}
      />

      <ConfirmDialog open={delOpen} onClose={() => setDelOpen(false)}
        onConfirm={() => { deletePresupuesto(selected?.id); toast.success('Presupuesto eliminado.'); setSelected(null); }}
        title="Eliminar presupuesto"
        message={`¿Eliminar el presupuesto ${selected?.numero}?`} />
    </div>
  );
}
