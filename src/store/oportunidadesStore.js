import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { fetchAll } from '../lib/supabaseUtils';
import { generateId } from '../utils/formatters';
import { buildAuditEntries, createEntry } from '../utils/auditLog';
import { useAuthStore } from './authStore';
import { useActividadStore } from './actividadStore';
import { useNotificacionesStore } from './notificacionesStore';
import { useAgendaStore } from './agendaStore';

const TABLE = 'oportunidades';

// Migración legacy: 'Cualificado' → 'Interesado'
const migrate = (items) => items.map(o => o.etapa === 'Cualificado' ? { ...o, etapa: 'Interesado' } : o);

export const useOportunidadesStore = create((set, get) => ({
  oportunidades: [],
  initialized: false,

  initialize: async () => {
    if (get().initialized) return;
    const { data, error } = await fetchAll(TABLE);
    if (error) { console.error('[oportunidadesStore]', error); return; }
    set({ oportunidades: migrate((data || []).map(r => r.data)), initialized: true });
  },

  addOportunidad: (oportunidadData) => {
    const user = useAuthStore.getState().user;
    const now = new Date().toISOString().split('T')[0];
    const historial = user ? [createEntry('creó esta oportunidad', user)] : [];
    const item = { ...oportunidadData, id: generateId(), fechaCreacion: now, fechaUltimaActualizacion: now, creadoPorId: user?.id || null, historial };
    set(s => ({ oportunidades: [...s.oportunidades, item] }));
    supabase.from(TABLE).insert({ id: item.id, data: item }).then(({ error }) => {
      if (error) { console.error(error); set(s => ({ oportunidades: s.oportunidades.filter(o => o.id !== item.id) })); }
    });
    if (user) {
      useActividadStore.getState().addActividad({ userId: user.id, userName: user.name, tipo: 'oportunidad', accion: 'creó una oportunidad', registroId: item.id, registroLabel: item.nombre, modulo: 'pipeline' });
      if (oportunidadData.responsable && oportunidadData.responsable !== user.id) {
        useNotificacionesStore.getState().pushNotificacion(oportunidadData.responsable, {
          mensaje: `${user.name} te asignó la oportunidad "${item.nombre}"`,
          tipo: 'oportunidad', modulo: 'pipeline', enlace: '/pipeline', registroId: item.id,
        });
      }
    }
    return item;
  },

  updateOportunidad: (id, updates) => {
    const user = useAuthStore.getState().user;
    const now = new Date().toISOString().split('T')[0];
    const prev = get().oportunidades.find(o => o.id === id);
    const entries = user ? buildAuditEntries(prev, { ...prev, ...updates }, user) : [];
    const extraOpp = updates.etapa === 'Ganado' && prev?.etapa !== 'Ganado' ? { fechaGanado: now } : {};

    // Gestionar evento de agenda para fecha de retorno de pausa
    const extraPausa = {};
    const pausaChanged = 'enPausa' in updates || 'pausaRecordatorio' in updates;
    if (pausaChanged) {
      const merged = { ...prev, ...updates };
      const agenda = useAgendaStore.getState();
      if (merged.enPausa && merged.pausaRecordatorio) {
        const eventoData = {
          titulo: `▶️ Retomar oportunidad — ${prev?.nombre || ''}`,
          tipo: 'Llamada/Seguimiento',
          inicio: `${merged.pausaRecordatorio}T09:00`,
          fin: `${merged.pausaRecordatorio}T09:30`,
          responsable: merged.responsable || prev?.responsable,
          oportunidadId: id,
          descripcion: `Retomar oportunidad pausada`,
        };
        if (prev?.eventoPausaId) {
          agenda.updateEvento(prev.eventoPausaId, eventoData);
        } else {
          const ev = agenda.addEvento({ ...eventoData, _skipNotif: true });
          extraPausa.eventoPausaId = ev.id;
        }
      } else if (!merged.enPausa && prev?.eventoPausaId) {
        agenda.deleteEvento(prev.eventoPausaId);
        extraPausa.eventoPausaId = null;
      }
    }

    const updated = { ...prev, ...updates, ...extraOpp, ...extraPausa, fechaUltimaActualizacion: now, historial: [...(prev?.historial || []), ...entries] };
    set(s => ({ oportunidades: s.oportunidades.map(o => o.id === id ? updated : o) }));
    supabase.from(TABLE).update({ data: updated }).eq('id', id).then(({ error }) => {
      if (error) { console.error(error); set(s => ({ oportunidades: s.oportunidades.map(o => o.id === id ? prev : o) })); }
    });
    if (user) {
      if (updates.etapa && prev?.etapa !== updates.etapa) {
        const etapasFinales = new Set(['Ganado', 'Perdido']);
        if (etapasFinales.has(updates.etapa)) {
          const accion = updates.etapa === 'Ganado' ? 'ganó la oportunidad' : 'perdió la oportunidad';
          useActividadStore.getState().addActividad({ userId: user.id, userName: user.name, tipo: 'oportunidad', accion, registroId: id, registroLabel: prev?.nombre || id, modulo: 'pipeline' });
        }
      }
      const push = useNotificacionesStore.getState().pushNotificacion;
      if (updates.etapa && prev?.etapa !== updates.etapa) {
        const resp = updates.responsable || prev?.responsable;
        if (resp && resp !== user.id) push(resp, { mensaje: `La oportunidad "${prev?.nombre}" avanzó a "${updates.etapa}"`, tipo: 'oportunidad', modulo: 'pipeline', enlace: '/pipeline', registroId: id });
      }
      if (updates.responsable && updates.responsable !== prev?.responsable && updates.responsable !== user.id) {
        push(updates.responsable, { mensaje: `${user.name} te asignó la oportunidad "${prev?.nombre}"`, tipo: 'oportunidad', modulo: 'pipeline', enlace: '/pipeline', registroId: id });
      }
    }
  },

  deleteOportunidad: (id) => {
    const user = useAuthStore.getState().user;
    const target = get().oportunidades.find(o => o.id === id);
    const prev = get().oportunidades;
    set(s => ({ oportunidades: s.oportunidades.filter(o => o.id !== id) }));
    supabase.from(TABLE).delete().eq('id', id).then(({ error }) => {
      if (error) { console.error(error); set({ oportunidades: prev }); }
    });
    if (target?.eventoPausaId) useAgendaStore.getState().deleteEvento(target.eventoPausaId);
  },

  getOportunidad: (id) => get().oportunidades.find(o => o.id === id),
}));
