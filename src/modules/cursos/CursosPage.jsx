import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, Search, X } from 'lucide-react';
import { useCursosStore } from '../../store/cursosStore';
import { useClientesStore } from '../../store/clientesStore';
import { useAuthStore } from '../../store/authStore';
import Button from '../../components/ui/Button';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { formatDate } from '../../utils/formatters';
import toast from 'react-hot-toast';

const ESTADOS = ['Interesado', 'Confirmado'];

const ESTADO_CLS = {
  'Interesado': 'bg-yellow-100 text-yellow-700',
  'Confirmado': 'bg-green-100 text-green-700',
};

function InscripcionForm({ initial, clientes, inscripciones, onSave, onClose }) {
  const { user } = useAuthStore();
  const [clienteId, setClienteId] = useState(initial?.cliente_id || '');
  const [estado, setEstado] = useState(initial?.estado || 'Interesado');
  const [notas, setNotas] = useState(initial?.notas || '');
  const [q, setQ] = useState('');

  const yaInscritos = new Set(inscripciones.filter(i => i.id !== initial?.id).map(i => i.cliente_id));
  const clientesFiltrados = useMemo(() => {
    if (!q.trim()) return clientes.filter(c => !yaInscritos.has(c.id));
    return clientes.filter(c =>
      !yaInscritos.has(c.id) &&
      c.nombre?.toLowerCase().includes(q.toLowerCase())
    );
  }, [q, clientes, yaInscritos]);

  const clienteSeleccionado = clientes.find(c => c.id === clienteId);

  const handleSave = () => {
    if (!clienteId) return toast.error('Selecciona un cliente.');
    onSave({
      cliente_id: clienteId,
      estado,
      notas: notas.trim() || null,
      fecha: initial?.fecha || new Date().toISOString().slice(0, 10),
      usuario_id: user?.id,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">{initial ? 'Editar inscripción' : '➕ Añadir cliente al curso'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"><X className="w-4 h-4" /></button>
        </div>

        {/* Buscador de clientes (solo al crear) */}
        {!initial && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Cliente</label>
            {clienteSeleccionado ? (
              <div className="flex items-center justify-between px-3 py-2 border border-blue-200 bg-blue-50 rounded-lg">
                <span className="text-sm font-medium text-blue-800">{clienteSeleccionado.nombre}</span>
                <button onClick={() => { setClienteId(''); setQ(''); }} className="text-blue-400 hover:text-blue-600 cursor-pointer"><X className="w-4 h-4" /></button>
              </div>
            ) : (
              <>
                <div className="relative mb-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    autoFocus
                    type="text"
                    value={q}
                    onChange={e => setQ(e.target.value)}
                    placeholder="Buscar cliente..."
                    className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none"
                  />
                </div>
                <div className="max-h-40 overflow-y-auto border border-gray-100 rounded-lg divide-y divide-gray-50">
                  {clientesFiltrados.slice(0, 30).map(c => (
                    <button
                      key={c.id}
                      onClick={() => { setClienteId(c.id); setQ(''); }}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                    >
                      {c.nombre}
                    </button>
                  ))}
                  {clientesFiltrados.length === 0 && <p className="text-xs text-gray-400 text-center py-3">Sin resultados</p>}
                </div>
              </>
            )}
          </div>
        )}
        {initial && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Cliente</label>
            <p className="text-sm font-medium text-gray-800 px-3 py-2 bg-gray-50 rounded-lg">{clientes.find(c => c.id === initial.cliente_id)?.nombre || '—'}</p>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Estado</label>
          <select value={estado} onChange={e => setEstado(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none bg-white">
            {ESTADOS.map(e => <option key={e}>{e}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Notas (opcional)</label>
          <textarea
            rows={2}
            value={notas}
            onChange={e => setNotas(e.target.value)}
            placeholder="Observaciones..."
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none resize-none"
          />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" onClick={handleSave} disabled={!clienteId}>
            {initial ? 'Guardar cambios' : 'Añadir al curso'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function CursosPage() {
  const { inscripciones, add, update, remove } = useCursosStore();
  const { clientes } = useClientesStore();
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [delId, setDelId] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [q, setQ] = useState('');

  const rows = useMemo(() => {
    return inscripciones
      .map(i => {
        const cliente = clientes.find(c => c.id === i.cliente_id);
        return { ...i, cliente };
      })
      .filter(i => {
        if (!i.cliente) return false;
        if (filtroEstado && i.estado !== filtroEstado) return false;
        if (q.trim() && !i.cliente.nombre?.toLowerCase().includes(q.toLowerCase())) return false;
        return true;
      });
  }, [inscripciones, clientes, filtroEstado, q]);

  const handleSave = async (data) => {
    if (editItem) {
      await update(editItem.id, data);
      toast.success('Inscripción actualizada.');
      setEditItem(null);
    } else {
      await add(data);
      toast.success('Cliente añadido al curso.');
      setFormOpen(false);
    }
  };

  const handleDelete = async () => {
    await remove(delId);
    setDelId(null);
    toast.success('Eliminado del curso.');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Cursos Formativos</h1>
          <p className="text-sm text-gray-500 mt-0.5">{rows.length} cliente{rows.length !== 1 ? 's' : ''} inscrito{rows.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="w-4 h-4" /> Añadir cliente
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Buscar cliente..."
            className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none w-52"
          />
        </div>
        <select
          value={filtroEstado}
          onChange={e => setFiltroEstado(e.target.value)}
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none bg-white"
        >
          <option value="">Todos los estados</option>
          {ESTADOS.map(e => <option key={e}>{e}</option>)}
        </select>
      </div>

      {/* Tabla desktop */}
      <div className="hidden sm:block bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wide">
              <th className="text-left px-4 py-3 font-medium">Cliente</th>
              <th className="text-left px-4 py-3 font-medium">Contacto</th>
              <th className="text-left px-4 py-3 font-medium">Teléfono</th>
              <th className="text-left px-4 py-3 font-medium">Estado</th>
              <th className="text-left px-4 py-3 font-medium">Fecha añadido</th>
              <th className="text-left px-4 py-3 font-medium">Notas</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.length === 0 && (
              <tr><td colSpan={7} className="text-center text-gray-400 py-12 text-sm">Sin clientes inscritos</td></tr>
            )}
            {rows.map(row => {
              const cp = (row.cliente.contactos || []).find(c => c.esPrincipal) || row.cliente.contactos?.[0];
              return (
                <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-800">
                    <Link to={`/clientes/${row.cliente.id}`} className="hover:text-[#1B4F8A] hover:underline">
                      {row.cliente.nombre}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{cp?.nombre || row.cliente.contactoPrincipal || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {row.cliente.telefono
                      ? <a href={`tel:${row.cliente.telefono}`} className="hover:text-[#1B4F8A]">{row.cliente.telefono}</a>
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ESTADO_CLS[row.estado] || 'bg-gray-100 text-gray-600'}`}>
                      {row.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(row.fecha)}</td>
                  <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate">{row.notas || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => setEditItem(row)} className="p-1.5 text-gray-400 hover:text-[#1B4F8A] hover:bg-gray-100 rounded-lg cursor-pointer transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setDelId(row.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg cursor-pointer transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Cards móvil */}
      <div className="sm:hidden space-y-3">
        {rows.length === 0 && (
          <div className="text-center text-gray-400 py-12 text-sm">Sin clientes inscritos</div>
        )}
        {rows.map(row => {
          const cp = (row.cliente.contactos || []).find(c => c.esPrincipal) || row.cliente.contactos?.[0];
          return (
            <div key={row.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <Link to={`/clientes/${row.cliente.id}`} className="text-sm font-semibold text-gray-800 hover:text-[#1B4F8A] hover:underline">
                  {row.cliente.nombre}
                </Link>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${ESTADO_CLS[row.estado] || 'bg-gray-100 text-gray-600'}`}>
                  {row.estado}
                </span>
              </div>
              {cp && <p className="text-xs text-gray-500">{cp.nombre}</p>}
              {row.cliente.telefono && (
                <a href={`tel:${row.cliente.telefono}`} className="text-xs text-gray-500 hover:text-[#1B4F8A]">{row.cliente.telefono}</a>
              )}
              {row.notas && <p className="text-xs text-gray-500 italic">"{row.notas}"</p>}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-gray-400">{formatDate(row.fecha)}</span>
                <div className="flex gap-1">
                  <button onClick={() => setEditItem(row)} className="p-1.5 text-gray-400 hover:text-[#1B4F8A] hover:bg-gray-100 rounded-lg cursor-pointer"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setDelId(row.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modales */}
      {formOpen && (
        <InscripcionForm
          clientes={clientes}
          inscripciones={inscripciones}
          onSave={handleSave}
          onClose={() => setFormOpen(false)}
        />
      )}
      {editItem && (
        <InscripcionForm
          initial={editItem}
          clientes={clientes}
          inscripciones={inscripciones}
          onSave={handleSave}
          onClose={() => setEditItem(null)}
        />
      )}
      <ConfirmDialog
        open={!!delId}
        title="¿Eliminar del curso?"
        message="Se eliminará este cliente del listado del curso."
        onConfirm={handleDelete}
        onCancel={() => setDelId(null)}
      />
    </div>
  );
}
