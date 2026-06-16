import { create } from 'zustand';
import { SEED_EVENTOS } from '../data/seedData';
import { generateId } from '../utils/formatters';
import { useAuthStore } from './authStore';
import { useActividadStore } from './actividadStore';

const KEY = 'sanicom_eventos';

const load = () => {
  try {
    const data = localStorage.getItem(KEY);
    if (data) return JSON.parse(data);
    localStorage.setItem(KEY, JSON.stringify(SEED_EVENTOS));
    return SEED_EVENTOS;
  } catch { return SEED_EVENTOS; }
};

const save = (items) => localStorage.setItem(KEY, JSON.stringify(items));

export const useAgendaStore = create((set, get) => ({
  eventos: load(),

  addEvento: (data) => {
    const user = useAuthStore.getState().user;
    const item = { ...data, id: generateId() };
    const eventos = [...get().eventos, item];
    save(eventos);
    set({ eventos });
    if (user) useActividadStore.getState().addActividad({ userId: user.id, userName: user.name, tipo: 'agenda', accion: 'añadió un evento', registroId: item.id, registroLabel: item.titulo || 'Sin título', modulo: 'agenda' });
    return item;
  },

  updateEvento: (id, data) => {
    const user = useAuthStore.getState().user;
    const prev = get().eventos.find(e => e.id === id);
    const eventos = get().eventos.map(e => e.id === id ? { ...e, ...data } : e);
    save(eventos);
    set({ eventos });
    if (user) useActividadStore.getState().addActividad({ userId: user.id, userName: user.name, tipo: 'agenda', accion: 'actualizó el evento', registroId: id, registroLabel: prev?.titulo || 'Sin título', modulo: 'agenda' });
  },

  deleteEvento: (id) => {
    const user = useAuthStore.getState().user;
    const target = get().eventos.find(e => e.id === id);
    const eventos = get().eventos.filter(e => e.id !== id);
    save(eventos);
    set({ eventos });
    if (user) useActividadStore.getState().addActividad({ userId: user.id, userName: user.name, tipo: 'agenda', accion: 'eliminó el evento', registroId: id, registroLabel: target?.titulo || 'Sin título', modulo: 'agenda' });
  },

  getEvento: (id) => get().eventos.find(e => e.id === id),
}));
