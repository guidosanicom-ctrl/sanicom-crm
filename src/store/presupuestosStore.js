import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { fetchAll } from '../lib/supabaseUtils';
import { generateId, generateNumeroAnual } from '../utils/formatters';
import { buildAuditEntries, createEntry } from '../utils/auditLog';
import { useAuthStore } from './authStore';

const TABLE = 'presupuestos';

export const usePresupuestosStore = create((set, get) => ({
  presupuestos: [],
  initialized: false,

  initialize: async () => {
    if (get().initialized) return;
    const { data, error } = await fetchAll(TABLE);
    if (error) { console.error('[presupuestosStore]', error); return; }
    set({ presupuestos: (data || []).map(r => r.data), initialized: true });
  },

  addPresupuesto: (presupuestoData) => {
    const user = useAuthStore.getState().user;
    const presupuestos = get().presupuestos;
    const numero = generateNumeroAnual('PR', presupuestos);
    const historial = user ? [createEntry('creó este presupuesto', user)] : [];
    const item = {
      ...presupuestoData, id: generateId(), numero,
      fechaCreacion: new Date().toISOString().split('T')[0],
      creadoPorId: user?.id || null,
      historial,
    };
    set(s => ({ presupuestos: [...s.presupuestos, item] }));
    supabase.from(TABLE).insert({ id: item.id, data: item }).then(({ error }) => {
      if (error) { console.error(error); set(s => ({ presupuestos: s.presupuestos.filter(p => p.id !== item.id) })); }
    });
    return item;
  },

  updatePresupuesto: (id, updates) => {
    const user = useAuthStore.getState().user;
    const prev = get().presupuestos.find(p => p.id === id);
    const entries = user ? buildAuditEntries(prev, { ...prev, ...updates }, user) : [];
    const updated = { ...prev, ...updates, historial: [...(prev?.historial || []), ...entries] };
    set(s => ({ presupuestos: s.presupuestos.map(p => p.id === id ? updated : p) }));
    supabase.from(TABLE).update({ data: updated }).eq('id', id).then(({ error }) => {
      if (error) { console.error(error); set(s => ({ presupuestos: s.presupuestos.map(p => p.id === id ? prev : p) })); }
    });
  },

  deletePresupuesto: (id) => {
    const prev = get().presupuestos;
    set(s => ({ presupuestos: s.presupuestos.filter(p => p.id !== id) }));
    supabase.from(TABLE).delete().eq('id', id).then(({ error }) => {
      if (error) { console.error(error); set({ presupuestos: prev }); }
    });
  },

  getPresupuesto: (id) => get().presupuestos.find(p => p.id === id),
}));
