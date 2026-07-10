import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { fetchAll } from '../lib/supabaseUtils';
import { generateId } from '../utils/formatters';
import { useAuthStore } from './authStore';
import { useNotificacionesStore } from './notificacionesStore';
const TABLE = 'eventos_agenda';

export const useAgendaStore = create((set, get) => ({
  eventos: [],
  initialized: false,

  initialize: async () => {
    if (get().initialized) return;
    const { data, error } = await fetchAll(TABLE);
    if (error) { console.error('[agendaStore]', error); return; }
    set({ eventos: (data || []).map(r => r.data), initialized: true });
  },

  addEvento: (eventoData) => {
    // _skipNotif: true cuando el evento viene de OT o Demo (esos ya notifican por su cuenta)
    const { _skipNotif, ...data } = eventoData;
    const item = { ...data, id: generateId() };
    set(s => ({ eventos: [...s.eventos, item] }));
    supabase.from(TABLE).insert({ id: item.id, data: item }).then(({ error }) => {
      if (error) { console.error(error); set(s => ({ eventos: s.eventos.filter(e => e.id !== item.id) })); }
    });
    if (!_skipNotif) {
      const user = useAuthStore.getState().user;
      const push = useNotificacionesStore.getState().pushNotificacion;
      if (user) {
        const toNotify = new Set([
          ...(item.responsable && item.responsable !== user.id ? [item.responsable] : []),
          ...(item.compartidoCon || []).filter(id => id !== user.id),
        ]);
        toNotify.forEach(uid => push(uid, {
          mensaje: `${user.name} te compartió un evento: "${item.titulo}"`,
          tipo: 'agenda', modulo: 'agenda', enlace: '/agenda',
        }));
      }
    }
    return item;
  },

  updateEvento: (id, updates) => {
    const prev = get().eventos.find(e => e.id === id);
    const updated = { ...prev, ...updates };
    set(s => ({ eventos: s.eventos.map(e => e.id === id ? updated : e) }));
    supabase.from(TABLE).update({ data: updated }).eq('id', id).then(({ error }) => {
      if (error) { console.error(error); set(s => ({ eventos: s.eventos.map(e => e.id === id ? prev : e) })); }
    });
  },

  deleteEvento: (id) => {
    const prev = get().eventos;
    set(s => ({ eventos: s.eventos.filter(e => e.id !== id) }));
    supabase.from(TABLE).delete().eq('id', id).then(({ error }) => {
      if (error) { console.error(error); set({ eventos: prev }); }
    });
  },

  getEvento: (id) => get().eventos.find(e => e.id === id),
}));
