import { useState, useEffect } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import HistorialTimeline from '../../components/shared/HistorialTimeline';
import { useClientesStore } from '../../store/clientesStore';
import { useEquiposStore } from '../../store/equiposStore';
import { useAuthStore } from '../../store/authStore';
import { useServicioStore } from '../../store/servicioStore';
import { formatDate } from '../../utils/formatters';
import { exportOTPdf } from '../../utils/exportOTPdf';
import { Edit, Trash2, FileDown } from 'lucide-react';
import logoSrc from '../../assets/sanicom_logo.png';

const ESTADO_COLOR = { 'Pendiente': 'yellow', 'Programada': 'blue', 'En curso': 'orange', 'Completada': 'green', 'Cancelada': 'gray' };
const PRIORIDAD_COLOR = { 'Baja': 'gray', 'Normal': 'blue', 'Alta': 'orange', 'Urgente': 'red' };

function Row({ label, value }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-gray-800">{value || '-'}</p>
    </div>
  );
}

export default function ServicioDetail({ open, onClose, orden, onEdit, onDelete }) {
  const { clientes } = useClientesStore();
  const { equipos } = useEquiposStore();
  const { users, isCarlos } = useAuthStore();
  const { updateServicio } = useServicioStore();
  const [exporting, setExporting] = useState(false);
  const [coste, setCoste] = useState('');
  const [precio, setPrecio] = useState('');
  const [ecoSaved, setEcoSaved] = useState(false);

  useEffect(() => {
    if (open && orden) {
      setCoste(orden.costeRepuestos != null ? String(orden.costeRepuestos) : '');
      setPrecio(orden.precioCobrado != null ? String(orden.precioCobrado) : '');
      setEcoSaved(false);
    }
  }, [open, orden]);

  if (!orden) return null;

  const cliente = clientes.find(c => c.id === orden.clienteId);
  const equipo = equipos.find(e => e.id === orden.equipoId);
  const tecnico = users.find(u => u.id === orden.tecnico);

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

        {/* Control económico */}
        {!isCarlos() && (
          <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span className="w-1 h-4 bg-[#1B4F8A] rounded-full inline-block" />
              Control económico
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Coste de repuestos (€)</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={coste}
                  onChange={e => { setCoste(e.target.value); setEcoSaved(false); }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none bg-white"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Precio cobrado al cliente (€)</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={precio}
                  onChange={e => { setPrecio(e.target.value); setEcoSaved(false); }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none bg-white"
                  placeholder="0.00"
                />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-600 mb-1">Margen (€)</p>
                {(() => {
                  const c = parseFloat(coste) || 0;
                  const p = parseFloat(precio) || 0;
                  const m = p - c;
                  const hasValues = coste !== '' || precio !== '';
                  return (
                    <p className={`text-sm font-bold px-3 py-2 rounded-lg ${!hasValues ? 'text-gray-400' : m >= 0 ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                      {hasValues ? `${m >= 0 ? '+' : ''}${m.toFixed(2)} €` : '-'}
                    </p>
                  );
                })()}
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => {
                  updateServicio(orden.id, { costeRepuestos: parseFloat(coste) || 0, precioCobrado: parseFloat(precio) || 0 });
                  setEcoSaved(true);
                }}
                className="px-3 py-1.5 bg-[#1B4F8A] text-white text-xs rounded-lg hover:bg-[#163d6e] transition-colors cursor-pointer"
              >
                Guardar
              </button>
              {ecoSaved && <span className="text-xs text-green-600">✓ Guardado</span>}
            </div>
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
