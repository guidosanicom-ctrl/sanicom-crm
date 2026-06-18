import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { fetchAll } from '../lib/supabaseUtils';
import { generateId } from '../utils/formatters';

const TABLE = 'visitas';

export const useVisitasStore = create((set, get) => ({
  visitas: [],
  initialized: false,

  initialize: async () => {
    if (get().initialized) return;
    const { data, error } = await fetchAll(TABLE);
    if (error) { console.error('[visitasStore]', error); return; }
    set({ visitas: (data || []).map(r => r.data), initialized: true });
  },

  addVisita: (visitaData) => {
    const item = { ...visitaData, id: generateId() };
    set(s => ({ visitas: [...s.visitas, item] }));
    supabase.from(TABLE).insert({ id: item.id, data: item }).then(({ error }) => {
      if (error) { console.error(error); set(s => ({ visitas: s.visitas.filter(v => v.id !== item.id) })); }
    });
    return item;
  },

  updateVisita: (id, updates) => {
    const prev = get().visitas.find(v => v.id === id);
    const updated = { ...prev, ...updates };
    set(s => ({ visitas: s.visitas.map(v => v.id === id ? updated : v) }));
    supabase.from(TABLE).update({ data: updated }).eq('id', id).then(({ error }) => {
      if (error) { console.error(error); set(s => ({ visitas: s.visitas.map(v => v.id === id ? prev : v) })); }
    });
  },

  deleteVisita: (id) => {
    const prev = get().visitas;
    set(s => ({ visitas: s.visitas.filter(v => v.id !== id) }));
    supabase.from(TABLE).delete().eq('id', id).then(({ error }) => {
      if (error) { console.error(error); set({ visitas: prev }); }
    });
  },
}));
