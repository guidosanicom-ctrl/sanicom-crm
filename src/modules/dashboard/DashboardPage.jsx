import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, TrendingUp, Wrench, Calendar, Target, PlaySquare, Briefcase, Clock } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import Card from '../../components/ui/Card';
import { useClientesStore } from '../../store/clientesStore';
import { useOportunidadesStore } from '../../store/oportunidadesStore';
import { useServicioStore } from '../../store/servicioStore';
import { useAgendaStore } from '../../store/agendaStore';
import { useActividadStore } from '../../store/actividadStore';
import { formatCurrency } from '../../utils/formatters';
import { usePipelineStore } from '../../store/pipelineStore';

const MODULO_RUTA = { clientes: '/clientes', pipeline: '/pipeline', demostraciones: '/demostraciones', 'servicio-tecnico': '/servicio-tecnico' };
const TIPO_ICON = { cliente: Users, oportunidad: TrendingUp, demo: PlaySquare, servicio: Wrench, agenda: Calendar };
const TIPO_COLOR = {
  cliente: 'bg-blue-100 text-blue-600',
  oportunidad: 'bg-cyan-100 text-cyan-600',
  demo: 'bg-purple-100 text-purple-600',
  servicio: 'bg-amber-100 text-amber-600',
  agenda: 'bg-green-100 text-green-600',
};

function Avatar({ name }) {
  const initials = name ? name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() : '?';
  return (
    <div className="w-8 h-8 rounded-full bg-[#1B4F8A] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
      {initials}
    </div>
  );
}

function TimeAgo({ dateStr }) {
  try {
    return <span className="text-xs text-gray-400">{formatDistanceToNow(parseISO(dateStr), { addSuffix: true, locale: es })}</span>;
  } catch { return null; }
}

function KpiCard({ icon: Icon, label, value, sub, color = '#1B4F8A' }) {
  return (
    <Card className="flex items-start gap-4">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: color + '15' }}>
        <Icon className="w-6 h-6" style={{ color }} />
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </Card>
  );
}

export default function DashboardPage() {
  const { clientes } = useClientesStore();
  const { oportunidades } = useOportunidadesStore();
  const { servicios } = useServicioStore();
  const { eventos } = useAgendaStore();
  const { actividad } = useActividadStore();
  const navigate = useNavigate();
  const { etapas: ETAPAS_PIPELINE } = usePipelineStore();

  const stats = useMemo(() => {
    const activeClients = clientes.filter(c => c.estado === 'Activo').length;
    const openOpps = oportunidades.filter(o => !['Ganado', 'Perdido'].includes(o.etapa));
    const totalPipeline = openOpps.reduce((s, o) => s + (o.valor || 0), 0);
    const pendingServices = servicios.filter(s => ['Pendiente', 'Programada', 'En curso'].includes(s.estado)).length;

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 2);
    const upcomingEvents = eventos.filter(e => {
      try { const d = parseISO(e.inicio); return d >= today && d < tomorrow; } catch { return false; }
    }).length;

    const won = oportunidades.filter(o => o.etapa === 'Ganado').length;
    const total = oportunidades.filter(o => ['Ganado', 'Perdido'].includes(o.etapa)).length;
    const closeRate = total > 0 ? Math.round((won / total) * 100) : 0;

    const byStage = ETAPAS_PIPELINE.map(stage => ({
      name: stage.length > 12 ? stage.slice(0, 12) + '…' : stage,
      value: oportunidades.filter(o => o.etapa === stage).length,
    }));

    // clients per month last 6
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      const key = format(d, 'yyyy-MM');
      const label = format(d, 'MMM', { locale: es });
      const count = clientes.filter(c => {
        try { return c.fechaAlta && c.fechaAlta.startsWith(key); } catch { return false; }
      }).length;
      months.push({ name: label, value: count });
    }

    return { activeClients, openOpps: openOpps.length, totalPipeline, pendingServices, upcomingEvents, closeRate, byStage, months };
  }, [clientes, oportunidades, servicios, eventos, ETAPAS_PIPELINE]);

  const feed = useMemo(() => actividad.slice(0, 20), [actividad]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <KpiCard icon={Users} label="Clientes activos" value={stats.activeClients} color="#1B4F8A" />
        <KpiCard icon={TrendingUp} label="Oportunidades abiertas" value={stats.openOpps} sub={formatCurrency(stats.totalPipeline)} color="#3ABDD5" />
        <KpiCard icon={Wrench} label="Órdenes pendientes" value={stats.pendingServices} color="#F59E0B" />
        <KpiCard icon={Calendar} label="Eventos próximos" value={stats.upcomingEvents} sub="Hoy y mañana" color="#8B5CF6" />
        <KpiCard icon={Target} label="Tasa de cierre" value={`${stats.closeRate}%`} color="#22C55E" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-base font-semibold text-gray-800 mb-4">Oportunidades por etapa</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.byStage} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#1B4F8A" radius={[4, 4, 0, 0]} name="Oportunidades" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 className="text-base font-semibold text-gray-800 mb-4">Nuevos clientes (últimos 6 meses)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={stats.months} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#3ABDD5" strokeWidth={2} dot={{ r: 4, fill: '#3ABDD5' }} name="Clientes" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card>
        <div className="flex items-center gap-2 mb-5">
          <Clock className="w-4 h-4 text-[#3ABDD5]" />
          <h3 className="text-base font-semibold text-gray-800">Actividad reciente</h3>
          {feed.length > 0 && <span className="ml-auto text-xs text-gray-400">{feed.length} acciones</span>}
        </div>

        {feed.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>Aún no hay actividad registrada.</p>
            <p className="text-xs mt-1">Las acciones del equipo aparecerán aquí.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {feed.map((item, i) => {
              const Icon = TIPO_ICON[item.tipo] || Briefcase;
              const colorCls = TIPO_COLOR[item.tipo] || 'bg-gray-100 text-gray-500';
              return (
                <div key={item.id || i} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors">
                  <Avatar name={item.userName} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-semibold text-gray-800">{item.userName}</span>
                      <span className="text-sm text-gray-600">{item.accion}</span>
                      {item.registroLabel && (
                        MODULO_RUTA[item.modulo] ? (
                          <button
                            onClick={() => navigate(MODULO_RUTA[item.modulo])}
                            className="text-sm font-medium text-[#1B4F8A] hover:underline truncate max-w-[200px] text-left"
                          >
                            {item.registroLabel}
                          </button>
                        ) : (
                          <span className="text-sm font-medium text-[#1B4F8A] truncate max-w-[200px]">
                            {item.registroLabel}
                          </span>
                        )
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${colorCls}`}>
                        <Icon className="w-2.5 h-2.5" />
                        {item.tipo}
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
