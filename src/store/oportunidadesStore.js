import { create } from 'zustand';
import { SEED_OPORTUNIDADES } from '../data/seedData';
import { generateId } from '../utils/formatters';
import { buildAuditEntries, createEntry } from '../utils/auditLog';
import { useAuthStore } from './authStore';
import { useActividadStore } from './actividadStore';

const KEY = 'sanicom_oportunidades';

const load = () => {
  try {
    const data = localStorage.getItem(KEY);
    if (data) {
      // Migración: renombrar etapa 'Cualificado' → 'Interesado'
      const parsed = JSON.parse(data).map(o => o.etapa === 'Cualificado' ? { ...o, etapa: 'Interesado' } : o);
      localStorage.setItem(KEY, JSON.stringify(parsed));
      return parsed;
    }
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
    const item = { ...data, id: generateId(), fechaCreacion: now, fechaUltimaActualizacion: now, creadoPorId: user?.id || null, historial };
    const oportunidades = [...get().oportunidades, item];
    save(oportunidades);
    set({ oportunidades });
    if (user) useActividadStore.getState().addActividad({ userId: user.id, userName: user.name, tipo: 'oportunidad', accion: 'creó una oportunidad', registroId: item.id, registroLabel: item.nombre, modulo: 'pipeline' });
    return item;
  },

  updateOportunidad: (id, data) => {
    const user = useAuthStore.getState().user;
    const now = new Date().toISOString().split('T')[0];
    const prev = get().oportunidades.find(o => o.id === id);
    const oportunidades = get().oportunidades.map(o => {
      if (o.id !== id) return o;
      const entries = user ? buildAuditEntries(o, { ...o, ...data }, user) : [];
      const historial = [...(o.historial || []), ...entries];
      return { ...o, ...data, fechaUltimaActualizacion: now, historial };
    });
    save(oportunidades);
    set({ oportunidades });
    if (user) {
      const accion = data.etapa && prev?.etapa !== data.etapa
        ? `movió la oportunidad a "${data.etapa}"`
        : 'actualizó la oportunidad';
      useActividadStore.getState().addActividad({ userId: user.id, userName: user.name, tipo: 'oportunidad', accion, registroId: id, registroLabel: prev?.nombre || id, modulo: 'pipeline' });
    }
  },

  deleteOportunidad: (id) => {
    const user = useAuthStore.getState().user;
    const target = get().oportunidades.find(o => o.id === id);
    const oportunidades = get().oportunidades.filter(o => o.id !== id);
    save(oportunidades);
    set({ oportunidades });
    if (user) useActividadStore.getState().addActividad({ userId: user.id, userName: user.name, tipo: 'oportunidad', accion: 'eliminó la oportunidad', registroId: id, registroLabel: target?.nombre || id, modulo: 'pipeline' });
  },

  getOportunidad: (id) => get().oportunidades.find(o => o.id === id),
}));
