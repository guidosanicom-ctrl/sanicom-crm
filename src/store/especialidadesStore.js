import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { ESPECIALIDADES } from '../utils/constants';

const TABLE = 'especialidades';

export const useEspecialidadesStore = create((set, get) => ({
  especialidades: [],
  initialized: false,

  initialize: async () => {
    if (get().initialized) return;
    const { data, error } = await supabase.from(TABLE).select('nombre').order('nombre');
    if (error) { console.error('[especialidadesStore]', error); return; }
    if ((data || []).length === 0) {
      await supabase.from(TABLE).insert(ESPECIALIDADES.map(n => ({ nombre: n })));
      set({ especialidades: ESPECIALIDADES, initialized: true });
    } else {
      const enBD = new Set(data.map(r => r.nombre));
      const faltantes = ESPECIALIDADES.filter(n => !enBD.has(n));
      if (faltantes.length > 0) {
        await supabase.from(TABLE).insert(faltantes.map(n => ({ nombre: n })));
      }
      const todas = [...data.map(r => r.nombre), ...faltantes];
      set({ especialidades: todas, initialized: true });
    }
  },

  addEspecialidad: (nombre) => {
    const trimmed = nombre.trim();
    if (!trimmed) return { ok: false, error: 'El nombre no puede estar vacío.' };
    if (get().especialidades.some(e => e.toLowerCase() === trimmed.toLowerCase()))
      return { ok: false, error: 'Ya existe una especialidad con ese nombre.' };
    set(s => ({ especialidades: [...s.especialidades, trimmed] }));
    supabase.from(TABLE).insert({ nombre: trimmed })
      .then(({ error }) => { if (error) console.error('[especialidadesStore.add]', error); });
    return { ok: true };
  },

  updateEspecialidad: (oldName, newName) => {
    const trimmed = newName.trim();
    if (!trimmed) return { ok: false, error: 'El nombre no puede estar vacío.' };
    if (trimmed !== oldName && get().especialidades.some(e => e.toLowerCase() === trimmed.toLowerCase()))
      return { ok: false, error: 'Ya existe una especialidad con ese nombre.' };
    set(s => ({ especialidades: s.especialidades.map(e => e === oldName ? trimmed : e) }));
    supabase.from(TABLE).update({ nombre: trimmed }).eq('nombre', oldName)
      .then(({ error }) => { if (error) console.error('[especialidadesStore.update]', error); });
    return { ok: true };
  },

  deleteEspecialidad: (nombre) => {
    set(s => ({ especialidades: s.especialidades.filter(e => e !== nombre) }));
    supabase.from(TABLE).delete().eq('nombre', nombre)
      .then(({ error }) => { if (error) console.error('[especialidadesStore.delete]', error); });
  },
}));
