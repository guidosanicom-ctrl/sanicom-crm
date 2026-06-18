import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { TIPOS_CLIENTE_DEFAULT } from '../utils/constants';

const TABLE = 'tipos_cliente';
const LS_KEY = 'sanicom_tipos_cliente';

export const useTiposClienteStore = create((set, get) => ({
  tipos: [],
  initialized: false,

  initialize: async () => {
    if (get().initialized) return;
    const { data, error } = await supabase.from(TABLE).select('nombre').order('nombre');
    if (error) {
      const saved = localStorage.getItem(LS_KEY);
      const tipos = saved ? JSON.parse(saved) : TIPOS_CLIENTE_DEFAULT;
      set({ tipos, initialized: true });
      return;
    }
    if ((data || []).length === 0) {
      await supabase.from(TABLE).insert(TIPOS_CLIENTE_DEFAULT.map(n => ({ nombre: n })));
      set({ tipos: TIPOS_CLIENTE_DEFAULT, initialized: true });
      localStorage.setItem(LS_KEY, JSON.stringify(TIPOS_CLIENTE_DEFAULT));
    } else {
      const tipos = data.map(r => r.nombre);
      set({ tipos, initialized: true });
      localStorage.setItem(LS_KEY, JSON.stringify(tipos));
    }
  },

  addTipo: (nombre) => {
    const trimmed = nombre.trim();
    if (!trimmed) return { ok: false, error: 'El nombre no puede estar vacío.' };
    if (get().tipos.some(t => t.toLowerCase() === trimmed.toLowerCase()))
      return { ok: false, error: 'Ya existe un tipo con ese nombre.' };
    const next = [...get().tipos, trimmed];
    set({ tipos: next });
    localStorage.setItem(LS_KEY, JSON.stringify(next));
    supabase.from(TABLE).insert({ nombre: trimmed })
      .then(({ error }) => { if (error) console.error('[tiposClienteStore.add]', error); });
    return { ok: true };
  },

  updateTipo: (oldName, newName) => {
    const trimmed = newName.trim();
    if (!trimmed) return { ok: false, error: 'El nombre no puede estar vacío.' };
    if (trimmed !== oldName && get().tipos.some(t => t.toLowerCase() === trimmed.toLowerCase()))
      return { ok: false, error: 'Ya existe un tipo con ese nombre.' };
    const next = get().tipos.map(t => t === oldName ? trimmed : t);
    set({ tipos: next });
    localStorage.setItem(LS_KEY, JSON.stringify(next));
    supabase.from(TABLE).update({ nombre: trimmed }).eq('nombre', oldName)
      .then(({ error }) => { if (error) console.error('[tiposClienteStore.update]', error); });
    return { ok: true };
  },

  deleteTipo: (nombre) => {
    const next = get().tipos.filter(t => t !== nombre);
    set({ tipos: next });
    localStorage.setItem(LS_KEY, JSON.stringify(next));
    supabase.from(TABLE).delete().eq('nombre', nombre)
      .then(({ error }) => { if (error) console.error('[tiposClienteStore.delete]', error); });
  },
}));
