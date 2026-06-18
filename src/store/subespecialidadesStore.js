import { create } from 'zustand';
import { supabase } from '../lib/supabase';

const TABLE = 'subespecialidades_fisioterapia';
const LS_KEY = 'sanicom_subesp_fisio';
const DEFAULTS = ['MSK (Musculoesquelético)', 'Manual', 'Suelo pélvico'];

function lsLoad() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || null; } catch { return null; }
}
function lsSave(list) {
  localStorage.setItem(LS_KEY, JSON.stringify(list));
}

export const useSubespecialidadesStore = create((set, get) => ({
  subespecialidades: [],
  useSupabase: false,
  initialized: false,

  initialize: async () => {
    if (get().initialized) return;
    try {
      const { data, error } = await supabase.from(TABLE).select('nombre').order('nombre');
      if (error) throw error;
      if ((data || []).length === 0) {
        await supabase.from(TABLE).insert(DEFAULTS.map(n => ({ nombre: n })));
        set({ subespecialidades: DEFAULTS, useSupabase: true, initialized: true });
      } else {
        set({ subespecialidades: data.map(r => r.nombre), useSupabase: true, initialized: true });
      }
    } catch {
      const stored = lsLoad() || DEFAULTS;
      lsSave(stored);
      set({ subespecialidades: stored, useSupabase: false, initialized: true });
    }
  },

  addSubespecialidad: (nombre) => {
    const trimmed = nombre.trim();
    if (!trimmed) return { ok: false, error: 'El nombre no puede estar vacío.' };
    if (get().subespecialidades.some(e => e.toLowerCase() === trimmed.toLowerCase()))
      return { ok: false, error: 'Ya existe esa subespecialidad.' };
    const next = [...get().subespecialidades, trimmed];
    set({ subespecialidades: next });
    if (get().useSupabase) {
      supabase.from(TABLE).insert({ nombre: trimmed })
        .then(({ error }) => { if (error) console.error('[subespecialidadesStore.add]', error); });
    } else {
      lsSave(next);
    }
    return { ok: true };
  },

  updateSubespecialidad: (oldName, newName) => {
    const trimmed = newName.trim();
    if (!trimmed) return { ok: false, error: 'El nombre no puede estar vacío.' };
    if (trimmed !== oldName && get().subespecialidades.some(e => e.toLowerCase() === trimmed.toLowerCase()))
      return { ok: false, error: 'Ya existe esa subespecialidad.' };
    const next = get().subespecialidades.map(e => e === oldName ? trimmed : e);
    set({ subespecialidades: next });
    if (get().useSupabase) {
      supabase.from(TABLE).update({ nombre: trimmed }).eq('nombre', oldName)
        .then(({ error }) => { if (error) console.error('[subespecialidadesStore.update]', error); });
    } else {
      lsSave(next);
    }
    return { ok: true };
  },

  deleteSubespecialidad: (nombre) => {
    const next = get().subespecialidades.filter(e => e !== nombre);
    set({ subespecialidades: next });
    if (get().useSupabase) {
      supabase.from(TABLE).delete().eq('nombre', nombre)
        .then(({ error }) => { if (error) console.error('[subespecialidadesStore.delete]', error); });
    } else {
      lsSave(next);
    }
  },
}));
