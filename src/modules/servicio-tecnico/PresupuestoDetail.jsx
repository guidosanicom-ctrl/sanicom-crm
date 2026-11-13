import { useState } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import HistorialTimeline from '../../components/shared/HistorialTimeline';
import { useAuthStore } from '../../store/authStore';
import { useClientesStore } from '../../store/clientesStore';
import { usePresupuestosStore } from '../../store/presupuestosStore';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import toast from 'react-hot-toast';
import { formatDate, formatCurrency, numeroPresupuesto } from '../../utils/formatters';
import { exportPresupuestoPdf } from '../../utils/exportPresupuestoPdf';
import { Edit, Trash2, FileDown, Send, CheckCircle2 } from 'lucide-react';
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

export default function PresupuestoDetail({ open, onClose, presupuesto: presupuestoProp, onEdit, onDelete }) {
  const { clientes } = useClientesStore();
  const { user, users } = useAuthStore();
  const enviarAStel = usePresupuestosStore(s => s.enviarAStel);
  // Versión viva del store (para ver al momento que se ha enviado a STEL)
  const presupuestoLive = usePresupuestosStore(s => s.presupuestos.find(p => p.id === presupuestoProp?.id));
  const presupuesto = presupuestoLive || presupuestoProp;
  const [exporting, setExporting] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [confirmStel, setConfirmStel] = useState(false);

  if (!presupuesto) return null;

  const lineasLibres = (presupuesto.lineas || []).filter(l => l.concepto?.trim() && !l.stelItemId);

  const handleEnviarStel = async () => {
    setEnviando(true);
    try {
      const r = await enviarAStel(presupuesto.id);
      if (!r.ok) { toast.error(r.error, { duration: 8000 }); return; }
      toast.success(r.yaEnviado ? 'Este presupuesto ya estaba en STEL.' : `Presupuesto creado en STEL: ${r.stel.referencia || r.stel.id}`);
    } finally {
      setEnviando(false);
    }
  };

  const cliente = clientes.find(c => c.id === presupuesto.clienteId);

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      // El pie del PDF lleva los datos de quien hizo el presupuesto (o de quien lo descarga, si es antiguo)
      const autor = users.find(u => u.id === presupuesto.creadoPorId) || user;
      await exportPresupuestoPdf(presupuesto, cliente, logoSrc, autor);
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
    <Modal
      open={open}
      onClose={onClose}
      title={`Presupuesto ${numeroPresupuesto(presupuesto)}`}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
          <Button variant="outline" onClick={handleExportPdf} loading={exporting}>
            <FileDown className="w-4 h-4" />{exporting ? 'Generando...' : 'Exportar PDF'}
          </Button>
          {!presupuesto.stel?.id && (
            <Button variant="outline" onClick={() => setConfirmStel(true)} loading={enviando}>
              <Send className="w-4 h-4" />{enviando ? 'Enviando…' : 'Enviar a STEL'}
            </Button>
          )}
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
            {presupuesto.stel?.id && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
                <CheckCircle2 className="w-3.5 h-3.5" />En STEL{presupuesto.stel.referencia ? `: ${presupuesto.stel.referencia}` : ''}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Row label="Cliente" value={cliente?.nombre} />
            {presupuesto.equipoNombre && <Row label="Equipo" value={presupuesto.equipoNombre} />}
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
                <span className="text-gray-800">{l.concepto}{l.descripcion && <span className="block text-xs text-gray-500 whitespace-pre-line">{l.descripcion}</span>}{l.referencia && <span className="block text-xs text-gray-400">{l.referencia}</span>}</span>
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
          {(presupuesto.formaPago || presupuesto.condiciones) && (
            <div className="mt-3 pt-2 border-t border-gray-100 text-xs text-gray-600 space-y-0.5">
              {presupuesto.formaPago && <p><span className="text-gray-400">Forma de pago:</span> {presupuesto.formaPago}</p>}
              {presupuesto.condiciones && <p className="whitespace-pre-line"><span className="text-gray-400">Condiciones:</span> {presupuesto.condiciones}</p>}
            </div>
          )}
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
      <ConfirmDialog
        open={confirmStel}
        onClose={() => setConfirmStel(false)}
        onConfirm={lineasLibres.length ? () => {} : handleEnviarStel}
        title="Enviar a STEL"
        variant="primary"
        confirmText={lineasLibres.length ? 'Entendido' : 'Enviar'}
        message={lineasLibres.length
          ? `No se puede enviar todavía: ${lineasLibres.length === 1 ? 'hay una línea escrita' : `hay ${lineasLibres.length} líneas escritas`} a mano. STEL solo admite artículos de su catálogo: edítalas y elígelas del buscador.`
          : 'Se creará este presupuesto en STEL Order para que Administración lo revise y lo facture. Si el cliente no existe en STEL, se creará con su CIF. Los cambios que hagas después en el CRM no se pasan a STEL.'}
      />
    </>
  );
}
