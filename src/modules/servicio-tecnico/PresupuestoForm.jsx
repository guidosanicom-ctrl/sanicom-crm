import { useState, useEffect, useMemo } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import ClienteSearchInput from '../../components/ui/ClienteSearchInput';
import ArticuloSearchInput from '../../components/ui/ArticuloSearchInput';
import { Plus, Trash2 } from 'lucide-react';
import { useClientesStore } from '../../store/clientesStore';
import { useAuthStore } from '../../store/authStore';
import { useStelCatalogoStore } from '../../store/stelCatalogoStore';
import { formatCurrency } from '../../utils/formatters';
import { ESTADOS_PRESUPUESTO, FORMAS_PAGO, CONDICIONES_DEFAULT } from '../../utils/constants';

const IVA_OPTIONS = [0, 10, 21];
const emptyLinea = () => ({ concepto: '', cantidad: 1, precioUnitario: 0 });
const hoy = () => new Date().toISOString().split('T')[0];

const empty = {
  clienteId: '', equipoNombre: '', fecha: hoy(), validezDias: 30,
  estado: 'Borrador', notas: '',
  formaPago: FORMAS_PAGO[0], condiciones: CONDICIONES_DEFAULT,
};

const inp = 'w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20';

export default function PresupuestoForm({ open, onClose, onSave, initial }) {
  const { clientes } = useClientesStore();
  const { user } = useAuthStore();
  // El campo Equipo es de servicio técnico; los comerciales (ventas) no lo usan
  const mostrarEquipo = user?.role !== 'Comercial Restringido';
  const { items: stelItems, config: stelConfig, initialize: initStel, itemsParaUsuario } = useStelCatalogoStore();
  useEffect(() => { if (open) initStel(); }, [open, initStel]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const articulos = useMemo(() => itemsParaUsuario(user), [stelItems, stelConfig, user, itemsParaUsuario]);
  const [form, setForm] = useState(empty);
  const [lineas, setLineas] = useState([emptyLinea()]);
  const [iva, setIva] = useState(21);
  const [errors, setErrors] = useState({});

  const [descAbiertas, setDescAbiertas] = useState(() => new Set());
  useEffect(() => {
    if (open) {
      setDescAbiertas(new Set());
      setForm(initial ? {
        clienteId: initial.clienteId || '',
        equipoNombre: initial.equipoNombre || '',
        fecha: initial.fecha || hoy(),
        validezDias: initial.validezDias ?? 30,
        estado: initial.estado || 'Borrador',
        notas: initial.notas || '',
        formaPago: initial.formaPago || '',
        condiciones: initial.condiciones || '',
      } : empty);
      setLineas(initial?.lineas?.length ? initial.lineas : [emptyLinea()]);
      setIva(initial?.iva ?? 21);
      setErrors({});
    }
  }, [open, initial]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setLinea = (i, k, v) => setLineas(ls => ls.map((l, idx) => idx === i ? { ...l, [k]: v } : l));
  // Cambiar el texto NO quita el vínculo con STEL: así se puede retocar el nombre
  // ("Ecógrafo X con sonda C5-2") y seguir enviándolo a STEL con su artículo.
  const setConceptoTexto = (i, v) => setLinea(i, 'concepto', v);
  // Quitar el vínculo a propósito (la línea pasa a ser texto libre)
  const desvincular = (i) => setLineas(ls => ls.map((l, idx) => idx === i
    ? { concepto: l.concepto, descripcion: l.descripcion, cantidad: l.cantidad, precioUnitario: l.precioUnitario }
    : l));
  const abrirDesc = (i) => setDescAbiertas(s => new Set(s).add(i));
  const elegirArticulo = (i, a) => setLineas(ls => ls.map((l, idx) => idx === i
    ? { ...l, concepto: a.nombre, precioUnitario: a.precio, referencia: a.referencia, stelItemId: a.stelId, stelTipo: a.tipo, ivaPct: a.ivaPct }
    : l));
  const addLinea = () => setLineas(ls => [...ls, emptyLinea()]);
  const removeLinea = (i) => setLineas(ls => ls.filter((_, idx) => idx !== i));

  const totalSinIva = useMemo(() =>
    lineas.reduce((s, l) => s + (parseFloat(l.cantidad) || 0) * (parseFloat(l.precioUnitario) || 0), 0),
    [lineas]);
  const totalConIva = totalSinIva * (1 + iva / 100);

  const validate = () => {
    const e = {};
    if (!form.clienteId) e.clienteId = 'Requerido';
    if (!lineas.some(l => l.concepto.trim())) e.lineas = 'Añade al menos un concepto';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    const lineasValidas = lineas.filter(l => l.concepto.trim());
    onSave({ ...form, lineas: lineasValidas, iva, totalSinIva, totalConIva });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? `Editar presupuesto ${initial.numero || ''}` : 'Nuevo presupuesto'}
      size="lg"
      footer={<><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={handleSave}>{initial ? 'Guardar' : 'Crear'}</Button></>}
    >
      <div className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Cliente *</label>
            <ClienteSearchInput
              value={form.clienteId}
              onChange={id => set('clienteId', id)}
              clientes={clientes}
              error={!!errors.clienteId}
              placeholder="Buscar cliente..."
            />
            {errors.clienteId && <p className="text-xs text-red-500 mt-1">{errors.clienteId}</p>}
          </div>
          {mostrarEquipo && <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Equipo</label>
            <input type="text" value={form.equipoNombre} onChange={e => set('equipoNombre', e.target.value)}
              placeholder="Nombre del equipo" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none" />
          </div>}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Fecha</label>
            <input type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Validez (días)</label>
            <input type="number" min={0} value={form.validezDias} onChange={e => set('validezDias', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Estado</label>
            <select value={form.estado} onChange={e => set('estado', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none">
              {ESTADOS_PRESUPUESTO.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Líneas */}
        <div>
          <div className="hidden sm:grid grid-cols-[1fr_80px_100px_90px_32px] gap-2 mb-1 px-1">
            {['Concepto', 'Cant.', 'Precio unit.', 'Subtotal', ''].map(h => (
              <p key={h} className="text-xs font-medium text-gray-500">{h}</p>
            ))}
          </div>
          <div className="space-y-2">
            {lineas.map((l, i) => {
              const sub = (parseFloat(l.cantidad) || 0) * (parseFloat(l.precioUnitario) || 0);
              return (
                <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_80px_100px_90px_32px] gap-2 items-start bg-gray-50 rounded-lg p-2 sm:bg-transparent sm:p-0">
                  <div className="space-y-1">
                    <ArticuloSearchInput
                      className={inp}
                      linea={l}
                      articulos={articulos}
                      onSelect={a => elegirArticulo(i, a)}
                      onTextChange={v => setConceptoTexto(i, v)}
                      onUnlink={() => desvincular(i)}
                    />
                    {(l.descripcion || descAbiertas.has(i)) ? (
                      <textarea
                        rows={2}
                        className={`${inp} resize-y text-xs`}
                        placeholder="Descripción (opcional): incluye sonda convex, carro, formación…"
                        value={l.descripcion || ''}
                        onChange={e => setLinea(i, 'descripcion', e.target.value)}
                        autoFocus={!l.descripcion}
                      />
                    ) : (
                      <button type="button" onClick={() => abrirDesc(i)}
                        className="text-[11px] text-gray-400 hover:text-[#1B4F8A] cursor-pointer">
                        + Añadir descripción
                      </button>
                    )}
                  </div>
                  <input
                    className={inp}
                    type="number" min={0} step="0.5"
                    value={l.cantidad}
                    onChange={e => setLinea(i, 'cantidad', e.target.value)}
                  />
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">€</span>
                    <input
                      className={`${inp} pl-5`}
                      type="number" min={0} step="0.01"
                      value={l.precioUnitario}
                      onChange={e => setLinea(i, 'precioUnitario', e.target.value)}
                    />
                  </div>
                  <p className="text-sm font-semibold text-gray-800 text-right sm:text-left">
                    {formatCurrency(sub)}
                  </p>
                  <button
                    onClick={() => removeLinea(i)}
                    disabled={lineas.length === 1}
                    className="p-1 text-gray-300 hover:text-red-400 disabled:opacity-30 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
          {errors.lineas && <p className="text-xs text-red-500 mt-1">{errors.lineas}</p>}
          <button
            onClick={addLinea}
            className="mt-2 flex items-center gap-1 text-xs text-[#1B4F8A] hover:underline cursor-pointer font-medium"
          >
            <Plus className="w-3.5 h-3.5" />Añadir línea
          </button>
        </div>

        {/* Totales */}
        <div className="border-t border-gray-100 pt-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">Total sin IVA</p>
            <p className="text-sm font-semibold text-gray-800">{formatCurrency(totalSinIva)}</p>
          </div>
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-gray-600">IVA</p>
            <div className="flex gap-2">
              {IVA_OPTIONS.map(pct => (
                <button
                  key={pct}
                  onClick={() => setIva(pct)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer
                    ${iva === pct ? 'bg-[#1B4F8A] text-white border-[#1B4F8A]' : 'border-gray-200 text-gray-600 hover:border-gray-400'}`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-gray-200">
            <p className="text-sm font-bold text-gray-800">Total con IVA</p>
            <p className="text-lg font-bold text-[#1B4F8A]">{formatCurrency(totalConIva)}</p>
          </div>
        </div>

        {/* Condiciones */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Forma de pago</label>
            <input list="formas-pago" value={form.formaPago} onChange={e => set('formaPago', e.target.value)}
              placeholder="Elegir o escribir…"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none" />
            <datalist id="formas-pago">{FORMAS_PAGO.map(f => <option key={f} value={f} />)}</datalist>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Condiciones</label>
            <textarea rows={2} value={form.condiciones} onChange={e => set('condiciones', e.target.value)}
              placeholder="Plazo de entrega, garantía, portes…"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none resize-none" />
          </div>
        </div>

        {/* Notas */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Notas (opcional)</label>
          <textarea
            rows={2}
            value={form.notas}
            onChange={e => set('notas', e.target.value)}
            placeholder="Condiciones, observaciones..."
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none resize-none"
          />
        </div>
      </div>
    </Modal>
  );
}
