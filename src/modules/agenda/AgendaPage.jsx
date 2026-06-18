import { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, subDays, addWeeks, subWeeks, addMonths, subMonths, addYears, subYears,
  isSameDay, isSameMonth, parseISO, differenceInMinutes, getYear, setMonth, setYear,
} from 'date-fns';
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

// ── Constantes de la rejilla horaria ─────────────────────────────────────────
const HOUR_START = 7;   // primera franja visible
const HOUR_END   = 21;  // última franja visible (exclusiva)
const HOURS = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);
const ROW_H  = 56;      // px por hora

function parseDate(str) { try { return str ? parseISO(str) : null; } catch { return null; } }

// ── Vista de rejilla horaria (Semana y Día) ───────────────────────────────────
function TimeGridView({ days, getDayEvents, onSlotClick, onEventClick, today }) {
  const scrollRef = useRef(null);

  // Scroll a hora laboral al montar
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = (8 - HOUR_START) * ROW_H;
  }, []);

  return (
    <div className="flex flex-col overflow-hidden h-full">
      {/* Cabecera de días */}
      <div className="flex border-b border-gray-100 bg-white sticky top-0 z-10">
        <div className="w-14 flex-shrink-0" />
        {days.map((day, i) => {
          const isToday = isSameDay(day, today);
          return (
            <div key={i} className="flex-1 text-center py-2 border-l border-gray-100">
              <p className="text-xs text-gray-400 capitalize">{format(day, 'EEE', { locale: es })}</p>
              <p className={`text-sm font-semibold mt-0.5 inline-flex w-7 h-7 items-center justify-center rounded-full
                ${isToday ? 'bg-[#1B4F8A] text-white' : 'text-gray-700'}`}>
                {format(day, 'd')}
              </p>
            </div>
          );
        })}
      </div>

      {/* Rejilla con scroll */}
      <div ref={scrollRef} className="overflow-y-auto flex-1">
        <div className="flex">
          {/* Etiquetas de hora */}
          <div className="w-14 flex-shrink-0">
            {HOURS.map(h => (
              <div key={h} style={{ height: ROW_H }} className="relative">
                <span className="absolute -top-2.5 right-2 text-[10px] text-gray-400 font-medium">
                  {String(h).padStart(2, '0')}:00
                </span>
              </div>
            ))}
          </div>

          {/* Columnas de días */}
          {days.map((day, di) => {
            const dayEvents = getDayEvents(day);
            return (
              <div key={di} className="flex-1 relative border-l border-gray-100" style={{ minWidth: 0 }}>
                {/* Líneas de hora */}
                {HOURS.map(h => (
                  <div
                    key={h}
                    style={{ height: ROW_H }}
                    className="border-b border-gray-100 hover:bg-blue-50/30 cursor-pointer transition-colors"
                    onClick={() => onSlotClick(day, h)}
                  />
                ))}

                {/* Eventos */}
                {dayEvents.map(ev => {
                  const start = parseDate(ev.inicio);
                  const end = ev.fin ? parseDate(ev.fin) : null;
                  if (!start) return null;
                  const startMins = (start.getHours() - HOUR_START) * 60 + start.getMinutes();
                  const durMins = end ? differenceInMinutes(end, start) : 60;
                  const top = Math.max(0, (startMins / 60) * ROW_H);
                  const height = Math.max((durMins / 60) * ROW_H, 22);
                  return (
                    <div
                      key={ev.id}
                      onClick={e => { e.stopPropagation(); onEventClick(ev); }}
                      style={{
                        position: 'absolute', top, left: 2, right: 2, height,
                        backgroundColor: COLORS_EVENTO[ev.tipo] || '#6B7280',
                        zIndex: 10,
                      }}
                      className="rounded px-1.5 py-0.5 text-white text-[11px] overflow-hidden cursor-pointer
                                 hover:brightness-110 transition-all shadow-sm"
                      title={ev.titulo}
                    >
                      <span className="font-medium">{format(start, 'HH:mm')}</span>
                      {' '}{ev.titulo}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Vista Anual ───────────────────────────────────────────────────────────────
const MINI_DAY_NAMES = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

function MiniMonth({ year, monthIndex, getDayEvents, today, onDayClick }) {
  const monthDate = setMonth(setYear(new Date(), year), monthIndex);
  const start = startOfWeek(startOfMonth(monthDate), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(monthDate), { weekStartsOn: 1 });
  const days = [];
  let d = start;
  while (d <= end) { days.push(new Date(d)); d = addDays(d, 1); }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-3 hover:shadow-sm transition-shadow">
      <p className="text-xs font-semibold text-gray-700 capitalize text-center mb-2">
        {format(monthDate, 'MMMM', { locale: es })}
      </p>
      <div className="grid grid-cols-7 mb-1">
        {MINI_DAY_NAMES.map(n => (
          <div key={n} className="text-center text-[9px] font-medium text-gray-400 pb-0.5">{n}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((date, i) => {
          const inMonth = isSameMonth(date, monthDate);
          const isToday = isSameDay(date, today);
          const events = inMonth ? getDayEvents(date) : [];
          const hasEvents = events.length > 0;
          const colors = [...new Set(events.map(e => COLORS_EVENTO[e.tipo] || '#6B7280'))].slice(0, 3);

          return (
            <div
              key={i}
              onClick={() => hasEvents && onDayClick(date)}
              className={`flex flex-col items-center py-0.5 rounded transition-colors
                ${!inMonth ? 'opacity-0 pointer-events-none' : ''}
                ${hasEvents ? 'cursor-pointer hover:bg-blue-50' : ''}`}
            >
              <span className={`text-[10px] font-medium inline-flex w-5 h-5 items-center justify-center rounded-full leading-none
                ${isToday ? 'bg-[#1B4F8A] text-white' : inMonth ? 'text-gray-700' : 'text-gray-300'}`}>
                {format(date, 'd')}
              </span>
              {hasEvents && (
                <div className="flex gap-px mt-px justify-center">
                  {colors.map((c, ci) => (
                    <div key={ci} className="w-1 h-1 rounded-full" style={{ backgroundColor: c }} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function YearView({ year, getDayEvents, today, onDayClick }) {
  return (
    <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 overflow-y-auto">
      {Array.from({ length: 12 }, (_, i) => (
        <MiniMonth
          key={i}
          year={year}
          monthIndex={i}
          getDayEvents={getDayEvents}
          today={today}
          onDayClick={onDayClick}
        />
      ))}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function AgendaPage() {
  const { eventos, addEvento, updateEvento, deleteEvento } = useAgendaStore();
  const { clientes } = useClientesStore();
  const { users } = useAuthStore();
  const today = useMemo(() => new Date(), []);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month');
  const [formOpen, setFormOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [defaultDate, setDefaultDate] = useState('');
  const [defaultHour, setDefaultHour] = useState('');
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

  // Días de la vista mensual
  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
    const days = [];
    let d = start;
    while (d <= end) { days.push(new Date(d)); d = addDays(d, 1); }
    return days;
  }, [currentDate]);

  // Días de la vista semanal
  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [currentDate]);

  // Navegación según vista
  const goBack = () => {
    if (view === 'month') setCurrentDate(d => subMonths(d, 1));
    else if (view === 'week') setCurrentDate(d => subWeeks(d, 1));
    else if (view === 'year') setCurrentDate(d => subYears(d, 1));
    else setCurrentDate(d => subDays(d, 1));
  };
  const goForward = () => {
    if (view === 'month') setCurrentDate(d => addMonths(d, 1));
    else if (view === 'week') setCurrentDate(d => addWeeks(d, 1));
    else if (view === 'year') setCurrentDate(d => addYears(d, 1));
    else setCurrentDate(d => addDays(d, 1));
  };

  // Título de la cabecera según vista
  const headerTitle = useMemo(() => {
    if (view === 'year') return format(currentDate, 'yyyy');
    if (view === 'month') return format(currentDate, 'MMMM yyyy', { locale: es });
    if (view === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = addDays(start, 6);
      if (start.getMonth() === end.getMonth())
        return `${format(start, 'd')} – ${format(end, 'd MMM yyyy', { locale: es })}`;
      return `${format(start, 'd MMM', { locale: es })} – ${format(end, 'd MMM yyyy', { locale: es })}`;
    }
    return format(currentDate, "EEEE, d 'de' MMMM yyyy", { locale: es });
  }, [view, currentDate]);

  // Desde vista anual: navegar al día
  const handleYearDayClick = (date) => {
    setCurrentDate(date);
    setView('day');
  };

  // Abrir formulario desde clic en día/franja
  const handleDayClick = (date) => {
    setDefaultDate(format(date, 'yyyy-MM-dd'));
    setDefaultHour('');
    setSelectedEvent(null);
    setFormOpen(true);
  };
  const handleSlotClick = (date, hour) => {
    setDefaultDate(format(date, 'yyyy-MM-dd'));
    setDefaultHour(String(hour).padStart(2, '0') + ':00');
    setSelectedEvent(null);
    setFormOpen(true);
  };

  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return filteredEventos
      .filter(e => { const d = parseDate(e.inicio); return d && d >= now; })
      .sort((a, b) => a.inicio.localeCompare(b.inicio))
      .slice(0, 8);
  }, [filteredEventos]);

  const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2">
          {[['month','Mes'], ['week','Semana'], ['day','Día'], ['year','Año']].map(([v, label]) => (
            <button key={v} onClick={() => setView(v)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer transition-colors
                ${view === v ? 'bg-[#1B4F8A] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none bg-white">
            <option value="">Todos los tipos</option>
            {TIPOS_EVENTO.map(t => <option key={t}>{t}</option>)}
          </select>
          <select value={filterResp} onChange={e => setFilterResp(e.target.value)}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none bg-white">
            <option value="">Todos</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <Button size="sm" onClick={() => { setSelectedEvent(null); setDefaultDate(''); setDefaultHour(''); setFormOpen(true); }}>
            <Plus className="w-4 h-4" />Nuevo evento
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* ── Área del calendario ── */}
        <div className={`xl:col-span-3 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col
          ${view === 'week' || view === 'day' ? 'h-[640px]' : view === 'year' ? 'h-[680px]' : ''}`}>
          {/* Cabecera de navegación */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
            <button onClick={goBack} className="p-1.5 rounded-lg hover:bg-gray-100 cursor-pointer">
              <ChevronLeft className="w-5 h-5 text-gray-500" />
            </button>
            <h2 className="text-base font-semibold text-gray-800 capitalize">{headerTitle}</h2>
            <button onClick={goForward} className="p-1.5 rounded-lg hover:bg-gray-100 cursor-pointer">
              <ChevronRight className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* ── Vista Mes ── */}
          {view === 'month' && (
            <div className="grid grid-cols-7">
              {DAY_NAMES.map(d => (
                <div key={d} className="text-center text-xs font-semibold text-gray-400 py-3 border-b border-gray-100">{d}</div>
              ))}
              {calendarDays.map((date, i) => {
                const dayEvents = getDayEvents(date);
                const isToday = isSameDay(date, today);
                const inMonth = isSameMonth(date, currentDate);
                return (
                  <div key={i}
                    onClick={() => inMonth && handleDayClick(date)}
                    className={`min-h-20 p-1 border-b border-r border-gray-50
                      ${inMonth ? 'cursor-pointer hover:bg-blue-50/50' : 'opacity-30'}`}>
                    <span className={`text-xs font-medium inline-flex w-6 h-6 items-center justify-center rounded-full mb-1
                      ${isToday ? 'bg-[#1B4F8A] text-white' : 'text-gray-600'}`}>
                      {format(date, 'd')}
                    </span>
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 3).map(ev => (
                        <div key={ev.id}
                          onClick={e => { e.stopPropagation(); setDetailEvent(ev); }}
                          className="text-xs px-1.5 py-0.5 rounded text-white truncate cursor-pointer"
                          style={{ backgroundColor: COLORS_EVENTO[ev.tipo] || '#6B7280' }}
                          title={ev.titulo}>
                          {ev.titulo}
                        </div>
                      ))}
                      {dayEvents.length > 3 && <span className="text-xs text-gray-400">+{dayEvents.length - 3} más</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Vista Semana ── */}
          {view === 'week' && (
            <TimeGridView
              days={weekDays}
              getDayEvents={getDayEvents}
              onSlotClick={handleSlotClick}
              onEventClick={setDetailEvent}
              today={today}
            />
          )}

          {/* ── Vista Día ── */}
          {view === 'day' && (
            <TimeGridView
              days={[currentDate]}
              getDayEvents={getDayEvents}
              onSlotClick={handleSlotClick}
              onEventClick={setDetailEvent}
              today={today}
            />
          )}

          {/* ── Vista Año ── */}
          {view === 'year' && (
            <YearView
              year={getYear(currentDate)}
              getDayEvents={getDayEvents}
              today={today}
              onDayClick={handleYearDayClick}
            />
          )}
        </div>

        {/* ── Sidebar ── */}
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

      {/* ── Panel de detalle del evento ── */}
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
              <button onClick={() => setDetailEvent(null)} className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
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
              <Button size="sm" variant="danger" onClick={() => setDelOpen(true)}>Eliminar</Button>
            </div>
          </div>
        </div>
      )}

      <EventForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setSelectedEvent(null); }}
        initial={selectedEvent}
        defaultDate={defaultDate}
        defaultHour={defaultHour}
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
