import { useEffect } from 'react';
import { useNotificacionesStore } from '../store/notificacionesStore';

export function useAppBadge() {
  const notificaciones = useNotificacionesStore(s => s.notificaciones);

  useEffect(() => {
    if (!('setAppBadge' in navigator)) return;
    const unread = notificaciones.filter(n => !n.leida).length;
    if (unread > 0) {
      navigator.setAppBadge(unread).catch(() => {});
    } else {
      navigator.clearAppBadge().catch(() => {});
    }
  }, [notificaciones]);
}
