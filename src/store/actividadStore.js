import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { generateId } from '../utils/formatters';

const TABLE = 'actividad';
const MAX = 100;

export const useActividadStore = create((set, get) => ({
  actividad: [],
  initialized: false,

  initialize: async () => {
    if (get().initialized) return;
    const { data, error } = await supabase
      .from(TABLE)
      .select('data')
      .order('fecha_hora', { ascending: false })
      .limit(MAX);
    if (error) { console.error('[actividadStore]', error); return; }
    set({ actividad: (data || []).map(r => r.data), initialized: true });
  },

  addActividad: (entry) => {
    const item = { ...entry, id: generateId(), fechaHora: new Date().toISOString() };
    set(s => ({ actividad: [item, ...s.actividad].slice(0, MAX) }));
    supabase.from(TABLE)
      .insert({ id: item.id, fecha_hora: item.fechaHora, data: item })
      .then(({ error }) => { if (error) console.error('[actividadStore.add]', error); });
  },
}));
