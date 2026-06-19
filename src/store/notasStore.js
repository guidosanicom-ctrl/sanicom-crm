import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { fetchAll } from '../lib/supabaseUtils';
import { generateId } from '../utils/formatters';

const TABLE = 'notas';

export const useNotasStore = create((set, get) => ({
  notas: [],
  initialized: false,

  initialize: async () => {
    if (get().initialized) return;
    const { data, error } = await fetchAll(TABLE);
    if (error) { console.error('[notasStore] Error cargando notas:', error); return; }
    set({ notas: (data || []).map(r => r.data), initialized: true });
  },

  addNota: async (notaData) => {
    const item = { ...notaData, id: generateId(), fechaHora: new Date().toISOString() };
    set(s => ({ notas: [item, ...s.notas] }));
    const { error } = await supabase.from(TABLE).insert({ id: item.id, data: item });
    if (error) {
      console.error('[notasStore] Error guardando nota:', error);
      set(s => ({ notas: s.notas.filter(n => n.id !== item.id) }));
      return null;
    }
    return item;
  },

  deleteNota: (id) => {
    const prev = get().notas;
    set(s => ({ notas: s.notas.filter(n => n.id !== id) }));
    supabase.from(TABLE).delete().eq('id', id).then(({ error }) => {
      if (error) { console.error('[notasStore] Error eliminando nota:', error); set({ notas: prev }); }
    });
  },
}));
