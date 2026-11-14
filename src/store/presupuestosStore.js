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
    const numero = generateNumeroAnual('PR', presupuestos, 144);
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

  /** Crea el presupuesto en STEL Order (función stel-enviar-presupuesto). */
  enviarAStel: async (id) => {
    const user = useAuthStore.getState().user;
    const { data, error } = await supabase.functions.invoke('stel-enviar-presupuesto', {
      body: { presupuestoId: id, usuario: user?.name || null },
    });
    let msg = data?.error;
    if (error) {
      msg = error.message;
      try { msg = (await error.context?.json())?.error || msg; } catch { /* sin cuerpo */ }
    }
    if (msg) return { ok: false, error: msg };
    // La función ya lo guardó en la base de datos; aquí solo actualizamos la copia local
    // (sin volver a guardar, para no pisar nada) y registramos quién lo envió.
    set(s => ({ presupuestos: s.presupuestos.map(p => p.id === id ? { ...p, stel: data.stel } : p) }));
    const prev = get().presupuestos.find(p => p.id === id);
    if (prev && user && !data.yaEnviado) {
      const updated = { ...prev, historial: [...(prev.historial || []), createEntry(`envió el presupuesto a STEL (${data.stel.referencia || data.stel.id})`, user)] };
      set(s => ({ presupuestos: s.presupuestos.map(p => p.id === id ? updated : p) }));
      supabase.from(TABLE).update({ data: updated }).eq('id', id).then(({ error: e }) => { if (e) console.error(e); });
    }
    return { ok: true, ...data };
  },

  /** Si el presupuesto ya está en STEL, manda allí los cambios (mismo número PRV). */
  actualizarEnStel: async (id) => {
    const user = useAuthStore.getState().user;
    const { data, error } = await supabase.functions.invoke('stel-enviar-presupuesto', {
      body: { presupuestoId: id, usuario: user?.name || null, modo: 'actualizar' },
    });
    let msg = data?.error;
    if (error) {
      msg = error.message;
      try { msg = (await error.context?.json())?.error || msg; } catch { /* sin cuerpo */ }
    }
    if (msg) return { ok: false, error: msg };
    if (data?.noEnviado) return { ok: true, noEnviado: true };
    set(s => ({ presupuestos: s.presupuestos.map(p => p.id === id ? { ...p, stel: data.stel } : p) }));
    const prev = get().presupuestos.find(p => p.id === id);
    if (prev && user) {
      const updated = { ...prev, historial: [...(prev.historial || []), createEntry(`actualizó el presupuesto en STEL (${data.stel.referencia || data.stel.id})`, user)] };
      set(s => ({ presupuestos: s.presupuestos.map(p => p.id === id ? updated : p) }));
      supabase.from(TABLE).update({ data: updated }).eq('id', id).then(({ error: e }) => { if (e) console.error(e); });
    }
    return { ok: true, ...data };
  },

  getPresupuesto: (id) => get().presupuestos.find(p => p.id === id),
}));
