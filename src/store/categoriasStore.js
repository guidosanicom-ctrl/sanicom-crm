import { create } from 'zustand';
import { supabase } from '../lib/supabase';

const TABLE = 'categorias_equipo';

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

export const useCategoriasStore = create((set, get) => ({
  categorias: [],
  initialized: false,

  initialize: async () => {
    if (get().initialized) return;
    const { data, error } = await supabase.from(TABLE).select('nombre').order('nombre');
    if (error) { console.error('[categoriasStore]', error); return; }
    if ((data || []).length === 0) {
      await supabase.from(TABLE).insert(SEED.map(n => ({ nombre: n })));
      set({ categorias: SEED, initialized: true });
    } else {
      set({ categorias: data.map(r => r.nombre), initialized: true });
    }
  },

  addCategoria: (nombre) => {
    const trimmed = nombre.trim();
    if (!trimmed) return { ok: false, error: 'El nombre no puede estar vacío.' };
    if (get().categorias.some(c => c.toLowerCase() === trimmed.toLowerCase()))
      return { ok: false, error: 'Ya existe una categoría con ese nombre.' };
    set(s => ({ categorias: [...s.categorias, trimmed] }));
    supabase.from(TABLE).insert({ nombre: trimmed })
      .then(({ error }) => { if (error) console.error('[categoriasStore.add]', error); });
    return { ok: true };
  },

  updateCategoria: (oldName, newName) => {
    const trimmed = newName.trim();
    if (!trimmed) return { ok: false, error: 'El nombre no puede estar vacío.' };
    if (trimmed !== oldName && get().categorias.some(c => c.toLowerCase() === trimmed.toLowerCase()))
      return { ok: false, error: 'Ya existe una categoría con ese nombre.' };
    set(s => ({ categorias: s.categorias.map(c => c === oldName ? trimmed : c) }));
    supabase.from(TABLE).update({ nombre: trimmed }).eq('nombre', oldName)
      .then(({ error }) => { if (error) console.error('[categoriasStore.update]', error); });
    return { ok: true };
  },

  deleteCategoria: (nombre) => {
    set(s => ({ categorias: s.categorias.filter(c => c !== nombre) }));
    supabase.from(TABLE).delete().eq('nombre', nombre)
      .then(({ error }) => { if (error) console.error('[categoriasStore.delete]', error); });
  },
}));
