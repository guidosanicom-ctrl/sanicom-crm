import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { fetchAll } from '../lib/supabaseUtils';
import { generateId, generateNumero } from '../utils/formatters';
import { buildAuditEntries, createEntry } from '../utils/auditLog';
import { useAuthStore } from './authStore';
import { useActividadStore } from './actividadStore';
import { useNotificacionesStore } from './notificacionesStore';
import { useAgendaStore } from './agendaStore';
import { useClientesStore } from './clientesStore';

const TABLE = 'ordenes_servicio';

const buildEventoData = (servicio) => {
  const clientes = useClientesStore.getState().clientes;
  const cliente = clientes.find(c => c.id === servicio.clienteId);
  const clienteNombre = cliente?.nombre || '';
  const desc = servicio.descripcion ? servicio.descripcion.slice(0, 40) : servicio.tipo;
  return {
    titulo: `OT: ${desc} - ${clienteNombre}`,
    tipo: 'Reparación/Servicio técnico',
    inicio: `${servicio.fechaProgramada}T09:00`,
    fin: `${servicio.fechaProgramada}T10:00`,
    clienteId: servicio.clienteId,
    responsable: servicio.tecnico,
    descripcion: `${servicio.tipo}${servicio.descripcion ? ' — ' + servicio.descripcion : ''}`,
  };
};

export const useServicioStore = create((set, get) => ({
  servicios: [],
  initialized: false,

  initialize: async () => {
    if (get().initialized) return;
    const { data, error } = await fetchAll(TABLE);
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
    // Crear evento en Agenda si se solicitó
    if (servicioData._agendarEvento && item.fechaProgramada) {
      const eventoData = buildEventoData(item);
      const evento = useAgendaStore.getState().addEvento({ ...eventoData, _skipNotif: true });
      if (evento?.id) {
        item.eventoId = evento.id;
      }
    }
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
    // Actualizar evento de agenda si existe y se solicitó
    if (updates._agendarEvento && updated.eventoId && updated.fechaProgramada) {
      useAgendaStore.getState().updateEvento(updated.eventoId, buildEventoData(updated));
    }
    set(s => ({ servicios: s.servicios.map(s => s.id === id ? updated : s) }));
    supabase.from(TABLE).update({ data: updated }).eq('id', id).then(({ error }) => {
      if (error) { console.error(error); set(s => ({ servicios: s.servicios.map(s => s.id === id ? prev : s) })); }
    });
    if (user && updates.estado && prev?.estado !== updates.estado && updates.estado === 'Completada') {
      useActividadStore.getState().addActividad({ userId: user.id, userName: user.name, tipo: 'servicio', accion: 'completó la orden de servicio', registroId: id, registroLabel: prev?.numero || id, modulo: 'servicio-tecnico' });
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
    // Eliminar evento de agenda vinculado
    if (target?.eventoId) {
      useAgendaStore.getState().deleteEvento(target.eventoId);
    }
    set(s => ({ servicios: s.servicios.filter(s => s.id !== id) }));
    supabase.from(TABLE).delete().eq('id', id).then(({ error }) => {
      if (error) { console.error(error); set({ servicios: prev }); }
    });
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
