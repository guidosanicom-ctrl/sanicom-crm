import { create } from 'zustand';
import { SEED_SERVICIOS } from '../data/seedData';
import { generateId, generateNumero } from '../utils/formatters';
import { buildAuditEntries, createEntry } from '../utils/auditLog';
import { useAuthStore } from './authStore';
import { useActividadStore } from './actividadStore';
import { useNotificacionesStore } from './notificacionesStore';

const KEY = 'sanicom_servicios';

const load = () => {
  try {
    const data = localStorage.getItem(KEY);
    if (data) return JSON.parse(data);
    localStorage.setItem(KEY, JSON.stringify(SEED_SERVICIOS));
    return SEED_SERVICIOS;
  } catch { return SEED_SERVICIOS; }
};

const save = (items) => localStorage.setItem(KEY, JSON.stringify(items));

export const useServicioStore = create((set, get) => ({
  servicios: load(),

  addServicio: (data) => {
    const user = useAuthStore.getState().user;
    const servicios = get().servicios;
    const numero = generateNumero('OT', servicios);
    const historial = user ? [createEntry('creó esta orden de servicio', user)] : [];
    const item = {
      ...data, id: generateId(), numero,
      fechaCreacion: new Date().toISOString().split('T')[0],
      acciones: [], materiales: [], historial,
    };
    const updated = [...servicios, item];
    save(updated);
    set({ servicios: updated });
    if (user) {
      useActividadStore.getState().addActividad({ userId: user.id, userName: user.name, tipo: 'servicio', accion: 'creó una orden de servicio', registroId: item.id, registroLabel: numero, modulo: 'servicio-tecnico' });
      // Notificar al técnico asignado (si es distinto al creador)
      if (data.tecnico && data.tecnico !== user.id) {
        useNotificacionesStore.getState().pushNotificacion(data.tecnico, {
          mensaje: `${user.name} te asignó la orden de servicio ${numero}`,
          tipo: 'servicio',
          modulo: 'servicio-tecnico',
          enlace: '/servicio-tecnico',
        });
      }
    }
    return item;
  },

  updateServicio: (id, data) => {
    const user = useAuthStore.getState().user;
    const prev = get().servicios.find(s => s.id === id);
    const servicios = get().servicios.map(s => {
      if (s.id !== id) return s;
      const entries = user ? buildAuditEntries(s, { ...s, ...data }, user) : [];
      const historial = [...(s.historial || []), ...entries];
      return { ...s, ...data, historial };
    });
    save(servicios);
    set({ servicios });
    if (user) {
      const accion = data.estado && prev?.estado !== data.estado
        ? `cambió la ${prev?.numero} a "${data.estado}"`
        : `actualizó la orden ${prev?.numero}`;
      useActividadStore.getState().addActividad({ userId: user.id, userName: user.name, tipo: 'servicio', accion, registroId: id, registroLabel: prev?.numero || id, modulo: 'servicio-tecnico' });
      // Orden completada → notificar al creador y a los usuarios de Administración
      if (data.estado === 'Completada' && prev?.estado !== 'Completada') {
        const push = useNotificacionesStore.getState().pushNotificacion;
        const numero = prev?.numero || id;
        const admins = useAuthStore.getState().users.filter(u => u.role === 'Administración').map(u => u.id);
        const notificados = new Set([prev?.creadoPorId, ...admins].filter(Boolean));
        notificados.forEach(targetId => {
          if (targetId !== user.id) {
            push(targetId, {
              mensaje: `La orden ${numero} ha sido marcada como Completada por ${user.name}`,
              tipo: 'servicio',
              modulo: 'servicio-tecnico',
              enlace: '/servicio-tecnico',
            });
          }
        });
      }
    }
  },

  deleteServicio: (id) => {
    const user = useAuthStore.getState().user;
    const target = get().servicios.find(s => s.id === id);
    const servicios = get().servicios.filter(s => s.id !== id);
    save(servicios);
    set({ servicios });
    if (user) useActividadStore.getState().addActividad({ userId: user.id, userName: user.name, tipo: 'servicio', accion: 'eliminó la orden de servicio', registroId: id, registroLabel: target?.numero || id, modulo: 'servicio-tecnico' });
  },

  addAccion: (servicioId, accion) => {
    const servicios = get().servicios.map(s => {
      if (s.id !== servicioId) return s;
      return { ...s, acciones: [...(s.acciones || []), { ...accion, id: generateId(), fecha: new Date().toISOString().split('T')[0] }] };
    });
    save(servicios);
    set({ servicios });
  },

  getServicio: (id) => get().servicios.find(s => s.id === id),
}));
