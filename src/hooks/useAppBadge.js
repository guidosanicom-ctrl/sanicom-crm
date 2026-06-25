import { useEffect, useCallback } from 'react';
import { useNotificacionesStore } from '../store/notificacionesStore';

function applyBadge(count) {
  if (!('setAppBadge' in navigator)) return;
  if (count > 0) {
    navigator.setAppBadge(count).catch((e) => console.warn('[badge] setAppBadge falló:', e));
  } else {
    navigator.clearAppBadge().catch(() => {});
  }
}

export function useAppBadge() {
  const notificaciones = useNotificacionesStore((s) => s.notificaciones);

  // Calcula y aplica el badge cada vez que cambia el array de notificaciones
  useEffect(() => {
    const unread = notificaciones.filter((n) => !n.leida).length;
    console.log('[badge] notificaciones cambiadas, no leídas:', unread);
    applyBadge(unread);
  }, [notificaciones]);

  // Re-aplica el badge al volver a la app (visibilitychange)
  // por si el OS lo limpió mientras la app estaba en segundo plano
  const refreshBadge = useCallback(() => {
    if (document.hidden) return;
    const unread = useNotificacionesStore.getState().notificaciones.filter((n) => !n.leida).length;
    console.log('[badge] visibilitychange, no leídas:', unread);
    applyBadge(unread);
  }, []);

  useEffect(() => {
    document.addEventListener('visibilitychange', refreshBadge);
    return () => document.removeEventListener('visibilitychange', refreshBadge);
  }, [refreshBadge]);
}
