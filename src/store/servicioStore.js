import { create } from 'zustand';
import { SEED_SERVICIOS } from '../data/seedData';
import { generateId, generateNumero } from '../utils/formatters';
import { buildAuditEntries, createEntry } from '../utils/auditLog';
import { useAuthStore } from './authStore';

const KEY = 'sanicom_servicios';

const load = () => {
  try {
    const data = localStorage.getItem(KEY);
    if (data) return JSON.parse(data);
    localStorage.setItem(KEY, JSON.stringify(SEED_SERVICIOS));
    return SEED_SERVICIOS;
  } catch { return SEED_SERVICIOS; }
};

const save = (items) => localStorage.setItem(KEY, JSON.stringify(items));

export const useServicioStore = create((set, get) => ({
  servicios: load(),

  addServicio: (data) => {
    const user = useAuthStore.getState().user;
    const servicios = get().servicios;
    const numero = generateNumero('OT', servicios);
    const historial = user ? [createEntry('creó esta orden de servicio', user)] : [];
    const item = {
      ...data, id: generateId(), numero,
      fechaCreacion: new Date().toISOString().split('T')[0],
      acciones: [], materiales: [], historial,
    };
    const updated = [...servicios, item];
    save(updated);
    set({ servicios: updated });
    return item;
  },

  updateServicio: (id, data) => {
    const user = useAuthStore.getState().user;
    const servicios = get().servicios.map(s => {
      if (s.id !== id) return s;
      const entries = user ? buildAuditEntries(s, { ...s, ...data }, user) : [];
      const historial = [...(s.historial || []), ...entries];
      return { ...s, ...data, historial };
    });
    save(servicios);
    set({ servicios });
  },

  deleteServicio: (id) => {
    const servicios = get().servicios.filter(s => s.id !== id);
    save(servicios);
    set({ servicios });
  },

  addAccion: (servicioId, accion) => {
    const servicios = get().servicios.map(s => {
      if (s.id !== servicioId) return s;
      return { ...s, acciones: [...(s.acciones || []), { ...accion, id: generateId(), fecha: new Date().toISOString().split('T')[0] }] };
    });
    save(servicios);
    set({ servicios });
  },

  getServicio: (id) => get().servicios.find(s => s.id === id),
}));
