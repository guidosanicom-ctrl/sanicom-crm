import { useState, useMemo, useEffect } from 'react';
import { useOpenFromUrl } from '../../hooks/useOpenFromUrl';
import { useAutoRefresh, makeRefresher } from '../../hooks/useAutoRefresh';
import RefreshIndicator from '../../components/ui/RefreshIndicator';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus, Euro, TrendingUp, LayoutGrid, List, X, ArrowLeftRight, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { useOportunidadesStore } from '../../store/oportunidadesStore';
import { useClientesStore } from '../../store/clientesStore';
import { useAuthStore } from '../../store/authStore';
import { useDemosStore } from '../../store/demosStore';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import OportunidadForm from './OportunidadForm';
import OportunidadDetail from './OportunidadDetail';
import DemoForm from '../demostraciones/DemoForm';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { usePipelineStore } from '../../store/pipelineStore';
import ConfirmDialog from '../../components/shared/ConfirmDialog';

const STAGE_COLORS = {
  'Prospecto': 'bg-gray-100 border-gray-200',
  'Interesado': 'bg-blue-50 border-blue-100',
  'Propuesta enviada': 'bg-purple-50 border-purple-100',
  'Negociación': 'bg-yellow-50 border-yellow-100',
  'Ganado': 'bg-green-50 border-green-100',
  'Perdido': 'bg-red-50 border-red-100',
};
const STAGE_HEADER = {
  'Prospecto': 'text-gray-600',
  'Interesado': 'text-blue-700',
  'Propuesta enviada': 'text-purple-700',
  'Negociación': 'text-yellow-700',
  'Ganado': 'text-green-700',
  'Perdido': 'text-red-700',
};

const TEMP_ICON = { frio: '❄️', tibio: '🌤', caliente: '🔥' };

const ESTADO_CLIENTE_COLOR = {
  'Evaluando opciones': 'bg-blue-50 text-blue-700',
  'Esperando aprobación': 'bg-yellow-50 text-yellow-700',
  'Consultando dirección': 'bg-purple-50 text-purple-700',
  'Silencio': 'bg-gray-100 text-gray-500',
  'Listo para decidir': 'bg-green-50 text-green-700',
};
const FINANCIACION_COLOR = {
  'Propia': 'bg-emerald-50 text-emerald-700',
  'Financiación bancaria': 'bg-blue-50 text-blue-700',
  'Leasing': 'bg-violet-50 text-violet-700',
  'Subvención': 'bg-orange-50 text-orange-700',
  'Por definir': 'bg-gray-100 text-gray-500',
};

// ── Bottom sheet para mover etapa (solo móvil) ───────────────────────────────
function MoveBottomSheet({ opp, etapas, onMove, onClose }) {
  // Cerrar al tocar el fondo
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:hidden">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full bg-white rounded-t-2xl shadow-2xl pb-safe">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
          <div>
            <p className="text-xs text-gray-400">Mover oportunidad</p>
            <p className="text-sm font-semibold text-gray-800 truncate max-w-[260px]">{opp.nombre}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="py-2">
          {etapas.map(etapa => {
            const isCurrent = etapa === opp.etapa;
            return (
              <button
                key={etapa}
                onClick={() => { if (!isCurrent) onMove(etapa); }}
                className={`w-full flex items-center justify-between px-5 py-3.5 text-sm transition-colors
                  ${isCurrent
                    ? 'text-[#1B4F8A] font-semibold bg-blue-50'
                    : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100'}`}
              >
                <span>{etapa}</span>
                {isCurrent && <Check className="w-4 h-4 text-[#1B4F8A]" />}
              </button>
            );
          })}
        </div>
        <div className="h-6" />
      </div>
    </div>
  );
}

