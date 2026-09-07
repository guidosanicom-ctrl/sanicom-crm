import { useState } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import HistorialTimeline from '../../components/shared/HistorialTimeline';
import { useClientesStore } from '../../store/clientesStore';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { exportPresupuestoPdf } from '../../utils/exportPresupuestoPdf';
import { Edit, Trash2, FileDown } from 'lucide-react';
import logoSrc from '../../assets/sanicom_logo.png';

const ESTADO_COLOR = { 'Borrador': 'gray', 'Enviado': 'blue', 'Aceptado': 'green', 'Rechazado': 'red' };

function Row({ label, value }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-gray-800">{value || '-'}</p>
    </div>
  );
}

function validoHasta(presupuesto) {
  if (!presupuesto.fecha || !presupuesto.validezDias) return null;
  const d = new Date(presupuesto.fecha);
  d.setDate(d.getDate() + Number(presupuesto.validezDias));
  return d.toISOString().split('T')[0];
}

export default function PresupuestoDetail({ open, onClose, presupuesto, onEdit, onDelete }) {
  const { clientes } = useClientesStore();
  const [exporting, setExporting] = useState(false);

  if (!presupuesto) return null;

  const cliente = clientes.find(c => c.id === presupuesto.clienteId);

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      await exportPresupuestoPdf(presupuesto, cliente, logoSrc);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Presupuesto ${presupuesto.numero}`}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
          <Button variant="outline" onClick={handleExportPdf} loading={exporting}>
            <FileDown className="w-4 h-4" />{exporting ? 'Generando...' : 'Exportar PDF'}
          </Button>
          {onDelete && (
            <Button variant="danger" onClick={onDelete}>
              <Trash2 className="w-4 h-4" />Eliminar
            </Button>
          )}
          {onEdit && (
            <Button onClick={onEdit}>
              <Edit className="w-4 h-4" />Editar
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-6">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <Badge color={ESTADO_COLOR[presupuesto.estado] || 'gray'}>{presupuesto.estado}</Badge>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Row label="Cliente" value={cliente?.nombre} />
            <Row label="Equipo" value={presupuesto.equipoNombre} />
            <Row label="Fecha" value={formatDate(presupuesto.fecha)} />
            <Row label="Válido hasta" value={validoHasta(presupuesto) ? formatDate(validoHasta(presupuesto)) : '-'} />
          </div>
        </div>

        {/* Líneas */}
        <div className="border border-gray-200 rounded-xl p-4">
          <div className="space-y-1 mb-3">
            <div className="hidden sm:grid grid-cols-[1fr_60px_90px_80px] gap-2 mb-1">
              {['Concepto', 'Cant.', 'Precio unit.', 'Subtotal'].map(h => (
                <p key={h} className="text-xs font-medium text-gray-500">{h}</p>
              ))}
            </div>
            {(presupuesto.lineas || []).map((l, i) => (
              <div key={i} className="grid grid-cols-[1fr_60px_90px_80px] gap-2 text-sm">
                <span className="text-gray-800">{l.concepto}</span>
                <span className="text-gray-500">{l.cantidad}</span>
                <span className="text-gray-500">{formatCurrency(parseFloat(l.precioUnitario) || 0)}</span>
                <span className="font-medium text-gray-700">{formatCurrency((parseFloat(l.cantidad) || 0) * (parseFloat(l.precioUnitario) || 0))}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 pt-2 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total sin IVA</span>
              <span className="font-medium">{formatCurrency(presupuesto.totalSinIva || 0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">IVA ({presupuesto.iva ?? 21}%)</span>
              <span className="font-medium">{formatCurrency((presupuesto.totalConIva || 0) - (presupuesto.totalSinIva || 0))}</span>
            </div>
            <div className="flex justify-between text-sm font-bold pt-1 border-t border-gray-100">
              <span>Total con IVA</span>
              <span className="text-[#1B4F8A] text-base">{formatCurrency(presupuesto.totalConIva || 0)}</span>
            </div>
          </div>
          {presupuesto.notas && (
            <p className="mt-2 text-xs text-gray-500 italic">{presupuesto.notas}</p>
          )}
        </div>

        {/* Historial */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-1 h-4 bg-[#3ABDD5] rounded-full inline-block" />
            Historial de cambios
          </h3>
          <HistorialTimeline
            historial={presupuesto.historial || []}
            clientes={clientes}
          />
        </div>
      </div>
    </Modal>
  );
}
