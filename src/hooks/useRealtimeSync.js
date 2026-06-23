import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useClientesStore } from '../store/clientesStore';
import { useOportunidadesStore } from '../store/oportunidadesStore';
import { useDemosStore } from '../store/demosStore';
import { useServicioStore } from '../store/servicioStore';
import { useNotificacionesStore } from '../store/notificacionesStore';

// Tablas mapeadas a su store y clave del array
const SYNC_CONFIG = [
  {
    table: 'clientes',
    getItems: () => useClientesStore.getState().clientes,
    setItems: (items) => useClientesStore.setState({ clientes: items }),
    isInitialized: () => useClientesStore.getState().initialized,
  },
  {
    table: 'oportunidades',
    getItems: () => useOportunidadesStore.getState().oportunidades,
    setItems: (items) => useOportunidadesStore.setState({ oportunidades: items }),
    isInitialized: () => useOportunidadesStore.getState().initialized,
  },
  {
    table: 'demostraciones',
    getItems: () => useDemosStore.getState().demos,
    setItems: (items) => useDemosStore.setState({ demos: items }),
    isInitialized: () => useDemosStore.getState().initialized,
  },
  {
    table: 'ordenes_servicio',
    getItems: () => useServicioStore.getState().servicios,
    setItems: (items) => useServicioStore.setState({ servicios: items }),
    isInitialized: () => useServicioStore.getState().initialized,
  },
];

function applyChange(config, eventType, newRecord, oldRecord) {
  if (!config.isInitialized()) return;

  const items = config.getItems();

  if (eventType === 'INSERT') {
    const incoming = newRecord.data;
    if (!incoming?.id) return;
    // Ignorar si ya existe (el usuario local ya lo insertó optimísticamente)
    if (items.some((i) => i.id === incoming.id)) return;
    config.setItems([...items, incoming]);
  } else if (eventType === 'UPDATE') {
    const incoming = newRecord.data;
    if (!incoming?.id) return;
    config.setItems(items.map((i) => (i.id === incoming.id ? incoming : i)));
  } else if (eventType === 'DELETE') {
    const deletedId = oldRecord?.id;
    if (!deletedId) return;
    config.setItems(items.filter((i) => i.id !== deletedId));
  }
}

export function useRealtimeSync(userId) {
  const channelRef = useRef(null);

  useEffect(() => {
    if (!userId) return;

    // Canal único con suscripciones múltiples
    const channel = supabase.channel('crm-realtime');

    for (const config of SYNC_CONFIG) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: config.table },
        (payload) => {
          applyChange(config, payload.eventType, payload.new, payload.old);
        }
      );
    }

    // Notificaciones: solo las del usuario actual
    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notificaciones', filter: `user_id=eq.${userId}` },
      (payload) => {
        const notif = payload.new?.data;
        if (!notif) return;
        const { notificaciones, userId: storeUserId } = useNotificacionesStore.getState();
        if (storeUserId !== userId) return;
        // Evitar duplicado (la misma sesión ya lo insertó localmente)
        if (notificaciones.some((n) => n.id === notif.id)) return;
        useNotificacionesStore.setState({
          notificaciones: [notif, ...notificaciones].slice(0, 100),
        });
      }
    );

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('[realtime] conectado');
      } else if (status === 'CHANNEL_ERROR') {
        console.warn('[realtime] error de canal');
      }
    });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [userId]);
}
