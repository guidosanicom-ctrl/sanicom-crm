import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import HistorialTimeline from '../../components/shared/HistorialTimeline';
import PresupuestosSection from '../../components/shared/PresupuestosSection';
import { useClientesStore } from '../../store/clientesStore';
import { useEquiposStore } from '../../store/equiposStore';
import { useAuthStore } from '../../store/authStore';
import { useDemosStore } from '../../store/demosStore';
import { formatDate } from '../../utils/formatters';
import { Edit, Trash2 } from 'lucide-react';

const BADGE_MAP = { 'Pendiente': 'yellow', 'Confirmada': 'blue', 'Realizada': 'green', 'Reprogramada': 'orange', 'Cancelada': 'gray' };

function Row({ label, value }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-gray-800">{value || '-'}</p>
    </div>
  );
}

export default function DemoDetail({ open, onClose, demo, onEdit, onDelete }) {
  const { clientes } = useClientesStore();
  const { equipos } = useEquiposStore();
  const { users } = useAuthStore();
  const { updateDemo } = useDemosStore();

  if (!demo) return null;

  const cliente = clientes.find(c => c.id === demo.clienteId);
  const equipo = demo.equipoNombre ? { nombre: demo.equipoNombre } : equipos.find(e => e.id === demo.equipoId);
  const responsable = users.find(u => u.id === demo.responsable);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Demo ${demo.numero}`}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
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
            <Badge color={BADGE_MAP[demo.estado] || 'gray'}>{demo.estado}</Badge>
            {demo.resultado && (
              <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full font-medium">{demo.resultado}</span>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Row label="Cliente" value={cliente?.nombre} />
            <Row label="Equipo" value={equipo?.nombre} />
            <Row label="Responsable" value={responsable?.name} />
            <Row label="Fecha" value={`${formatDate(demo.fecha)} ${demo.hora || ''}`} />
            <Row label="Lugar" value={demo.lugar} />
            {demo.direccion && <Row label="Dirección / Link" value={demo.direccion} />}
          </div>
          {demo.objetivo && (
            <div className="mt-4">
              <p className="text-xs text-gray-400 mb-1">Objetivo</p>
              <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{demo.objetivo}</p>
            </div>
          )}
          {demo.observaciones && (
            <div className="mt-3">
              <p className="text-xs text-gray-400 mb-1">Observaciones</p>
              <p className="text-sm text-gray-700 bg-yellow-50 rounded-lg p-3">{demo.observaciones}</p>
            </div>
          )}
        </div>

        {/* Presupuestos */}
        <PresupuestosSection
          presupuestos={demo.presupuestos || []}
          onUpdate={(list) => updateDemo(demo.id, { presupuestos: list })}
          origen="demo"
          origenId={demo.id}
        />

        {/* Historial */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-1 h-4 bg-[#3ABDD5] rounded-full inline-block" />
            Historial de cambios
          </h3>
          <HistorialTimeline
            historial={demo.historial || []}
            clientes={clientes}
            equipos={equipos}
            users={users}
          />
        </div>
      </div>
    </Modal>
  );
}
