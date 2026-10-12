import { useState, useMemo } from 'react';
import { Plus, Car, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useViajesStore, calcularViaje, DIETA_POR_NOCHE } from '../../store/viajesStore';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import EmptyState from '../../components/shared/EmptyState';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { formatDate } from '../../utils/formatters';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const fmt = (n) => n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

function ViajeForm({ open, onClose, initial, onSave }) {
  const hoy = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState(() => ({
    fecha: initial?.fecha || hoy,
    destino: initial?.destino || '',
    noches: initial?.noches ?? 1,
    hotel: initial?.hotel ?? '',
    cena: initial?.cena ?? '',
    notas: initial?.notas || '',
  }));
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const { dieta, gastos, sobrante } = calcularViaje({ ...form, dietaPorNoche: initial?.dietaPorNoche });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.destino.trim()) { toast.error('Indica el destino.'); return; }
    if (!(Number(form.noches) >= 1)) { toast.error('El viaje debe tener al menos 1 noche.'); return; }
    onSave({
      fecha: form.fecha,
      destino: form.destino.trim(),
      noches: Number(form.noches),
      hotel: Number(form.hotel) || 0,
      cena: Number(form.cena) || 0,
      notas: form.notas.trim(),
    });
  };

  const input = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white';
  const label = 'block text-xs font-medium text-gray-600 mb-1';

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Editar viaje' : 'Nuevo viaje'} size="sm"
      footer={<>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button type="submit" form="viaje-form">{initial ? 'Guardar cambios' : 'Guardar viaje'}</Button>
      </>}>
      <form id="viaje-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Fecha de salida</label>
            <input type="date" className={input} value={form.fecha} onChange={e => set('fecha', e.target.value)} required />
          </div>
          <div>
            <label className={label}>Noches</label>
            <input type="number" min="1" step="1" className={input} value={form.noches} onChange={e => set('noches', e.target.value)} required />
          </div>
        </div>
        <div>
          <label className={label}>Destino</label>
          <input className={input} value={form.destino} onChange={e => set('destino', e.target.value)} placeholder="Ej: Málaga" autoFocus />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Hotel (€)</label>
            <input type="number" min="0" step="0.01" inputMode="decimal" className={input} value={form.hotel} onChange={e => set('hotel', e.target.value)} placeholder="0,00" />
          </div>
          <div>
            <label className={label}>Cena (€)</label>
            <input type="number" min="0" step="0.01" inputMode="decimal" className={input} value={form.cena} onChange={e => set('cena', e.target.value)} placeholder="0,00" />
          </div>
        </div>
        <div>
          <label className={label}>Notas (opcional)</label>
          <input className={input} value={form.notas} onChange={e => set('notas', e.target.value)} placeholder="Ej: instalación en Clínica X" />
        </div>

        <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
          <div className="flex justify-between text-gray-600">
            <span>Dieta ({form.noches || 0} noche{Number(form.noches) === 1 ? '' : 's'} × {initial?.dietaPorNoche ?? DIETA_POR_NOCHE} €)</span>
            <span>{fmt(dieta)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>− Hotel y cena</span>
            <span>{fmt(gastos)}</span>
          </div>
          <div className={`flex justify-between font-semibold border-t border-gray-200 pt-1 ${sobrante >= 0 ? 'text-green-700' : 'text-red-600'}`}>
            <span>Sobrante para comisiones</span>
            <span>{fmt(sobrante)}</span>
          </div>
        </div>
      </form>
    </Modal>
  );
}

