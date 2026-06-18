import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { generateId, generateNumero } from '../utils/formatters';
import { buildAuditEntries, createEntry } from '../utils/auditLog';
import { useAuthStore } from './authStore';
import { useActividadStore } from './actividadStore';
import { useAgendaStore } from './agendaStore';
import { useClientesStore } from './clientesStore';
import { useEquiposStore } from './equiposStore';
import { useNotificacionesStore } from './notificacionesStore';

const TABLE = 'demostraciones';

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

export const useDemosStore = create((set, get) => ({
  demos: [],
  initialized: false,

  initialize: async () => {
    if (get().initialized) return;
    const { data, error } = await supabase.from(TABLE).select('data');
    if (error) { console.error('[demosStore]', error); return; }
    set({ demos: (data || []).map(r => r.data), initialized: true });
  },

  addDemo: (demoData) => {
    const user = useAuthStore.getState().user;
    const demos = get().demos;
    const numero = generateNumero('DM', demos);
    const historial = user ? [createEntry('creó esta demostración', user)] : [];
    const item = { ...demoData, id: generateId(), numero, creadoPorId: user?.id || null, historial };
    // Crear evento en agenda vinculado
    const evento = useAgendaStore.getState().addEvento({ ...buildEventoFromDemo(demoData), demoId: item.id });
    const itemWithEvento = { ...item, eventoId: evento.id };
    set(s => ({ demos: [...s.demos, itemWithEvento] }));
    supabase.from(TABLE).insert({ id: itemWithEvento.id, data: itemWithEvento }).then(({ error }) => {
      if (error) { console.error(error); set(s => ({ demos: s.demos.filter(d => d.id !== itemWithEvento.id) })); }
    });
    if (user) {
      useActividadStore.getState().addActividad({ userId: user.id, userName: user.name, tipo: 'demo', accion: 'creó una demostración', registroId: item.id, registroLabel: numero, modulo: 'demostraciones' });
      if (demoData.responsable && demoData.responsable !== user.id) {
        const cliente = useClientesStore.getState().clientes.find(c => c.id === demoData.clienteId);
        const equipo  = useEquiposStore.getState().equipos.find(e => e.id === demoData.equipoId);
        useNotificacionesStore.getState().pushNotificacion(demoData.responsable, {
          mensaje: `${user.name} te asignó una demostración: ${equipo?.nombre || 'equipo'} con ${cliente?.nombre || 'cliente'} (${demoData.fecha || 'sin fecha'})`,
          tipo: 'demo', modulo: 'demostraciones', enlace: '/demostraciones',
        });
      }
    }
    return itemWithEvento;
  },

  updateDemo: (id, updates) => {
    const user = useAuthStore.getState().user;
    const prev = get().demos.find(d => d.id === id);
    const entries = user ? buildAuditEntries(prev, { ...prev, ...updates }, user) : [];
    const updated = { ...prev, ...updates, historial: [...(prev?.historial || []), ...entries] };
    set(s => ({ demos: s.demos.map(d => d.id === id ? updated : d) }));
    supabase.from(TABLE).update({ data: updated }).eq('id', id).then(({ error }) => {
      if (error) { console.error(error); set(s => ({ demos: s.demos.map(d => d.id === id ? prev : d) })); }
    });
    // Sincronizar evento de agenda si cambiaron campos relevantes
    if (prev?.eventoId) {
      const syncFields = ['fecha', 'hora', 'clienteId', 'equipoId', 'responsable'];
      if (syncFields.some(k => updates[k] !== undefined && updates[k] !== prev[k])) {
        useAgendaStore.getState().updateEvento(prev.eventoId, buildEventoFromDemo({ ...prev, ...updates }));
      }
    }
    if (user) {
      const accion = updates.estado && prev?.estado !== updates.estado
        ? `cambió la demo ${prev?.numero} a "${updates.estado}"`
        : `actualizó la demo ${prev?.numero}`;
      useActividadStore.getState().addActividad({ userId: user.id, userName: user.name, tipo: 'demo', accion, registroId: id, registroLabel: prev?.numero || id, modulo: 'demostraciones' });
    }
  },

  deleteDemo: (id) => {
    const user = useAuthStore.getState().user;
    const target = get().demos.find(d => d.id === id);
    const prev = get().demos;
    set(s => ({ demos: s.demos.filter(d => d.id !== id) }));
    supabase.from(TABLE).delete().eq('id', id).then(({ error }) => {
      if (error) { console.error(error); set({ demos: prev }); }
    });
    if (target?.eventoId) useAgendaStore.getState().deleteEvento(target.eventoId);
    if (user) useActividadStore.getState().addActividad({ userId: user.id, userName: user.name, tipo: 'demo', accion: 'eliminó la demostración', registroId: id, registroLabel: target?.numero || id, modulo: 'demostraciones' });
  },

  getDemo: (id) => get().demos.find(d => d.id === id),
}));
