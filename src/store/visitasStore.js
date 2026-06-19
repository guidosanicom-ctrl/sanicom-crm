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

  addVisita: async (visitaData) => {
    const item = { ...visitaData, id: generateId() };
    console.log('[visitasStore] Intentando INSERT visita:', item);
    const { data, error } = await supabase.from(TABLE).insert({ id: item.id, data: item }).select();
    if (error) {
      console.error('[visitasStore] ERROR en INSERT:', error);
      return null;
    }
    console.log('[visitasStore] INSERT exitoso:', data);
    set(s => ({ visitas: [...s.visitas, item] }));
    return item;
  },

  updateVisita: async (id, updates) => {
    const prev = get().visitas.find(v => v.id === id);
    const updated = { ...prev, ...updates };
    const { error } = await supabase.from(TABLE).update({ data: updated }).eq('id', id);
    if (error) {
      console.error('[visitasStore] Error actualizando visita:', error);
      return;
    }
    set(s => ({ visitas: s.visitas.map(v => v.id === id ? updated : v) }));
  },

  deleteVisita: (id) => {
    const prev = get().visitas;
    set(s => ({ visitas: s.visitas.filter(v => v.id !== id) }));
    supabase.from(TABLE).delete().eq('id', id).then(({ error }) => {
      if (error) { console.error('[visitasStore] Error eliminando visita:', error); set({ visitas: prev }); }
    });
  },
}));
