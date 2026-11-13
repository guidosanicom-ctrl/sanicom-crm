import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { fetchAll } from '../lib/supabaseUtils';
import { USERS } from '../data/seedData';

const ITEMS = 'stel_items';
const CONFIG = 'stel_config';
const CONFIG_ID = 'main';

/** Marca del artículo = prefijo de la referencia antes del primer guion (ROSS-04BP031 → ROSS). */
export const prefijoReferencia = (ref) => {
  const r = String(ref || '').trim().toUpperCase();
  const i = r.indexOf('-');
  return i > 0 ? r.slice(0, i) : '';
};

/**
 * Áreas efectivas de un artículo: las asignadas a mano + las de su categoría STEL
 * + las de su marca (prefijo de referencia).
 */
export const areasEfectivas = (item, config = {}) => {
  const set = new Set(item?.areas || []);
  const { categoriaAreas = {}, prefijoAreas = {} } = config;
  if (item?.categoriaId != null) (categoriaAreas[item.categoriaId] || []).forEach(a => set.add(a));
  const pref = prefijoReferencia(item?.referencia);
  if (pref) (prefijoAreas[pref] || []).forEach(a => set.add(a));
  return [...set];
};

/** Administración ve todo el catálogo; el resto, solo las áreas que tenga asignadas. */
export const veTodoElCatalogo = (user) => user?.role === 'Administración';

export const useStelCatalogoStore = create((set, get) => ({
  items: [],
  config: { categoriaAreas: {}, prefijoAreas: {}, categorias: [], ultimaSync: null },
  initialized: false,
  syncing: false,

  initialize: async () => {
    if (get().initialized) return;
    const [{ data, error }, { data: cfg }] = await Promise.all([
      fetchAll(ITEMS),
      supabase.from(CONFIG).select('data').eq('id', CONFIG_ID).maybeSingle(),
    ]);
    if (error) { console.error('[stelCatalogoStore]', error); return; }
    set({
      items: (data || []).map(r => r.data),
      config: { categoriaAreas: {}, prefijoAreas: {}, categorias: [], ...(cfg?.data || {}) },
      initialized: true,
    });
  },

  /** Llama a la función stel-sync (la API key vive solo en el servidor). */
  sincronizar: async () => {
    set({ syncing: true });
    try {
      const { data, error } = await supabase.functions.invoke('stel-sync', { method: 'POST' });
      if (error) {
        let msg = error.message;
        try { msg = (await error.context?.json())?.error || msg; } catch { /* sin cuerpo */ }
        return { ok: false, error: msg };
      }
      if (data?.error) return { ok: false, error: data.error };
      set({ initialized: false });
      await get().initialize();
      return { ok: true, ...data };
    } finally {
      set({ syncing: false });
    }
  },

  setItemAreas: (id, areas) => {
    const prev = get().items.find(i => i.id === id);
    if (!prev) return;
    const updated = { ...prev, areas };
    set(s => ({ items: s.items.map(i => i.id === id ? updated : i) }));
    supabase.from(ITEMS).update({ data: updated }).eq('id', id).then(({ error }) => {
      if (error) { console.error(error); set(s => ({ items: s.items.map(i => i.id === id ? prev : i) })); }
    });
  },

  setCategoriaAreas: (categoriaId, areas) => {
    const prev = get().config;
    const updated = { ...prev, categoriaAreas: { ...(prev.categoriaAreas || {}), [categoriaId]: areas } };
    set({ config: updated });
    supabase.from(CONFIG).upsert({ id: CONFIG_ID, data: updated }).then(({ error }) => {
      if (error) { console.error(error); set({ config: prev }); }
    });
  },

  setPrefijoAreas: (prefijo, areas) => {
    const prev = get().config;
    const updated = { ...prev, prefijoAreas: { ...(prev.prefijoAreas || {}), [prefijo]: areas } };
    set({ config: updated });
    supabase.from(CONFIG).upsert({ id: CONFIG_ID, data: updated }).then(({ error }) => {
      if (error) { console.error(error); set({ config: prev }); }
    });
  },

  /** Artículos que puede usar un usuario en sus presupuestos. */
  itemsParaUsuario: (user) => {
    const { items, config } = get();
    const activos = items.filter(i => !i.inactivo && !i.eliminado);
    if (veTodoElCatalogo(user)) return activos;
    // Se lee de USERS (no de la sesión guardada) para que los cambios de áreas apliquen sin volver a iniciar sesión
    const misAreas = new Set(USERS.find(u => u.id === user?.id)?.areasCatalogo || []);
    if (!misAreas.size) return [];
    return activos.filter(i => areasEfectivas(i, config).some(a => misAreas.has(a)));
  },
}));
