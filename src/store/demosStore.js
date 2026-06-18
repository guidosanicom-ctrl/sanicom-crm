import { create } from 'zustand';
import { SEED_DEMOS } from '../data/seedData';
import { generateId, generateNumero } from '../utils/formatters';
import { buildAuditEntries, createEntry } from '../utils/auditLog';
import { useAuthStore } from './authStore';
import { useActividadStore } from './actividadStore';
import { useAgendaStore } from './agendaStore';
import { useNotificacionesStore } from './notificacionesStore';
import { useClientesStore } from './clientesStore';
import { useEquiposStore } from './equiposStore';

function buildEventoFromDemo(demo) {
  const cliente = useClientesStore.getState().clientes.find(c => c.id === demo.clienteId);
  const equipo  = useEquiposStore.getState().equipos.find(e => e.id === demo.equipoId);
  const hora = demo.hora || '09:00';
  const [h, m] = hora.split(':').map(Number);
  const finH = String(h + 1).padStart(2, '0');
  const finM = String(m).padStart(2, '0');
  return {
    titulo: `Demo: ${equipo?.nombre || 'Equipo'} - ${cliente?.nombre || 'Cliente'}`,
    tipo: 'Demo de equipo',
    inicio: demo.fecha ? `${demo.fecha}T${hora}` : '',
    fin:    demo.fecha ? `${demo.fecha}T${finH}:${finM}` : '',
    clienteId: demo.clienteId,
    responsable: demo.responsable,
    descripcion: 'Demostración generada automáticamente desde el módulo de Demostraciones',
  };
}

const KEY = 'sanicom_demos';

const load = () => {
  try {
    const data = localStorage.getItem(KEY);
    if (data) return JSON.parse(data);
    localStorage.setItem(KEY, JSON.stringify(SEED_DEMOS));
    return SEED_DEMOS;
  } catch { return SEED_DEMOS; }
};

const save = (items) => localStorage.setItem(KEY, JSON.stringify(items));

export const useDemosStore = create((set, get) => ({
  demos: load(),

  addDemo: (data) => {
    const user = useAuthStore.getState().user;
    const demos = get().demos;
    const numero = generateNumero('DM', demos);
    const historial = user ? [createEntry('creó esta demostración', user)] : [];
    const item = { ...data, id: generateId(), numero, creadoPorId: user?.id || null, historial };
    // Create linked agenda event
    const evento = useAgendaStore.getState().addEvento({ ...buildEventoFromDemo(data), demoId: item.id });
    const itemWithEvento = { ...item, eventoId: evento.id };
    const updated = [...demos, itemWithEvento];
    save(updated);
    set({ demos: updated });
    if (user) {
      useActividadStore.getState().addActividad({ userId: user.id, userName: user.name, tipo: 'demo', accion: 'creó una demostración', registroId: item.id, registroLabel: numero, modulo: 'demostraciones' });
      // Notificar al responsable asignado (si es distinto al creador)
      if (data.responsable && data.responsable !== user.id) {
        const cliente = useClientesStore.getState().clientes.find(c => c.id === data.clienteId);
        const equipo  = useEquiposStore.getState().equipos.find(e => e.id === data.equipoId);
        useNotificacionesStore.getState().pushNotificacion(data.responsable, {
          mensaje: `${user.name} te asignó una demostración: ${equipo?.nombre || 'equipo'} con ${cliente?.nombre || 'cliente'} (${data.fecha || 'sin fecha'})`,
          tipo: 'demo',
          modulo: 'demostraciones',
          enlace: '/demostraciones',
        });
      }
    }
    return itemWithEvento;
  },

  updateDemo: (id, data) => {
    const user = useAuthStore.getState().user;
    const prev = get().demos.find(d => d.id === id);
    const demos = get().demos.map(d => {
      if (d.id !== id) return d;
      const entries = user ? buildAuditEntries(d, { ...d, ...data }, user) : [];
      const historial = [...(d.historial || []), ...entries];
      return { ...d, ...data, historial };
    });
    save(demos);
    set({ demos });
    // Sync agenda event if any relevant field changed
    if (prev?.eventoId) {
      const merged = { ...prev, ...data };
      const syncFields = ['fecha', 'hora', 'clienteId', 'equipoId', 'responsable'];
      const changed = syncFields.some(k => data[k] !== undefined && data[k] !== prev[k]);
      if (changed) {
        useAgendaStore.getState().updateEvento(prev.eventoId, buildEventoFromDemo(merged));
      }
    }
    if (user) {
      const accion = data.estado && prev?.estado !== data.estado
        ? `cambió la demo ${prev?.numero} a "${data.estado}"`
        : `actualizó la demo ${prev?.numero}`;
      useActividadStore.getState().addActividad({ userId: user.id, userName: user.name, tipo: 'demo', accion, registroId: id, registroLabel: prev?.numero || id, modulo: 'demostraciones' });
    }
  },

  deleteDemo: (id) => {
    const user = useAuthStore.getState().user;
    const target = get().demos.find(d => d.id === id);
    const demos = get().demos.filter(d => d.id !== id);
    save(demos);
    set({ demos });
    // Remove linked agenda event
    if (target?.eventoId) {
      useAgendaStore.getState().deleteEvento(target.eventoId);
    }
    if (user) useActividadStore.getState().addActividad({ userId: user.id, userName: user.name, tipo: 'demo', accion: 'eliminó la demostración', registroId: id, registroLabel: target?.numero || id, modulo: 'demostraciones' });
  },

  getDemo: (id) => get().demos.find(d => d.id === id),
}));
