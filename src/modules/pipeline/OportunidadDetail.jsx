import { useState, useEffect } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import HistorialTimeline from '../../components/shared/HistorialTimeline';
import PresupuestosSection from '../../components/shared/PresupuestosSection';
import { useClientesStore } from '../../store/clientesStore';
import { useEquiposStore } from '../../store/equiposStore';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Edit, Trash2, Phone, Mail, MapPin, User, PlaySquare,
         CheckCircle2, Circle, Clock, Plus, Trophy } from 'lucide-react';
import { useOportunidadesStore } from '../../store/oportunidadesStore';
import { useDemosStore } from '../../store/demosStore';

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

// ── Timeline de gestión ────────────────────────────────────────────────────────
function GestionTimeline({ oportunidad, demosVinculadas, onUpdate, onCrearDemo }) {
  const gestion = oportunidad.gestion || {};

  // ── Cálculo de estados ─────────────────────────────────────────────────────
  const demoRealizada  = demosVinculadas.some(d => d.estado === 'Realizada');
  const demoEnCurso    = !demoRealizada && demosVinculadas.length > 0;
  const sinDemo        = demosVinculadas.length === 0;

  const demoStatus     = demoRealizada ? 'done' : demoEnCurso ? 'active' : 'pending';
  const presupStatus   = gestion.presupuestoEnviado ? 'done' : 'pending';
  const negocStatus    = gestion.negociando ? 'done' : 'pending';
  const ventaStatus    = oportunidad.etapa === 'Ganado' ? 'done' : 'pending';

  const toggle = (key) => {
    onUpdate({ gestion: { ...gestion, [key]: !gestion[key] } });
  };

  const steps = [
    {
      key: 'demo',
      label: 'Demo',
      status: demoStatus,
      auto: true,
      sublabel: demoRealizada
        ? `Realizada · ${demosVinculadas.find(d => d.estado === 'Realizada')?.numero || ''}`
        : demoEnCurso
          ? `${demosVinculadas[0]?.estado} · ${demosVinculadas[0]?.numero || ''}`
          : 'Sin demo vinculada',
      action: sinDemo ? (
        <button
          onClick={onCrearDemo}
          className="mt-1.5 flex items-center gap-1 text-xs text-[#1B4F8A] hover:underline cursor-pointer font-medium"
        >
          <Plus className="w-3 h-3" />Crear demo
        </button>
      ) : null,
    },
    {
      key: 'presupuesto',
      label: 'Presupuesto enviado',
      status: presupStatus,
      auto: false,
      sublabel: gestion.presupuestoEnviado ? 'Marcado manualmente' : 'Pendiente',
    },
    {
      key: 'negociando',
      label: 'Negociando precio',
      status: negocStatus,
      auto: false,
      sublabel: gestion.negociando ? 'En negociación' : 'Pendiente',
    },
    {
      key: 'venta',
      label: 'Venta cerrada',
      status: ventaStatus,
      auto: true,
      sublabel: ventaStatus === 'done' ? 'Oportunidad ganada ✓' : 'Pendiente',
    },
  ];

  return (
    <div className="bg-gray-50 rounded-xl p-4">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Estado de gestión</p>

      {/* Desktop: horizontal */}
      <div className="hidden sm:flex items-start">
        {steps.map((step, i) => {
          const isLast = i === steps.length - 1;
          return (
            <div key={step.key} className="flex-1 flex flex-col items-center relative">
              {/* Línea conectora */}
              {!isLast && (
                <div className={`absolute top-4 left-1/2 w-full h-0.5 z-0
                  ${steps[i + 1].status === 'done' || step.status === 'done' ? 'bg-green-300' : 'bg-gray-200'}`}
                />
              )}

              {/* Icono */}
              <div className="relative z-10 mb-2">
                {step.status === 'done' ? (
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  </div>
                ) : step.status === 'active' ? (
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center ring-2 ring-amber-300 ring-offset-1">
                    <Clock className="w-4 h-4 text-amber-600" />
                  </div>
                ) : (
                  <div
                    className={`w-8 h-8 rounded-full bg-white border-2 flex items-center justify-center
                      ${step.auto ? 'border-gray-200 cursor-default' : 'border-gray-300 cursor-pointer hover:border-[#1B4F8A] transition-colors'}`}
                    onClick={!step.auto && step.key !== 'venta' ? () => toggle(step.key) : undefined}
                    title={!step.auto ? 'Clic para marcar' : ''}
                  >
                    <Circle className="w-4 h-4 text-gray-300" />
                  </div>
                )}
              </div>

              {/* Etiqueta */}
              <div className="text-center px-1">
                <p className={`text-xs font-semibold ${step.status === 'done' ? 'text-green-700' : step.status === 'active' ? 'text-amber-700' : 'text-gray-500'}`}>
                  {step.label}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{step.sublabel}</p>
                {step.action}
                {/* Checkbox para pasos manuales */}
                {!step.auto && (
                  <button
                    onClick={() => toggle(step.key)}
                    className={`mt-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full cursor-pointer transition-colors
                      ${step.status === 'done'
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                  >
                    {step.status === 'done' ? '✓ Hecho' : 'Marcar'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile: vertical */}
      <div className="flex sm:hidden flex-col gap-0">
        {steps.map((step, i) => {
          const isLast = i === steps.length - 1;
          return (
            <div key={step.key} className="flex gap-3">
              {/* Columna izquierda: icono + línea */}
              <div className="flex flex-col items-center">
                {step.status === 'done' ? (
                  <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  </div>
                ) : step.status === 'active' ? (
                  <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 ring-2 ring-amber-300 ring-offset-1">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                  </div>
                ) : (
                  <div className="w-7 h-7 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center flex-shrink-0">
                    <Circle className="w-3.5 h-3.5 text-gray-300" />
                  </div>
                )}
                {!isLast && <div className={`w-0.5 flex-1 my-1 ${step.status === 'done' ? 'bg-green-200' : 'bg-gray-200'}`} />}
              </div>

              {/* Contenido */}
              <div className="pb-4 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className={`text-sm font-semibold ${step.status === 'done' ? 'text-green-700' : step.status === 'active' ? 'text-amber-700' : 'text-gray-600'}`}>
                    {step.label}
                  </p>
                  {!step.auto && (
                    <button
                      onClick={() => toggle(step.key)}
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full cursor-pointer transition-colors
                        ${step.status === 'done'
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                    >
                      {step.status === 'done' ? '✓ Hecho' : 'Marcar'}
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{step.sublabel}</p>
                {step.action}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function OportunidadDetail({ open, onClose, oportunidad, onEdit, onDelete, onCrearDemo }) {
  const { clientes } = useClientesStore();
  const { equipos } = useEquiposStore();
  const { users } = useAuthStore();
  const { updateOportunidad } = useOportunidadesStore();
  const { demos } = useDemosStore();
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
  const demosVinculadas = (oportunidad.demoIds || []).map(id => demos.find(d => d.id === id)).filter(Boolean);
  const responsable = users.find(u => u.id === oportunidad.responsable);
  const equiposNombres = oportunidad.equiposDescripcion ||
    (oportunidad.equipos || []).map(id => equipos.find(e => e.id === id)?.nombre).filter(Boolean).join(', ');

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
                    <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
                      <Mail className="w-3 h-3 flex-shrink-0" />{cliente.email}
                    </span>
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

        {/* ── Timeline de gestión ── */}
        <GestionTimeline
          oportunidad={oportunidad}
          demosVinculadas={demosVinculadas}
          onUpdate={(updates) => updateOportunidad(oportunidad.id, updates)}
          onCrearDemo={onCrearDemo}
        />

        {/* Demos vinculadas */}
        {demosVinculadas.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span className="w-1 h-4 bg-[#3ABDD5] rounded-full inline-block" />
              Demostraciones vinculadas
            </h3>
            <div className="space-y-2">
              {demosVinculadas.map(d => (
                <div key={d.id} className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-3">
                  <div className="w-7 h-7 rounded-lg bg-[#3ABDD5]/10 flex items-center justify-center flex-shrink-0">
                    <PlaySquare className="w-4 h-4 text-[#3ABDD5]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800">{d.numero} · {d.equipoNombre}</p>
                    <p className="text-xs text-gray-400">{formatDate(d.fecha)} · {d.estado}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Presupuestos */}
        <PresupuestosSection
          presupuestos={oportunidad.presupuestos || []}
          onUpdate={(list) => updateOportunidad(oportunidad.id, { presupuestos: list })}
          origen="oportunidad"
          origenId={oportunidad.id}
        />

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
