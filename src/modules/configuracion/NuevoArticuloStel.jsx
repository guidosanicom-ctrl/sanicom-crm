import { useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { useStelCatalogoStore, prefijoReferencia } from '../../store/stelCatalogoStore';
import { useAuthStore } from '../../store/authStore';
import { AREAS_CATALOGO } from '../../utils/constants';

const vacio = { tipo: 'product', referencia: '', nombre: '', descripcion: '', precio: '', ivaPct: 21, categoriaId: '', areas: [] };

/**
 * Alta de un artículo nuevo: se crea en STEL y queda en el catálogo del CRM con sus áreas.
 * Se monta solo mientras está abierto, así el formulario empieza vacío cada vez.
 */
export default function NuevoArticuloStel({ open, onClose, item = null }) {
  const editando = !!item;
  const { items, config, crearArticulo } = useStelCatalogoStore();
  const { user } = useAuthStore();
  const [form, setForm] = useState(() => item ? {
    tipo: item.tipo, referencia: item.referencia || '', nombre: item.nombre || '', descripcion: item.descripcion || '',
    precio: item.precio ?? '', ivaPct: item.ivaPct ?? 21, categoriaId: item.categoriaId ?? '', areas: item.areas || [],
  } : vacio);
  const [guardando, setGuardando] = useState(false);


  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleArea = (a) => set('areas', form.areas.includes(a) ? form.areas.filter(x => x !== a) : [...form.areas, a]);

  const refNorm = form.referencia.trim().toUpperCase();
  const duplicado = refNorm && items.find(i => !i.eliminado && i.id !== item?.id && i.referencia?.toUpperCase() === refNorm);
  // Si la marca de la referencia ya tiene áreas, el artículo las heredará igualmente
  const marca = prefijoReferencia(refNorm);
  const areasMarca = marca ? (config.prefijoAreas?.[marca] || []) : [];

  const handleSave = async () => {
    if (!form.nombre.trim()) { toast.error('Pon un nombre'); return; }
    if (duplicado) { toast.error(`Ya existe la referencia ${refNorm}`); return; }
    if (!form.areas.length && !areasMarca.length) { toast.error('Elige al menos un área para que alguien pueda usarlo'); return; }
    setGuardando(true);
    try {
      const r = await crearArticulo({ ...form, referencia: refNorm, ...(editando ? { id: item.id } : {}) }, user?.name);
      if (!r.ok) { toast.error(r.error, { duration: 8000 }); return; }
      toast.success(editando ? 'Artículo actualizado en STEL.' : `Creado en STEL: ${r.item.referencia || r.item.nombre}`);
      onClose();
    } finally {
      setGuardando(false);
    }
  };

  const inp = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4F8A]/20';
  const lbl = 'block text-xs font-medium text-gray-600 mb-1';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editando ? `Editar artículo · ${item.referencia || item.nombre}` : "Nuevo artículo en STEL"}
      size="md"
      footer={<>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSave} loading={guardando}>{guardando ? 'Guardando…' : editando ? 'Guardar en STEL' : 'Crear en STEL'}</Button>
      </>}
    >
      <div className="space-y-4">
        {editando && <p className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">Los cambios se guardan en STEL y se verán en los presupuestos nuevos. Los ya enviados no cambian.</p>}
        <div className="flex gap-2">
          {[['product', 'Producto'], ['service', 'Servicio']].map(([v, l]) => (
            <button key={v} type="button" disabled={editando} onClick={() => set('tipo', v)}
              className={`px-3 py-1.5 rounded-lg text-sm border cursor-pointer ${form.tipo === v ? 'bg-[#1B4F8A] text-white border-[#1B4F8A]' : 'border-gray-200 text-gray-600'}`}>
              {l}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={lbl}>Referencia</label>
            <input className={inp} value={form.referencia} onChange={e => set('referencia', e.target.value)} placeholder="ROSS-0099999" maxLength={32} />
            {duplicado
              ? <p className="text-[11px] text-red-600 mt-1">Ya existe: «{duplicado.nombre}»</p>
              : <p className="text-[11px] text-gray-400 mt-1">Marca-código. Vacía: STEL pone una automática.</p>}
          </div>
          <div className="md:col-span-2">
            <label className={lbl}>Nombre *</label>
            <input className={inp} value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Nombre como saldrá en presupuestos y facturas" maxLength={128} />
          </div>
        </div>

        <div>
          <label className={lbl}>Descripción</label>
          <textarea rows={2} className={`${inp} resize-none`} value={form.descripcion} onChange={e => set('descripcion', e.target.value)} maxLength={2048} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className={lbl}>Precio de venta (sin IVA)</label>
            <input className={inp} type="number" min={0} step="0.01" value={form.precio} onChange={e => set('precio', e.target.value)} placeholder="0,00" />
          </div>
          <div>
            <label className={lbl}>IVA</label>
            <select className={inp} value={form.ivaPct} onChange={e => set('ivaPct', Number(e.target.value))}>
              {[21, 10, 4, 0].map(v => <option key={v} value={v}>{v} %</option>)}
            </select>
          </div>
          {form.tipo === 'product' && config.categorias?.length > 0 && (
            <div>
              <label className={lbl}>Categoría STEL</label>
              <select className={inp} value={form.categoriaId} onChange={e => set('categoriaId', e.target.value)}>
                <option value="">Sin categoría</option>
                {config.categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
          )}
        </div>

        <div>
          <label className={lbl}>Áreas (quién podrá usarlo en sus presupuestos) *</label>
          <div className="flex flex-wrap gap-1.5">
            {AREAS_CATALOGO.map(a => {
              const heredada = areasMarca.includes(a.id) && !form.areas.includes(a.id);
              return (
                <button key={a.id} type="button" onClick={() => toggleArea(a.id)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border cursor-pointer
                    ${form.areas.includes(a.id) ? 'bg-[#1B4F8A] text-white border-[#1B4F8A]'
                      : heredada ? 'bg-blue-50 text-[#1B4F8A] border-blue-200'
                      : 'border-gray-200 text-gray-500 hover:border-gray-400'}`}>
                  {a.label}
                </button>
              );
            })}
          </div>
          {areasMarca.length > 0 && (
            <p className="text-[11px] text-gray-400 mt-1">La marca {marca} ya está asignada: el artículo aparecerá en sus áreas (en azul claro).</p>
          )}
        </div>
      </div>
    </Modal>
  );
}
