import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { fetchAll } from '../lib/supabaseUtils';
import { generateId } from '../utils/formatters';
import { useAuthStore } from './authStore';

const TABLE = 'vacaciones';

export const useVacacionesStore = create((set, get) => ({
  vacaciones: [],
  initialized: false,

  initialize: async () => {
    if (get().initialized) return;
    const { data, error } = await fetchAll(TABLE);
    if (error) { console.error('[vacacionesStore]', error); return; }
    set({ vacaciones: (data || []).map(r => r.data), initialized: true });
  },

  addVacaciones: async (vacData) => {
    const user = useAuthStore.getState().user;
    const item = { ...vacData, id: generateId(), usuarioId: user?.id, usuarioNombre: user?.name };
    set(s => ({ vacaciones: [...s.vacaciones, item] }));
    const { error } = await supabase.from(TABLE).insert({ id: item.id, data: item });
    if (error) {
      console.error(error);
      set(s => ({ vacaciones: s.vacaciones.filter(v => v.id !== item.id) }));
    }
    return item;
  },

  deleteVacaciones: async (id) => {
    const prev = get().vacaciones;
    set(s => ({ vacaciones: s.vacaciones.filter(v => v.id !== id) }));
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    if (error) { console.error(error); set({ vacaciones: prev }); }
  },
}));
