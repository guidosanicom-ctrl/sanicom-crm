import { useMemo } from 'react';
import { Users, TrendingUp, Wrench, Calendar, Target } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, parseISO, startOfMonth, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import Card from '../../components/ui/Card';
import { useClientesStore } from '../../store/clientesStore';
import { useOportunidadesStore } from '../../store/oportunidadesStore';
import { useServicioStore } from '../../store/servicioStore';
import { useAgendaStore } from '../../store/agendaStore';
import { formatCurrency } from '../../utils/formatters';
import { ETAPAS_PIPELINE } from '../../utils/constants';

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
  }, [clientes, oportunidades, servicios, eventos]);

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
        <h3 className="text-base font-semibold text-gray-800 mb-4">Actividad reciente</h3>
        <div className="space-y-3">
          {[...oportunidades, ...clientes].sort((a, b) => {
            const da = a.fechaUltimaActualizacion || a.fechaAlta || '';
            const db = b.fechaUltimaActualizacion || b.fechaAlta || '';
            return db.localeCompare(da);
          }).slice(0, 5).map((item, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                {item.etapa ? <TrendingUp className="w-4 h-4 text-blue-600" /> : <Users className="w-4 h-4 text-blue-600" />}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">{item.nombre}</p>
                <p className="text-xs text-gray-400">{item.etapa ? `Oportunidad · ${item.etapa}` : `Cliente · ${item.tipo || ''}`}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
