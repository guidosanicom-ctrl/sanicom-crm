import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { generateId } from '../utils/formatters';

const TABLE = 'notificaciones';

export const useNotificacionesStore = create((set, get) => ({
  notificaciones: [],
  userId: null,

  // Llamar al iniciar sesión para cargar las notificaciones del usuario autenticado
  init: async (userId) => {
    const { data, error } = await supabase
      .from(TABLE)
      .select('data')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) { console.error('[notificacionesStore.init]', error); return; }
    set({ notificaciones: (data || []).map(r => r.data), userId });
  },

  // Escribe una notificación para el usuario DESTINO.
  // Si el destino es el usuario logueado actualmente, también actualiza el estado reactivo.
  pushNotificacion: (targetUserId, notif) => {
    if (!targetUserId) return;
    const nueva = {
      id: generateId(),
      fechaHora: new Date().toISOString(),
      leida: false,
      userId: targetUserId,
      ...notif,
    };
    if (get().userId === targetUserId) {
      set(s => ({ notificaciones: [nueva, ...s.notificaciones].slice(0, 100) }));
    }
    supabase.from(TABLE)
      .insert({ id: nueva.id, user_id: targetUserId, data: nueva })
      .then(({ error }) => { if (error) console.error('[notificacionesStore.push]', error); });
  },

  markRead: (id) => {
    const updated = get().notificaciones.map(n => n.id === id ? { ...n, leida: true } : n);
    set({ notificaciones: updated });
    const notif = updated.find(n => n.id === id);
    if (notif) {
      supabase.from(TABLE).update({ data: notif }).eq('id', id)
        .then(({ error }) => { if (error) console.error('[notificacionesStore.markRead]', error); });
    }
  },

  markAllRead: () => {
    const updated = get().notificaciones.map(n => ({ ...n, leida: true }));
    set({ notificaciones: updated });
    Promise.all(
      updated.map(n => supabase.from(TABLE).update({ data: n }).eq('id', n.id))
    ).catch(e => console.error('[notificacionesStore.markAllRead]', e));
  },

  unreadCount: () => get().notificaciones.filter(n => !n.leida).length,
}));
