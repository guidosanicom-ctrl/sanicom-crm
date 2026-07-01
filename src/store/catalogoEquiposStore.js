import { create } from 'zustand';
import { supabase } from '../lib/supabase';

const TABLE = 'catalogo_equipos';

export const SUBCATEGORIA_LIBRE = 'Ocasión / Otra marca';

const INICIAL = [
  { categoria: 'Láser',          subcategoria: null,                      orden: 10 },
  { categoria: 'Ecógrafos',      subcategoria: 'SonoScape X11',    orden: 20 },
  { categoria: 'Ecógrafos',      subcategoria: 'SonoScape X3',     orden: 21 },
  { categoria: 'Ecógrafos',      subcategoria: 'SonoScape P12 Elite', orden: 22 },
  { categoria: 'Ecógrafos',      subcategoria: 'SonoScape P25 Elite', orden: 23 },
  { categoria: 'Ecógrafos',      subcategoria: 'SonoScape E3',     orden: 24 },
  { categoria: 'Ecógrafos',      subcategoria: 'SonoScape E11',    orden: 25 },
  { categoria: 'Ecógrafos',      subcategoria: SUBCATEGORIA_LIBRE,        orden: 26 },
  { categoria: 'Fluoroscopio',   subcategoria: null,                      orden: 30 },
  { categoria: 'Onda de Choque', subcategoria: 'Radial',                  orden: 40 },
  { categoria: 'Onda de Choque', subcategoria: 'Focal',                   orden: 41 },
  { categoria: 'Diatermia',      subcategoria: 'Consola',                 orden: 50 },
  { categoria: 'Diatermia',      subcategoria: 'Portátil',                orden: 51 },
  { categoria: 'Magneto',        subcategoria: null,                      orden: 60 },
  { categoria: 'Super Inductiva', subcategoria: 'Simple',                 orden: 70 },
  { categoria: 'Super Inductiva', subcategoria: 'Doble',                  orden: 71 },
];

export const useCatalogoEquiposStore = create((set, get) => ({
  items: [],
  initialized: false,

  initialize: async () => {
    if (get().initialized) return;
    const { data, error } = await supabase.from(TABLE).select('*').order('orden').order('subcategoria');
    if (error) { console.error('[catalogoEquiposStore]', error); return; }
    if ((data || []).length === 0) {
      const { data: inserted, error: insErr } = await supabase.from(TABLE).insert(INICIAL).select();
      if (insErr) { console.error('[catalogoEquiposStore init]', insErr); return; }
      set({ items: inserted || INICIAL, initialized: true });
    } else {
      set({ items: data, initialized: true });
    }
  },

  // Returns unique categories in order
  categorias: () => {
    const seen = new Set();
    return get().items.filter(i => { if (seen.has(i.categoria)) return false; seen.add(i.categoria); return true; }).map(i => i.categoria);
  },

  // Returns subcategories for a given category (null entries filtered out)
  subcategorias: (categoria) =>
    get().items.filter(i => i.categoria === categoria && i.subcategoria).map(i => i.subcategoria),

  addItem: async (categoria, subcategoria) => {
    const cat = categoria.trim();
    const sub = subcategoria?.trim() || null;
    if (!cat) return { ok: false, error: 'La categoría no puede estar vacía.' };
    const maxOrden = Math.max(0, ...get().items.map(i => i.orden || 0));
    const { data, error } = await supabase.from(TABLE).insert({ categoria: cat, subcategoria: sub, orden: maxOrden + 10 }).select().single();
    if (error) return { ok: false, error: error.message };
    set(s => ({ items: [...s.items, data] }));
    return { ok: true };
  },

  updateItem: async (id, categoria, subcategoria) => {
    const cat = categoria.trim();
    const sub = subcategoria?.trim() || null;
    if (!cat) return { ok: false, error: 'La categoría no puede estar vacía.' };
    const { error } = await supabase.from(TABLE).update({ categoria: cat, subcategoria: sub }).eq('id', id);
    if (error) return { ok: false, error: error.message };
    set(s => ({ items: s.items.map(i => i.id === id ? { ...i, categoria: cat, subcategoria: sub } : i) }));
    return { ok: true };
  },

  deleteItem: async (id) => {
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    if (error) return { ok: false, error: error.message };
    set(s => ({ items: s.items.filter(i => i.id !== id) }));
    return { ok: true };
  },
}));
