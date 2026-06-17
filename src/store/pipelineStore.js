import { create } from 'zustand';
import { ETAPAS_PIPELINE } from '../utils/constants';

const KEY = 'sanicom_etapas_pipeline';

const load = () => {
  try {
    const data = localStorage.getItem(KEY);
    if (data) {
      // Migración: renombrar 'Cualificado' → 'Interesado' si existe en datos guardados
      const parsed = JSON.parse(data).map(e => e === 'Cualificado' ? 'Interesado' : e);
      localStorage.setItem(KEY, JSON.stringify(parsed));
      return parsed;
    }
    localStorage.setItem(KEY, JSON.stringify(ETAPAS_PIPELINE));
    return ETAPAS_PIPELINE;
  } catch { return ETAPAS_PIPELINE; }
};

const save = (items) => localStorage.setItem(KEY, JSON.stringify(items));

export const usePipelineStore = create((set) => ({
  etapas: load(),

  setEtapas: (etapas) => {
    save(etapas);
    set({ etapas });
  },
}));
