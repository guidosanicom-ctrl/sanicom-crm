import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { generateId } from '../utils/formatters';
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
    const item = { ...eventoData, id: generateId() };
    set(s => ({ eventos: [...s.eventos, item] }));
    supabase.from(TABLE).insert({ id: item.id, data: item }).then(({ error }) => {
      if (error) { console.error(error); set(s => ({ eventos: s.eventos.filter(e => e.id !== item.id) })); }
    });
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
