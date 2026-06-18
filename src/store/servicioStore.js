import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { generateId, generateNumero } from '../utils/formatters';
import { buildAuditEntries, createEntry } from '../utils/auditLog';
import { useAuthStore } from './authStore';
import { useActividadStore } from './actividadStore';
import { useNotificacionesStore } from './notificacionesStore';

const TABLE = 'ordenes_servicio';

export const useServicioStore = create((set, get) => ({
  servicios: [],
  initialized: false,

  initialize: async () => {
    if (get().initialized) return;
    const { data, error } = await supabase.from(TABLE).select('data');
    if (error) { console.error('[servicioStore]', error); return; }
    set({ servicios: (data || []).map(r => r.data), initialized: true });
  },

  addServicio: (servicioData) => {
    const user = useAuthStore.getState().user;
    const servicios = get().servicios;
    const numero = generateNumero('OT', servicios);
    const historial = user ? [createEntry('creó esta orden de servicio', user)] : [];
    const item = {
      ...servicioData, id: generateId(), numero,
      fechaCreacion: new Date().toISOString().split('T')[0],
      acciones: [], materiales: [], historial,
      creadoPorId: user?.id || null,
    };
    set(s => ({ servicios: [...s.servicios, item] }));
    supabase.from(TABLE).insert({ id: item.id, data: item }).then(({ error }) => {
      if (error) { console.error(error); set(s => ({ servicios: s.servicios.filter(s => s.id !== item.id) })); }
    });
    if (user) {
      useActividadStore.getState().addActividad({ userId: user.id, userName: user.name, tipo: 'servicio', accion: 'creó una orden de servicio', registroId: item.id, registroLabel: numero, modulo: 'servicio-tecnico' });
      if (servicioData.tecnico && servicioData.tecnico !== user.id) {
        useNotificacionesStore.getState().pushNotificacion(servicioData.tecnico, {
          mensaje: `${user.name} te asignó la orden de servicio ${numero}`,
          tipo: 'servicio', modulo: 'servicio-tecnico', enlace: '/servicio-tecnico',
        });
      }
    }
    return item;
  },

  updateServicio: (id, updates) => {
    const user = useAuthStore.getState().user;
    const prev = get().servicios.find(s => s.id === id);
    const entries = user ? buildAuditEntries(prev, { ...prev, ...updates }, user) : [];
    const updated = { ...prev, ...updates, historial: [...(prev?.historial || []), ...entries] };
    set(s => ({ servicios: s.servicios.map(s => s.id === id ? updated : s) }));
    supabase.from(TABLE).update({ data: updated }).eq('id', id).then(({ error }) => {
      if (error) { console.error(error); set(s => ({ servicios: s.servicios.map(s => s.id === id ? prev : s) })); }
    });
    if (user) {
      const accion = updates.estado && prev?.estado !== updates.estado
        ? `cambió la ${prev?.numero} a "${updates.estado}"`
        : `actualizó la orden ${prev?.numero}`;
      useActividadStore.getState().addActividad({ userId: user.id, userName: user.name, tipo: 'servicio', accion, registroId: id, registroLabel: prev?.numero || id, modulo: 'servicio-tecnico' });
      if (updates.estado === 'Completada' && prev?.estado !== 'Completada') {
        const push = useNotificacionesStore.getState().pushNotificacion;
        const numero = prev?.numero || id;
        const admins = useAuthStore.getState().users.filter(u => u.role === 'Administración').map(u => u.id);
        new Set([prev?.creadoPorId, ...admins].filter(Boolean)).forEach(targetId => {
          if (targetId !== user.id) {
            push(targetId, { mensaje: `La orden ${numero} fue marcada como Completada por ${user.name}`, tipo: 'servicio', modulo: 'servicio-tecnico', enlace: '/servicio-tecnico' });
          }
        });
      }
    }
  },

  deleteServicio: (id) => {
    const user = useAuthStore.getState().user;
    const target = get().servicios.find(s => s.id === id);
    const prev = get().servicios;
    set(s => ({ servicios: s.servicios.filter(s => s.id !== id) }));
    supabase.from(TABLE).delete().eq('id', id).then(({ error }) => {
      if (error) { console.error(error); set({ servicios: prev }); }
    });
    if (user) useActividadStore.getState().addActividad({ userId: user.id, userName: user.name, tipo: 'servicio', accion: 'eliminó la orden de servicio', registroId: id, registroLabel: target?.numero || id, modulo: 'servicio-tecnico' });
  },

  addAccion: (servicioId, accion) => {
    const s = get().servicios.find(s => s.id === servicioId);
    if (!s) return;
    const updated = { ...s, acciones: [...(s.acciones || []), { ...accion, id: generateId(), fecha: new Date().toISOString().split('T')[0] }] };
    set(st => ({ servicios: st.servicios.map(s => s.id === servicioId ? updated : s) }));
    supabase.from(TABLE).update({ data: updated }).eq('id', servicioId)
      .then(({ error }) => { if (error) console.error(error); });
  },

  getServicio: (id) => get().servicios.find(s => s.id === id),
}));
