import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Upload, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { useClientesStore } from '../../store/clientesStore';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import SearchBar from '../../components/shared/SearchBar';
import Pagination from '../../components/shared/Pagination';
import EmptyState from '../../components/shared/EmptyState';
import ClienteForm from './ClienteForm';
import ImportWizard from './ImportWizard';
import { formatDate } from '../../utils/formatters';
import { TIPOS_CLIENTE, ESPECIALIDADES } from '../../utils/constants';
import { Users } from 'lucide-react';

export default function ClientesPage() {
  const navigate = useNavigate();
  const { clientes, addCliente, importClientes } = useClientesStore();
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [filterEsp, setFilterEsp] = useState('');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const PER_PAGE = 10;

  const filtered = useMemo(() => {
    return clientes.filter(c => {
      const q = search.toLowerCase();
      const matchSearch = !q || c.nombre?.toLowerCase().includes(q) || c.ciudad?.toLowerCase().includes(q) || c.tipo?.toLowerCase().includes(q);
      const matchTipo = !filterTipo || c.tipo === filterTipo;
      const matchEstado = !filterEstado || c.estado === filterEstado;
      const matchEsp = !filterEsp || c.especialidad === filterEsp;
      return matchSearch && matchTipo && matchEstado && matchEsp;
    });
  }, [clientes, search, filterTipo, filterEstado, filterEsp]);

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const handleImport = (rows, mode) => {
    const result = importClientes(rows, mode);
    toast.success(`Se importaron ${result.imported} clientes correctamente. ${result.skipped} omitidos por duplicado.`);
    return result;
  };

  const sel = `px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white`;

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2 flex-1 min-w-0">
          <SearchBar value={search} onChange={s => { setSearch(s); setPage(1); }} placeholder="Buscar por nombre, ciudad..." className="w-64" />
          <select className={sel} value={filterTipo} onChange={e => { setFilterTipo(e.target.value); setPage(1); }}>
            <option value="">Todos los tipos</option>
            {TIPOS_CLIENTE.map(t => <option key={t}>{t}</option>)}
          </select>
          <select className={sel} value={filterEstado} onChange={e => { setFilterEstado(e.target.value); setPage(1); }}>
            <option value="">Todos los estados</option>
            <option>Activo</option><option>Inactivo</option>
          </select>
          <select className={sel} value={filterEsp} onChange={e => { setFilterEsp(e.target.value); setPage(1); }}>
            <option value="">Todas las especialidades</option>
            {ESPECIALIDADES.map(e => <option key={e}>{e}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}><Upload className="w-4 h-4" />Importar</Button>
          <Button size="sm" onClick={() => setFormOpen(true)}><Plus className="w-4 h-4" />Nuevo cliente</Button>
        </div>
      </div>

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
                    {['Nombre', 'Tipo', 'Especialidad', 'Teléfono', 'Email', 'Ciudad', 'Alta', 'Estado'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginated.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => navigate(`/clientes/${c.id}`)}>
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
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 pb-4">
              <Pagination page={page} total={filtered.length} perPage={PER_PAGE} onChange={setPage} />
            </div>
          </>
        )}
      </div>

      <ClienteForm open={formOpen} onClose={() => setFormOpen(false)}
        onSave={(data) => { addCliente(data); toast.success('Cliente creado correctamente.'); setFormOpen(false); }} />
      <ImportWizard open={importOpen} onClose={() => setImportOpen(false)} onImport={handleImport} />
    </div>
  );
}
