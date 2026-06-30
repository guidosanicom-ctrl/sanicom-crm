import { supabase } from './supabase';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export async function registerPushSubscription(userId) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return;

  const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) {
    console.warn('[push] VITE_VAPID_PUBLIC_KEY no configurada');
    return;
  }

  const reg = await navigator.serviceWorker.ready;
  const subscription = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  });

  const subJson = subscription.toJSON();
  const endpoint = subJson.endpoint;

  // El id de la fila depende SOLO del endpoint (no del usuario), para que un mismo
  // dispositivo físico nunca pueda quedar registrado bajo dos user_id distintos a la vez.
  // upsert sobre ese id reasigna atómicamente el dispositivo al usuario que acaba de
  // iniciar sesión, sin dejar filas huérfanas de un usuario anterior (bug: Guido recibía
  // pushes de Carlos porque el mismo endpoint quedaba duplicado bajo ambos user_id).
  const id = btoa(endpoint).slice(-24).replace(/[^a-zA-Z0-9]/g, '');
  const { error: upsertError } = await supabase
    .from('push_subscriptions')
    .upsert({ id, user_id: userId, subscription: subJson }, { onConflict: 'id' });

  if (upsertError) console.error('[push] error guardando suscripción:', upsertError);
  else console.log('[push] suscripción registrada OK, id:', id, 'userId:', userId);
}

// Re-registro forzado: desuscribe la suscripción actual del navegador (si la hay) y
// solicita una NUEVA al servicio push del sistema operativo. A diferencia de
// registerPushSubscription, que reutiliza la suscripción existente si ya hay una,
// esto garantiza un endpoint/token completamente nuevo — útil cuando el token
// quedó corrupto o inválido (frecuente en iOS tras reinstalar la PWA o tiempo sin uso).
export async function forceReregisterPushSubscription(userId) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Este dispositivo/navegador no soporta notificaciones push.');
  }

  const reg = await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();
  if (existing) {
    const oldEndpoint = existing.endpoint;
    await supabase.from('push_subscriptions').delete().filter('subscription->>endpoint', 'eq', oldEndpoint)
      .then(({ error }) => { if (error) console.warn('[push] error limpiando suscripción previa:', error); });
    await existing.unsubscribe();
  }

  // Reseteamos también cualquier permiso ya concedido no sirve para forzar el diálogo,
  // pero sí garantizamos que se pida de nuevo si por algún motivo se había revocado.
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Permiso de notificaciones denegado por el navegador.');
  }

  const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) throw new Error('VITE_VAPID_PUBLIC_KEY no configurada.');

  const subscription = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  });

  const subJson = subscription.toJSON();
  const endpoint = subJson.endpoint;
  const id = btoa(endpoint).slice(-24).replace(/[^a-zA-Z0-9]/g, '');

  const { error: upsertError } = await supabase
    .from('push_subscriptions')
    .upsert({ id, user_id: userId, subscription: subJson }, { onConflict: 'id' });

  if (upsertError) throw upsertError;
  console.log('[push] re-registro forzado OK, id:', id, 'userId:', userId);
  return true;
}

// Llamar al hacer logout: desuscribe el SW y elimina la fila en Supabase
export async function unregisterPushSubscription() {
  if (!('serviceWorker' in navigator)) return;
  const reg = await navigator.serviceWorker.getRegistration('/');
  if (!reg) return;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;

  const endpoint = sub.endpoint;

  // Primero eliminar en Supabase, luego desuscribir el SW
  const { error: delError } = await supabase
    .from('push_subscriptions')
    .delete()
    .filter('subscription->>endpoint', 'eq', endpoint);
  if (delError) console.warn('[push] error eliminando suscripción en logout:', delError);

  await sub.unsubscribe();
  console.log('[push] suscripción eliminada al cerrar sesión');
}
