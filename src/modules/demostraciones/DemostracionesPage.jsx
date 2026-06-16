import { useState, useMemo } from 'react';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useDemosStore } from '../../store/demosStore';
import { useClientesStore } from '../../store/clientesStore';
import { useEquiposStore } from '../../store/equiposStore';
import { useAuthStore } from '../../store/authStore';
import { useOportunidadesStore } from '../../store/oportunidadesStore';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import SearchBar from '../../components/shared/SearchBar';
import Pagination from '../../components/shared/Pagination';
import EmptyState from '../../components/shared/EmptyState';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import DemoForm from './DemoForm';
import DemoDetail from './DemoDetail';
import { formatDate } from '../../utils/formatters';
import { ESTADOS_DEMO } from '../../utils/constants';
import { PlaySquare } from 'lucide-react';

const BADGE_MAP = { 'Pendiente': 'yellow', 'Confirmada': 'blue', 'Realizada': 'green', 'Reprogramada': 'orange', 'Cancelada': 'black' };

export default function DemostracionesPage() {
  const { demos, addDemo, updateDemo, deleteDemo } = useDemosStore();
  const { clientes } = useClientesStore();
  const { equipos } = useEquiposStore();
  const { users } = useAuthStore();
  const { addOportunidad } = useOportunidadesStore();
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [filterResp, setFilterResp] = useState('');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [delOpen, setDelOpen] = useState(false);
  const PER_PAGE = 10;

  const filtered = useMemo(() => demos.filter(d => {
    const client = clientes.find(c => c.id === d.clienteId);
    const equipo = equipos.find(e => e.id === d.equipoId);
    const q = search.toLowerCase();
    const matchSearch = !q || client?.nombre?.toLowerCase().includes(q) || equipo?.nombre?.toLowerCase().includes(q);
    const matchEstado = !filterEstado || d.estado === filterEstado;
    const matchResp = !filterResp || d.responsable === filterResp;
    return matchSearch && matchEstado && matchResp;
  }), [demos, clientes, equipos, search, filterEstado, filterResp]);

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const openDetail = (d) => { setSelected(d); setDetailOpen(true); };
  const openEdit = (d) => { setSelected(d); setDetailOpen(false); setFormOpen(true); };

  const handleSave = (data) => {
    if (selected) {
      updateDemo(selected.id, data);
      toast.success('Demostración actualizada.');
    } else {
      const demo = addDemo({ ...data, adjuntos: [] });
      if (data.generarOportunidad && data.clienteId && data.equipoId) {
        addOportunidad({
          nombre: `Demo ${equipos.find(e => e.id === data.equipoId)?.nombre}`,
          clienteId: data.clienteId, equipos: [data.equipoId], valor: 0, probabilidad: 50,
          etapa: 'Prospecto', fechaCierre: '', responsable: data.responsable, origen: 'Demo de equipo',
        });
        toast.success('Demostración creada y oportunidad generada.');
      } else {
        toast.success('Demostración creada.');
      }
    }
  };

  const sel = `px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none bg-white`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 items-center justify-between">
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

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState icon={PlaySquare} title="Sin demostraciones" message="No hay demostraciones con los filtros actuales." action={() => setFormOpen(true)} actionLabel="Nueva demo" />
        ) : (
          <>
            <div className="overflow-x-auto">
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
                    const equipo = equipos.find(e => e.id === d.equipoId);
                    const user = users.find(u => u.id === d.responsable);
                    return (
                      <tr key={d.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <button onClick={() => openDetail(d)} className="font-mono text-xs text-[#1B4F8A] hover:underline cursor-pointer">{d.numero}</button>
                        </td>
                        <td className="px-4 py-3 font-medium">{client?.nombre || '-'}</td>
                        <td className="px-4 py-3 text-gray-600">{equipo?.nombre || '-'}</td>
                        <td className="px-4 py-3 text-gray-500">{user?.name || '-'}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{formatDate(d.fecha)} {d.hora}</td>
                        <td className="px-4 py-3"><Badge color={BADGE_MAP[d.estado] || 'gray'}>{d.estado}</Badge></td>
                        <td className="px-4 py-3 text-gray-500">{d.resultado || '-'}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => openEdit(d)} className="text-blue-600 hover:underline text-xs cursor-pointer mr-2">Editar</button>
                          <button onClick={() => { setSelected(d); setDelOpen(true); }} className="text-red-500 hover:underline text-xs cursor-pointer">Eliminar</button>
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
      <DemoDetail
        open={detailOpen}
        onClose={() => { setDetailOpen(false); setSelected(null); }}
        demo={selected && demos.find(d => d.id === selected.id)}
        onEdit={() => openEdit(selected)}
        onDelete={() => { setDetailOpen(false); setDelOpen(true); }}
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
    </div>
  );
}
