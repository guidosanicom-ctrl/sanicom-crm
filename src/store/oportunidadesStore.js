import { create } from 'zustand';
import { SEED_OPORTUNIDADES } from '../data/seedData';
import { generateId } from '../utils/formatters';
import { buildAuditEntries, createEntry } from '../utils/auditLog';
import { useAuthStore } from './authStore';

const KEY = 'sanicom_oportunidades';

const load = () => {
  try {
    const data = localStorage.getItem(KEY);
    if (data) return JSON.parse(data);
    localStorage.setItem(KEY, JSON.stringify(SEED_OPORTUNIDADES));
    return SEED_OPORTUNIDADES;
  } catch { return SEED_OPORTUNIDADES; }
};

const save = (items) => localStorage.setItem(KEY, JSON.stringify(items));

export const useOportunidadesStore = create((set, get) => ({
  oportunidades: load(),

  addOportunidad: (data) => {
    const user = useAuthStore.getState().user;
    const now = new Date().toISOString().split('T')[0];
    const historial = user ? [createEntry('creó esta oportunidad', user)] : [];
    const item = { ...data, id: generateId(), fechaCreacion: now, fechaUltimaActualizacion: now, historial };
    const oportunidades = [...get().oportunidades, item];
    save(oportunidades);
    set({ oportunidades });
    return item;
  },

  updateOportunidad: (id, data) => {
    const user = useAuthStore.getState().user;
    const now = new Date().toISOString().split('T')[0];
    const oportunidades = get().oportunidades.map(o => {
      if (o.id !== id) return o;
      const entries = user ? buildAuditEntries(o, { ...o, ...data }, user) : [];
      const historial = [...(o.historial || []), ...entries];
      return { ...o, ...data, fechaUltimaActualizacion: now, historial };
    });
    save(oportunidades);
    set({ oportunidades });
  },

  deleteOportunidad: (id) => {
    const oportunidades = get().oportunidades.filter(o => o.id !== id);
    save(oportunidades);
    set({ oportunidades });
  },

  getOportunidad: (id) => get().oportunidades.find(o => o.id === id),
}));
