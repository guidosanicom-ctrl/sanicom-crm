import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { fetchAll } from '../lib/supabaseUtils';
import { generateId } from '../utils/formatters';

const TABLE = 'seguimiento_contactos';

export const useSeguimientoStore = create((set, get) => ({
  contactos: [],
  initialized: false,

  initialize: async () => {
    if (get().initialized) return;
    const { data, error } = await fetchAll(TABLE);
    if (error) { console.error('[seguimientoStore]', error); return; }
    set({ contactos: (data || []).map(r => r.data), initialized: true });
  },

  addContacto: async (contactoData) => {
    const item = { ...contactoData, id: generateId() };
    set(s => ({ contactos: [...s.contactos, item] }));
    const { error } = await supabase.from(TABLE).insert({ id: item.id, data: item });
    if (error) {
      console.error('[seguimientoStore] Error guardando contacto:', error);
      set(s => ({ contactos: s.contactos.filter(c => c.id !== item.id) }));
      return null;
    }
    return item;
  },

  deleteContacto: async (id) => {
    set(s => ({ contactos: s.contactos.filter(c => c.id !== id) }));
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    if (error) console.error('[seguimientoStore] Error eliminando contacto:', error);
  },
}));
