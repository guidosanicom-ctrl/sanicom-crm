import { create } from 'zustand';
import { supabase } from '../lib/supabase';

const TABLE = 'cursos_clientes';

export const useCursosStore = create((set, get) => ({
  inscripciones: [],
  initialized: false,

  initialize: async () => {
    if (get().initialized) return;
    await get().fetch();
    set({ initialized: true });
  },

  fetch: async () => {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .order('created_at', { ascending: false });
    if (error) { console.error('[cursosStore]', error); return; }
    set({ inscripciones: data || [] });
  },

  add: async (insc) => {
    const { data, error } = await supabase.from(TABLE).insert(insc).select().single();
    if (error) { console.error('[cursosStore.add]', error); return null; }
    set(s => ({ inscripciones: [data, ...s.inscripciones] }));
    return data;
  },

  update: async (id, changes) => {
    const { data, error } = await supabase.from(TABLE).update(changes).eq('id', id).select().single();
    if (error) { console.error('[cursosStore.update]', error); return; }
    set(s => ({ inscripciones: s.inscripciones.map(i => i.id === id ? data : i) }));
  },

  remove: async (id) => {
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    if (error) { console.error('[cursosStore.remove]', error); return; }
    set(s => ({ inscripciones: s.inscripciones.filter(i => i.id !== id) }));
  },

  hasCliente: (clienteId) => get().inscripciones.some(i => i.cliente_id === clienteId),
}));
