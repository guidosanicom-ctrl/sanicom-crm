import { create } from 'zustand';
import { SEED_EVENTOS } from '../data/seedData';
import { generateId } from '../utils/formatters';

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
    const item = { ...data, id: generateId() };
    const eventos = [...get().eventos, item];
    save(eventos);
    set({ eventos });
    return item;
  },

  updateEvento: (id, data) => {
    const eventos = get().eventos.map(e => e.id === id ? { ...e, ...data } : e);
    save(eventos);
    set({ eventos });
  },

  deleteEvento: (id) => {
    const eventos = get().eventos.filter(e => e.id !== id);
    save(eventos);
    set({ eventos });
  },

  getEvento: (id) => get().eventos.find(e => e.id === id),
}));
