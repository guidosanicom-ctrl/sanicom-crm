import { useState, useMemo, useEffect } from 'react';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useEquiposStore } from '../../store/equiposStore';
import { useAuthStore } from '../../store/authStore';
import { useCategoriasStore } from '../../store/categoriasStore';
import { useEspecialidadesStore } from '../../store/especialidadesStore';
import { useCatalogoEquiposStore, SUBCATEGORIA_LIBRE } from '../../store/catalogoEquiposStore';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import SearchBar from '../../components/shared/SearchBar';
import Pagination from '../../components/shared/Pagination';
import EmptyState from '../../components/shared/EmptyState';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import Modal from '../../components/ui/Modal';
import { formatCurrency } from '../../utils/formatters';
import { Package } from 'lucide-react';

const emptyBase = { nombre: '', marca: '', modelo: '', unidades: '', categoria: '', subcategoria: '', otroTexto: '', descripcion: '', precioVenta: '', precioCoste: '', estado: 'Activo', especialidades: [] };

function EquipoForm({ open, onClose, onSave, initial, readOnly }) {
  const { especialidades } = useEspecialidadesStore();
  const { categorias: getCats, subcategorias: getSubs } = useCatalogoEquiposStore();
  // catSelect = raw catalog pick ('Otro' stays as 'Otro'); form.categoria = valor final guardado
  const [catSelect, setCatSelect] = useState('');
  const [form, setForm] = useState(initial || { ...emptyBase });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      const f = initial || { ...emptyBase };
      setForm(f);
      setErrors({});
      // if saved with otroTexto, restore 'Otro' in the picker
      setCatSelect(f.otroTexto ? 'Otro' : (f.categoria || ''));
    }
  }, [open, initial]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleCatChange = (val) => {
    setCatSelect(val);
    if (val === 'Otro') {
      setForm(f => ({ ...f, categoria: '', subcategoria: '', otroTexto: '' }));
    } else {
      const nombre = val; // subcategoria not chosen yet
      setForm(f => ({ ...f, categoria: val, subcategoria: '', otroTexto: '', nombre: val || f.nombre }));
    }
  };

  const handleSubChange = (val) => {
    const clearOtro = val !== SUBCATEGORIA_LIBRE ? { otroTexto: '' } : {};

    if (val && val !== SUBCATEGORIA_LIBRE && val.includes(' ')) {
      // "SonoScape X11" → marca=SonoScape, modelo=X11, nombre=SonoScape X11
      const spaceIdx = val.indexOf(' ');
      const marca = val.slice(0, spaceIdx);
      const modelo = val.slice(spaceIdx + 1);
      setForm(f => ({ ...f, subcategoria: val, ...clearOtro, nombre: val, marca, modelo }));
    } else {
      const catFinal = catSelect === 'Otro' ? (form.otroTexto?.trim() || '') : catSelect;
      const displaySub = val === SUBCATEGORIA_LIBRE ? '' : val;
      const nombre = [catFinal, displaySub].filter(Boolean).join(' ');
      setForm(f => ({ ...f, subcategoria: val, ...clearOtro, nombre: nombre || f.nombre }));
    }
  };

  const handleOtroChange = (val) => {
    // Used for both categoria='Otro' text AND subcategoria=SUBCATEGORIA_LIBRE text
    if (catSelect === 'Otro') {
      const nombre = [val.trim(), form.subcategoria].filter(Boolean).join(' ');
      setForm(f => ({ ...f, otroTexto: val, categoria: val.trim(), nombre: nombre || f.nombre }));
    } else {
      // SUBCATEGORIA_LIBRE case — store free text in otroTexto, nombre = cat + free text
      const catFinal = catSelect;
      const nombre = [catFinal, val.trim()].filter(Boolean).join(' — ');
      setForm(f => ({ ...f, otroTexto: val, nombre: nombre || f.nombre }));
    }
  };

  const validate = () => {
    const e = {};
    if (!form.nombre.trim()) e.nombre = 'Requerido';
    if (!form.marca.trim()) e.marca = 'Requerido';
    if (!form.modelo.trim()) e.modelo = 'Requerido';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({ ...form, precioVenta: Number(form.precioVenta) || 0, precioCoste: Number(form.precioCoste) || 0, unidades: form.unidades !== '' ? Math.max(0, parseInt(form.unidades) || 0) : null });
    onClose();
    setForm(empty);
  };

  const inp = (k, type='text') => ({
    type, value: form[k] || '', onChange: e => set(k, e.target.value),
    disabled: readOnly,
    className: `w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${errors[k] ? 'border-red-400' : 'border-gray-200'} ${readOnly ? 'bg-gray-50' : ''}`,
  });

  const toggleEsp = (e) => {
    const list = form.especialidades || [];
    set('especialidades', list.includes(e) ? list.filter(x => x !== e) : [...list, e]);
  };

  return (
    <Modal open={open} onClose={onClose} title={readOnly ? 'Detalle del equipo' : initial ? 'Editar equipo' : 'Nuevo equipo'} size="lg"
      footer={readOnly ? <Button variant="outline" onClick={onClose}>Cerrar</Button> : <><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={handleSave}>{initial ? 'Guardar' : 'Crear'}</Button></>}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Categoría del catálogo</label>
          {readOnly ? (
            <div className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-700">
              {[form.categoria, form.subcategoria].filter(Boolean).join(' — ') || '-'}
            </div>
          ) : (
            <div className="space-y-2">
              <select
                value={catSelect}
                onChange={e => handleCatChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
              >
                <option value="">Sin especificar</option>
                {getCats().map(c => <option key={c} value={c}>{c}</option>)}
                <option value="Otro">Otro</option>
              </select>
              {catSelect === 'Otro' && (
                <input
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  value={form.otroTexto || ''}
                  onChange={e => handleOtroChange(e.target.value)}
                  placeholder="Especifica la categoría..."
                  autoFocus
                />
              )}
              {catSelect && catSelect !== 'Otro' && getSubs(catSelect).length > 0 && (
                <select
                  value={form.subcategoria || ''}
                  onChange={e => handleSubChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                >
                  <option value="">Modelo / subcategoría (opcional)</option>
                  {getSubs(catSelect).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              )}
              {form.subcategoria === SUBCATEGORIA_LIBRE && (
                <input
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  value={form.otroTexto || ''}
                  onChange={e => handleOtroChange(e.target.value)}
                  placeholder="Marca y modelo..."
                  autoFocus
                />
              )}
            </div>
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Nombre *</label>
          <input {...inp('nombre')} placeholder="Se rellena automáticamente o escribe manualmente" />
          {errors.nombre && <p className="text-xs text-red-500 mt-1">{errors.nombre}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Marca *</label>
          <input {...inp('marca')} placeholder="Philips, GE..." />
          {errors.marca && <p className="text-xs text-red-500 mt-1">{errors.marca}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Modelo *</label>
          <input {...inp('modelo')} placeholder="Modelo" />
          {errors.modelo && <p className="text-xs text-red-500 mt-1">{errors.modelo}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Unidades en stock</label>
          <input {...inp('unidades', 'number')} placeholder="0" min={0} step={1} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Precio de venta (€)</label>
          <input {...inp('precioVenta', 'number')} placeholder="0" min={0} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Precio de coste (€) <span className="text-gray-300">(privado)</span></label>
          <input {...inp('precioCoste', 'number')} placeholder="0" min={0} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Estado</label>
          <select value={form.estado} onChange={e => set('estado', e.target.value)} disabled={readOnly}
            className={`w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none ${readOnly ? 'bg-gray-50' : ''}`}>
            <option>Activo</option><option>Demo</option><option>Descatalogado</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Descripción técnica</label>
          <textarea {...inp('descripcion')} rows={3} placeholder="Descripción técnica del equipo..."
            className={`w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none resize-none ${readOnly ? 'bg-gray-50' : ''}`} />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-2">Especialidades médicas relacionadas</label>
          <div className="flex flex-wrap gap-2">
            {especialidades.map(e => (
              <button key={e} type="button" onClick={() => !readOnly && toggleEsp(e)} disabled={readOnly}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${readOnly ? 'cursor-default' : 'cursor-pointer'} ${(form.especialidades || []).includes(e) ? 'bg-[#1B4F8A] text-white border-[#1B4F8A]' : 'border-gray-200 text-gray-600 hover:border-gray-400'}`}>
                {e}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default function EquiposPage() {
  const { equipos, addEquipo, updateEquipo, deleteEquipo } = useEquiposStore();
  const { isReadOnly } = useAuthStore();
  const { categorias } = useCategoriasStore();
  const readOnly = isReadOnly('equipos');
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [delOpen, setDelOpen] = useState(false);
  const PER_PAGE = 100;

  const filtered = useMemo(() => equipos.filter(e => {
    const q = search.toLowerCase();
    const matchSearch = !q || e.nombre?.toLowerCase().includes(q) || e.marca?.toLowerCase().includes(q) || e.modelo?.toLowerCase().includes(q);
    return matchSearch && (!filterCat || e.categoria === filterCat) && (!filterEstado || e.estado === filterEstado);
  }).sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '', 'es')), [equipos, search, filterCat, filterEstado]);

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const sel = `px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none bg-white`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <SearchBar value={search} onChange={s => { setSearch(s); setPage(1); }} placeholder="Buscar por nombre, marca, modelo..." className="w-64" />
          <select className={sel} value={filterCat} onChange={e => { setFilterCat(e.target.value); setPage(1); }}>
            <option value="">Todas las categorías</option>
            {categorias.map(c => <option key={c}>{c}</option>)}
          </select>
          <select className={sel} value={filterEstado} onChange={e => { setFilterEstado(e.target.value); setPage(1); }}>
            <option value="">Todos los estados</option>
            <option>Activo</option><option>Demo</option><option>Descatalogado</option>
          </select>
        </div>
        {!readOnly && <Button size="sm" onClick={() => { setSelected(null); setFormOpen(true); }}><Plus className="w-4 h-4" />Nuevo equipo</Button>}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState icon={Package} title="Sin equipos" message="No hay equipos con los filtros actuales." action={!readOnly ? () => setFormOpen(true) : null} actionLabel="Nuevo equipo" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Nombre', 'Marca', 'Modelo', 'Uds.', 'Categoría', 'Precio venta', 'Estado', 'Acciones'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginated.map(e => (
                    <tr key={e.id} className={e.estado === 'Demo' ? 'bg-red-200 hover:bg-red-300' : 'hover:bg-gray-50'}>
                      <td className="px-4 py-3 font-medium cursor-pointer text-[#1B4F8A]" onClick={() => { setSelected(e); setFormOpen(true); }}>{e.nombre}</td>
                      <td className="px-4 py-3 text-gray-600">{e.marca}</td>
                      <td className="px-4 py-3 text-gray-500">{e.modelo}</td>
                      <td className="px-4 py-3 text-center text-gray-700 font-medium">{e.unidades ?? '-'}</td>
                      <td className="px-4 py-3 text-gray-500">{e.categoria}</td>
                      <td className="px-4 py-3 font-semibold text-[#1B4F8A]">{formatCurrency(e.precioVenta)}</td>
                      <td className="px-4 py-3"><Badge color={e.estado === 'Activo' ? 'green' : e.estado === 'Demo' ? 'red' : 'gray'}>{e.estado}</Badge></td>
                      <td className="px-4 py-3">
                        <button onClick={() => { setSelected(e); setFormOpen(true); }} className="text-blue-600 hover:underline text-xs cursor-pointer mr-2">{readOnly ? 'Ver' : 'Editar'}</button>
                        {!readOnly && <button onClick={() => { setSelected(e); setDelOpen(true); }} className="text-red-500 hover:underline text-xs cursor-pointer">Eliminar</button>}
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

      <EquipoForm open={formOpen} onClose={() => { setFormOpen(false); setSelected(null); }} initial={selected} readOnly={readOnly}
        onSave={(data) => {
          if (selected) { updateEquipo(selected.id, data); toast.success('Equipo actualizado.'); }
          else { addEquipo(data); toast.success('Equipo creado.'); }
        }} />
      <ConfirmDialog open={delOpen} onClose={() => setDelOpen(false)}
        onConfirm={() => { deleteEquipo(selected?.id); toast.success('Equipo eliminado.'); setSelected(null); }}
        title="Eliminar equipo"
        message={`¿Eliminar "${selected?.nombre}"?`} />
    </div>
  );
}
