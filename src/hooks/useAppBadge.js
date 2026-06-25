import { useEffect } from 'react';
import { useNotificacionesStore } from '../store/notificacionesStore';

export function useAppBadge() {
  const notificaciones = useNotificacionesStore((s) => s.notificaciones);
  const refresh = useNotificacionesStore((s) => s.refresh);

  // Actualiza el badge del sistema operativo cuando cambia el conteo
  useEffect(() => {
    if (!('setAppBadge' in navigator)) return;
    const unread = notificaciones.filter((n) => !n.leida).length;
    if (unread > 0) {
      navigator.setAppBadge(unread).catch(() => {});
    } else {
      navigator.clearAppBadge().catch(() => {});
    }
  }, [notificaciones]);

  // Reconexión al volver a primer plano + polling cada 30s (fallback para Safari/iOS
  // que mata el WebSocket de Supabase Realtime en background)
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisibility);
    const interval = setInterval(refresh, 30_000);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      clearInterval(interval);
    };
  }, [refresh]);
}
