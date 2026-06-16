import { useState, useMemo } from 'react';
import { Plus, CheckCircle } from 'lucide-react';
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
import { formatDate } from '../../utils/formatters';
import { ESTADOS_SERVICIO, TIPOS_SERVICIO, PRIORIDADES_SERVICIO } from '../../utils/constants';
import { Wrench } from 'lucide-react';

const ESTADO_BADGE = { 'Pendiente': 'yellow', 'Programada': 'blue', 'En curso': 'orange', 'Completada': 'green', 'Cancelada': 'gray' };
const PRIORIDAD_BADGE = { 'Baja': 'gray', 'Normal': 'blue', 'Alta': 'orange', 'Urgente': 'red' };

export default function ServicioTecnicoPage() {
  const { servicios, addServicio, updateServicio, deleteServicio } = useServicioStore();
  const { clientes } = useClientesStore();
  const { equipos } = useEquiposStore();
  const { users, isReadOnly } = useAuthStore();
  const readOnly = isReadOnly('servicio-tecnico');
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
  const PER_PAGE = 10;

  const filtered = useMemo(() => servicios.filter(s => {
    const client = clientes.find(c => c.id === s.clienteId);
    const equipo = equipos.find(e => e.id === s.equipoId);
    const q = search.toLowerCase();
    const matchSearch = !q || client?.nombre?.toLowerCase().includes(q) || equipo?.nombre?.toLowerCase().includes(q) || s.numero?.toLowerCase().includes(q);
    return matchSearch
      && (!filterEstado || s.estado === filterEstado)
      && (!filterTipo || s.tipo === filterTipo)
      && (!filterPrioridad || s.prioridad === filterPrioridad)
      && (!filterTecnico || s.tecnico === filterTecnico);
  }), [servicios, clientes, equipos, search, filterEstado, filterTipo, filterPrioridad, filterTecnico]);

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const openDetail = (s) => { setSelected(s); setDetailOpen(true); };
  const openEdit = (s) => { setSelected(s); setDetailOpen(false); setFormOpen(true); };

  const sel = `px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none bg-white`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 items-start justify-between">
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

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState icon={Wrench} title="Sin órdenes de servicio" message="No hay órdenes con los filtros actuales." action={() => setFormOpen(true)} actionLabel="Nueva orden" />
        ) : (
          <>
            <div className="overflow-x-auto">
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
                    const equipo = equipos.find(e => e.id === s.equipoId);
                    const user = users.find(u => u.id === s.tecnico);
                    return (
                      <tr key={s.id} className="hover:bg-gray-50">
                        <td className="px-3 py-3">
                          <button onClick={() => openDetail(s)} className="font-mono text-xs text-[#1B4F8A] hover:underline cursor-pointer">{s.numero}</button>
                        </td>
                        <td className="px-3 py-3 font-medium">{client?.nombre || '-'}</td>
                        <td className="px-3 py-3 text-gray-600">{equipo?.nombre || '-'}</td>
                        <td className="px-3 py-3 text-gray-500 text-xs">{s.tipo}</td>
                        <td className="px-3 py-3 text-gray-500 text-xs">{user?.name?.split(' ')[0] || '-'}</td>
                        <td className="px-3 py-3 whitespace-nowrap text-xs">{formatDate(s.fechaProgramada)}</td>
                        <td className="px-3 py-3"><Badge color={ESTADO_BADGE[s.estado] || 'gray'}>{s.estado}</Badge></td>
                        <td className="px-3 py-3"><Badge color={PRIORIDAD_BADGE[s.prioridad] || 'gray'}>{s.prioridad}</Badge></td>
                        <td className="px-3 py-3">
                          <div className="flex gap-2 items-center">
                            {!readOnly && s.estado !== 'Completada' && (
                              <button
                                onClick={() => { updateServicio(s.id, { estado: 'Completada' }); toast.success('Orden completada.'); }}
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
