import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { fetchAll } from '../lib/supabaseUtils';
import { generateId } from '../utils/formatters';
import { useAuthStore } from './authStore';

const TABLE = 'viajes';

// Dieta que paga la empresa por cada noche fuera
export const DIETA_POR_NOCHE = 150;

// Sobrante de un viaje = dieta (noches × importe por noche) − hotel − cena
export function calcularViaje(v) {
  const noches = Number(v.noches) || 0;
  const dietaPorNoche = v.dietaPorNoche != null ? Number(v.dietaPorNoche) : DIETA_POR_NOCHE;
  const dieta = noches * dietaPorNoche;
  const gastos = (Number(v.hotel) || 0) + (Number(v.cena) || 0);
  return { dieta, gastos, sobrante: dieta - gastos };
}

export const useViajesStore = create((set, get) => ({
  viajes: [],
  initialized: false,

  initialize: async () => {
    if (get().initialized) return;
    const { data, error } = await fetchAll(TABLE);
    if (error) { console.error('[viajesStore]', error); return; }
    set({ viajes: (data || []).map(r => r.data), initialized: true });
  },

  addViaje: (viajeData) => {
    const user = useAuthStore.getState().user;
    const item = {
      ...viajeData, id: generateId(),
      dietaPorNoche: viajeData.dietaPorNoche ?? DIETA_POR_NOCHE,
      fechaCreacion: new Date().toISOString(),
      creadoPorId: user?.id || null,
    };
    set(s => ({ viajes: [...s.viajes, item] }));
    supabase.from(TABLE).insert({ id: item.id, data: item }).then(({ error }) => {
      if (error) { console.error(error); set(s => ({ viajes: s.viajes.filter(v => v.id !== item.id) })); }
    });
    return item;
  },

  updateViaje: (id, updates) => {
    const prev = get().viajes.find(v => v.id === id);
    const updated = { ...prev, ...updates };
    set(s => ({ viajes: s.viajes.map(v => v.id === id ? updated : v) }));
    supabase.from(TABLE).update({ data: updated }).eq('id', id).then(({ error }) => {
      if (error) { console.error(error); set(s => ({ viajes: s.viajes.map(v => v.id === id ? prev : v) })); }
    });
  },

  deleteViaje: (id) => {
    const prev = get().viajes;
    set(s => ({ viajes: s.viajes.filter(v => v.id !== id) }));
    supabase.from(TABLE).delete().eq('id', id).then(({ error }) => {
      if (error) { console.error(error); set({ viajes: prev }); }
    });
  },
}));
