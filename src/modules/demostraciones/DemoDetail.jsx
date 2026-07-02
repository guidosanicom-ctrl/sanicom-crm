import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import HistorialTimeline from '../../components/shared/HistorialTimeline';
import PresupuestosSection from '../../components/shared/PresupuestosSection';
import { useClientesStore } from '../../store/clientesStore';
import { useEquiposStore } from '../../store/equiposStore';
import { useAuthStore } from '../../store/authStore';
import { useDemosStore } from '../../store/demosStore';
import { useOportunidadesStore } from '../../store/oportunidadesStore';
import { formatDate } from '../../utils/formatters';
import { Edit, Trash2, TrendingUp } from 'lucide-react';

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
  const { oportunidades } = useOportunidadesStore();

  if (!demo) return null;

  const cliente = clientes.find(c => c.id === demo.clienteId);
  const oppVinculada = demo.oportunidadId ? oportunidades.find(o => o.id === demo.oportunidadId) : null;
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
            <Row label="Fecha de entrega" value={`${formatDate(demo.fecha)} ${demo.hora || ''}`} />
            <Row label="Lugar" value={demo.lugar} />
            {demo.fechaRecogida && <Row label="Fecha de recogida" value={formatDate(demo.fechaRecogida)} />}
            {demo.direccion && <Row label="Dirección / Link" value={demo.direccion} />}
          </div>
          {demo.fecha && (() => {
            const inicio = new Date(demo.fecha);
            const fin = demo.fechaRecogida ? new Date(demo.fechaRecogida) : new Date();
            const dias = Math.max(0, Math.floor((fin - inicio) / (1000 * 60 * 60 * 24)));
            const recogida = !!demo.fechaRecogida;
            return (
              <div className={`mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${recogida ? 'bg-gray-100 text-gray-600' : 'bg-blue-50 text-blue-700'}`}>
                <span className="text-base">{recogida ? '📦' : '⏱️'}</span>
                {recogida
                  ? `Demo en cliente durante ${dias} día${dias !== 1 ? 's' : ''}`
                  : `${dias} día${dias !== 1 ? 's' : ''} en el cliente`}
              </div>
            );
          })()}
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

        {/* Oportunidad vinculada */}
        {oppVinculada && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#1B4F8A]/10 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-4 h-4 text-[#1B4F8A]" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-blue-500 font-medium uppercase tracking-wide">Oportunidad vinculada</p>
              <p className="text-sm font-semibold text-gray-800 truncate">{oppVinculada.nombre}</p>
              <p className="text-xs text-gray-500">Etapa: {oppVinculada.etapa}</p>
            </div>
          </div>
        )}

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
