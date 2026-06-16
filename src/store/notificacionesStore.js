import { create } from 'zustand';
import { generateId } from '../utils/formatters';

const getKey = (userId) => `sanicom_notificaciones_${userId}`;

const loadNotifs = (userId) => {
  try {
    const data = localStorage.getItem(getKey(userId));
    return data ? JSON.parse(data) : [];
  } catch { return []; }
};

const saveNotifs = (userId, notifs) => {
  const limited = notifs.slice(0, 100);
  localStorage.setItem(getKey(userId), JSON.stringify(limited));
};

export const useNotificacionesStore = create((set, get) => ({
  notificaciones: [],
  userId: null,

  init: (userId) => {
    const notificaciones = loadNotifs(userId);
    set({ notificaciones, userId });
  },

  addNotificacion: (notif) => {
    const { userId, notificaciones } = get();
    if (!userId) return;
    const nueva = {
      id: generateId(),
      fechaHora: new Date().toISOString(),
      leida: false,
      ...notif,
    };
    const updated = [nueva, ...notificaciones];
    saveNotifs(userId, updated);
    set({ notificaciones: updated });
  },

  markRead: (id) => {
    const { userId, notificaciones } = get();
    const updated = notificaciones.map(n => n.id === id ? { ...n, leida: true } : n);
    saveNotifs(userId, updated);
    set({ notificaciones: updated });
  },

  markAllRead: () => {
    const { userId, notificaciones } = get();
    const updated = notificaciones.map(n => ({ ...n, leida: true }));
    saveNotifs(userId, updated);
    set({ notificaciones: updated });
  },

  unreadCount: () => get().notificaciones.filter(n => !n.leida).length,
}));
