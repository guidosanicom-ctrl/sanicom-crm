import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { fetchAll } from '../lib/supabaseUtils';
import { generateId } from '../utils/formatters';

const TABLE = 'equipos';

export const useEquiposStore = create((set, get) => ({
  equipos: [],
  initialized: false,

  initialize: async () => {
    if (get().initialized) return;
    const { data, error } = await fetchAll(TABLE);
    if (error) { console.error('[equiposStore]', error); return; }
    set({ equipos: (data || []).map(r => r.data), initialized: true });
  },

  addEquipo: (equipoData) => {
    const item = { ...equipoData, id: generateId() };
    set(s => ({ equipos: [...s.equipos, item] }));
    supabase.from(TABLE).insert({ id: item.id, data: item }).then(({ error }) => {
      if (error) { console.error(error); set(s => ({ equipos: s.equipos.filter(e => e.id !== item.id) })); }
    });
    return item;
  },

  updateEquipo: (id, updates) => {
    const prev = get().equipos.find(e => e.id === id);
    const updated = { ...prev, ...updates };
    set(s => ({ equipos: s.equipos.map(e => e.id === id ? updated : e) }));
    supabase.from(TABLE).update({ data: updated }).eq('id', id).then(({ error }) => {
      if (error) { console.error(error); set(s => ({ equipos: s.equipos.map(e => e.id === id ? prev : e) })); }
    });
  },

  deleteEquipo: (id) => {
    const prev = get().equipos;
    set(s => ({ equipos: s.equipos.filter(e => e.id !== id) }));
    supabase.from(TABLE).delete().eq('id', id).then(({ error }) => {
      if (error) { console.error(error); set({ equipos: prev }); }
    });
  },

  getEquipo: (id) => get().equipos.find(e => e.id === id),
}));