// ── Tarjeta móvil con botón Mover ────────────────────────────────────────────
function MobileOppCard({ opp, clients, users, onClick, onMove }) {
  const client = clients.find(c => c.id === opp.clienteId);
  const user = users.find(u => u.id === opp.responsable);
  return (
    <div className={`rounded-xl p-3.5 shadow-sm border ${opp.enPausa ? 'bg-gray-100 border-gray-200' : 'bg-white border-gray-100'}`}>
      <div className="flex items-start justify-between gap-2 mb-1">
        <button onClick={onClick} className="text-sm font-semibold text-gray-800 leading-snug text-left flex-1">
          {opp.enPausa && <span className="mr-1">⏸️</span>}
          {opp.nombre}
          {opp.temperatura && <span className="ml-1">{TEMP_ICON[opp.temperatura]}</span>}
        </button>
      </div>
      <p className="text-xs text-gray-500 mb-2.5">{client?.nombre || '-'}</p>

      {(opp.estadoCliente || opp.financiacion) && (
        <div className="flex flex-wrap gap-1 mb-2.5">
          {opp.estadoCliente && (
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${ESTADO_CLIENTE_COLOR[opp.estadoCliente] || 'bg-gray-100 text-gray-500'}`}>
              {opp.estadoCliente}
            </span>
          )}
          {opp.financiacion && (
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${FINANCIACION_COLOR[opp.financiacion] || 'bg-gray-100 text-gray-500'}`}>
              {opp.financiacion}
            </span>
          )}
        </div>
      )}

      {opp.notaSeguimiento && (
        <p className="text-[11px] text-gray-500 italic bg-gray-50 rounded px-2 py-1 mb-2.5 line-clamp-2">
          {opp.notaSeguimiento}
        </p>
      )}

      <div className="flex items-center justify-between mt-1">
        <span className="text-sm font-bold text-[#1B4F8A]">{formatCurrency(opp.valor)}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{opp.probabilidad}%</span>
          <button
            onClick={(e) => { e.stopPropagation(); onMove(); }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#1B4F8A]/10 text-[#1B4F8A] text-xs font-medium active:bg-[#1B4F8A]/20 transition-colors"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            Mover
          </button>
        </div>
      </div>
      <div className="mt-1.5 flex items-center justify-between">
        <span className="text-xs text-gray-400">Cierre: {formatDate(opp.fechaCierre)}</span>
        <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-500">{user?.name?.split(' ')[0]}</span>
      </div>
    </div>
  );
}

