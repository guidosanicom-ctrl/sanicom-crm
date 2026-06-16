import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameDay, isSameMonth, parseISO, addMonths, subMonths, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { useAgendaStore } from '../../store/agendaStore';
import { useClientesStore } from '../../store/clientesStore';
import { useAuthStore } from '../../store/authStore';
import Button from '../../components/ui/Button';
import EventForm from './EventForm';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import { COLORS_EVENTO, TIPOS_EVENTO } from '../../utils/constants';
import { formatDateTime } from '../../utils/formatters';

function parseDate(str) { try { return str ? parseISO(str) : null; } catch { return null; } }

export default function AgendaPage() {
  const { eventos, addEvento, updateEvento, deleteEvento } = useAgendaStore();
  const { clientes } = useClientesStore();
  const { users } = useAuthStore();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [view, setView] = useState('month');
  const [formOpen, setFormOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [defaultDate, setDefaultDate] = useState('');
  const [detailEvent, setDetailEvent] = useState(null);
  const [delOpen, setDelOpen] = useState(false);
  const [filterTipo, setFilterTipo] = useState('');
  const [filterResp, setFilterResp] = useState('');

  const filteredEventos = useMemo(() => eventos.filter(e => {
    if (filterTipo && e.tipo !== filterTipo) return false;
    if (filterResp && e.responsable !== filterResp) return false;
    return true;
  }), [eventos, filterTipo, filterResp]);

  const getDayEvents = (date) => filteredEventos.filter(e => {
    const d = parseDate(e.inicio);
    return d && isSameDay(d, date);
  });

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
    const days = [];
    let d = start;
    while (d <= end) { days.push(new Date(d)); d = addDays(d, 1); }
    return days;
  }, [currentMonth]);

  const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  const handleDayClick = (date) => {
    setDefaultDate(format(date, 'yyyy-MM-dd'));
    setSelectedEvent(null);
    setFormOpen(true);
  };

  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return filteredEventos.filter(e => {
      const d = parseDate(e.inicio);
      return d && d >= now;
    }).sort((a, b) => a.inicio.localeCompare(b.inicio)).slice(0, 8);
  }, [filteredEventos]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2">
          {['month', 'week', 'day'].map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer capitalize transition-colors ${view === v ? 'bg-[#1B4F8A] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              {v === 'month' ? 'Mes' : v === 'week' ? 'Semana' : 'Día'}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none bg-white">
            <option value="">Todos los tipos</option>
            {TIPOS_EVENTO.map(t => <option key={t}>{t}</option>)}
          </select>
          <select value={filterResp} onChange={e => setFilterResp(e.target.value)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none bg-white">
            <option value="">Todos</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <Button size="sm" onClick={() => { setSelectedEvent(null); setDefaultDate(''); setFormOpen(true); }}>
            <Plus className="w-4 h-4" />Nuevo evento
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Calendar */}
        <div className="xl:col-span-3 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1.5 rounded-lg hover:bg-gray-100 cursor-pointer">
              <ChevronLeft className="w-5 h-5 text-gray-500" />
            </button>
            <h2 className="text-base font-semibold text-gray-800 capitalize">
              {format(currentMonth, 'MMMM yyyy', { locale: es })}
            </h2>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1.5 rounded-lg hover:bg-gray-100 cursor-pointer">
              <ChevronRight className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="grid grid-cols-7">
            {DAY_NAMES.map(d => (
              <div key={d} className="text-center text-xs font-semibold text-gray-400 py-3 border-b border-gray-100">{d}</div>
            ))}
            {calendarDays.map((date, i) => {
              const dayEvents = getDayEvents(date);
              const isToday = isSameDay(date, new Date());
              const inMonth = isSameMonth(date, currentMonth);
              return (
                <div
                  key={i}
                  onClick={() => inMonth && handleDayClick(date)}
                  className={`min-h-20 p-1 border-b border-r border-gray-50 ${inMonth ? 'cursor-pointer hover:bg-blue-50/50' : 'opacity-30'} ${i % 7 === 0 ? 'border-l-0' : ''}`}
                >
                  <span className={`text-xs font-medium inline-flex w-6 h-6 items-center justify-center rounded-full mb-1
                    ${isToday ? 'bg-[#1B4F8A] text-white' : 'text-gray-600'}`}>
                    {format(date, 'd')}
                  </span>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map(ev => (
                      <div
                        key={ev.id}
                        onClick={e => { e.stopPropagation(); setDetailEvent(ev); }}
                        className="text-xs px-1.5 py-0.5 rounded text-white truncate cursor-pointer"
                        style={{ backgroundColor: COLORS_EVENTO[ev.tipo] || '#6B7280' }}
                        title={ev.titulo}
                      >
                        {ev.titulo}
                      </div>
                    ))}
                    {dayEvents.length > 3 && <span className="text-xs text-gray-400">+{dayEvents.length - 3} más</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Próximos eventos</h3>
            {upcomingEvents.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">Sin eventos próximos</p>
            ) : (
              <div className="space-y-2">
                {upcomingEvents.map(ev => {
                  const client = clientes.find(c => c.id === ev.clienteId);
                  return (
                    <div key={ev.id} onClick={() => setDetailEvent(ev)}
                      className="flex gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <div className="w-1 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS_EVENTO[ev.tipo] }} />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-800 truncate">{ev.titulo}</p>
                        <p className="text-xs text-gray-400">{formatDateTime(ev.inicio)}</p>
                        {client && <p className="text-xs text-gray-400 truncate">{client.nombre}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Leyenda</h3>
            <div className="space-y-2">
              {TIPOS_EVENTO.map(t => (
                <div key={t} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS_EVENTO[t] }} />
                  <span className="text-xs text-gray-600">{t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Event detail panel */}
      {detailEvent && (
        <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDetailEvent(null)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md p-6 z-50">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS_EVENTO[detailEvent.tipo] }} />
                  <span className="text-xs text-gray-500">{detailEvent.tipo}</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900">{detailEvent.titulo}</h3>
              </div>
              <button onClick={() => setDetailEvent(null)} className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-2 text-sm text-gray-600">
              <div><span className="font-medium">Inicio:</span> {formatDateTime(detailEvent.inicio)}</div>
              {detailEvent.fin && <div><span className="font-medium">Fin:</span> {formatDateTime(detailEvent.fin)}</div>}
              {detailEvent.clienteId && <div><span className="font-medium">Cliente:</span> {clientes.find(c => c.id === detailEvent.clienteId)?.nombre}</div>}
              {detailEvent.responsable && <div><span className="font-medium">Responsable:</span> {users.find(u => u.id === detailEvent.responsable)?.name}</div>}
              {detailEvent.descripcion && <div><span className="font-medium">Descripción:</span> {detailEvent.descripcion}</div>}
            </div>
            <div className="flex gap-2 mt-5">
              <Button size="sm" variant="outline" onClick={() => { setSelectedEvent(detailEvent); setDetailEvent(null); setFormOpen(true); }}>Editar</Button>
              <Button size="sm" variant="danger" onClick={() => { setDelOpen(true); }}>Eliminar</Button>
            </div>
          </div>
        </div>
      )}

      <EventForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setSelectedEvent(null); }}
        initial={selectedEvent}
        defaultDate={defaultDate}
        onSave={(data) => {
          if (selectedEvent) { updateEvento(selectedEvent.id, data); toast.success('Evento actualizado.'); }
          else { addEvento(data); toast.success('Evento creado.'); }
        }}
      />
      <ConfirmDialog open={delOpen} onClose={() => setDelOpen(false)}
        onConfirm={() => { deleteEvento(detailEvent?.id); setDetailEvent(null); toast.success('Evento eliminado.'); }}
        title="Eliminar evento"
        message={`¿Eliminar "${detailEvent?.titulo}"?`} />
    </div>
  );
}
