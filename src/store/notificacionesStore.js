import { create } from 'zustand';
import { generateId } from '../utils/formatters';

const getKey = (userId) => `sanicom_notificaciones_${userId}`;

const loadNotifs = (userId) => {
  try {
    const data = localStorage.getItem(getKey(userId));
    return data ? JSON.parse(data) : [];
  } catch { return []; }
};

export const useNotificacionesStore = create((set, get) => ({
  notificaciones: [],
  userId: null,

  // Llamar al iniciar sesión para cargar las notificaciones del usuario autenticado
  init: (userId) => {
    const notificaciones = loadNotifs(userId);
    set({ notificaciones, userId });
  },

  // Escribe una notificación en el localStorage del usuario DESTINO.
  // Si el destino es el usuario actualmente logueado, también actualiza el estado reactivo.
  pushNotificacion: (targetUserId, notif) => {
    if (!targetUserId) return;
    const existing = loadNotifs(targetUserId);
    const nueva = {
      id: generateId(),
      fechaHora: new Date().toISOString(),
      leida: false,
      ...notif,
    };
    const updated = [nueva, ...existing].slice(0, 100);
    localStorage.setItem(getKey(targetUserId), JSON.stringify(updated));
    // Actualizar estado solo si el destino es el usuario logueado actualmente
    if (get().userId === targetUserId) {
      set({ notificaciones: updated });
    }
  },

  markRead: (id) => {
    const { userId, notificaciones } = get();
    const updated = notificaciones.map(n => n.id === id ? { ...n, leida: true } : n);
    localStorage.setItem(getKey(userId), JSON.stringify(updated));
    set({ notificaciones: updated });
  },

  markAllRead: () => {
    const { userId, notificaciones } = get();
    const updated = notificaciones.map(n => ({ ...n, leida: true }));
    localStorage.setItem(getKey(userId), JSON.stringify(updated));
    set({ notificaciones: updated });
  },

  unreadCount: () => get().notificaciones.filter(n => !n.leida).length,
}));