function OppCard({ opp, clients, users, onClick }) {
  const client = clients.find(c => c.id === opp.clienteId);
  const user = users.find(u => u.id === opp.responsable);
  return (
    <div onClick={onClick} className={`rounded-xl p-3.5 shadow-sm border cursor-pointer hover:shadow-md transition-shadow ${opp.enPausa ? 'bg-gray-100 border-gray-200' : 'bg-white border-gray-100'}`}>
      {/* Cabecera: pausa + temperatura + nombre */}
      <div className="flex items-start justify-between gap-1 mb-1">
        <p className="text-sm font-semibold text-gray-800 leading-snug flex-1">
          {opp.enPausa && <span className="mr-1">⏸️</span>}
          {opp.nombre}
        </p>
        {opp.temperatura && <span className="text-base flex-shrink-0">{TEMP_ICON[opp.temperatura]}</span>}
      </div>
      <p className="text-xs text-gray-500 mb-2.5">{client?.nombre || '-'}</p>

      {/* Chips: estado cliente + financiación */}
      {(opp.estadoCliente || opp.financiacion) && (
        <div className="flex flex-wrap gap-1 mb-2.5">
          {opp.estadoCliente && (
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${ESTADO_CLIENTE_COLOR[opp.estadoCliente] || 'bg-gray-100 text-gray-500'}`}>
              {opp.estadoCliente}
            </span>
          )}
          {opp.financiacion && (
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${FINANCIACION_COLOR[opp.financiacion] || 'bg-gray-100 text-gray-500'}`}>
              {opp.financiacion}
            </span>
          )}
        </div>
      )}

      {/* Nota de seguimiento */}
      {opp.notaSeguimiento && (
        <p className="text-[11px] text-gray-500 italic bg-gray-50 rounded px-2 py-1 mb-2.5 line-clamp-2">
          {opp.notaSeguimiento}
        </p>
      )}

      {/* Valor + probabilidad */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-[#1B4F8A]">{formatCurrency(opp.valor)}</span>
        <span className="text-xs text-gray-400">{opp.probabilidad}%</span>
      </div>
      <div className="mt-1.5 flex items-center justify-between">
        <span className="text-xs text-gray-400">Cierre: {formatDate(opp.fechaCierre)}</span>
        <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-500">{user?.name?.split(' ')[0]}</span>
      </div>
      {opp.enPausa && opp.pausaRecordatorio && (
        <div className="mt-1.5 flex items-center gap-1 text-[10px] text-gray-400">
          <span>🔔 Retomar: {formatDate(opp.pausaRecordatorio)}</span>
        </div>
      )}
    </div>
  );
}

export default function PipelinePage() {
  const { oportunidades, addOportunidad, updateOportunidad, deleteOportunidad } = useOportunidadesStore();
  const { clientes } = useClientesStore();
  const { users, canEditRecord } = useAuthStore();
  const { addDemo, updateDemo } = useDemosStore();
  const { etapas: ETAPAS_PIPELINE } = usePipelineStore();
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [delOpen, setDelOpen] = useState(false);
  const [viewMode, setViewMode] = useState('kanban');
  const [mobileTab, setMobileTab] = useState(() => ETAPAS_PIPELINE[0] || '');
  const [moveSheet, setMoveSheet] = useState(null);
  const [demoFormOpen, setDemoFormOpen] = useState(false);

  // Sincronizar mobileTab cuando cargan las etapas
  useEffect(() => { if (!mobileTab && ETAPAS_PIPELINE.length) setMobileTab(ETAPAS_PIPELINE[0]); }, [ETAPAS_PIPELINE]);

  const openDetail = (opp) => { setSelected(opp); setDetailOpen(true); };
  const openEdit   = (opp) => { setSelected(opp); setDetailOpen(false); setFormOpen(true); };
  const openNew    = () => { setSelected(null); setFormOpen(true); };

  useOpenFromUrl((id) => {
    const opp = oportunidades.find((o) => o.id === id);
    if (opp) openDetail(opp);
  });

  const { refreshing } = useAutoRefresh([makeRefresher(useOportunidadesStore)]);

  // Crear demo vinculada desde el detalle de una oportunidad
  const handleCrearDemoDesdeOpp = () => setDemoFormOpen(true);

  const handleSaveDemo = (data) => {
    const opp = selected && oportunidades.find(o => o.id === selected.id);
    if (!opp) return;
    const demo = addDemo({
      ...data,
      clienteId: data.clienteId || opp.clienteId,
      equipoNombre: data.equipoNombre || opp.equiposDescripcion,
      responsable: data.responsable || opp.responsable,
      adjuntos: [],
    });
    // Vínculo bidireccional
    updateDemo(demo.id, { oportunidadId: opp.id, oportunidadNombre: opp.nombre });
    updateOportunidad(opp.id, { demoIds: [...(opp.demoIds || []), demo.id] });
    toast.success(`Demo ${demo.numero} creada y vinculada.`);
    setDemoFormOpen(false);
  };

  const onDragEnd = ({ source, destination, draggableId }) => {
    if (!destination) return;
    const newStage = destination.droppableId;
    updateOportunidad(draggableId, { etapa: newStage });
    toast.success(`Movido a "${newStage}"`);
  };

  const metrics = useMemo(() => {
    const open = oportunidades.filter(o => !['Ganado', 'Perdido'].includes(o.etapa));
    const pipeline = open.reduce((s, o) => s + (o.valor || 0), 0);
    const weighted = open.reduce((s, o) => s + (o.valor || 0) * (o.probabilidad || 0) / 100, 0);
    const now = new Date();
    const wonMonth = oportunidades.filter(o => {
      if (o.etapa !== 'Ganado') return false;
      const d = o.fechaUltimaActualizacion;
      return d && new Date(d).getMonth() === now.getMonth() && new Date(d).getFullYear() === now.getFullYear();
    }).length;
    return { total: oportunidades.length, pipeline, weighted, wonMonth };
  }, [oportunidades]);

  return (
    <div className="space-y-6">
      <RefreshIndicator show={refreshing} />
      {/* Metrics bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total oportunidades', value: metrics.total },
          { label: 'Pipeline total', value: formatCurrency(metrics.pipeline) },
          { label: 'Valor ponderado', value: formatCurrency(metrics.weighted) },
          { label: 'Ganadas este mes', value: metrics.wonMonth },
        ].map((m, i) => (
          <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500">{m.label}</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-white rounded-lg border border-gray-200 p-1">
          <button onClick={() => setViewMode('kanban')} className={`px-3 py-1.5 rounded text-sm cursor-pointer transition-colors ${viewMode === 'kanban' ? 'bg-[#1B4F8A] text-white' : 'text-gray-500 hover:text-gray-700'}`}>
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button onClick={() => setViewMode('table')} className={`px-3 py-1.5 rounded text-sm cursor-pointer transition-colors ${viewMode === 'table' ? 'bg-[#1B4F8A] text-white' : 'text-gray-500 hover:text-gray-700'}`}>
            <List className="w-4 h-4" />
          </button>
        </div>
        <Button onClick={openNew}><Plus className="w-4 h-4" />Nueva oportunidad</Button>
      </div>

      {/* ── Vista móvil (< 640px) ── */}
      {viewMode === 'kanban' && (
        <div className="sm:hidden space-y-3">
          {/* Tabs de etapa — cuadrícula 2×3 */}
          {(() => {
            const ETAPA_SHORT = {
              'Prospecto': 'Prospecto', 'Interesado': 'Interesado',
              'Propuesta enviada': 'Oferta', 'Negociación': 'Negoc.',
              'Ganado': 'Ganado', 'Perdido': 'Perdido',
            };
            return (
              <div className="grid grid-cols-3 gap-1.5">
                {ETAPAS_PIPELINE.map(etapa => {
                  const count = oportunidades.filter(o => o.etapa === etapa).length;
                  const active = mobileTab === etapa;
                  return (
                    <button key={etapa} onClick={() => setMobileTab(etapa)}
                      className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg text-xs font-medium transition-colors cursor-pointer
                        ${active ? 'bg-[#1B4F8A] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      <span>{ETAPA_SHORT[etapa] ?? etapa}</span>
                      <span className={`text-xs font-bold mt-0.5 ${active ? 'text-white/80' : 'text-gray-400'}`}>{count}</span>
                    </button>
                  );
                })}
              </div>
            );
          })()}

          {/* Tarjetas de la etapa activa */}
          {(() => {
            const cards = oportunidades.filter(o => o.etapa === mobileTab);
            if (cards.length === 0) return (
              <div className="text-center py-10 text-gray-400 text-sm">
                No hay oportunidades en esta etapa
              </div>
            );
            return (
              <div className="space-y-2">
                {cards.map(opp => (
                  <MobileOppCard
                    key={opp.id}
                    opp={opp}
                    clients={clientes}
                    users={users}
                    onClick={() => openDetail(opp)}
                    onMove={() => setMoveSheet(opp)}
                  />
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {viewMode === 'kanban' ? (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="hidden sm:flex gap-4 overflow-x-auto pb-4">
            {ETAPAS_PIPELINE.map(stage => {
              const stageopps = oportunidades.filter(o => o.etapa === stage);
              return (
                <div key={stage} className="flex-shrink-0 w-72">
                  <div className={`rounded-xl border p-3 ${STAGE_COLORS[stage] || 'bg-gray-50 border-gray-100'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <span className={`text-sm font-semibold ${STAGE_HEADER[stage] || 'text-gray-700'}`}>{stage}</span>
                      <span className="text-xs bg-white/70 px-2 py-0.5 rounded-full font-medium text-gray-500">{stageopps.length}</span>
                    </div>
                    <Droppable droppableId={stage}>
                      {(provided) => (
                        <div ref={provided.innerRef} {...provided.droppableProps} className="min-h-12 space-y-2">
                          {stageopps.map((opp, index) => (
                            <Draggable key={opp.id} draggableId={opp.id} index={index}>
                              {(prov, snapshot) => (
                                <div ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps}
                                  className={snapshot.isDragging ? 'opacity-80 rotate-1' : ''}>
                                  <OppCard opp={opp} clients={clientes} users={users} onClick={() => openDetail(opp)} />
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Nombre', 'Cliente', 'Valor', 'Probabilidad', 'Etapa', 'Cierre', 'Acciones'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {oportunidades.map(o => {
                const client = clientes.find(c => c.id === o.clienteId);
                return (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">
                      <button onClick={() => openDetail(o)} className="text-[#1B4F8A] hover:underline text-left cursor-pointer">{o.nombre}</button>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{client?.nombre}</td>
                    <td className="px-4 py-3 font-semibold text-[#1B4F8A]">{formatCurrency(o.valor)}</td>
                    <td className="px-4 py-3">{o.probabilidad}%</td>
                    <td className="px-4 py-3">
                      <Badge color={o.etapa === 'Ganado' ? 'green' : o.etapa === 'Perdido' ? 'gray' : 'blue'}>{o.etapa}</Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(o.fechaCierre)}</td>
                    <td className="px-4 py-3">
                      {canEditRecord(o) && <button onClick={() => openEdit(o)} className="text-blue-600 hover:underline text-xs cursor-pointer mr-2">Editar</button>}
                      {canEditRecord(o) && <button onClick={() => { setSelected(o); setDelOpen(true); }} className="text-red-500 hover:underline text-xs cursor-pointer">Eliminar</button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail panel */}
      <OportunidadDetail
        open={detailOpen}
        onClose={() => { setDetailOpen(false); setSelected(null); }}
        oportunidad={selected && oportunidades.find(o => o.id === selected.id)}
        onEdit={canEditRecord(selected) ? () => openEdit(selected) : null}
        onDelete={canEditRecord(selected) ? () => { setDetailOpen(false); setDelOpen(true); } : null}
        onCrearDemo={handleCrearDemoDesdeOpp}
      />

      {/* DemoForm lanzado desde OportunidadDetail */}
      <DemoForm
        open={demoFormOpen}
        onClose={() => setDemoFormOpen(false)}
        initial={selected ? {
          clienteId: selected.clienteId,
          equipoNombre: selected.equiposDescripcion || '',
          responsable: selected.responsable || '',
        } : null}
        onSave={handleSaveDemo}
      />

      <OportunidadForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setSelected(null); }}
        initial={selected}
        onSave={(data) => {
          if (selected) { updateOportunidad(selected.id, data); toast.success('Oportunidad actualizada.'); }
          else { addOportunidad(data); toast.success('Oportunidad creada.'); }
        }}
      />
      <ConfirmDialog open={delOpen} onClose={() => setDelOpen(false)}
        onConfirm={() => { deleteOportunidad(selected?.id); toast.success('Oportunidad eliminada.'); setSelected(null); }}
        title="Eliminar oportunidad"
        message={`¿Eliminar "${selected?.nombre}"?`} />

      {/* Bottom sheet mover etapa (móvil) */}
      {moveSheet && (
        <MoveBottomSheet
          opp={moveSheet}
          etapas={ETAPAS_PIPELINE}
          onMove={(etapa) => {
            updateOportunidad(moveSheet.id, { etapa });
            toast.success(`Movido a "${etapa}"`);
            setMoveSheet(null);
          }}
          onClose={() => setMoveSheet(null)}
        />
      )}
    </div>
  );
}
