import { useState, useEffect } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import HistorialTimeline from '../../components/shared/HistorialTimeline';
import { useClientesStore } from '../../store/clientesStore';
import { useEquiposStore } from '../../store/equiposStore';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Edit, Trash2, Phone, Mail, MapPin, User } from 'lucide-react';

const STAGE_COLOR = {
  'Prospecto': 'gray', 'Interesado': 'blue', 'Propuesta enviada': 'purple',
  'Negociación': 'yellow', 'Ganado': 'green', 'Perdido': 'red',
};

const TEMP_LABEL = { frio: '❄️ Frío', tibio: '🌤 Tibio', caliente: '🔥 Caliente' };

const ESTADO_CLIENTE_COLOR = {
  'Evaluando opciones': 'bg-blue-50 text-blue-700 border-blue-200',
  'Esperando aprobación': 'bg-yellow-50 text-yellow-700 border-yellow-200',
  'Consultando dirección': 'bg-purple-50 text-purple-700 border-purple-200',
  'Silencio': 'bg-gray-100 text-gray-500 border-gray-200',
  'Listo para decidir': 'bg-green-50 text-green-700 border-green-200',
};
const FINANCIACION_COLOR = {
  'Propia': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Financiación bancaria': 'bg-blue-50 text-blue-700 border-blue-200',
  'Leasing': 'bg-violet-50 text-violet-700 border-violet-200',
  'Subvención': 'bg-orange-50 text-orange-700 border-orange-200',
  'Por definir': 'bg-gray-100 text-gray-500 border-gray-200',
};

function Row({ label, value }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-gray-800">{value || '-'}</p>
    </div>
  );
}

export default function OportunidadDetail({ open, onClose, oportunidad, onEdit, onDelete }) {
  const { clientes } = useClientesStore();
  const { equipos } = useEquiposStore();
  const { users } = useAuthStore();
  const [clienteData, setClienteData] = useState(null);

  useEffect(() => {
    if (!open || !oportunidad?.clienteId) { setClienteData(null); return; }
    supabase
      .from('clientes')
      .select('data')
      .eq('id', oportunidad.clienteId)
      .single()
      .then(({ data }) => { if (data) setClienteData(data.data); });
  }, [open, oportunidad?.clienteId]);

  if (!oportunidad) return null;

  const cliente = clienteData || clientes.find(c => c.id === oportunidad.clienteId);
  const responsable = users.find(u => u.id === oportunidad.responsable);
  const equiposNombres = (oportunidad.equipos || [])
    .map(id => equipos.find(e => e.id === id)?.nombre).filter(Boolean).join(', ');

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={oportunidad.nombre}
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
        {/* Datos principales */}
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <Badge color={STAGE_COLOR[oportunidad.etapa] || 'gray'}>{oportunidad.etapa}</Badge>
            <span className="text-xl font-bold text-[#1B4F8A]">{formatCurrency(oportunidad.valor)}</span>
            <span className="text-sm text-gray-500">· {oportunidad.probabilidad}% prob.</span>
            {oportunidad.temperatura && (
              <span className="ml-1 text-lg" title={TEMP_LABEL[oportunidad.temperatura]}>
                {TEMP_LABEL[oportunidad.temperatura]}
              </span>
            )}
          </div>

          {/* Chips de seguimiento */}
          {(oportunidad.estadoCliente || oportunidad.financiacion) && (
            <div className="flex flex-wrap gap-2 mb-4">
              {oportunidad.estadoCliente && (
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${ESTADO_CLIENTE_COLOR[oportunidad.estadoCliente] || 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
                  {oportunidad.estadoCliente}
                </span>
              )}
              {oportunidad.financiacion && (
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${FINANCIACION_COLOR[oportunidad.financiacion] || 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
                  {oportunidad.financiacion}
                </span>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Cliente</p>
              <p className="text-sm font-medium text-gray-800">{cliente?.nombre || '-'}</p>
              {cliente && (
                <div className="mt-1.5 flex flex-col gap-1">
                  {cliente.telefono && (
                    <a href={`tel:${cliente.telefono}`} className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#1B4F8A] transition-colors">
                      <Phone className="w-3 h-3 flex-shrink-0" />{cliente.telefono}
                    </a>
                  )}
                  {cliente.email && (
                    <a href={`mailto:${cliente.email}`} className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#1B4F8A] transition-colors">
                      <Mail className="w-3 h-3 flex-shrink-0" />{cliente.email}
                    </a>
                  )}
                  {(cliente.ciudad || cliente.provincia) && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      {[cliente.ciudad, cliente.provincia].filter(Boolean).join(', ')}
                    </span>
                  )}
                  {(() => {
                    const cp = (cliente.contactos || []).find(c => c.esPrincipal) || cliente.contactos?.[0];
                    return cp ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
                        <User className="w-3 h-3 flex-shrink-0" />
                        {cp.nombre}{cp.cargo ? ` · ${cp.cargo}` : ''}
                      </span>
                    ) : null;
                  })()}
                </div>
              )}
            </div>
            <Row label="Responsable" value={responsable?.name} />
            <Row label="Fecha de cierre" value={formatDate(oportunidad.fechaCierre)} />
            <Row label="Origen" value={oportunidad.origen === 'Redes sociales' && oportunidad.redSocial ? `Redes sociales · ${oportunidad.redSocial}` : oportunidad.origen} />
            <Row label="Creado" value={formatDate(oportunidad.fechaCreacion)} />
            {equiposNombres && <Row label="Equipos de interés" value={equiposNombres} />}
          </div>

          {oportunidad.notaSeguimiento && (
            <div className="mt-4">
              <p className="text-xs text-gray-400 mb-1">Nota de seguimiento</p>
              <p className="text-sm text-gray-700 bg-amber-50 border border-amber-100 rounded-lg p-3 italic">
                {oportunidad.notaSeguimiento}
              </p>
            </div>
          )}

          {oportunidad.descripcion && (
            <div className="mt-3">
              <p className="text-xs text-gray-400 mb-1">Descripción</p>
              <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{oportunidad.descripcion}</p>
            </div>
          )}
        </div>

        {/* Historial */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span className="w-1 h-4 bg-[#3ABDD5] rounded-full inline-block" />
            Historial de cambios
          </h3>
          <HistorialTimeline
            historial={oportunidad.historial || []}
            clientes={clientes}
            equipos={equipos}
            users={users}
          />
        </div>
      </div>
    </Modal>
  );
}
