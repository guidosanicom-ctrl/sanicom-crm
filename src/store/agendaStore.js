import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { generateId } from '../utils/formatters';
import { useAuthStore } from './authStore';
import { useActividadStore } from './actividadStore';

const TABLE = 'eventos_agenda';

export const useAgendaStore = create((set, get) => ({
  eventos: [],
  initialized: false,

  initialize: async () => {
    if (get().initialized) return;
    const { data, error } = await supabase.from(TABLE).select('data');
    if (error) { console.error('[agendaStore]', error); return; }
    set({ eventos: (data || []).map(r => r.data), initialized: true });
  },

  addEvento: (eventoData) => {
    const user = useAuthStore.getState().user;
    const item = { ...eventoData, id: generateId() };
    set(s => ({ eventos: [...s.eventos, item] }));
    supabase.from(TABLE).insert({ id: item.id, data: item }).then(({ error }) => {
      if (error) { console.error(error); set(s => ({ eventos: s.eventos.filter(e => e.id !== item.id) })); }
    });
    if (user) useActividadStore.getState().addActividad({ userId: user.id, userName: user.name, tipo: 'agenda', accion: 'añadió un evento', registroId: item.id, registroLabel: item.titulo || 'Sin título', modulo: 'agenda' });
    return item;
  },

  updateEvento: (id, updates) => {
    const user = useAuthStore.getState().user;
    const prev = get().eventos.find(e => e.id === id);
    const updated = { ...prev, ...updates };
    set(s => ({ eventos: s.eventos.map(e => e.id === id ? updated : e) }));
    supabase.from(TABLE).update({ data: updated }).eq('id', id).then(({ error }) => {
      if (error) { console.error(error); set(s => ({ eventos: s.eventos.map(e => e.id === id ? prev : e) })); }
    });
    if (user) useActividadStore.getState().addActividad({ userId: user.id, userName: user.name, tipo: 'agenda', accion: 'actualizó el evento', registroId: id, registroLabel: prev?.titulo || 'Sin título', modulo: 'agenda' });
  },

  deleteEvento: (id) => {
    const user = useAuthStore.getState().user;
    const target = get().eventos.find(e => e.id === id);
    const prev = get().eventos;
    set(s => ({ eventos: s.eventos.filter(e => e.id !== id) }));
    supabase.from(TABLE).delete().eq('id', id).then(({ error }) => {
      if (error) { console.error(error); set({ eventos: prev }); }
    });
    if (user) useActividadStore.getState().addActividad({ userId: user.id, userName: user.name, tipo: 'agenda', accion: 'eliminó el evento', registroId: id, registroLabel: target?.titulo || 'Sin título', modulo: 'agenda' });
  },

  getEvento: (id) => get().eventos.find(e => e.id === id),
}));
