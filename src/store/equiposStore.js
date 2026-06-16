import { create } from 'zustand';
import { SEED_EQUIPOS } from '../data/seedData';
import { generateId } from '../utils/formatters';

const KEY = 'sanicom_equipos';

const load = () => {
  try {
    const data = localStorage.getItem(KEY);
    if (data) return JSON.parse(data);
    localStorage.setItem(KEY, JSON.stringify(SEED_EQUIPOS));
    return SEED_EQUIPOS;
  } catch { return SEED_EQUIPOS; }
};

const save = (equipos) => localStorage.setItem(KEY, JSON.stringify(equipos));

export const useEquiposStore = create((set, get) => ({
  equipos: load(),

  addEquipo: (data) => {
    const equipo = { ...data, id: generateId() };
    const equipos = [...get().equipos, equipo];
    save(equipos);
    set({ equipos });
    return equipo;
  },

  updateEquipo: (id, data) => {
    const equipos = get().equipos.map(e => e.id === id ? { ...e, ...data } : e);
    save(equipos);
    set({ equipos });
  },

  deleteEquipo: (id) => {
    const equipos = get().equipos.filter(e => e.id !== id);
    save(equipos);
    set({ equipos });
  },

  getEquipo: (id) => get().equipos.find(e => e.id === id),
}));
