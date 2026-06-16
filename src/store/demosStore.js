import { create } from 'zustand';
import { SEED_DEMOS } from '../data/seedData';
import { generateId, generateNumero } from '../utils/formatters';
import { buildAuditEntries, createEntry } from '../utils/auditLog';
import { useAuthStore } from './authStore';

const KEY = 'sanicom_demos';

const load = () => {
  try {
    const data = localStorage.getItem(KEY);
    if (data) return JSON.parse(data);
    localStorage.setItem(KEY, JSON.stringify(SEED_DEMOS));
    return SEED_DEMOS;
  } catch { return SEED_DEMOS; }
};

const save = (items) => localStorage.setItem(KEY, JSON.stringify(items));

export const useDemosStore = create((set, get) => ({
  demos: load(),

  addDemo: (data) => {
    const user = useAuthStore.getState().user;
    const demos = get().demos;
    const numero = generateNumero('DM', demos);
    const historial = user ? [createEntry('creó esta demostración', user)] : [];
    const item = { ...data, id: generateId(), numero, creadoPorId: user?.id || null, historial };
    const updated = [...demos, item];
    save(updated);
    set({ demos: updated });
    return item;
  },

  updateDemo: (id, data) => {
    const user = useAuthStore.getState().user;
    const demos = get().demos.map(d => {
      if (d.id !== id) return d;
      const entries = user ? buildAuditEntries(d, { ...d, ...data }, user) : [];
      const historial = [...(d.historial || []), ...entries];
      return { ...d, ...data, historial };
    });
    save(demos);
    set({ demos });
  },

  deleteDemo: (id) => {
    const demos = get().demos.filter(d => d.id !== id);
    save(demos);
    set({ demos });
  },

  getDemo: (id) => get().demos.find(d => d.id === id),
}));
