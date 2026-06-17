import { create } from 'zustand';

const KEY = 'sanicom_categorias_equipo';

const SEED = [
  'Ecografía / Ultrasonido',
  'Diagnóstico por imagen',
  'Fisioterapia y Rehabilitación',
  'Podología',
  'Veterinaria',
  'Monitorización',
  'Esterilización',
  'Mobiliario clínico',
];

const load = () => {
  try {
    const data = localStorage.getItem(KEY);
    if (data) return JSON.parse(data);
    localStorage.setItem(KEY, JSON.stringify(SEED));
    return SEED;
  } catch { return SEED; }
};

const save = (items) => localStorage.setItem(KEY, JSON.stringify(items));

export const useCategoriasStore = create((set, get) => ({
  categorias: load(),

  addCategoria: (nombre) => {
    const nombre_trim = nombre.trim();
    if (!nombre_trim) return { ok: false, error: 'El nombre no puede estar vacío.' };
    if (get().categorias.some(c => c.toLowerCase() === nombre_trim.toLowerCase()))
      return { ok: false, error: 'Ya existe una categoría con ese nombre.' };
    const categorias = [...get().categorias, nombre_trim];
    save(categorias);
    set({ categorias });
    return { ok: true };
  },

  updateCategoria: (oldName, newName) => {
    const newName_trim = newName.trim();
    if (!newName_trim) return { ok: false, error: 'El nombre no puede estar vacío.' };
    if (newName_trim !== oldName && get().categorias.some(c => c.toLowerCase() === newName_trim.toLowerCase()))
      return { ok: false, error: 'Ya existe una categoría con ese nombre.' };
    const categorias = get().categorias.map(c => c === oldName ? newName_trim : c);
    save(categorias);
    set({ categorias });
    return { ok: true };
  },

  deleteCategoria: (nombre) => {
    const categorias = get().categorias.filter(c => c !== nombre);
    save(categorias);
    set({ categorias });
  },
}));
