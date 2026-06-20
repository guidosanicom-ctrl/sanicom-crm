import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, TrendingUp, Wrench, Calendar, PlaySquare, Briefcase,
  Clock, Percent, ArrowUpRight, AlertCircle, ChevronRight,
} from 'lucide-react';
import { format, parseISO, formatDistanceToNow, isAfter, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import Card from '../../components/ui/Card';
import UserAvatar from '../../components/ui/UserAvatar';
import { useClientesStore } from '../../store/clientesStore';
import { useOportunidadesStore } from '../../store/oportunidadesStore';
import { useServicioStore } from '../../store/servicioStore';
import { useAgendaStore } from '../../store/agendaStore';
import { useActividadStore } from '../../store/actividadStore';
import { useAuthStore } from '../../store/authStore';
import { useDemosStore } from '../../store/demosStore';
import { formatCurrency } from '../../utils/formatters';

const MODULO_RUTA = {
  clientes: '/clientes', pipeline: '/pipeline',
  demostraciones: '/demostraciones', 'servicio-tecnico': '/servicio-tecnico',
};

const TIPO_ICON = { cliente: Users, oportunidad: TrendingUp, demo: PlaySquare, servicio: Wrench, agenda: Calendar };
const TIPO_COLOR = {
  cliente: 'bg-blue-100 text-blue-600',
  oportunidad: 'bg-cyan-100 text-cyan-600',
  demo: 'bg-purple-100 text-purple-600',
  servicio: 'bg-amber-100 text-amber-600',
  agenda: 'bg-green-100 text-green-600',
};

const FUNNEL_CONFIG = [
  { etapa: 'Prospecto',         label: 'Prospecto',      bg: '#E6F1FB', textColor: '#1e3a5f' },
  { etapa: 'Interesado',        label: 'Interesado',     bg: '#B5D4F4', textColor: '#1e3a5f' },
  { etapa: 'Propuesta enviada', label: 'Oferta enviada', bg: '#85B7EB', textColor: '#1e3a5f' },
  { etapa: 'Negociación',       label: 'Negociación',    bg: '#378ADD', textColor: '#ffffff' },
  { etapa: 'Ganado',            label: 'Ganado',         bg: '#639922', textColor: '#ffffff' },
];

const ESPECIALIDADES = ['Fisioterapia', 'Podología', 'Veterinaria'];
const BAR_COLORS = ['#1B4F8A', '#3ABDD5', '#0F766E', '#94A3B8'];

function TimeAgo({ dateStr }) {
  try {
    return <span className="text-xs text-gray-400">{formatDistanceToNow(parseISO(dateStr), { addSuffix: true, locale: es })}</span>;
  } catch { return null; }
}

function SectionTitle({ icon: Icon, label, action, onAction }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className="w-4 h-4 text-[#3ABDD5]" />
      <h3 className="text-base font-semibold text-gray-800">{label}</h3>
      {action && (
        <button onClick={onAction} className="ml-auto text-xs text-[#1B4F8A] hover:underline flex items-center gap-0.5 cursor-pointer">
          {action} <ChevronRight className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, trend, trendIcon: TrendIcon, accent, to }) {
  const navigate = useNavigate();
  return (
    <div
      onClick={to ? () => navigate(to) : undefined}
      className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex ${to ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-150' : ''}`}
    >
      {/* Acento vertical */}
      <div className="w-1 flex-shrink-0" style={{ backgroundColor: accent }} />
      <div className="flex-1 p-4 flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: accent + '18' }}>
          <Icon className="w-5 h-5" style={{ color: accent }} />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide leading-none mb-1">{label}</p>
          <p className="text-2xl font-bold text-gray-900 leading-none">{value}</p>
          {trend && (
            <p className="text-xs mt-1.5 flex items-center gap-0.5" style={{ color: accent }}>
              {TrendIcon && <TrendIcon className="w-3 h-3" />}
              {trend}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { users } = useAuthStore();
  const { clientes } = useClientesStore();
  const { oportunidades } = useOportunidadesStore();
  const { servicios } = useServicioStore();
  const { eventos } = useAgendaStore();
  const { actividad } = useActividadStore();
  const { demos } = useDemosStore();
  const navigate = useNavigate();

  const stats = useMemo(() => {
    const today = startOfDay(new Date());
    const thisMonth = format(today, 'yyyy-MM');
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 2);

    // Clientes
    const activeClients = clientes.filter(c => c.estado === 'Activo').length;
    const newThisMonth = clientes.filter(c => c.fechaAlta?.startsWith(thisMonth)).length;

    // Pipeline
    const openOpps = oportunidades.filter(o => !['Ganado', 'Perdido'].includes(o.etapa));
    const totalPipeline = openOpps.reduce((s, o) => s + (o.valor || 0), 0);

    // OTs
    const clienteNombre = (id) => clientes.find(c => c.id === id)?.nombre || '—';
    const activeStates = ['Pendiente', 'Programada', 'En curso'];
    const activeOTs = servicios
      .filter(s => activeStates.includes(s.estado))
      .map(s => ({ ...s, clienteNombre: clienteNombre(s.clienteId) }));
    const urgentOTs = activeOTs.filter(s => s.prioridad === 'Urgente').length;

    // Demos — próximos 7 días (incluye hoy), estados no terminados
    const nextWeek = new Date(today); nextWeek.setDate(today.getDate() + 7);
    const DEMO_ESTADOS_EXCLUIDOS = ['Realizada', 'Cancelada'];
    const tempPorCliente = (clienteId) => {
      const opp = oportunidades
        .filter(o => o.clienteId === clienteId && !['Ganado', 'Perdido'].includes(o.etapa))
        .sort((a, b) => (b.fechaCreacion || '').localeCompare(a.fechaCreacion || ''))[0];
      return opp?.temperatura || null;
    };
    const upcomingDemos = demos
      .filter(d => {
        if (DEMO_ESTADOS_EXCLUIDOS.includes(d.estado)) return false;
        try {
          const fd = parseISO(d.fecha);
          return fd >= today && fd <= nextWeek;
        } catch { return false; }
      })
      .sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''))
      .map(d => ({
        ...d,
        clienteNombre: clienteNombre(d.clienteId),
        temperatura: tempPorCliente(d.clienteId),
      }));

    // Eventos hoy/mañana
    const upcomingEvents = eventos.filter(e => {
      try { const d = parseISO(e.inicio); return d >= today && d < tomorrow; } catch { return false; }
    }).length;

    // Tasa cierre
    const won = oportunidades.filter(o => o.etapa === 'Ganado').length;
    const closed = oportunidades.filter(o => ['Ganado', 'Perdido'].includes(o.etapa)).length;
    const closeRate = closed > 0 ? Math.round((won / closed) * 100) : 0;

    // Embudo pipeline (5 etapas activas, excluye Perdido)
    const FUNNEL_ETAPAS = ['Prospecto', 'Interesado', 'Propuesta enviada', 'Negociación', 'Ganado'];
    const PROB_DEFAULT = { Prospecto: 10, Interesado: 25, 'Propuesta enviada': 50, Negociación: 75, Ganado: 100 };
    const funnelStages = FUNNEL_ETAPAS.map(etapa => {
      const opps = oportunidades.filter(o => o.etapa === etapa);
      return {
        etapa,
        count: opps.length,
        valor: opps.reduce((s, o) => s + (o.valor || 0), 0),
      };
    });
    const valorPonderado = oportunidades
      .filter(o => !['Perdido'].includes(o.etapa))
      .reduce((s, o) => s + (o.valor || 0) * ((o.probabilidad ?? PROB_DEFAULT[o.etapa] ?? 50) / 100), 0);

    // Clientes por especialidad
    const total = clientes.length || 1;
    const especCounts = ESPECIALIDADES.map(esp => ({
      label: esp,
      count: clientes.filter(c => c.especialidad === esp).length,
    }));
    const otrasCount = clientes.filter(c => !ESPECIALIDADES.includes(c.especialidad)).length;
    const especData = [...especCounts, { label: 'Otras', count: otrasCount }].map(e => ({
      ...e,
      pct: Math.round((e.count / total) * 100),
    }));

    // Clientes nuevos esta semana
    const sevenDaysAgo = new Date(today); sevenDaysAgo.setDate(today.getDate() - 7);
    const newThisWeek = clientes.filter(c => {
      try { return parseISO(c.fechaAlta) >= sevenDaysAgo; } catch { return false; }
    }).length;

    return {
      activeClients, newThisMonth, newThisWeek,
      openOpps: openOpps.length, totalPipeline,
      activeOTs, urgentOTs,
      upcomingDemos, upcomingEvents,
      closeRate, won, closed,
      funnelStages, valorPonderado, especData,
    };
  }, [clientes, oportunidades, servicios, eventos, demos]);

  const [hoy, setHoy] = useState(() => new Date());
  useEffect(() => {
    // Refresca a medianoche para que la fecha siempre sea correcta
    const ahora = new Date();
    const msSiguienteDia = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + 1) - ahora;
    const t = setTimeout(() => { setHoy(new Date()); }, msSiguienteDia);
    return () => clearTimeout(t);
  }, [hoy]);

  const feed = useMemo(() =>
    actividad.slice(0, 15).map(item => ({
      ...item,
      userName: (item.userId ? users.find(u => u.id === item.userId)?.name : null) || item.userName,
    })),
  [actividad, users]);

  return (
    <div className="space-y-6">

      {/* ── Encabezado ───────────────────────────────────────── */}
      <div>
        <p className="text-2xl font-bold text-gray-900 leading-tight">Sanicom Medical Systems S.L</p>
        <p className="text-sm text-gray-400 mt-0.5 capitalize">
          {format(hoy, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
        </p>
      </div>

      {/* ── KPIs ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard
          icon={Users} label="Clientes activos" value={stats.activeClients}
          trend={stats.newThisMonth > 0 ? `+${stats.newThisMonth} este mes` : 'Sin altas este mes'}
          trendIcon={ArrowUpRight} accent="#1B4F8A" to="/clientes"
        />
        <KpiCard
          icon={TrendingUp} label="Pipeline abierto" value={stats.openOpps}
          trend={formatCurrency(stats.totalPipeline)}
          accent="#3ABDD5" to="/pipeline"
        />
        <KpiCard
          icon={Wrench} label="OTs activas" value={stats.activeOTs.length}
          trend={stats.urgentOTs > 0 ? `${stats.urgentOTs} urgente${stats.urgentOTs > 1 ? 's' : ''}` : 'Sin urgentes'}
          trendIcon={stats.urgentOTs > 0 ? AlertCircle : undefined} accent="#F59E0B" to="/servicio-tecnico"
        />
        <KpiCard
          icon={PlaySquare} label="Demos programadas" value={stats.upcomingDemos.length}
          trend={stats.upcomingDemos.length > 0 ? `Próxima: ${stats.upcomingDemos[0]?.fecha || '—'}` : 'Sin demos próximas'}
          accent="#8B5CF6" to="/demostraciones"
        />
        <KpiCard
          icon={Calendar} label="Eventos hoy/mañana" value={stats.upcomingEvents}
          trend="Hoy y mañana"
          accent="#0F766E" to="/agenda"
        />
        <KpiCard
          icon={Percent} label="Tasa de cierre" value={`${stats.closeRate}%`}
          trend={`${stats.won} ganados / ${stats.closed} cerrados`}
          accent="#16A34A" to="/pipeline"
        />
      </div>

      {/* ── Embudo pipeline + Clientes nuevos ───────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* Embudo pipeline */}
        <Card>
          <SectionTitle icon={TrendingUp} label="Embudo de pipeline" action="Ver todas" onAction={() => navigate('/pipeline')} />

          {/* Flechas — scroll horizontal en móvil */}
          <div className="overflow-x-auto -mx-1 px-1 pb-1">
            <div className="flex items-stretch min-w-[520px]" style={{ height: 110 }}>
              {FUNNEL_CONFIG.map(({ etapa, label, bg, textColor }, i) => {
                const stage = stats.funnelStages.find(s => s.etapa === etapa) || { count: 0, valor: 0 };
                const isFirst = i === 0;
                const isLast = i === FUNNEL_CONFIG.length - 1;
                const NOTCH = 18;
                const clipPath = isLast
                  ? 'none'
                  : isFirst
                    ? `polygon(0% 0%, calc(100% - ${NOTCH}px) 0%, 100% 50%, calc(100% - ${NOTCH}px) 100%, 0% 100%)`
                    : `polygon(0% 0%, calc(100% - ${NOTCH}px) 0%, 100% 50%, calc(100% - ${NOTCH}px) 100%, 0% 100%, ${NOTCH}px 50%)`;
                return (
                  <div
                    key={etapa}
                    className="flex-1 flex flex-col items-center justify-center cursor-pointer transition-opacity hover:opacity-90"
                    style={{
                      backgroundColor: bg,
                      clipPath,
                      marginRight: isLast ? 0 : `-${NOTCH - 1}px`,
                      zIndex: FUNNEL_CONFIG.length - i,
                      paddingLeft: isFirst ? 8 : NOTCH + 4,
                      paddingRight: isLast ? 8 : NOTCH + 4,
                    }}
                    onClick={() => navigate('/pipeline')}
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-center leading-tight" style={{ color: textColor, opacity: 0.75 }}>{label}</p>
                    <p className="text-2xl font-bold leading-none mt-1" style={{ color: textColor }}>{stage.count}</p>
                    <p className="text-[10px] font-medium mt-1 text-center" style={{ color: textColor, opacity: 0.8 }}>{formatCurrency(stage.valor)}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Barra resumen */}
          <div className="mt-3 flex items-center gap-4 pt-3 border-t border-gray-100">
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Total pipeline</p>
              <p className="text-base font-bold text-gray-900">{formatCurrency(stats.totalPipeline)}</p>
            </div>
            <div className="w-px h-8 bg-gray-200" />
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Valor ponderado</p>
              <p className="text-base font-bold text-[#1B4F8A]">{formatCurrency(stats.valorPonderado)}</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">Oportunidades</p>
              <p className="text-base font-bold text-gray-900">{stats.openOpps}</p>
            </div>
          </div>
        </Card>

        {/* Clientes nuevos */}
        <Card>
          <SectionTitle icon={Users} label="Clientes nuevos" action="Ver clientes" onAction={() => navigate('/clientes')} />
          <div className="grid grid-cols-2 gap-3 mt-1">
            <div className="rounded-xl p-4 flex flex-col gap-2" style={{ backgroundColor: '#F0FDF4' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#16A34A18' }}>
                <ArrowUpRight className="w-4 h-4" style={{ color: '#16A34A' }} />
              </div>
              <p className="text-3xl font-bold text-gray-900 leading-none">{stats.newThisMonth}</p>
              <p className="text-xs font-medium" style={{ color: '#16A34A' }}>Este mes</p>
            </div>
            <div className="rounded-xl p-4 flex flex-col gap-2" style={{ backgroundColor: '#EFF6FF' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#1B4F8A18' }}>
                <ArrowUpRight className="w-4 h-4" style={{ color: '#1B4F8A' }} />
              </div>
              <p className="text-3xl font-bold text-gray-900 leading-none">{stats.newThisWeek}</p>
              <p className="text-xs font-medium" style={{ color: '#1B4F8A' }}>Esta semana</p>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Especialidades + OTs activas + Próximas demos ─────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Clientes por especialidad */}
        <Card>
          <SectionTitle icon={Users} label="Clientes por especialidad" />
          <div className="space-y-3">
            {stats.especData.map(({ label, count, pct }, i) => (
              <div key={label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-gray-700">{label}</span>
                  <span className="text-gray-400">{count} ({pct}%)</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: BAR_COLORS[i] || '#94A3B8' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* OTs activas */}
        <Card>
          <SectionTitle icon={Wrench} label="OTs activas" action="Ver todas" onAction={() => navigate('/servicio-tecnico')} />
          {stats.activeOTs.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Sin órdenes activas</p>
          ) : (
            <div className="space-y-2">
              {stats.activeOTs.slice(0, 5).map(ot => (
                <div key={ot.id} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors" onClick={() => navigate('/servicio-tecnico')}>
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${ot.prioridad === 'Urgente' ? 'bg-red-500' : ot.prioridad === 'Alta' ? 'bg-amber-400' : 'bg-gray-300'}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-gray-800 truncate">{ot.numero}</p>
                    <p className="text-[11px] text-gray-400 truncate">{ot.clienteNombre || ot.clienteId || '—'}</p>
                  </div>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                    ot.estado === 'En curso' ? 'bg-blue-100 text-blue-600' :
                    ot.estado === 'Programada' ? 'bg-purple-100 text-purple-600' :
                    'bg-amber-100 text-amber-700'
                  }`}>{ot.estado}</span>
                </div>
              ))}
              {stats.activeOTs.length > 5 && (
                <p className="text-xs text-center text-gray-400 pt-1">+{stats.activeOTs.length - 5} más</p>
              )}
            </div>
          )}
        </Card>

        {/* Próximas demos */}
        <Card>
          <SectionTitle icon={PlaySquare} label="Próximas demos (7 días)" action="Ver todas" onAction={() => navigate('/demostraciones')} />
          {stats.upcomingDemos.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Sin demos programadas esta semana</p>
          ) : (
            <div className="space-y-2">
              {stats.upcomingDemos.slice(0, 5).map(demo => {
                const TEMP_MAP = { frio: { icon: '❄️', label: 'Frío', cls: 'bg-blue-50 text-blue-500' }, tibio: { icon: '🌤', label: 'Tibio', cls: 'bg-amber-50 text-amber-600' }, caliente: { icon: '🔥', label: 'Caliente', cls: 'bg-red-50 text-red-500' } };
                const temp = demo.temperatura ? TEMP_MAP[demo.temperatura] : null;
                let diaMes = '—';
                try { diaMes = format(parseISO(demo.fecha), "d MMM", { locale: es }); } catch {}
                return (
                  <div key={demo.id} className="flex items-start gap-2 p-2 rounded-lg bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors" onClick={() => navigate('/demostraciones')}>
                    {/* Fecha */}
                    <div className="w-10 flex-shrink-0 flex flex-col items-center justify-center bg-purple-100 rounded-lg py-1.5">
                      <span className="text-[11px] font-bold text-purple-700 leading-none uppercase">{diaMes.split(' ')[1] || ''}</span>
                      <span className="text-base font-bold text-purple-800 leading-none">{diaMes.split(' ')[0] || ''}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-gray-800 truncate">{demo.equipoNombre || demo.numero}</p>
                      <p className="text-[11px] text-gray-500 truncate">{demo.clienteNombre}</p>
                      {temp && (
                        <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full mt-0.5 ${temp.cls}`}>
                          {temp.icon} {temp.label}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              {stats.upcomingDemos.length > 5 && (
                <p className="text-xs text-center text-gray-400 pt-1">+{stats.upcomingDemos.length - 5} más</p>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* ── Actividad reciente ────────────────────────────────── */}
      <Card>
        <SectionTitle icon={Clock} label="Actividad reciente" />
        {feed.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>Aún no hay actividad registrada.</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {feed.map((item, i) => {
              const Icon = TIPO_ICON[item.tipo] || Briefcase;
              const colorCls = TIPO_COLOR[item.tipo] || 'bg-gray-100 text-gray-500';
              return (
                <div key={item.id || i} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors">
                  <UserAvatar name={item.userName} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="text-sm font-semibold text-gray-800">{item.userName}</span>
                      <span className="text-sm text-gray-500">{item.accion}</span>
                      {item.registroLabel && (
                        MODULO_RUTA[item.modulo] ? (
                          <button
                            onClick={() => navigate(MODULO_RUTA[item.modulo])}
                            className="text-sm font-medium text-[#1B4F8A] hover:underline truncate max-w-[180px] text-left cursor-pointer"
                          >
                            {item.registroLabel}
                          </button>
                        ) : (
                          <span className="text-sm font-medium text-[#1B4F8A] truncate max-w-[180px]">{item.registroLabel}</span>
                        )
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${colorCls}`}>
                        <Icon className="w-2.5 h-2.5" />{item.tipo}
                      </span>
                      <TimeAgo dateStr={item.fechaHora} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
