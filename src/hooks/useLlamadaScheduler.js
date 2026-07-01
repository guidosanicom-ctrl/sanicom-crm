import { useEffect, useRef, useState } from 'react';
import { useLlamadasPendientesStore } from '../store/llamadasPendientesStore';
import { useNotificacionesStore } from '../store/notificacionesStore';
import { useAuthStore } from '../store/authStore';

const MAX_SCHEDULE_MS = 24 * 60 * 60 * 1000; // solo programar dentro de 24h

export function useLlamadaScheduler() {
  const { user } = useAuthStore();
  const { llamadas } = useLlamadasPendientesStore();
  const { pushNotificacion } = useNotificacionesStore();
  const timersRef = useRef({});
  const [notifPermission, setNotifPermission] = useState(
    'Notification' in window ? Notification.permission : 'unsupported'
  );

  const isJavier = user?.email === 'jgovantes@sanicom.es';

  // Solicitar permiso al montar (solo Javier)
  useEffect(() => {
    if (!isJavier || !('Notification' in window)) return;
    if (Notification.permission === 'default') {
      Notification.requestPermission().then(p => setNotifPermission(p));
    }
  }, [isJavier]);

  // Programar notificaciones para llamadas futuras pendientes
  useEffect(() => {
    if (!isJavier) return;

    // Limpiar timers anteriores
    Object.values(timersRef.current).forEach(t => clearTimeout(t));
    timersRef.current = {};

    const now = Date.now();

    llamadas
      .filter(l => !l.confirmada)
      .forEach(l => {
        const delay = new Date(l.fecha_hora).getTime() - now;
        // Solo programar llamadas futuras dentro de las próximas 24h
        if (delay <= 0 || delay > MAX_SCHEDULE_MS) return;

        timersRef.current[l.id] = setTimeout(() => {
          // 1. Notificación nativa del navegador
          if ('Notification' in window && Notification.permission === 'granted') {
            const bodyText = l.nota
              ? `${l.oportunidad_nombre} — ${l.nota}`
              : l.oportunidad_nombre;
            const notif = new Notification('📞 Hora de llamar', {
              body: bodyText,
              icon: '/minilogo.png',
              tag: `llamada-${l.id}`,
              requireInteraction: true,
            });
            notif.onclick = () => {
              window.focus();
              window.location.href = `/pipeline?openId=${l.oportunidad_id}`;
              notif.close();
            };
          }

          // 2. Campanita interna del CRM
          pushNotificacion(user.id, {
            tipo: 'llamada',
            mensaje: `📞 Llamada pendiente: ${l.oportunidad_nombre}${l.nota ? ` — ${l.nota}` : ''}`,
            enlace: '/pipeline',
            registroId: l.oportunidad_id,
          });
        }, delay);
      });

    return () => {
      Object.values(timersRef.current).forEach(t => clearTimeout(t));
    };
  }, [isJavier, llamadas, user?.id]);

  return { notifPermission, isJavier };
}
