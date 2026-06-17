import { create } from 'zustand';
import { ESPECIALIDADES } from '../utils/constants';

const KEY = 'sanicom_especialidades';

const load = () => {
  try {
    const data = localStorage.getItem(KEY);
    if (data) return JSON.parse(data);
    localStorage.setItem(KEY, JSON.stringify(ESPECIALIDADES));
    return ESPECIALIDADES;
  } catch { return ESPECIALIDADES; }
};

const save = (items) => localStorage.setItem(KEY, JSON.stringify(items));

export const useEspecialidadesStore = create((set, get) => ({
  especialidades: load(),

  addEspecialidad: (nombre) => {
    const nombre_trim = nombre.trim();
    if (!nombre_trim) return { ok: false, error: 'El nombre no puede estar vacío.' };
    if (get().especialidades.some(e => e.toLowerCase() === nombre_trim.toLowerCase()))
      return { ok: false, error: 'Ya existe una especialidad con ese nombre.' };
    const especialidades = [...get().especialidades, nombre_trim];
    save(especialidades);
    set({ especialidades });
    return { ok: true };
  },

  updateEspecialidad: (oldName, newName) => {
    const newName_trim = newName.trim();
    if (!newName_trim) return { ok: false, error: 'El nombre no puede estar vacío.' };
    if (newName_trim !== oldName && get().especialidades.some(e => e.toLowerCase() === newName_trim.toLowerCase()))
      return { ok: false, error: 'Ya existe una especialidad con ese nombre.' };
    const especialidades = get().especialidades.map(e => e === oldName ? newName_trim : e);
    save(especialidades);
    set({ especialidades });
    return { ok: true };
  },

  deleteEspecialidad: (nombre) => {
    const especialidades = get().especialidades.filter(e => e !== nombre);
    save(especialidades);
    set({ especialidades });
  },
}));
