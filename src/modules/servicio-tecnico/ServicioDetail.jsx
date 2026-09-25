import { useState, useEffect } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import HistorialTimeline from '../../components/shared/HistorialTimeline';
import { useClientesStore } from '../../store/clientesStore';
import { useEquiposStore } from '../../store/equiposStore';
import { useAuthStore } from '../../store/authStore';
import { useServicioStore } from '../../store/servicioStore';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { exportOTPdf } from '../../utils/exportOTPdf';
import { Edit, Trash2, FileDown, Truck } from 'lucide-react';
import logoSrc from '../../assets/sanicom_logo.png';
import FirmaCanvas from '../../components/ui/FirmaCanvas';

const ESTADO_COLOR = { 'Pendiente': 'yellow', 'Programada': 'blue', 'En curso': 'orange', 'Completada': 'green', 'Entregada': 'purple', 'Cancelada': 'gray' };
const PRIORIDAD_COLOR = { 'Baja': 'gray', 'Normal': 'blue', 'Alta': 'orange', 'Urgente': 'red' };

function Row({ label, value }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-gray-800">{value || '-'}</p>
    </div>
  );
}

export default function ServicioDetail({ open, onClose, orden, onEdit, onDelete, onFacturar }) {
  const { clientes } = useClientesStore();
  const { equipos } = useEquiposStore();
  const { users, isCarlos, user } = useAuthStore();
  const { updateServicio } = useServicioStore();
  const [exporting, setExporting] = useState(false);
  const [fechaEntrega, setFechaEntrega] = useState(new Date().toISOString().split('T')[0]);
  const [firmaCliente, setFirmaCliente] = useState(null);
  const [registrandoEntrega, setRegistrandoEntrega] = useState(false);
  const [editandoCierre, setEditandoCierre] = useState(false);
  const [fechaCierreEdit, setFechaCierreEdit] = useState('');

  const puedeEditarCierre = ['jgovantes@sanicom.es', 'guidorosso@sanicom.es'].includes(user?.email);

  useEffect(() => {
    if (open && orden) {
      setFechaEntrega(orden.fechaEntrega || new Date().toISOString().split('T')[0]);
      setFirmaCliente(orden.firmaCliente || null);
      setEditandoCierre(false);
      setFechaCierreEdit(orden.fechaCompletada || '');
    }
  }, [open, orden?.id]);

  if (!orden) return null;

  const cliente = clientes.find(c => c.id === orden.clienteId);
  const equipo = orden.equipoNombre ? { nombre: orden.equipoNombre } : equipos.find(e => e.id === orden.equipoId);
  const tecnico = users.find(u => u.id === orden.tecnico);

  const handleRegistrarEntrega = async () => {
    if (!firmaCliente) return;
    setRegistrandoEntrega(true);
    try {
      await updateServicio(orden.id, { estado: 'Entregada', fechaEntrega, firmaCliente });
    } finally {
      setRegistrandoEntrega(false);
    }
  };

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      await exportOTPdf(orden, cliente, equipo, tecnico, logoSrc);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Orden ${orden.numero}`}
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
        {/* Cabecera */}
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <Badge color={ESTADO_COLOR[orden.estado] || 'gray'}>{orden.estado}</Badge>
            <Badge color={PRIORIDAD_COLOR[orden.prioridad] || 'gray'}>{orden.prioridad}</Badge>
            <span className="text-sm text-gray-500">{orden.tipo}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Row label="Cliente" value={cliente?.nombre} />
            <Row label="Equipo" value={equipo?.nombre} />
            <Row label="Técnico" value={tecnico?.name} />
            <Row label="Fecha programada" value={formatDate(orden.fechaProgramada)} />
            <Row label="Fecha creación" value={formatDate(orden.fechaCreacion)} />
            {orden.nSerie && <Row label="Nº de serie" value={orden.nSerie} />}
            {(orden.estado === 'Completada' || orden.estado === 'Entregada') && (
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Fecha de cierre</p>
                {editandoCierre ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={fechaCierreEdit}
                      onChange={e => setFechaCierreEdit(e.target.value)}
                      className="px-2 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                    <button
                      onClick={() => {
                        updateServicio(orden.id, { fechaCompletada: fechaCierreEdit });
                        setEditandoCierre(false);
                      }}
                      className="text-xs text-blue-600 font-medium hover:text-blue-800 cursor-pointer"
                    >Guardar</button>
                    <button onClick={() => setEditandoCierre(false)} className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer">✕</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-800">{formatDate(orden.fechaCompletada) || '-'}</p>
                    {puedeEditarCierre && (
                      <button onClick={() => setEditandoCierre(true)} className="text-xs text-gray-400 hover:text-blue-600 cursor-pointer" title="Editar fecha de cierre">✏️</button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          {orden.descripcion && (
            <div className="mt-4">
              <p className="text-xs text-gray-400 mb-1">Descripción del problema</p>
              <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{orden.descripcion}</p>
            </div>
          )}
          {orden.resultado && (
            <div className="mt-3">
              <p className="text-xs text-gray-400 mb-1">Resultado final</p>
              <p className="text-sm text-gray-700 bg-green-50 rounded-lg p-3">{orden.resultado}</p>
            </div>
          )}
          {orden.confirmacionCliente && (
            <p className="mt-3 text-xs text-green-600 font-medium">✓ Confirmación del cliente recibida</p>
          )}
        </div>

        {/* Acciones registradas */}
        {(orden.acciones || []).length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Partes de trabajo</h3>
            <div className="space-y-2">
              {orden.acciones.map(a => (
                <div key={a.id} className="text-sm bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-700">{a.descripcion}</p>
                  <p className="text-xs text-gray-400 mt-1">{formatDate(a.fecha)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Facturación */}
        {orden.facturacion && !isCarlos() && (
          <div className="border border-yellow-200 rounded-xl p-4 bg-yellow-50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <span className="w-1 h-4 bg-yellow-400 rounded-full inline-block" />
                💶 Facturación
              </h3>
              {orden.facturacionRequerida === false ? (
                <span className="text-xs text-gray-600 font-semibold bg-gray-100 px-2 py-1 rounded-lg">Sin factura · solo registro</span>
              ) : orden.facturacion.facturada ? (
                <span className="text-xs text-green-600 font-semibold bg-green-100 px-2 py-1 rounded-lg">✓ Facturada</span>
              ) : (
                <button
                  onClick={() => updateServicio(orden.id, { facturacion: { ...orden.facturacion, facturada: true } })}
                  className="text-xs bg-[#1B4F8A] text-white px-3 py-1.5 rounded-lg hover:bg-[#163d6e] transition-colors cursor-pointer font-medium"
                >
                  Marcar como facturada
                </button>
              )}
            </div>
            <div className="space-y-1 mb-3">
              <div className="hidden sm:grid grid-cols-[1fr_60px_90px_80px] gap-2 mb-1">
                {['Concepto', 'Cant.', 'Precio unit.', 'Subtotal'].map(h => (
                  <p key={h} className="text-xs font-medium text-gray-500">{h}</p>
                ))}
              </div>
              {(orden.facturacion.lineas || []).map((l, i) => (
                <div key={i} className="grid grid-cols-[1fr_60px_90px_80px] gap-2 text-sm">
                  <span className="text-gray-800">{l.concepto}</span>
                  <span className="text-gray-500">{l.cantidad}</span>
                  <span className="text-gray-500">{formatCurrency(parseFloat(l.precioUnitario) || 0)}</span>
                  <span className="font-medium text-gray-700">{formatCurrency((parseFloat(l.cantidad) || 0) * (parseFloat(l.precioUnitario) || 0))}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-yellow-200 pt-2 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total sin IVA</span>
                <span className="font-medium">{formatCurrency(orden.facturacion.totalSinIva || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">IVA ({orden.facturacion.iva ?? 21}%)</span>
                <span className="font-medium">{formatCurrency((orden.facturacion.totalConIva || 0) - (orden.facturacion.totalSinIva || 0))}</span>
              </div>
              <div className="flex justify-between text-sm font-bold pt-1 border-t border-yellow-200">
                <span>Total con IVA</span>
                <span className="text-[#1B4F8A] text-base">{formatCurrency(orden.facturacion.totalConIva || 0)}</span>
              </div>
            </div>
            {orden.facturacion.notas && (
              <p className="mt-2 text-xs text-gray-500 italic">{orden.facturacion.notas}</p>
            )}
          </div>
        )}

        {/* Cerrada sin datos de facturación — permitir añadirla ahora */}
        {!orden.facturacion && !isCarlos()
          && (orden.estado === 'Completada' || orden.estado === 'Entregada') && onFacturar && (
          <div className="border border-yellow-200 rounded-xl p-4 bg-yellow-50 flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm text-gray-700">
              {orden.facturacionRequerida === false
                ? '💶 Cerrada sin factura y sin detalle cargado.'
                : '💶 Esta OT no tiene detalle de facturación cargado.'}
            </p>
            <button
              onClick={() => onFacturar(orden)}
              className="text-xs bg-[#1B4F8A] text-white px-3 py-1.5 rounded-lg hover:bg-[#163d6e] transition-colors cursor-pointer font-medium whitespace-nowrap"
            >
              Añadir facturación
            </button>
          </div>
        )}

        {/* Entrega del equipo */}
        {(orden.estado === 'Completada' || orden.estado === 'Entregada') && (
          <div className="border border-purple-200 rounded-xl p-4 bg-purple-50">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Truck className="w-4 h-4 text-purple-500" />
              Entrega del equipo
            </h3>

            {orden.estado === 'Entregada' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Row label="Fecha de entrega" value={formatDate(orden.fechaEntrega)} />
                <div>
                  <p className="text-xs text-gray-400 mb-1">Firma del cliente</p>
                  {orden.firmaCliente ? (
                    <img src={orden.firmaCliente} alt="Firma del cliente" className="border border-gray-200 rounded-lg bg-white h-24 object-contain" />
                  ) : (
                    <p className="text-sm text-gray-400">Sin firma registrada</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">📅 Fecha de entrega</label>
                  <input
                    type="date"
                    value={fechaEntrega}
                    onChange={e => setFechaEntrega(e.target.value)}
                    className="w-full sm:w-56 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">✍️ Firma del cliente</label>
                  <FirmaCanvas onChange={setFirmaCliente} initialValue={firmaCliente} />
                </div>
                <button
                  onClick={handleRegistrarEntrega}
                  disabled={!firmaCliente || registrandoEntrega}
                  className="px-4 py-2 bg-[#1B4F8A] text-white text-sm font-medium rounded-lg hover:bg-[#163d6e] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {registrandoEntrega ? 'Guardando…' : 'Registrar entrega'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Historial */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-1 h-4 bg-[#3ABDD5] rounded-full inline-block" />
            Historial de cambios
          </h3>
          <HistorialTimeline
            historial={orden.historial || []}
            clientes={clientes}
            equipos={equipos}
            users={users}
          />
        </div>
      </div>
    </Modal>
  );
}
