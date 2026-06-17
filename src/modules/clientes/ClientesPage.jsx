import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Upload, Trash2, Users } from 'lucide-react';
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
import { formatDate } from '../../utils/formatters';
import { TIPOS_CLIENTE } from '../../utils/constants';
import { useEspecialidadesStore } from '../../store/especialidadesStore';

export default function ClientesPage() {
  const navigate = useNavigate();
  const { clientes, addCliente, deleteCliente, importClientes } = useClientesStore();
  const { isCarlos, CARLOS_ESPECIALIDADES } = useAuthStore();
  const { especialidades } = useEspecialidadesStore();
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [filterEsp, setFilterEsp] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(50);
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [delBulkOpen, setDelBulkOpen] = useState(false);

  const carlos = isCarlos();
  const espOptions = carlos ? CARLOS_ESPECIALIDADES.filter(e => especialidades.includes(e)) : especialidades;

  const filtered = useMemo(() => {
    return clientes.filter(c => {
      if (carlos && !CARLOS_ESPECIALIDADES.includes(c.especialidad)) return false;
      const q = search.toLowerCase();
      const matchSearch = !q || c.nombre?.toLowerCase().includes(q) || c.ciudad?.toLowerCase().includes(q) || c.tipo?.toLowerCase().includes(q);
      const matchTipo = !filterTipo || c.tipo === filterTipo;
      const matchEstado = !filterEstado || c.estado === filterEstado;
      const matchEsp = !filterEsp || c.especialidad === filterEsp;
      return matchSearch && matchTipo && matchEstado && matchEsp;
    });
  }, [clientes, search, filterTipo, filterEstado, filterEsp, carlos]);

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

  const handleDeleteBulk = () => {
    selected.forEach(id => deleteCliente(id));
    toast.success(`${selected.size} cliente${selected.size > 1 ? 's' : ''} eliminado${selected.size > 1 ? 's' : ''}.`);
    setSelected(new Set());
  };

  const handleImport = (rows, mode) => {
    const result = importClientes(rows, mode);
    toast.success(`Se importaron ${result.imported} clientes correctamente. ${result.skipped} omitidos por duplicado.`);
    return result;
  };

  const sel = `px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white`;

  const chk = 'w-4 h-4 rounded border-gray-300 text-[#1B4F8A] accent-[#1B4F8A] cursor-pointer';

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2 flex-1 min-w-0">
          <SearchBar value={search} onChange={s => { setSearch(s); setPage(1); setSelected(new Set()); }} placeholder="Buscar por nombre, ciudad..." className="w-64" />
          <select className={sel} value={filterTipo} onChange={e => { setFilterTipo(e.target.value); setPage(1); setSelected(new Set()); }}>
            <option value="">Todos los tipos</option>
            {TIPOS_CLIENTE.map(t => <option key={t}>{t}</option>)}
          </select>
          <select className={sel} value={filterEstado} onChange={e => { setFilterEstado(e.target.value); setPage(1); setSelected(new Set()); }}>
            <option value="">Todos los estados</option>
            <option>Activo</option><option>Inactivo</option>
          </select>
          <select className={sel} value={filterEsp} onChange={e => { setFilterEsp(e.target.value); setPage(1); setSelected(new Set()); }}>
            <option value="">Todas las especialidades</option>
            {espOptions.map(e => <option key={e}>{e}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          {!carlos && <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}><Upload className="w-4 h-4" />Importar</Button>}
          <Button size="sm" onClick={() => setFormOpen(true)}><Plus className="w-4 h-4" />Nuevo cliente</Button>
        </div>
      </div>

      {/* Barra de acciones de selección múltiple */}
      {selected.size > 0 && (
        <div className="flex items-center justify-between gap-4 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl">
          <span className="text-sm font-medium text-blue-800">
            {selected.size} cliente{selected.size > 1 ? 's' : ''} seleccionado{selected.size > 1 ? 's' : ''}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelected(new Set())}>Cancelar</Button>
            <Button variant="danger" size="sm" onClick={() => setDelBulkOpen(true)}>
              <Trash2 className="w-4 h-4" />Eliminar seleccionados ({selected.size})
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState icon={Users} title="Sin clientes" message="No se encontraron clientes con los filtros actuales." action={() => setFormOpen(true)} actionLabel="Nuevo cliente" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        className={chk}
                        checked={allPageSelected}
                        ref={el => { if (el) el.indeterminate = somePageSelected && !allPageSelected; }}
                        onChange={togglePage}
                        title="Seleccionar página"
                      />
                    </th>
                    {['Nombre', 'Tipo', 'Especialidad', 'Teléfono', 'Email', 'Ciudad', 'Alta', 'Estado'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginated.map(c => {
                    const isSelected = selected.has(c.id);
                    return (
                      <tr
                        key={c.id}
                        className={`hover:bg-gray-50 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50/60' : ''}`}
                        onClick={() => navigate(`/clientes/${c.id}`)}
                      >
                        <td className="px-4 py-3 w-10" onClick={e => toggleOne(c.id, e)}>
                          <input type="checkbox" className={chk} checked={isSelected} onChange={() => {}} />
                        </td>
                        <td className="px-4 py-3 font-medium text-[#1B4F8A]">{c.nombre}</td>
                        <td className="px-4 py-3 text-gray-600">{c.tipo}</td>
                        <td className="px-4 py-3 text-gray-500">{c.especialidad || '-'}</td>
                        <td className="px-4 py-3 text-gray-500">{c.telefono || '-'}</td>
                        <td className="px-4 py-3 text-gray-500">{c.email || '-'}</td>
                        <td className="px-4 py-3 text-gray-500">{c.ciudad || '-'}</td>
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
              <Pagination page={page} total={filtered.length} perPage={perPage} onChange={p => { setPage(p); setSelected(new Set()); }} onPerPageChange={n => { setPerPage(n); setPage(1); setSelected(new Set()); }} perPageOptions={[25, 50, 100]} />
            </div>
          </>
        )}
      </div>

      <ClienteForm open={formOpen} onClose={() => setFormOpen(false)}
        onSave={(data) => { addCliente(data); toast.success('Cliente creado correctamente.'); setFormOpen(false); }} />
      <ImportWizard open={importOpen} onClose={() => setImportOpen(false)} onImport={handleImport} />

      <ConfirmDialog
        open={delBulkOpen}
        onClose={() => setDelBulkOpen(false)}
        onConfirm={handleDeleteBulk}
        title="Eliminar clientes seleccionados"
        message={`¿Eliminar ${selected.size} cliente${selected.size > 1 ? 's' : ''}? Esta acción no se puede deshacer.`}
        confirmText={`Eliminar ${selected.size}`}
      />
    </div>
  );
}
