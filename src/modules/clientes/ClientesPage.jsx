import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Upload, Trash2, Users, Route, X, Eye, Copy } from 'lucide-react';
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
import { useEspecialidadesStore } from '../../store/especialidadesStore';
import { useSubespecialidadesStore } from '../../store/subespecialidadesStore';
import { useTiposClienteStore } from '../../store/tiposClienteStore';

export default function ClientesPage() {
  const navigate = useNavigate();
  const { clientes, addCliente, deleteCliente, deleteClientes, importClientes } = useClientesStore();
  const { user, isCarlos, CARLOS_ESPECIALIDADES } = useAuthStore();
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

  const carlos = isCarlos();
  const espOptions = carlos ? CARLOS_ESPECIALIDADES.filter(e => especialidades.includes(e)) : especialidades;

  // Mis clientes recientes (últimos 20 creados o modificados por el usuario actual)
  const misRecientes = useMemo(() => {
    if (!user?.id) return [];
    return clientes
      .filter(c => c.creadoPorId === user.id || c.modificadoPorId === user.id)
      .sort((a, b) => new Date(b.fechaModificacion || b.fechaAlta) - new Date(a.fechaModificacion || a.fechaAlta))
      .slice(0, 20);
  }, [clientes, user]);

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
    if (viewingSelected) return clientes.filter(c => selected.has(c.id));
    return baseFiltered;
  }, [baseFiltered, viewingSelected, selected, clientes]);

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
      {misRecientes.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Mis clientes recientes
          </p>
          <div className="flex flex-wrap gap-2">
            {misRecientes.map(c => (
              <button
                key={c.id}
                onClick={() => navigate(`/clientes/${c.id}`)}
                className="flex items-start gap-3 px-4 py-3 bg-white border border-gray-100 rounded-xl shadow-sm hover:border-[#1B4F8A]/30 hover:shadow-md transition-all text-left cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-[#1B4F8A]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-[#1B4F8A]">{c.nombre?.charAt(0)?.toUpperCase()}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate max-w-[180px]">{c.nombre}</p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[180px]">
                    {[c.especialidad, c.ciudad].filter(Boolean).join(' · ')}
                  </p>
                  {c.telefono && <p className="text-xs text-gray-400">{c.telefono}</p>}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
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
          {!carlos && (
            <Button variant="outline" size="sm" onClick={() => setSanicomOpen(true)}>
              <Upload className="w-4 h-4" />Importar planilla Sanicom
            </Button>
          )}
          {!carlos && (
            <Button variant="outline" size="sm" onClick={() => setDupOpen(true)}>
              <Copy className="w-4 h-4" />Gestionar duplicados
            </Button>
          )}
          <Button size="sm" onClick={() => setFormOpen(true)}><Plus className="w-4 h-4" />Nuevo cliente</Button>
        </div>
      </div>

      {/* Barra de selección múltiple */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-blue-800">
              Seleccionados: {selected.size} cliente{selected.size > 1 ? 's' : ''}
            </span>
            {viewingSelected && (
              <span className="text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full font-medium">
                Vista filtrada
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setViewingSelected(v => !v); setPage(1); }}
            >
              <Eye className="w-4 h-4" />
              {viewingSelected ? 'Ver todos' : 'Ver seleccionados'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearSelection}
            >
              <X className="w-4 h-4" />
              Limpiar selección
            </Button>
            <Button
              size="sm"
              onClick={() => setRutaOpen(true)}
            >
              <Route className="w-4 h-4" />
              Crear ruta ({selected.size})
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setDelBulkOpen(true)}
            >
              <Trash2 className="w-4 h-4" />
              Eliminar ({selected.size})
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
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
                    {['Nombre', 'Contacto', 'Tipo', 'Especialidad', 'Teléfono', 'Email', 'Ciudad', 'País', 'Alta', 'Estado'].map(h => (
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
                        <td className="px-4 py-3 text-gray-500">{c.contactoPrincipal || '-'}</td>
                        <td className="px-4 py-3 text-gray-600">{c.tipo}</td>
                        <td className="px-4 py-3 text-gray-500">
                          {c.especialidad
                            ? c.subespecialidad
                              ? `${c.especialidad} (${c.subespecialidad})`
                              : c.especialidad
                            : '-'}
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
