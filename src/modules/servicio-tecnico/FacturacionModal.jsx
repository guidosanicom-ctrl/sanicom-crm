import { useState, useMemo, useEffect } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { Plus, Trash2 } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

const IVA_OPTIONS = [0, 10, 21];

const emptyLinea = () => ({ concepto: '', cantidad: 1, precioUnitario: 0 });

export default function FacturacionModal({ open, onClose, onConfirm, ordenNumero }) {
  const [requiereFactura, setRequiereFactura] = useState(true);
  const [lineas, setLineas] = useState([emptyLinea()]);
  const [iva, setIva] = useState(21);
  const [notas, setNotas] = useState('');

  useEffect(() => {
    if (open) {
      setRequiereFactura(true);
      setLineas([emptyLinea()]);
      setIva(21);
      setNotas('');
    }
  }, [open]);

  const setLinea = (i, k, v) => {
    setLineas(ls => ls.map((l, idx) => idx === i ? { ...l, [k]: v } : l));
  };
  const addLinea = () => setLineas(ls => [...ls, emptyLinea()]);
  const removeLinea = (i) => setLineas(ls => ls.filter((_, idx) => idx !== i));

  const totalSinIva = useMemo(() =>
    lineas.reduce((s, l) => s + (parseFloat(l.cantidad) || 0) * (parseFloat(l.precioUnitario) || 0), 0),
    [lineas]);
  const totalConIva = totalSinIva * (1 + iva / 100);

  const hayLineas = lineas.some(l => l.concepto.trim());

  const handleConfirm = () => {
    const lineasValidas = lineas.filter(l => l.concepto.trim());
    const facturacion = lineasValidas.length > 0
      ? { lineas: lineasValidas, iva, notas, totalSinIva, totalConIva, facturada: false }
      : null;
    if (!requiereFactura) {
      // Sin factura: el detalle es opcional; si se carga, cuenta para el resumen y la comisión
      onConfirm({ facturacionRequerida: false, ...(facturacion ? { facturacion } : {}) });
      return;
    }
    if (!facturacion) return;
    onConfirm({ facturacion });
  };

  const inp = 'w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Detalle para facturación — ${ordenNumero || ''}`}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={requiereFactura && !hayLineas}>
            {requiereFactura || hayLineas ? 'Confirmar y cerrar OT' : 'Cerrar OT sin facturar'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Selector: requiere factura o no */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setRequiereFactura(true)}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-colors cursor-pointer
              ${requiereFactura ? 'border-[#1B4F8A] bg-blue-50 text-[#1B4F8A]' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
          >
            ✅ Requiere factura
          </button>
          <button
            onClick={() => setRequiereFactura(false)}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-colors cursor-pointer
              ${!requiereFactura ? 'border-[#1B4F8A] bg-blue-50 text-[#1B4F8A]' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
          >
            ⬜ No requiere factura
          </button>
        </div>

        {!requiereFactura && (
          <p className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
            La OT no se enviará a Administración para facturar ni aparecerá como pendiente de facturar.
            Puedes cargar el detalle igualmente (opcional): quedará en el histórico y contará para el total y la comisión del resumen mensual.
          </p>
        )}
      </div>

      <div className="space-y-5 mt-5">
        {/* Tabla de líneas */}
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
                <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_80px_100px_90px_32px] gap-2 items-center bg-gray-50 rounded-lg p-2 sm:bg-transparent sm:p-0">
                  <input
                    className={inp}
                    placeholder="Concepto (ej: Horas de servicio)"
                    value={l.concepto}
                    onChange={e => setLinea(i, 'concepto', e.target.value)}
                  />
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

        {/* Notas */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Notas para facturación (opcional)</label>
          <textarea
            rows={2}
            value={notas}
            onChange={e => setNotas(e.target.value)}
            placeholder="Observaciones, descuentos aplicados..."
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none resize-none"
          />
        </div>
      </div>
    </Modal>
  );
}
