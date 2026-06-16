import { create } from 'zustand';
import { generateId } from '../utils/formatters';

const KEY = 'sanicom_actividad';
const MAX = 100;

const load = () => {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; }
};

const save = (items) => localStorage.setItem(KEY, JSON.stringify(items));

export const useActividadStore = create((set, get) => ({
  actividad: load(),

  addActividad: (entry) => {
    const item = { ...entry, id: generateId(), fechaHora: new Date().toISOString() };
    const actividad = [item, ...get().actividad].slice(0, MAX);
    save(actividad);
    set({ actividad });
  },
}));