export default function ViajesTab() {
  const { viajes, addViaje, updateViaje, deleteViaje } = useViajesStore();
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth());
  const [anio, setAnio] = useState(now.getFullYear());
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [delTarget, setDelTarget] = useState(null);

  const años = useMemo(() => {
    const s = new Set(viajes.map(v => v.fecha ? new Date(v.fecha).getFullYear() : null).filter(Boolean));
    s.add(new Date().getFullYear());
    return [...s].sort((a, b) => b - a);
  }, [viajes]);

  const delMes = useMemo(() => viajes
    .filter(v => { const d = new Date(v.fecha); return d.getFullYear() === anio && d.getMonth() === mes; })
    .map(v => ({ ...v, ...calcularViaje(v) }))
    .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '')), [viajes, mes, anio]);

  const tot = delMes.reduce((acc, v) => ({
    noches: acc.noches + (Number(v.noches) || 0), dieta: acc.dieta + v.dieta,
    gastos: acc.gastos + v.gastos, sobrante: acc.sobrante + v.sobrante,
  }), { noches: 0, dieta: 0, gastos: 0, sobrante: 0 });

  const openNew = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (v) => { setEditing(v); setFormOpen(true); };

  const sel = 'px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none bg-white';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          <select value={mes} onChange={e => setMes(Number(e.target.value))} className={sel}>
            {MESES.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
          <select value={anio} onChange={e => setAnio(Number(e.target.value))} className={sel}>
            {años.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <Button size="sm" onClick={openNew}><Plus className="w-4 h-4" />Nuevo viaje</Button>
      </div>

      {/* Totales del mes */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="border rounded-xl p-4 bg-blue-50 border-blue-200 text-blue-700">
          <p className="text-sm font-medium opacity-70">Viajes · noches</p>
          <p className="text-2xl font-bold">{delMes.length} · {tot.noches}</p>
        </div>
        <div className="border rounded-xl p-4 bg-gray-50 border-gray-200 text-gray-700">
          <p className="text-sm font-medium opacity-70">Dieta recibida</p>
          <p className="text-2xl font-bold">{fmt(tot.dieta)}</p>
        </div>
        <div className="border rounded-xl p-4 bg-orange-50 border-orange-200 text-orange-700">
          <p className="text-sm font-medium opacity-70">Hotel + cena</p>
          <p className="text-2xl font-bold">{fmt(tot.gastos)}</p>
        </div>
        <div className="border rounded-xl p-4 bg-green-50 border-green-200 text-green-700">
          <p className="text-sm font-medium opacity-70">Sobrante → comisiones</p>
          <p className="text-2xl font-bold">{fmt(tot.sobrante)}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {delMes.length === 0 ? (
          <EmptyState icon={Car} title="Sin viajes" message={`No hay viajes en ${MESES[mes]} ${anio}.`} action={openNew} actionLabel="Nuevo viaje" />
        ) : (
          <>
            {/* Cards — móvil */}
            <div className="sm:hidden divide-y divide-gray-100">
              {delMes.map(v => (
                <div key={v.id} className="px-4 py-3 flex items-start justify-between gap-3" onClick={() => openEdit(v)}>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{v.destino}</p>
                    <p className="text-xs text-gray-500">{formatDate(v.fecha)} · {v.noches} noche{v.noches === 1 ? '' : 's'}</p>
                    <p className="text-xs text-gray-400">Hotel {fmt(Number(v.hotel) || 0)} · Cena {fmt(Number(v.cena) || 0)}</p>
                  </div>
                  <span className={`text-sm font-bold whitespace-nowrap ${v.sobrante >= 0 ? 'text-green-700' : 'text-red-600'}`}>{fmt(v.sobrante)}</span>
                </div>
              ))}
            </div>

            {/* Tabla — escritorio */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Fecha', 'Destino', 'Noches', 'Dieta', 'Hotel', 'Cena', 'Sobrante', ''].map(h => (
                      <th key={h} className={`px-3 py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap ${['Dieta', 'Hotel', 'Cena', 'Sobrante'].includes(h) ? 'text-right' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {delMes.map(v => (
                    <tr key={v.id} className="hover:bg-gray-50">
                      <td className="px-3 py-3 whitespace-nowrap text-xs">{formatDate(v.fecha)}</td>
                      <td className="px-3 py-3 font-medium">
                        {v.destino}
                        {v.notas && <p className="text-xs text-gray-400 font-normal">{v.notas}</p>}
                      </td>
                      <td className="px-3 py-3 text-gray-600">{v.noches}</td>
                      <td className="px-3 py-3 text-right text-gray-600">{fmt(v.dieta)}</td>
                      <td className="px-3 py-3 text-right text-gray-600">{fmt(Number(v.hotel) || 0)}</td>
                      <td className="px-3 py-3 text-right text-gray-600">{fmt(Number(v.cena) || 0)}</td>
                      <td className={`px-3 py-3 text-right font-semibold ${v.sobrante >= 0 ? 'text-green-700' : 'text-red-600'}`}>{fmt(v.sobrante)}</td>
                      <td className="px-3 py-3">
                        <div className="flex gap-1 justify-end">
                          <button onClick={() => openEdit(v)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded cursor-pointer" title="Editar"><Pencil className="w-4 h-4" /></button>
                          <button onClick={() => setDelTarget(v)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <p className="text-xs text-gray-400">
        Cada noche fuera son {DIETA_POR_NOCHE} €. Lo que sobra después de hotel y cena se suma a «Mi comisión total del mes» en el Resumen mensual.
      </p>

      {formOpen && (
        <ViajeForm
          open
          onClose={() => setFormOpen(false)}
          initial={editing}
          onSave={(data) => {
            if (editing) { updateViaje(editing.id, data); toast.success('Viaje actualizado.'); }
            else { addViaje(data); toast.success('Viaje guardado.'); }
            setFormOpen(false);
          }}
        />
      )}

      <ConfirmDialog
        open={!!delTarget}
        onClose={() => setDelTarget(null)}
        onConfirm={() => { deleteViaje(delTarget.id); toast.success('Viaje eliminado.'); setDelTarget(null); }}
        title="Eliminar viaje"
        message={delTarget ? `¿Eliminar el viaje a ${delTarget.destino} del ${formatDate(delTarget.fecha)}?` : ''}
      />
    </div>
  );
}
