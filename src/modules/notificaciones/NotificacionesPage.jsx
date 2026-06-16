import { useState } from 'react';
import { useNotificacionesStore } from '../../store/notificacionesStore';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/shared/EmptyState';
import Pagination from '../../components/shared/Pagination';
import { Bell } from 'lucide-react';
import { formatDateTime } from '../../utils/formatters';

export default function NotificacionesPage() {
  const { notificaciones, markRead, markAllRead } = useNotificacionesStore();
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const PER_PAGE = 20;

  const filtered = notificaciones.filter(n => filter === 'all' || (filter === 'unread' && !n.leida));
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {[{ v: 'all', l: 'Todas' }, { v: 'unread', l: 'No leídas' }].map(({ v, l }) => (
            <button key={v} onClick={() => { setFilter(v); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer transition-colors ${filter === v ? 'bg-[#1B4F8A] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              {l}
            </button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={markAllRead}>Marcar todas como leídas</Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState icon={Bell} title="Sin notificaciones" message="No hay notificaciones para mostrar." />
        ) : (
          <div className="divide-y divide-gray-50">
            {paginated.map(n => (
              <div key={n.id} onClick={() => markRead(n.id)}
                className={`px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors flex items-start gap-4 ${!n.leida ? 'bg-blue-50' : ''}`}>
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${!n.leida ? 'bg-[#1B4F8A]' : 'bg-gray-200'}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${!n.leida ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>{n.mensaje}</p>
                  {n.tipo && <p className="text-xs text-gray-400 mt-0.5">{n.tipo} · {n.modulo}</p>}
                  <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(n.fechaHora)}</p>
                </div>
                {!n.leida && <Badge color="blue" size="xs">Nueva</Badge>}
              </div>
            ))}
          </div>
        )}
        {filtered.length > PER_PAGE && (
          <div className="px-6 pb-4">
            <Pagination page={page} total={filtered.length} perPage={PER_PAGE} onChange={setPage} />
          </div>
        )}
      </div>
    </div>
  );
}
