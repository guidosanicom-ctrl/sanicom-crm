import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { ETAPAS_PIPELINE } from '../utils/constants';

const TABLE = 'pipeline_etapas';

export const usePipelineStore = create((set, get) => ({
  etapas: [],
  initialized: false,

  initialize: async () => {
    if (get().initialized) return;
    const { data, error } = await supabase.from(TABLE).select('nombre, orden').order('orden');
    if (error) { console.error('[pipelineStore]', error); return; }
    if ((data || []).length === 0) {
      await supabase.from(TABLE).insert(ETAPAS_PIPELINE.map((n, i) => ({ nombre: n, orden: i })));
      set({ etapas: ETAPAS_PIPELINE, initialized: true });
    } else {
      set({ etapas: data.map(r => r.nombre), initialized: true });
    }
  },

  setEtapas: async (etapas) => {
    set({ etapas });
    // Reemplazar todas las etapas en BD
    await supabase.from(TABLE).delete().neq('nombre', '__none__');
    const { error } = await supabase.from(TABLE).insert(etapas.map((n, i) => ({ nombre: n, orden: i })));
    if (error) console.error('[pipelineStore.setEtapas]', error);
  },
}));
