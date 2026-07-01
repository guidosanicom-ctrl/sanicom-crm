import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useAgendaStore } from './agendaStore';

const TABLE = 'llamadas_pendientes';

export const useLlamadasPendientesStore = create((set, get) => ({
  llamadas: [],
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
      .eq('confirmada', false)
      .order('fecha_hora', { ascending: true });
    if (error) { console.error('[llamadasPendientesStore]', error); return; }
    set({ llamadas: data || [] });
  },

  add: async (llamada) => {
    const { data, error } = await supabase.from(TABLE).insert(llamada).select().single();
    if (error) { console.error('[llamadasPendientesStore.add]', error); return null; }
    set(s => ({ llamadas: [...s.llamadas, data] }));
    return data;
  },

  confirmar: async (id) => {
    const llamada = get().llamadas.find(l => l.id === id);
    const { error } = await supabase.from(TABLE).update({
      confirmada: true,
      confirmada_at: new Date().toISOString(),
    }).eq('id', id);
    if (error) { console.error('[llamadasPendientesStore.confirmar]', error); return; }
    // Eliminar el evento de agenda vinculado
    if (llamada?.evento_id) {
      useAgendaStore.getState().deleteEvento(llamada.evento_id);
    }
    set(s => ({ llamadas: s.llamadas.filter(l => l.id !== id) }));
  },

  // Returns Set of oportunidadIds with pending calls
  oportunidadesConLlamadaPendiente: () =>
    new Set(get().llamadas.filter(l => !l.confirmada).map(l => l.oportunidad_id)),
}));
